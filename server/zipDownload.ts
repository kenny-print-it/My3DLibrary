import type { Request, Response } from "express";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver") as (format: string, opts?: object) => import("archiver").Archiver;
import path from "path";
import fs from "fs";
import { getDb, getSetting } from "./db";
import { models } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { authenticateRequest } from "./_core/auth";

/**
 * GET /api/download/zip/:modelId
 * Streams all model files from the local library folder as a .zip archive.
 * Requires the user to be authenticated.
 */
export async function zipDownloadHandler(req: Request, res: Response) {
  try {
    // --- Auth check ---
    const user = await authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const modelId = parseInt(req.params.modelId, 10);
    if (isNaN(modelId)) {
      res.status(400).json({ error: "Invalid model ID" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }

    const libraryPath = await getSetting("library_path");
    if (!libraryPath) {
      res.status(503).json({ error: "Library path not configured" });
      return;
    }

    // model.driveId is the relative path from library root: "CollectionName/ModelName"
    const modelFolderPath = path.join(libraryPath, model.driveId);
    if (!fs.existsSync(modelFolderPath)) {
      res.status(404).json({ error: "Model folder not found on disk" });
      return;
    }

    const safeName = model.name.replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err: Error) => {
      console.error("[ZIP] Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Archive failed" });
    });

    archive.pipe(res);

    // Add all files in the model folder (non-recursive — just the top level)
    const entries = fs.readdirSync(modelFolderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(modelFolderPath, entry.name);
      archive.file(filePath, { name: entry.name });
    }

    await archive.finalize();
  } catch (err) {
    console.error("[ZIP] Unexpected error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
}
