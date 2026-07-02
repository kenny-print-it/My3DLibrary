import axios from "axios";
import type { DriveImage, DriveFile } from "../drizzle/schema";

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const MODEL_EXTS = new Set([".stl", ".obj", ".3mf", ".step", ".stp", ".ply", ".gcode"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const FOLDER_MIME = "application/vnd.google-apps.folder";

// Max concurrent Drive API calls for model folder scanning
const CONCURRENCY = 10;

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function isImage(f: { name: string; mimeType: string }) {
  return IMAGE_MIMES.has(f.mimeType) || IMAGE_EXTS.has(ext(f.name));
}

function isModel(f: { name: string }) {
  return MODEL_EXTS.has(ext(f.name));
}

/** Run an array of async tasks with a max concurrency limit */
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string;   // ISO 8601 from Drive API
  modifiedTime?: string;  // ISO 8601 from Drive API
}

export interface ScannedModel {
  driveId: string;
  name: string;
  path: string;
  images: DriveImage[];
  modelFiles: DriveFile[];
  thumbnailUrl: string;
  driveCreatedAt?: Date;
  driveModifiedAt?: Date;
  skipped?: boolean; // true when incremental scan determined no changes
}

export interface ScannedCategory {
  driveId: string;
  name: string;
  path: string;
  parentDriveId: string | null;
}

export interface ScanResult {
  categories: ScannedCategory[];
  models: ScannedModel[];
  skippedCount: number;
}

async function listFolderContents(folderId: string, apiKey: string): Promise<DriveItem[]> {
  const all: DriveItem[] = [];
  let pageToken: string | undefined;
  do {
    const params: Record<string, string> = {
      key: apiKey,
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime,modifiedTime)",
      pageSize: "1000",
    };
    if (pageToken) params.pageToken = pageToken;
    const resp = await axios.get("https://www.googleapis.com/drive/v3/files", { params });
    const data = resp.data as { files: DriveItem[]; nextPageToken?: string };
    all.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

/**
 * Recursively collect ALL files (images + model files) from a folder and its
 * subfolders. Used to gather everything inside a Level-2 "model" folder so
 * the detail page can show renders and STLs that may live in nested subfolders
 * (e.g. size variants like "256mm", "400mm").
 */
export async function collectAllFilesForModel(folderId: string, apiKey: string) {
  return collectAllFiles(folderId, apiKey);
}

async function collectAllFiles(
  folderId: string,
  apiKey: string,
  depth: number = 0
): Promise<{ images: DriveImage[]; modelFiles: DriveFile[] }> {
  if (depth > 6) return { images: [], modelFiles: [] }; // safety guard

  const contents = await listFolderContents(folderId, apiKey);
  const subfolders = contents.filter((f) => f.mimeType === FOLDER_MIME);
  const files = contents.filter((f) => f.mimeType !== FOLDER_MIME);

  const images: DriveImage[] = files.filter(isImage).map((f) => ({
    id: f.id,
    name: f.name,
    thumbnailLink: f.thumbnailLink || "",
    webViewLink: f.webViewLink || "",
  }));

  const modelFiles: DriveFile[] = files.filter(isModel).map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size || "0",
    webViewLink: f.webViewLink || "",
    webContentLink: f.webContentLink || "",
    mimeType: f.mimeType,
  }));

  // Recurse into subfolders in parallel (depth-limited)
  if (subfolders.length > 0) {
    const childResults = await Promise.all(
      subfolders.map((sf) => collectAllFiles(sf.id, apiKey, depth + 1))
    );
    for (const child of childResults) {
      images.push(...child.images);
      modelFiles.push(...child.modelFiles);
    }
  }

  return { images, modelFiles };
}

/**
 * Pick the best thumbnail from a list of images.
 * Prefers images with "render" in the name, then falls back to the first image.
 */
function pickThumbnail(images: DriveImage[]): string {
  if (images.length === 0) return "";
  const render = images.find((i) => i.name.toLowerCase().includes("render")) || images[0];
  return render.thumbnailLink ? render.thumbnailLink.replace("=s220", "=s400") : "";
}

export type ScanProgressCallback = (update: {
  modelsFound: number;
  categoriesFound: number;
  totalCollections: number;
  currentFolder: string;
  skippedCount: number;
  phase: "discovering" | "scanning" | "saving" | "done";
}) => void;

/**
 * Main scan entry point.
 *
 * Hierarchy:
 *   Root folder (rootFolderId)
 *     └── Level 1: Collection folders  →  stored as `categories`
 *           └── Level 2: Model folders  →  stored as `models`
 *                 └── Level 3+: Files & nested folders  →  stored inside the model record
 *
 * @param existingModels  Map of driveId → lastScanned Date for incremental sync.
 *                        If provided, model folders whose modifiedTime <= lastScanned are skipped.
 */
export async function scanDrive(
  apiKey: string,
  rootFolderId: string,
  onProgress?: ScanProgressCallback,
  existingModels?: Map<string, Date>
): Promise<ScanResult> {
  const categories: ScannedCategory[] = [];
  const models: ScannedModel[] = [];
  let skippedCount = 0;

  // Get root folder name for path display
  const rootResp = await axios.get(`https://www.googleapis.com/drive/v3/files/${rootFolderId}`, {
    params: { key: apiKey, fields: "id,name" },
  });
  const rootName = (rootResp.data as { name: string }).name;

  // Level 1: collection folders directly inside the root
  const rootContents = await listFolderContents(rootFolderId, apiKey);
  const collectionFolders = rootContents.filter((f) => f.mimeType === FOLDER_MIME);
  const totalCollections = collectionFolders.length;
  onProgress?.({ modelsFound: 0, categoriesFound: 0, totalCollections, currentFolder: rootName, skippedCount: 0, phase: "discovering" });

  for (const collectionFolder of collectionFolders) {
    const collectionPath = `${rootName} / ${collectionFolder.name}`;

    // Register as a category
    categories.push({
      driveId: collectionFolder.id,
      name: collectionFolder.name,
      path: collectionPath,
      parentDriveId: rootFolderId,
    });
    onProgress?.({ modelsFound: models.length, categoriesFound: categories.length, totalCollections, currentFolder: collectionFolder.name, skippedCount, phase: "scanning" });

    // Level 2: model folders inside this collection
    const collectionContents = await listFolderContents(collectionFolder.id, apiKey);
    const modelFolders = collectionContents.filter((f) => f.mimeType === FOLDER_MIME);

    // Handle loose files directly in the collection folder
    const looseFiles = collectionContents.filter((f) => f.mimeType !== FOLDER_MIME);
    const looseImages: DriveImage[] = looseFiles.filter(isImage).map((f) => ({
      id: f.id, name: f.name, thumbnailLink: f.thumbnailLink || "", webViewLink: f.webViewLink || "",
    }));
    const looseModelFiles: DriveFile[] = looseFiles.filter(isModel).map((f) => ({
      id: f.id, name: f.name, size: f.size || "0", webViewLink: f.webViewLink || "", webContentLink: f.webContentLink || "", mimeType: f.mimeType,
    }));

    if (looseModelFiles.length > 0 || looseImages.length > 0) {
      models.push({
        driveId: collectionFolder.id + "_loose",
        name: collectionFolder.name + " (misc)",
        path: collectionPath,
        images: looseImages,
        modelFiles: looseModelFiles,
        thumbnailUrl: pickThumbnail(looseImages),
      });
    }

    // Process model folders in parallel batches
    const tasks = modelFolders.map((modelFolder) => async (): Promise<ScannedModel> => {
      const modelPath = `${collectionPath} / ${modelFolder.name}`;
      const driveModifiedAt = modelFolder.modifiedTime ? new Date(modelFolder.modifiedTime) : undefined;

      // Incremental sync: skip if folder hasn't changed since last scan
      if (existingModels && driveModifiedAt) {
        const lastScanned = existingModels.get(modelFolder.id);
        if (lastScanned && driveModifiedAt <= lastScanned) {
          skippedCount++;
          onProgress?.({ modelsFound: models.length, categoriesFound: categories.length, totalCollections, currentFolder: modelFolder.name, skippedCount, phase: "scanning" });
          return {
            driveId: modelFolder.id,
            name: modelFolder.name,
            path: modelPath,
            images: [],
            modelFiles: [],
            thumbnailUrl: "",
            driveCreatedAt: modelFolder.createdTime ? new Date(modelFolder.createdTime) : undefined,
            driveModifiedAt,
            skipped: true,
          };
        }
      }

      onProgress?.({ modelsFound: models.length, categoriesFound: categories.length, totalCollections, currentFolder: modelFolder.name, skippedCount, phase: "scanning" });
      const { images, modelFiles } = await collectAllFiles(modelFolder.id, apiKey);

      return {
        driveId: modelFolder.id,
        name: modelFolder.name,
        path: modelPath,
        images,
        modelFiles,
        thumbnailUrl: pickThumbnail(images),
        driveCreatedAt: modelFolder.createdTime ? new Date(modelFolder.createdTime) : undefined,
        driveModifiedAt,
        skipped: false,
      };
    });

    // Run with concurrency limit
    const batchResults = await pLimit(tasks, CONCURRENCY);
    models.push(...batchResults);
  }

  return { categories, models, skippedCount };
}

/**
 * Find which collection folder (Level 1) directly contains the given model folder (Level 2).
 */
export async function getParentCollectionForModel(
  modelDriveId: string,
  collectionDriveIds: string[],
  apiKey: string
): Promise<string | null> {
  for (const collectionId of collectionDriveIds) {
    const children = await listFolderContents(collectionId, apiKey);
    const found = children.find(
      (f) => f.mimeType === FOLDER_MIME && f.id === modelDriveId
    );
    if (found) return collectionId;
  }
  return null;
}

export async function validateDriveApiKey(apiKey: string, folderId: string): Promise<boolean> {
  try {
    await axios.get(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
      params: { key: apiKey, fields: "id,name" },
    });
    return true;
  } catch {
    return false;
  }
}
