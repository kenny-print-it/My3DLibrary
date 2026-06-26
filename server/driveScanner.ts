import axios from "axios";
import type { DriveImage, DriveFile } from "../drizzle/schema";

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const MODEL_EXTS = new Set([".stl", ".obj", ".3mf", ".step", ".stp", ".ply", ".gcode"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const FOLDER_MIME = "application/vnd.google-apps.folder";

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

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string; // ISO 8601 from Drive API
}

export interface ScannedModel {
  driveId: string;
  name: string;
  path: string;
  images: DriveImage[];
  modelFiles: DriveFile[];
  thumbnailUrl: string;
  driveCreatedAt?: Date; // folder createdTime from Drive
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
}

async function listFolderContents(folderId: string, apiKey: string): Promise<DriveItem[]> {
  const all: DriveItem[] = [];
  let pageToken: string | undefined;
  do {
    const params: Record<string, string> = {
      key: apiKey,
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime)",
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
    fileId: f.id,
    id: f.id,
    name: f.name,
    thumbnailLink: f.thumbnailLink || "",
    webContentLink: f.webContentLink || f.webViewLink || "",
    mimeType: f.mimeType || "image/jpeg",
    webViewLink: f.webViewLink || "",
  }));

  const modelFiles: DriveFile[] = files.filter(isModel).map((f) => ({
    fileId: f.id,
    id: f.id,
    name: f.name,
    size: f.size || "0",
    webContentLink: f.webContentLink || "",
    mimeType: f.mimeType,
    webViewLink: f.webViewLink || "",
  }));

  // Recurse into subfolders
  for (const sf of subfolders) {
    const child = await collectAllFiles(sf.id, apiKey, depth + 1);
    images.push(...child.images);
    modelFiles.push(...child.modelFiles);
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

/**
 * Main scan entry point.
 *
 * Hierarchy:
 *   Root folder (rootFolderId)
 *     └── Level 1: Collection folders  →  stored as `categories`
 *           └── Level 2: Model folders  →  stored as `models`
 *                 └── Level 3+: Files & nested folders  →  stored inside the model record
 */
export type ScanProgressCallback = (update: {
  modelsFound: number;
  categoriesFound: number;
  totalCollections: number;
  currentFolder: string;
  phase: "discovering" | "scanning" | "saving" | "done";
}) => void;

export async function scanDrive(
  apiKey: string,
  rootFolderId: string,
  onProgress?: ScanProgressCallback
): Promise<ScanResult> {
  const categories: ScannedCategory[] = [];
  const models: ScannedModel[] = [];

  // Get root folder name for path display
  const rootResp = await axios.get(`https://www.googleapis.com/drive/v3/files/${rootFolderId}`, {
    params: { key: apiKey, fields: "id,name" },
  });
  const rootName = (rootResp.data as { name: string }).name;

  // Level 1: collection folders directly inside the root
  const rootContents = await listFolderContents(rootFolderId, apiKey);
    const collectionFolders = rootContents.filter((f) => f.mimeType === FOLDER_MIME);
  const totalCollections = collectionFolders.length;
  onProgress?.({ modelsFound: 0, categoriesFound: 0, totalCollections, currentFolder: rootName, phase: "discovering" });
  for (const collectionFolder of collectionFolders) {
    const collectionPath = `${rootName} / ${collectionFolder.name}`;

    // Register as a category
    categories.push({
      driveId: collectionFolder.id,
      name: collectionFolder.name,
      path: collectionPath,
      parentDriveId: rootFolderId,
    });
        onProgress?.({ modelsFound: models.length, categoriesFound: categories.length, totalCollections, currentFolder: collectionFolder.name, phase: "scanning" });
    // Level 2: model folders inside this collection
    const collectionContents = await listFolderContents(collectionFolder.id, apiKey);
    const modelFolders = collectionContents.filter((f) => f.mimeType === FOLDER_MIME);

    // Also handle any loose files directly in the collection folder
    // (treat the collection folder itself as a model if it has model/image files)
    const looseFiles = collectionContents.filter((f) => f.mimeType !== FOLDER_MIME);
    const looseImages: DriveImage[] = looseFiles.filter(isImage).map((f) => ({
      fileId: f.id, id: f.id, name: f.name, thumbnailLink: f.thumbnailLink || "", webContentLink: f.webContentLink || f.webViewLink || "", mimeType: f.mimeType || "image/jpeg", webViewLink: f.webViewLink || "",
    }));
    const looseModelFiles: DriveFile[] = looseFiles.filter(isModel).map((f) => ({
      fileId: f.id, id: f.id, name: f.name, size: f.size || "0", webContentLink: f.webContentLink || "", mimeType: f.mimeType, webViewLink: f.webViewLink || "",
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

    // Each subfolder of the collection = one model card
    for (const modelFolder of modelFolders) {
      const modelPath = `${collectionPath} / ${modelFolder.name}`;

      // Collect ALL files recursively inside this model folder (Level 3+)
      onProgress?.({ modelsFound: models.length, categoriesFound: categories.length, totalCollections, currentFolder: modelFolder.name, phase: "scanning" });
      const { images, modelFiles } = await collectAllFiles(modelFolder.id, apiKey);

      models.push({
        driveId: modelFolder.id,
        name: modelFolder.name,
        path: modelPath,
        images,
        modelFiles,
        thumbnailUrl: pickThumbnail(images),
        driveCreatedAt: modelFolder.createdTime ? new Date(modelFolder.createdTime) : undefined,
      });
    }
  }

  return { categories, models };
}

/**
 * Find which collection folder (Level 1) directly contains the given model folder (Level 2).
 * The Drive API with an API key does not return the `parents` field, so we instead
 * list the direct children of each known collection folder and look for the model's driveId.
 *
 * @param modelDriveId  The Drive folder ID of the model
 * @param collectionDriveIds  Array of Level-1 collection folder IDs to search
 * @param apiKey  Google Drive API key
 * @returns The driveId of the matching collection, or null if not found
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
