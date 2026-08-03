/**
 * 3mfThumbnail.ts
 *
 * Extracts embedded thumbnail images from .3mf files.
 * 3MF files are ZIP archives. Most contain a thumbnail at one of these paths:
 *   - Metadata/thumbnail.png
 *   - Metadata/thumbnail.jpg
 *   - /Metadata/thumbnail.png
 *   - thumbnail.png  (root level)
 *   - .rels → look for Thumbnail relationship type
 *
 * Returns the extracted image as a Buffer with its mime type,
 * or null if no thumbnail is found.
 */

import yauzl from "yauzl";
import path from "path";
import fs from "fs";

const THUMBNAIL_CANDIDATES = [
  "Metadata/thumbnail.png",
  "Metadata/thumbnail.jpg",
  "Metadata/thumbnail.jpeg",
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.jpeg",
];

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export interface ExtractedThumbnail {
  buffer: Buffer;
  mimeType: string;
  ext: string;
}

/**
 * Extract a thumbnail from a .3mf file.
 * Returns null if no thumbnail is found or extraction fails.
 */
export async function extract3mfThumbnail(filePath: string): Promise<ExtractedThumbnail | null> {
  if (!fs.existsSync(filePath)) return null;

  return new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return resolve(null);

      const entries: { name: string; entry: yauzl.Entry }[] = [];

      zipfile.readEntry();
      zipfile.on("entry", (entry: yauzl.Entry) => {
        const normalizedName = entry.fileName.replace(/\\/g, "/").replace(/^\//, "");
        const ext = path.extname(normalizedName).toLowerCase();

        // Collect all image entries
        if (IMAGE_EXTS.has(ext)) {
          entries.push({ name: normalizedName, entry });
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        if (entries.length === 0) return resolve(null);

        // Prioritize known thumbnail paths
        let best = entries.find(e =>
          THUMBNAIL_CANDIDATES.some(c => e.name.toLowerCase() === c.toLowerCase())
        );

        // Fall back to any image entry
        if (!best) best = entries[0];
        if (!best) return resolve(null);

        // Extract the chosen entry
        zipfile.openReadStream(best.entry, (streamErr, readStream) => {
          if (streamErr || !readStream) return resolve(null);

          const chunks: Buffer[] = [];
          readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
          readStream.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const ext = path.extname(best!.name).toLowerCase();
            const mimeType = ext === ".png" ? "image/png"
              : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
              : ext === ".gif" ? "image/gif"
              : ext === ".webp" ? "image/webp"
              : "image/png";
            resolve({ buffer, mimeType, ext });
          });
          readStream.on("error", () => resolve(null));
        });
      });

      zipfile.on("error", () => resolve(null));
    });
  });
}

/**
 * Save an extracted thumbnail to disk next to the .3mf file.
 * Returns the saved file path, or null on failure.
 */
export async function save3mfThumbnail(
  threemfPath: string,
  thumbnail: ExtractedThumbnail
): Promise<string | null> {
  try {
    const dir = path.dirname(threemfPath);
    const base = path.basename(threemfPath, ".3mf");
    const outPath = path.join(dir, `${base}_thumbnail${thumbnail.ext}`);
    await fs.promises.writeFile(outPath, thumbnail.buffer);
    return outPath;
  } catch {
    return null;
  }
}
