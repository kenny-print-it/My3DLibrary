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

import { invokeLLM, listLLMModels, isLLMConfigured } from "./_core/llm";
import * as db from "./db";
import type { DriveImage } from "../drizzle/schema";
import { ENV } from "./_core/env";
import fs from "fs";
import path from "path";

/**
 * Check that the configured model is actually available in Ollama.
 * Returns true if the model is ready, false with a console warning if not.
 */
async function isModelAvailable(): Promise<boolean> {
  if (!isLLMConfigured()) {
    console.warn("[ThumbnailPicker] LLM not configured — skipping.");
    return false;
  }
  try {
    const { data: models } = await listLLMModels();
    const modelName = ENV.llmModel?.toLowerCase() ?? "";
    const found = models.some(
      (m) => m.id.toLowerCase() === modelName || m.id.toLowerCase().startsWith(modelName)
    );
    if (!found) {
      console.warn(
        `[ThumbnailPicker] Model '${ENV.llmModel}' not found in Ollama. ` +
        `Run Download-AI-Model.bat first, then restart. Available: ${models.map(m => m.id).join(", ") || "(none)"}`
      );
    }
    return found;
  } catch (err) {
    console.warn("[ThumbnailPicker] Could not reach LLM to check model availability:", err);
    return false;
  }
}

/**
 * Convert a local image file to a base64 data URI.
 * Ollama (and most local LLMs) cannot fetch relative server URLs,
 * so we must inline the image bytes as a data URI.
 * Returns null if the file cannot be read.
 */
// Max file size to inline as base64 (1.5 MB). Larger files are skipped to avoid
// Ollama 413 "Request Entity Too Large" errors.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

async function toBase64DataUri(img: DriveImage & { absPath?: string }): Promise<string | null> {
  // Local file: use absPath if available
  if ((img as any).absPath) {
    try {
      const absPath = (img as any).absPath as string;
      const stat = fs.statSync(absPath);
      if (stat.size > MAX_IMAGE_BYTES) return null; // skip oversized images
      const buf = fs.readFileSync(absPath);
      const mime = img.mimeType || "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }
  // Remote URL (Google Drive etc.) — pass through as-is
  return img.thumbnailLink || null;
}

/**
 * Determine the hero image URL to store for a chosen candidate.
 * For local files, use thumbnailLink (/local-files/...) directly.
 * For Drive files, use the proxy URL.
 */
function heroUrlForImage(img: DriveImage & { absPath?: string }): string {
  if ((img as any).absPath) {
    // Local file — thumbnailLink is already a valid server-relative URL
    return img.thumbnailLink;
  }
  // Google Drive file — use proxy
  return `/api/drive-image/${img.id}`;
}

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
    const heroUrl = heroUrlForImage(images[0] as any);
    await db.updateModelHeroImage(modelId, heroUrl, "ai");
    return heroUrl;
  }

  // Build vision message: send up to 3 thumbnails to stay within Ollama's context limit.
  // LLaVA has a small context window; sending more than 3 images risks 413 errors.
  const candidates = images.slice(0, 3);

  // Convert images to base64 data URIs for local files (Ollama can't fetch
  // relative server URLs like /local-files/...). Remote URLs pass through.
  const imageUrls = await Promise.all(
    candidates.map((img) => toBase64DataUri(img as any))
  );
  // Filter out any images that failed to load
  const validPairs = candidates
    .map((img, i) => ({ img, url: imageUrls[i] }))
    .filter((p) => p.url !== null);

  if (validPairs.length === 0) return null;

  const imageContents = validPairs.map(({ url }) => ({
    type: "image_url" as const,
    image_url: { url: url!, detail: "low" as const },
  }));

  const textContent = {
    type: "text" as const,
    // Use validPairs.length (not candidates.length) so the index range matches what was actually sent
    text: `You are selecting the best hero image for a 3D printing model card.

Model name: "${modelName}"

You are shown ${validPairs.length} images (numbered 1 to ${validPairs.length}) from this model's folder.

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
      // Note: response_format json_schema is NOT supported by Ollama/LLaVA.
      // We ask the model to respond with JSON in the prompt and extract it below.
    });

    const raw = response?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) return null;

    // Extract JSON from the response — the model may wrap it in markdown code fences
    let parsed: { index: number };
    try {
      // Try direct parse first
      parsed = JSON.parse(raw.trim());
    } catch {
      // Try extracting JSON object from the text (handles ```json ... ``` wrappers)
      const match = raw.match(/\{[^}]*"index"\s*:\s*(\d+)[^}]*\}/);
      if (!match) return null;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }

    const idx = parsed.index - 1; // convert to 0-based
    if (idx < 0 || idx >= validPairs.length) {
      // LLM returned out-of-range index — fall back to first valid image
      const fallback = validPairs[0]?.img;
      if (!fallback) return null;
      const heroUrl = heroUrlForImage(fallback as any);
      await db.updateModelHeroImage(modelId, heroUrl, "ai");
      return heroUrl;
    }

    // Store the hero URL — use thumbnailLink for local files, proxy for Drive
    const chosenImg = validPairs[idx]?.img;
    if (!chosenImg) return null;
    const heroUrl = heroUrlForImage(chosenImg as any);
    await db.updateModelHeroImage(modelId, heroUrl, "ai");
    return heroUrl;
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
  // Pre-flight: verify the model is actually available before processing 100+ models
  const modelReady = await isModelAvailable();
  if (!modelReady) {
    const empty: ThumbnailPickProgress = {
      running: false, total: 0, processed: 0, updated: 0,
      skipped: 0, errors: 0, startedAt: Date.now(), finishedAt: Date.now(),
    };
    _progress = empty;
    return empty;
  }

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
