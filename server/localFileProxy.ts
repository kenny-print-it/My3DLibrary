/**
 * Local file proxy — serves files directly from the library folder on disk.
 * Replaces the Google Drive image proxy used in the Online version.
 * URL pattern: /local-files/<relative-path-from-library-root>
 */
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { getSetting } from "./db";

export async function localFileHandler(req: Request, res: Response) {
  try {
    const libraryPath = await getSetting("library_path");
    if (!libraryPath) {
      res.status(503).json({ error: "Library path not configured" });
      return;
    }

    // Extract the relative path from the URL (strip /local-files/ prefix)
    const urlPath = req.path.replace(/^\/local-files\//, "");
    const decodedPath = decodeURIComponent(urlPath);

    // Security: prevent path traversal
    const resolvedPath = path.resolve(libraryPath, decodedPath);
    if (!resolvedPath.startsWith(path.resolve(libraryPath))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      res.status(400).json({ error: "Path is a directory" });
      return;
    }

    // Set appropriate cache headers (1 hour — files on local disk don't expire)
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error("[LocalFileProxy] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
