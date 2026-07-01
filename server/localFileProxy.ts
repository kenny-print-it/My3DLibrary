/**
 * Local file proxy — serves files directly from the library folder(s) on disk.
 * Replaces the Google Drive image proxy used in the Online version.
 *
 * URL pattern: /local-files/<relative-path-from-a-library-root>
 *
 * The relative path stored in the DB is relative to the library root it came from.
 * We try each enabled library root in order until we find the file.
 */
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { getEnabledLibraryPaths } from "./db";

export async function localFileHandler(req: Request, res: Response) {
  try {
    const libraryRoots = await getEnabledLibraryPaths();
    if (!libraryRoots || libraryRoots.length === 0) {
      res.status(503).json({ error: "No library paths configured" });
      return;
    }

    // Extract the relative path from the URL (strip /local-files/ prefix)
    // req.params[0] captures everything after /local-files/
    const rawParam = (req.params as any)[0] ?? req.path.replace(/^\/local-files\//, "");
    const decodedPath = decodeURIComponent(rawParam).replace(/\\/g, "/");

    // Try each library root until we find the file
    for (const { path: libraryPath } of libraryRoots) {
      // Security: prevent path traversal
      const resolvedPath = path.resolve(libraryPath, decodedPath);
      const resolvedRoot = path.resolve(libraryPath);
      if (!resolvedPath.startsWith(resolvedRoot)) {
        continue; // skip this root, try next
      }

      if (!fs.existsSync(resolvedPath)) {
        continue; // not in this root, try next
      }

      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        continue; // skip directories
      }

      // Found it — serve with cache headers
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.sendFile(resolvedPath);
      return;
    }

    // Not found in any library root
    res.status(404).json({ error: "File not found in any configured library folder" });
  } catch (error) {
    console.error("[LocalFileProxy] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
