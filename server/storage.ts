/**
 * Local filesystem storage — replaces the Manus S3/Forge storage layer.
 * Files are stored under DATA_DIR/storage/ and served via /local-storage/*.
 */
import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

const STORAGE_DIR = path.resolve(ENV.dataDir, "storage");

async function ensureStorageDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType?: string
): Promise<{ key: string; url: string }> {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, relKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { key: relKey, url: `/local-storage/${relKey}` };
}

export async function storageGet(
  relKey: string,
  _expiresIn?: number
): Promise<{ key: string; url: string }> {
  return { key: relKey, url: `/local-storage/${relKey}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return `/local-storage/${relKey}`;
}

export function storageAbsPath(relKey: string): string {
  return path.join(STORAGE_DIR, relKey);
}

export { STORAGE_DIR };
