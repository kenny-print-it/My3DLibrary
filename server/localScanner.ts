/**
 * Local filesystem scanner — replaces driveScanner.ts for the self-hosted version.
 * Scans a local folder with this structure:
 *   <library-root>/
 *     <Collection Name>/        ← Level 1: categories
 *       <Model Name>/           ← Level 2: models
 *         image1.jpg            ← files (images, STL, 3MF, docs, etc.)
 *         model.stl
 *         ...
 */
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"]);
const MODEL_EXTS = new Set([".stl", ".3mf", ".obj", ".step", ".stp", ".iges", ".igs"]);
const DOC_EXTS = new Set([".pdf", ".txt", ".md", ".docx"]);

export type ScannedFile = {
  name: string;
  /** Relative path from the library root */
  relativePath: string;
  size: number;
  mimeType: string;
  isImage: boolean;
  isModel: boolean;
};

export type ScannedModel = {
  /** Unique ID — relative path from library root, e.g. "Beasts/Dragon" */
  localId: string;
  name: string;
  /** Absolute path to the model folder */
  folderPath: string;
  /** Relative path from library root */
  relativePath: string;
  /** Absolute path to the library root this model belongs to */
  rootPath: string;
  files: ScannedFile[];
  images: ScannedFile[];
  thumbnailPath: string | null;
};

export type ScannedCategory = {
  /** Unique ID — folder name, e.g. "Beasts and Minis" */
  localId: string;
  name: string;
  /** Absolute path to the collection folder */
  folderPath: string;
  models: ScannedModel[];
};

export type ScanProgressCallback = (progress: {
  phase: string;
  currentFolder: string;
  collectionsScanned: number;
  totalCollections: number;
  modelsFound: number;
}) => void;

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp",
    ".stl": "model/stl", ".3mf": "model/3mf", ".obj": "model/obj",
    ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

async function scanModelFolder(
  modelFolderPath: string,
  libraryRoot: string
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];

  async function walk(dir: string) {
    let entries: import('node:fs').Dirent<string>[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const stat = await fs.stat(fullPath).catch(() => null);
        const relativePath = path.relative(libraryRoot, fullPath).replace(/\\/g, "/");
        files.push({
          name: entry.name,
          relativePath,
          size: stat?.size ?? 0,
          mimeType: getMimeType(ext),
          isImage: IMAGE_EXTS.has(ext),
          isModel: MODEL_EXTS.has(ext),
        });
      }
    }
  }

  await walk(modelFolderPath);
  return files;
}

export async function scanLocalLibrary(
  libraryRoot: string,
  onProgress?: ScanProgressCallback
): Promise<ScannedCategory[]> {
  if (!fsSync.existsSync(libraryRoot)) {
    throw new Error(`Library path does not exist: ${libraryRoot}`);
  }

  const categories: ScannedCategory[] = [];

  // Level 1: collection folders
  const collectionEntries = await fs.readdir(libraryRoot, { withFileTypes: true });
  const collectionFolders = collectionEntries.filter(e => e.isDirectory() && !e.name.startsWith("."));
  const totalCollections = collectionFolders.length;
  let collectionsScanned = 0;
  let modelsFound = 0;

  onProgress?.({
    phase: "Discovering collections",
    currentFolder: "",
    collectionsScanned: 0,
    totalCollections,
    modelsFound: 0,
  });

  for (const collectionEntry of collectionFolders) {
    const collectionPath = path.join(libraryRoot, collectionEntry.name);
    const collectionId = collectionEntry.name;

    onProgress?.({
      phase: `Scanning "${collectionEntry.name}"`,
      currentFolder: collectionEntry.name,
      collectionsScanned,
      totalCollections,
      modelsFound,
    });

    // Level 2: model folders inside this collection
    const modelEntries = await fs.readdir(collectionPath, { withFileTypes: true });
    const modelFolders = modelEntries.filter(e => e.isDirectory() && !e.name.startsWith("."));

    const models: ScannedModel[] = [];

    for (const modelEntry of modelFolders) {
      const modelPath = path.join(collectionPath, modelEntry.name);
      const localId = `${collectionEntry.name}/${modelEntry.name}`;
      const relativePath = path.relative(libraryRoot, modelPath).replace(/\\/g, "/");

      const files = await scanModelFolder(modelPath, libraryRoot);
      const images = files.filter(f => f.isImage);
      const thumbnailPath = images.length > 0 ? images[0].relativePath : null;

      models.push({
        localId,
        name: modelEntry.name,
        folderPath: modelPath,
        relativePath,
        rootPath: libraryRoot,
        files,
        images,
        thumbnailPath,
      });
      modelsFound++;
    }

    collectionsScanned++;
    categories.push({
      localId: collectionId,
      name: collectionEntry.name,
      folderPath: collectionPath,
      models,
    });
  }

  onProgress?.({
    phase: "Saving to database",
    currentFolder: "",
    collectionsScanned,
    totalCollections,
    modelsFound,
  });

  return categories;
}

/**
 * Scan multiple library root paths and merge results.
 * Models are tagged with their rootPath for offline detection.
 */
export async function scanMultipleLibraries(
  rootPaths: string[],
  onProgress?: ScanProgressCallback
): Promise<ScannedCategory[]> {
  const allCategories: ScannedCategory[] = [];
  for (const rootPath of rootPaths) {
    if (!fsSync.existsSync(rootPath)) {
      console.warn(`[localScanner] Skipping missing path: ${rootPath}`);
      continue;
    }
    const cats = await scanLocalLibrary(rootPath, onProgress);
    // Prefix localId with rootPath to avoid collisions across different roots
    const prefixed = cats.map(cat => ({
      ...cat,
      localId: `${rootPath}::${cat.localId}`,
      models: cat.models.map(m => ({
        ...m,
        localId: `${rootPath}::${m.localId}`,
        rootPath,
      })),
    }));
    allCategories.push(...prefixed);
  }
  return allCategories;
}

/**
 * Check whether a given rootPath is currently accessible (drive mounted).
 */
export function isPathAccessible(rootPath: string): boolean {
  try {
    return fsSync.existsSync(rootPath);
  } catch {
    return false;
  }
}
