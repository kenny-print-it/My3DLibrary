import type { Request, Response } from "express";
import { ZipArchive } from "archiver";
import { getDb, getSetting, getAccessRequestByOpenId } from "./db";
import { models } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

/**
 * GET /api/download/zip/:modelId
 * Streams all files in the model's Drive folder as a .zip archive.
 * Requires the user to be authenticated (checked via session cookie in context).
 */
export async function zipDownloadHandler(req: Request, res: Response) {
  try {
    // --- Auth check: require a valid session ---
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // --- Allowlist check: must be approved or owner ---
    const isOwner = user.openId === ENV.ownerOpenId;
    if (!isOwner) {
      const accessRecord = await getAccessRequestByOpenId(user.openId);
      if (!accessRecord || accessRecord.status !== "approved") {
        res.status(403).json({ error: "Access not approved" });
        return;
      }
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

    // Fetch the model
    const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }

    const apiKey = await getSetting("drive_api_key");
    if (!apiKey) {
      res.status(503).json({ error: "Google Drive API key not configured" });
      return;
    }

    // Use the modelFiles JSON column
    const files: Array<{ id: string; name: string; mimeType: string; size?: number }> =
      Array.isArray(model.modelFiles) ? (model.modelFiles as any[]) : [];

    if (files.length === 0) {
      res.status(404).json({ error: "No files found for this model" });
      return;
    }

    const safeName = model.name.replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 5 } });
    archive.on("error", (err: Error) => {
      console.error("[ZIP] Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Archive failed" });
    });

    archive.pipe(res);

    // Download each file from Drive and append to the archive
    for (const file of files) {
      // Skip Google Docs native types (they can't be downloaded as-is)
      if (file.mimeType.startsWith("application/vnd.google-apps.")) continue;

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
      try {
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) {
          console.warn(`[ZIP] Skipping ${file.name}: HTTP ${fileRes.status}`);
          continue;
        }
        const buffer = Buffer.from(await fileRes.arrayBuffer());
        archive.append(buffer, { name: file.name });
      } catch (err) {
        console.warn(`[ZIP] Failed to fetch ${file.name}:`, err);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("[ZIP] Unexpected error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
}
