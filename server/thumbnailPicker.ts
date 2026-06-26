/**
 * thumbnailPicker.ts
 *
 * Vision LLM-powered best thumbnail selector for 3D model library.
 * Given a model's image list, sends thumbnails to the vision LLM and asks it
 * to pick the single best photo showing the complete, assembled model.
 *
 * The chosen image is stored as heroImage (via proxy URL) with source="ai".
 * Models with heroImageSource="manual" are ALWAYS skipped — even in forceAll mode.
 *
 * Usage:
 *   - Called automatically after each Drive scan (after auto-tagging)
 *   - Called manually via the "Re-pick Thumbnails" admin procedure (forceAll=true)
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import type { DriveImage } from "../drizzle/schema";

// ─── Progress tracking (in-memory, server-side) ──────────────────────────────

export interface ThumbnailPickProgress {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  startedAt: number | null;
  finishedAt: number | null;
}

let _progress: ThumbnailPickProgress = {
  running: false,
  total: 0,
  processed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  finishedAt: null,
};

export function getThumbnailPickProgress(): ThumbnailPickProgress {
  return { ..._progress };
}

// ─── Single-model picker ─────────────────────────────────────────────────────

/**
 * Pick the best thumbnail for a single model.
 * Stores the chosen image as heroImage with source="ai".
 * Returns the proxy URL, or null if no images / LLM fails.
 */
export async function pickBestThumbnail(
  modelId: number,
  modelName: string,
  images: DriveImage[]
): Promise<string | null> {
  if (!images || images.length === 0) return null;

  // Only one image — trivially the best
  if (images.length === 1) {
    const proxyUrl = `/api/drive-image/${images[0].id}`;
    await db.updateModelHeroImage(modelId, proxyUrl, "ai");
    return proxyUrl;
  }

  // Build vision message: send up to 8 thumbnails to keep token cost low
  const candidates = images.slice(0, 8);
  const imageContents = candidates.map((img) => ({
    type: "image_url" as const,
    image_url: { url: img.thumbnailLink, detail: "low" as const },
  }));

  const textContent = {
    type: "text" as const,
    text: `You are selecting the best hero image for a 3D printing model card.

Model name: "${modelName}"

You are shown ${candidates.length} images (numbered 1 to ${candidates.length}) from this model's folder.

Pick the SINGLE best image that:
- Shows the COMPLETE, fully assembled model
- Has a clear, unobstructed view of the whole object
- Is NOT a partial part, work-in-progress, assembly step, or multi-pose sheet
- Ideally has a clean/neutral background

Respond with ONLY a JSON object like: {"index": 2}
where the number is the 1-based position of the best image.`,
  };

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [textContent, ...imageContents],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "thumbnail_pick",
          strict: true,
          schema: {
            type: "object",
            properties: {
              index: { type: "integer" },
            },
            required: ["index"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) return null;

    let parsed: { index: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    const idx = parsed.index - 1; // convert to 0-based
    if (idx < 0 || idx >= candidates.length) return null;

    // Store as proxy URL so it never expires
    const proxyUrl = `/api/drive-image/${candidates[idx].id}`;
    await db.updateModelHeroImage(modelId, proxyUrl, "ai");
    return proxyUrl;
  } catch (err) {
    console.warn(`[ThumbnailPicker] Failed for model ${modelId} (${modelName}):`, err);
    return null;
  }
}

/**
 * Pick the best thumbnail for a single model by ID.
 * Skips if heroImageSource is "manual" (owner override preserved).
 * Accepts pre-fetched images array to avoid a second DB round-trip.
 */
export async function pickThumbnailForModel(
  modelId: number,
  images: DriveImage[]
): Promise<string | null> {
  const model = await db.getModelById(modelId);
  if (!model) return null;
  // Never overwrite a manually-selected hero image
  if (model.heroImageSource === "manual") return model.heroImage ?? null;
  return pickBestThumbnail(modelId, model.name, images);
}

// ─── Bulk picker ─────────────────────────────────────────────────────────────

/**
 * Pick best thumbnails for all eligible models.
 *
 * Skipping rules:
 *  - heroImageSource="manual" → ALWAYS skipped (owner override, never touched)
 *  - heroImageSource="ai" or heroImage=null → eligible for re-pick
 *  - forceAll=false (auto-scan): only process models with no heroImage at all
 *  - forceAll=true (manual Re-pick All): re-evaluate all AI-picked + unset models
 */
export async function pickThumbnailsForAllModels(forceAll = false): Promise<ThumbnailPickProgress> {
  const allModels = await db.getAllModels();

  // Always skip manually-set hero images
  const eligible = allModels.filter((m: any) => m.heroImageSource !== "manual");

  const toProcess = forceAll
    ? eligible
    : eligible.filter((m: any) => !m.heroImage);

  const manuallySkipped = allModels.length - eligible.length;

  _progress = {
    running: true,
    total: toProcess.length,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    startedAt: Date.now(),
    finishedAt: null,
  };

  console.log(
    `[ThumbnailPicker] Starting thumbnail pick for ${toProcess.length} models` +
    (forceAll ? " (force re-pick AI+unset)" : ` (${allModels.length - toProcess.length} already have hero image — skipping)`) +
    (manuallySkipped > 0 ? ` | ${manuallySkipped} manual picks always preserved` : "") +
    "…"
  );

  for (const model of toProcess) {
    try {
      const images = Array.isArray(model.images) ? (model.images as DriveImage[]) : [];
      if (images.length === 0) {
        _progress.skipped++;
        _progress.processed++;
        continue;
      }
      const result = await pickBestThumbnail(model.id, model.name, images);
      _progress.processed++;
      if (result) _progress.updated++;
    } catch {
      _progress.errors++;
      _progress.processed++;
    }
  }

  _progress.running = false;
  _progress.finishedAt = Date.now();

  console.log(
    `[ThumbnailPicker] Done. Processed: ${_progress.processed}, updated: ${_progress.updated}, ` +
    `skipped (no images): ${_progress.skipped}, errors: ${_progress.errors}, manual preserved: ${manuallySkipped}`
  );
  return { ..._progress };
}
