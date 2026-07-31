/**
 * autoTagger.ts — Dual-model AI auto-tagging
 *
 * Pass 1 (Text): Fast text model (llama3.2 or llmTextModel) analyses the model
 *   name + file list and returns matching tags from the library.
 * Pass 2 (Vision): Vision model (llava or llmVisionModel) looks at the hero image
 *   and suggests additional tags based on what it sees.
 *
 * Results are merged and applied. Models with locked tags are skipped.
 */

import { invokeLLM, listLLMModels, isLLMConfigured } from "./_core/llm";
import * as db from "./db";
import { ENV } from "./_core/env";
import fs from "fs";
import path from "path";

// ── File logger ───────────────────────────────────────────────────────────────

function getLogPath(): string {
  return path.join(ENV.dataDir, "autotag.log");
}

function tagLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(getLogPath(), line);
  } catch { /* ignore write errors */ }
}

export function getAutoTagLogPath(): string {
  return getLogPath();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveTextModel(): string {
  return ENV.llmTextModel?.trim() || ENV.llmModel?.trim() || "llama3.2";
}

function resolveVisionModel(): string {
  return ENV.llmVisionModel?.trim() || ENV.llmModel?.trim() || "llava";
}

async function isModelAvailable(modelName: string): Promise<boolean> {
  if (!isLLMConfigured()) return false;
  try {
    const { data: models } = await listLLMModels();
    const name = modelName.toLowerCase();
    return models.some((m) => {
      const id = m.id.toLowerCase();
      return id === name || id.startsWith(name + ":") || id.startsWith(name);
    });
  } catch {
    return false;
  }
}

function imageToBase64(imagePath: string): string | null {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    };
    const mime = mimeMap[ext] || "image/jpeg";
    const data = fs.readFileSync(imagePath);
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

function extractTagsFromResponse(raw: string, availableTags: { id: number; name: string }[]): number[] {
  let tagNames: string[] = [];
  try {
    const direct = JSON.parse(raw.trim());
    if (Array.isArray(direct)) tagNames = direct;
    else if (Array.isArray(direct?.tags)) tagNames = direct.tags;
  } catch {
    const arrMatch = raw.match(/\[[^\]]*\]/);
    if (arrMatch) {
      try { tagNames = JSON.parse(arrMatch[0]); } catch { /* ignore */ }
    }
  }
  const selectedNames = new Set(
    tagNames.filter((n): n is string => typeof n === "string").map((n) => n.toLowerCase().trim())
  );
  return availableTags.filter((t) => selectedNames.has(t.name.toLowerCase().trim())).map((t) => t.id);
}

// ── Progress tracking ────────────────────────────────────────────────────────

export interface AutoTagProgress {
  inProgress: boolean;
  total: number;
  processed: number;
  tagged: number;
  errors: number;
  currentModel: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  lastResult: {
    processed: number;
    tagged: number;
    skipped: number;
    errors: number;
    ranAt: number;
  } | null;
}

const _progress: AutoTagProgress = {
  inProgress: false,
  total: 0,
  processed: 0,
  tagged: 0,
  errors: 0,
  currentModel: null,
  startedAt: null,
  finishedAt: null,
  lastResult: null,
};

let _cancelRequested = false;

export function getAutoTagProgress(): AutoTagProgress {
  return { ..._progress };
}

export function stopAutoTag(): void {
  if (_progress.inProgress) {
    _cancelRequested = true;
    tagLog("=== STOP requested by user");
  }
}

// ── Single model tagging ─────────────────────────────────────────────────────

export async function autoTagModel(
  modelId: number,
  modelName: string,
  fileNames: string[],
  availableTags: { id: number; name: string }[],
  heroImagePath?: string
): Promise<number[]> {
  if (availableTags.length === 0) return [];

  const tagList = availableTags.map((t) => t.name).join(", ");
  const filesSnippet = fileNames.length > 0
    ? `\nFiles in this model folder: ${fileNames.slice(0, 20).join(", ")}${fileNames.length > 20 ? ` … (${fileNames.length} total)` : ""}`
    : "";

  const textModel = resolveTextModel();
  const visionModel = resolveVisionModel();
  const useVision = visionModel !== textModel && !!heroImagePath;

  const matchedIdSets: Set<number> = new Set();

  // ── Pass 1: Text model ──────────────────────────────────────────────────
  const textPrompt = `You are a strict tag classifier for a 3D printing model library.

Available tags: ${tagList}

Model name: "${modelName}"${filesSnippet}

Return a JSON array of tag names from the available list that clearly and specifically describe this model.
Rules:
- Only use tags from the available list — never invent new ones.
- Be GENEROUS: if the model name or files contain a clear reference to a tag, include it.
- A tag for a franchise (e.g. "Pokemon") should be applied if the model name or files mention that franchise.
- Return at most 5 tags.
- Return ONLY the JSON array, no explanation.`;

  tagLog(`TEXT  "${modelName}" → model=${textModel}, tags available: ${availableTags.length}`);
  try {
    const response = await invokeLLM({
      model: textModel,
      messages: [{ role: "user", content: textPrompt }],
    });
    const raw = response?.choices?.[0]?.message?.content as string | undefined;
    tagLog(`TEXT  "${modelName}" raw response: ${raw?.slice(0, 200) ?? "(empty)"}`);
    if (raw) {
      const ids = extractTagsFromResponse(raw, availableTags);
      const names = ids.map(id => availableTags.find(t => t.id === id)?.name).filter(Boolean);
      tagLog(`TEXT  "${modelName}" matched tags: [${names.join(", ") || "none"}]`);
      for (const id of ids) matchedIdSets.add(id);
    }
  } catch (err) {
    tagLog(`TEXT  "${modelName}" ERROR: ${err}`);
  }

  // ── Pass 2: Vision model ────────────────────────────────────────────────
  if (useVision && heroImagePath) {
    // Resolve hero image to absolute path
    let fullPath = heroImagePath;
    if (heroImagePath.startsWith("/local-files/")) {
      fullPath = heroImagePath.replace("/local-files/", "");
    }
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(ENV.dataDir, fullPath);
    }

    if (fs.existsSync(fullPath)) {
      const base64 = imageToBase64(fullPath);
      if (base64) {
        const visionPrompt = `You are a 3D model library assistant. Look at this 3D model render image and assign tags.

Available tags (ONLY use tags from this exact list):
${tagList}

Instructions:
- Look at the image and identify what character, franchise, category, or theme this model belongs to
- Return ONLY tags from the available list — do not invent new tags
- Return a JSON array of matching tag names, e.g. ["Digimon", "Anime"]
- If nothing matches, return []
- Do NOT include explanations, only the JSON array`;

        tagLog(`VISION "${modelName}" → model=${visionModel}, image=${fullPath}`);
        try {
          const response = await invokeLLM({
            model: visionModel,
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: base64 } },
                { type: "text", text: visionPrompt },
              ],
            }],
          });
          const raw = response?.choices?.[0]?.message?.content as string | undefined;
          tagLog(`VISION "${modelName}" raw response: ${raw?.slice(0, 200) ?? "(empty)"}`);
          if (raw) {
            const ids = extractTagsFromResponse(raw, availableTags);
            const names = ids.map(id => availableTags.find(t => t.id === id)?.name).filter(Boolean);
            tagLog(`VISION "${modelName}" matched tags: [${names.join(", ") || "none"}]`);
            for (const id of ids) matchedIdSets.add(id);
          }
        } catch (err) {
          tagLog(`VISION "${modelName}" ERROR: ${err}`);
        }
      }
    }
  }

  const matchedIds = Array.from(matchedIdSets);

  // Apply tags (addTagToModel is idempotent; skipLock=true so auto-tagging never locks)
  for (const tagId of matchedIds) {
    await db.addTagToModel(modelId, tagId, true);
  }

  return matchedIds;
}

// ── Bulk tagging ─────────────────────────────────────────────────────────────

export async function autoTagAllModels(forceAll = false): Promise<{
  processed: number;
  tagged: number;
  skipped: number;
  errors: number;
}> {
  const textModel = resolveTextModel();
  const visionModel = resolveVisionModel();

  // Pre-flight: verify text model is available
  const textAvailable = await isModelAvailable(textModel);
  if (!textAvailable) {
    console.warn(`[AutoTagger] Text model "${textModel}" not available in Ollama. Skipping.`);
    return { processed: 0, tagged: 0, skipped: 0, errors: 0 };
  }

  const useVision = visionModel !== textModel;
  if (useVision) {
    const visionAvailable = await isModelAvailable(visionModel);
    if (!visionAvailable) {
      console.warn(`[AutoTagger] Vision model "${visionModel}" not found — will use text-only tagging.`);
    }
  }

  const allTags = await db.getAllTags();
  if (allTags.length === 0) {
    console.log("[AutoTagger] No tags in library — skipping.");
    return { processed: 0, tagged: 0, skipped: 0, errors: 0 };
  }

  const allModels = await db.getAllModels();
  const toProcess = forceAll
    ? allModels
    : allModels.filter((m) => !(m as any).tagsLockedAt);

  let processed = 0;
  let tagged = 0;
  const skipped = allModels.length - toProcess.length;
  let errors = 0;

  _cancelRequested = false;
  Object.assign(_progress, {
    inProgress: true,
    total: toProcess.length,
    processed: 0,
    tagged: 0,
    errors: 0,
    currentModel: null,
    startedAt: Date.now(),
    finishedAt: null,
  });

  tagLog(
    `=== START dual-model tagging: ${toProcess.length} models, ` +
    `text=${textModel}, vision=${useVision ? visionModel : "(same as text — vision pass SKIPPED)"}, ` +
    (forceAll ? "force re-tag all" : `${skipped} locked — skipping`)
  );

  for (const model of toProcess) {
    if (_cancelRequested) {
      tagLog(`=== CANCELLED after ${processed} models (${toProcess.length - processed} remaining)`);
      break;
    }
    _progress.currentModel = model.name;
    try {
      const fileNames = Array.isArray(model.modelFiles)
        ? (model.modelFiles as any[]).map((f: any) => f.name as string).filter(Boolean)
        : [];

      const heroImagePath = (model as any).thumbnailPath ?? undefined;
      const matchedIds = await autoTagModel(model.id, model.name, fileNames, allTags, heroImagePath);
      processed++;
      _progress.processed = processed;
      if (matchedIds.length > 0) {
        tagged++;
        _progress.tagged = tagged;
      }
    } catch {
      errors++;
      _progress.errors = errors;
    }
  }

  const result = { processed, tagged, skipped, errors, ranAt: Date.now() };
  Object.assign(_progress, {
    inProgress: false,
    currentModel: null,
    finishedAt: Date.now(),
    lastResult: result,
  });

  tagLog(`=== DONE. Processed: ${processed}, tagged: ${tagged}, skipped (locked): ${skipped}, errors: ${errors}`);
  console.log(
    `[AutoTagger] Done. Processed: ${processed}, tagged: ${tagged}, skipped (locked): ${skipped}, errors: ${errors}`
  );
  return result;
}
