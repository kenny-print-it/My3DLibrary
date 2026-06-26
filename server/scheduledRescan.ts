/**
 * Scheduled rescan handler — called by the Manus Heartbeat cron system.
 *
 * The platform POSTs to /api/scheduled/rescan on the configured interval.
 * This handler authenticates the cron caller, then runs the same Drive scan
 * logic used by the manual Scan button.
 *
 * Per periodic-updates.md:
 *  - Path MUST start with /api/scheduled/
 *  - Authenticate via sdk.authenticateRequest; check user.isCron === true
 *  - Wrap in try/catch and return JSON-encoded error on 500
 *  - Handler must be idempotent (platform retries on 5xx)
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { scanDrive } from "./driveScanner";
import * as db from "./db";

const DEFAULT_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || "";
const DEFAULT_FOLDER_ID = "1sQRvAn0PbrvaKoJ8hqlqBBGhCLXhLXiZ";

async function getApiKey(): Promise<string> {
  const stored = await db.getSetting("drive_api_key");
  return stored || DEFAULT_API_KEY;
}

async function getFolderId(): Promise<string> {
  const stored = await db.getSetting("drive_folder_id");
  return stored || DEFAULT_FOLDER_ID;
}

export async function scheduledRescanHandler(req: Request, res: Response) {
  try {
    // Authenticate — only cron callers are allowed
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const apiKey = await getApiKey();
    const folderId = await getFolderId();

    const log = await db.createScanLog();
    const logId = log?.id;

    try {
      const result = await scanDrive(apiKey, folderId);

      // Upsert categories (Level-1 collection folders)
      for (const cat of result.categories) {
        await db.upsertCategory(cat);
      }

      const allCats = await db.getAllCategories();
      const catByName = new Map(allCats.map((c) => [c.name, c]));

      // Upsert models (Level-2 model folders)
      for (const model of result.models) {
        const pathParts = model.path.split(" / ");
        const collectionName = pathParts[1];
        const matchedCat = allCats.find(
          (c) => c.name === collectionName && c.parentDriveId === folderId
        );
        await db.upsertModel({
          driveId: model.driveId,
          name: model.name,
          categoryId: matchedCat?.id ?? null,
          path: model.path,
          images: model.images,
          modelFiles: model.modelFiles,
          thumbnailUrl: model.thumbnailUrl,
        });
      }

      if (logId) {
        await db.updateScanLog(logId, {
          status: "completed",
          modelsFound: result.models.length,
          categoriesFound: result.categories.length,
          completedAt: new Date(),
        });
      }

      return res.json({
        ok: true,
        modelsFound: result.models.length,
        categoriesFound: result.categories.length,
      });
    } catch (scanErr: any) {
      if (logId) {
        await db.updateScanLog(logId, {
          status: "failed",
          errorMessage: scanErr?.message || "Unknown scan error",
          completedAt: new Date(),
        });
      }
      throw scanErr;
    }
  } catch (err: any) {
    console.error("[scheduledRescan] Error:", err);
    return res.status(500).json({
      error: err?.message || "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
