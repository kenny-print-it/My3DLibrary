/**
 * Local filesystem scanner — replaces driveScanner.ts for the self-hosted version.
 *
 * Adaptive depth scanning: instead of requiring a fixed 2-level hierarchy, this
 * scanner walks the tree and treats any folder that directly contains at least one
 * model file (.stl, .3mf, .obj, etc.) OR at least one image as a "model folder".
 * The parent folder (one level up from the model folder) becomes the collection.
 *
 * Example structures that all work:
 *   root/Collection/Model/file.stl          ← classic 2-level
 *   root/Category/SubCat/Model/file.stl     ← 3-level (SubCat becomes collection)
 *   root/Model/file.stl                     ← flat (root itself is the collection)
 */
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"]);
const MODEL_EXTS = new Set([".stl", ".3mf", ".obj", ".step", ".stp", ".iges", ".igs", ".fcstd", ".blend", ".f3d", ".amf"]);
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

/**
 * Returns true if the folder name looks like a date rather than a meaningful category.
 * Detected patterns:
 *   - 4-digit year alone: 2024
 *   - Year-month: 2024-01, 2024_01, 2024.01
 *   - Month-year: 01-2024, 01_2024, Jan-2024, January-2024
 *   - Month year (space): Jan 2024, January 2024
 *   - Full date: 2024-01-15, 2024_01_15
 */
function isDateFolder(name: string): boolean {
  const n = name.trim();
  const MONTHS = /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)$/i;
  // 4-digit year alone
  if (/^\d{4}$/.test(n)) return true;
  // YYYY-MM or YYYY_MM or YYYY.MM
  if (/^\d{4}[-_.](0?\d|1[0-2])$/.test(n)) return true;
  // MM-YYYY or MM_YYYY
  if (/^(0?\d|1[0-2])[-_]\d{4}$/.test(n)) return true;
  // YYYY-MM-DD variants
  if (/^\d{4}[-_.](0?\d|1[0-2])[-_.](\d{1,2})$/.test(n)) return true;
  // Month YYYY or Month-YYYY (e.g. "Jan 2024", "January-2024")
  const monthYear = n.match(/^([A-Za-z]+)[-_ ]?(\d{4})$/);
  if (monthYear && MONTHS.test(monthYear[1])) return true;
  // Month alone (e.g. "January", "Jan")
  if (MONTHS.test(n)) return true;
  return false;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp",
    ".stl": "model/stl", ".3mf": "model/3mf", ".obj": "model/obj",
    ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Collect all direct files in a folder (non-recursive — just the immediate files).
 * We do a recursive walk only to collect all files inside a model folder.
 */
async function collectFilesInFolder(
  folderPath: string,
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

  await walk(folderPath);
  return files;
}

/**
 * Check if a folder directly contains any model or image files (not recursive).
 * A folder qualifies as a "model folder" if it has at least one model file,
 * or at least one image file alongside any other content.
 */
async function isModelFolder(folderPath: string): Promise<boolean> {
  let entries: import('node:fs').Dirent<string>[];
  try {
    entries = await fs.readdir(folderPath, { withFileTypes: true });
  } catch {
    return false;
  }
  const fileExts = entries
    .filter(e => e.isFile())
    .map(e => path.extname(e.name).toLowerCase());

  const hasModel = fileExts.some(ext => MODEL_EXTS.has(ext));
  const hasImage = fileExts.some(ext => IMAGE_EXTS.has(ext));
  const hasDoc = fileExts.some(ext => DOC_EXTS.has(ext));

  // A model folder must have at least a model file, OR an image + doc/any file
  return hasModel || (hasImage && (hasDoc || fileExts.length > 1));
}

/**
 * Recursively find all "model folders" under a given directory.
 * Returns them as { folderPath, depth } sorted by depth ascending.
 * A folder that is itself a model folder is NOT descended into further
 * (its subfolders are treated as part of the model, not separate models).
 */
async function findModelFolders(
  dir: string,
  depth: number = 0,
  maxDepth: number = 8
): Promise<Array<{ folderPath: string; depth: number }>> {
  if (depth > maxDepth) return [];

  const isModel = await isModelFolder(dir);
  if (isModel) {
    return [{ folderPath: dir, depth }];
  }

  let entries: import('node:fs').Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: Array<{ folderPath: string; depth: number }> = [];
  const subDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("$"));

  for (const subDir of subDirs) {
    const subPath = path.join(dir, subDir.name);
    const sub = await findModelFolders(subPath, depth + 1, maxDepth);
    results.push(...sub);
  }

  return results;
}

/**
 * Scan using fixed depth:
 *   depth=2: root/Collection/Model/  (each direct subfolder of root = collection, its subfolders = models)
 *   depth=3: root/Group/Collection/Model/  (2 levels of grouping, 3rd level = models)
 */
export async function scanLocalLibrary(
  libraryRoot: string,
  scanDepth: 2 | 3 = 2,
  onProgress?: ScanProgressCallback
): Promise<ScannedCategory[]> {
  if (!fsSync.existsSync(libraryRoot)) {
    throw new Error(`Library path does not exist: ${libraryRoot}`);
  }

  onProgress?.({
    phase: "Discovering collections",
    currentFolder: "",
    collectionsScanned: 0,
    totalCollections: 0,
    modelsFound: 0,
  });

  const collectionMap = new Map<string, { name: string; folderPath: string; models: ScannedModel[] }>();
  let modelsFound = 0;

  // Read level-1 folders (always = collections for depth=2, or groups for depth=3)
  let level1Entries: import('node:fs').Dirent<string>[];
  try {
    level1Entries = await fs.readdir(libraryRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const level1Dirs = level1Entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("$"));

  if (scanDepth === 2) {
    // 2-level: root folder itself = the single collection (named after the root folder).
    // Each DIRECT subfolder of root = one model tile.
    // Everything inside each model subfolder (files AND sub-subfolders like STLs\, Renders\)
    // is collected recursively as files belonging to that model — NOT as separate model tiles.
    const collName = path.basename(libraryRoot);
    const collPath = libraryRoot;
    collectionMap.set(collPath, { name: collName, folderPath: collPath, models: [] });

    for (const modelDir of level1Dirs) {
      const modelFolderPath = path.join(libraryRoot, modelDir.name);
      const modelName = modelDir.name;
      const relativePath = modelDir.name; // relative to libraryRoot
      onProgress?.({
        phase: `Scanning "${modelName}"`,
        currentFolder: modelName,
        collectionsScanned: 1,
        totalCollections: 1,
        modelsFound,
      });
      const files = await collectFilesInFolder(modelFolderPath, libraryRoot);
      const images = files.filter(f => f.isImage);
      collectionMap.get(collPath)!.models.push({
        localId: relativePath,
        name: modelName,
        folderPath: modelFolderPath,
        relativePath,
        rootPath: libraryRoot,
        files,
        images,
        thumbnailPath: images.length > 0 ? images[0].relativePath : null,
      });
      modelsFound++;
    }
  } else {
    // depth=3:
    //   Level 1 (libraryRoot subfolders) = the root folder itself is the library root,
    //     its direct subfolders are date/category folders → become the collection label.
    //   Level 2 (subfolders of level-1) = the actual model folders.
    //     Everything inside a model folder (including Renders/, STLs/, etc.) is collected
    //     recursively as files belonging to that model — NOT treated as separate model tiles.
    //
    // Date detection: if the level-1 folder name looks like a date (e.g. "April 2026",
    //   "2024-01"), it is still used as the collection label (it IS the meaningful grouping).
    //   The isDateFolder check was previously used to skip dates — but for this use case
    //   the date IS the collection name the user wants to see.
    for (const collDir of level1Dirs) {
      // level1Dir = date/category folder (e.g. "April 2026", "Armor")
      const collPath = path.join(libraryRoot, collDir.name);
      const collName = collDir.name; // use as-is — date or category, it's the collection label
      let modelEntries: import('node:fs').Dirent<string>[];
      try {
        modelEntries = await fs.readdir(collPath, { withFileTypes: true });
      } catch { continue; }
      const modelDirs = modelEntries.filter(e => e.isDirectory() && !e.name.startsWith("."));
      if (modelDirs.length === 0) continue;

      if (!collectionMap.has(collPath)) {
        collectionMap.set(collPath, { name: collName, folderPath: collPath, models: [] });
      }

      for (const modelDir of modelDirs) {
        // level2Dir = the actual model (e.g. "Arc Raiders Abyss Armor")
        // Collect ALL files recursively inside it (Renders/, STLs/, etc. are just files)
        const modelFolderPath = path.join(collPath, modelDir.name);
        const modelName = modelDir.name;
        const relativePath = path.relative(libraryRoot, modelFolderPath).replace(/\\/g, "/");
        onProgress?.({
          phase: `Scanning "${modelName}"`,
          currentFolder: modelName,
          collectionsScanned: collectionMap.size,
          totalCollections: level1Dirs.length,
          modelsFound,
        });
        const files = await collectFilesInFolder(modelFolderPath, libraryRoot);
        const images = files.filter(f => f.isImage);
        collectionMap.get(collPath)!.models.push({
          localId: relativePath,
          name: modelName,
          folderPath: modelFolderPath,
          relativePath,
          rootPath: libraryRoot,
          files,
          images,
          thumbnailPath: images.length > 0 ? images[0].relativePath : null,
        });
        modelsFound++;
      }
    }
  }

  onProgress?.({
    phase: "Saving to database",
    currentFolder: "",
    collectionsScanned: collectionMap.size,
    totalCollections: collectionMap.size,
    modelsFound,
  });

  const categories: ScannedCategory[] = Array.from(collectionMap.entries()).map(([, v], i) => ({
    localId: `${path.relative(libraryRoot, v.folderPath).replace(/\\/g, "/") || path.basename(libraryRoot)}_${i}`,
    name: v.name,
    folderPath: v.folderPath,
    models: v.models,
  }));

  categories.sort((a, b) => a.name.localeCompare(b.name));
  return categories;
}

/**
 * Scan multiple library root paths and merge results.
 * Models are tagged with their rootPath for offline detection.
 */
export async function scanMultipleLibraries(
  rootPaths: { path: string; scanDepth: number }[],
  onProgress?: ScanProgressCallback
): Promise<ScannedCategory[]> {
  const allCategories: ScannedCategory[] = [];
  for (const { path: rootPath, scanDepth } of rootPaths) {
    if (!fsSync.existsSync(rootPath)) {
      console.warn(`[localScanner] Skipping missing path: ${rootPath}`);
      continue;
    }
    const depth: 2 | 3 = scanDepth === 3 ? 3 : 2;
    const cats = await scanLocalLibrary(rootPath, depth, onProgress);
    // Prefix localId with a hash of rootPath to avoid collisions across different roots
    const prefix = rootPath.replace(/[^a-zA-Z0-9]/g, "_").slice(-20);
    const prefixed = cats.map(cat => ({
      ...cat,
      localId: `${prefix}::${cat.localId}`,
      models: cat.models.map(m => ({
        ...m,
        localId: `${prefix}::${m.localId}`,
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
