/**
 * autoTagger.ts
 *
 * LLM-powered auto-tagger for 3D model library.
 * Given a model's name and its file list, asks the LLM to pick the best
 * matching tags from the existing tag library and applies them.
 *
 * Usage:
 *   - Called automatically after each Drive scan (for all models)
 *   - Called manually via the "Re-tag All" admin procedure
 */

import { invokeLLM, listLLMModels, isLLMConfigured } from "./_core/llm";
import * as db from "./db";
import { ENV } from "./_core/env";

async function isModelAvailable(): Promise<boolean> {
  if (!isLLMConfigured()) return false;
  try {
    const { data: models } = await listLLMModels();
    const modelName = ENV.llmModel?.toLowerCase() ?? "";
    return models.some(
      (m) => m.id.toLowerCase() === modelName || m.id.toLowerCase().startsWith(modelName)
    );
  } catch {
    return false;
  }
}

/** Tag a single model by its DB id. Returns the tag ids applied. */
export async function autoTagModel(
  modelId: number,
  modelName: string,
  fileNames: string[],
  availableTags: { id: number; name: string }[]
): Promise<number[]> {
  if (availableTags.length === 0) return [];

  const tagList = availableTags.map((t) => t.name).join(", ");
  const filesSnippet =
    fileNames.length > 0
      ? `\nFiles in this model folder: ${fileNames.slice(0, 20).join(", ")}${fileNames.length > 20 ? ` … (${fileNames.length} total)` : ""}`
      : "";

  const prompt = `You are a strict tag classifier for a 3D printing model library.

Available tags: ${tagList}

Model name: "${modelName}"${filesSnippet}

Return a JSON array of tag names from the available list that clearly and specifically describe this model.
Rules:
- Only use tags from the available list — never invent new ones.
- Return an empty array [] if you are not confident a tag applies.
- Be CONSERVATIVE: only apply a tag if the model name or files contain a clear, direct reference to that tag. Do NOT guess or infer loosely.
- A tag for a franchise (e.g. "Pokemon") should ONLY be applied if the model name or files explicitly mention that franchise by name.
- Do NOT apply a tag just because the model is a creature, character, or could vaguely belong to a category.
- Return at most 4 tags.
- Return ONLY the JSON array, no explanation.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      // Note: response_format json_schema is NOT supported by Ollama/LLaVA.
      // We ask the model to respond with JSON in the prompt and extract it below.
    });

    const raw = response?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) return [];

    // Extract JSON from the response — the model may wrap it in markdown code fences
    // or return a plain array instead of {tags:[...]}
    let tagNames: string[] = [];
    try {
      const direct = JSON.parse(raw.trim());
      if (Array.isArray(direct)) {
        tagNames = direct;
      } else if (Array.isArray(direct?.tags)) {
        tagNames = direct.tags;
      }
    } catch {
      // Try extracting a JSON array from the text
      const arrMatch = raw.match(/\[[^\]]*\]/);
      if (arrMatch) {
        try { tagNames = JSON.parse(arrMatch[0]); } catch { /* ignore */ }
      }
    }

    // Guard: LLM may return non-string values (numbers, nulls, objects) — filter them out
    const selectedNames = new Set(
      tagNames
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.toLowerCase().trim())
    );

    const matchedIds = availableTags
      .filter((t) => selectedNames.has(t.name.toLowerCase().trim()))
      .map((t) => t.id);

    // Apply tags to the model (addTagToModel is idempotent)
    // skipLock=true so auto-tagging never sets tagsLockedAt — only manual edits lock
    for (const tagId of matchedIds) {
      await db.addTagToModel(modelId, tagId, true);
    }

    return matchedIds;
  } catch (err) {
    console.warn(`[AutoTagger] Failed to tag model ${modelId} (${modelName}):`, err);
    return [];
  }
}

/**
 * Tag all models in the database.
 *
 * @param forceAll - When false (default, used by auto-scan), skips models whose
 *   tags have been manually edited (tagsLockedAt is set). When true (used by
 *   the manual Re-tag All button), re-tags every model regardless.
 */
export async function autoTagAllModels(forceAll = false): Promise<{
  processed: number;
  tagged: number;
  skipped: number;
  errors: number;
}> {
  // Pre-flight: verify the model is available before processing all models
  const modelReady = await isModelAvailable();
  if (!modelReady) {
    console.warn("[AutoTagger] LLM model not available — skipping auto-tag. Run Download-AI-Model.bat first.");
    return { processed: 0, tagged: 0, skipped: 0, errors: 0 };
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
  let skipped = allModels.length - toProcess.length;
  let errors = 0;

  console.log(
    `[AutoTagger] Starting auto-tag for ${toProcess.length} models` +
    (forceAll ? " (force re-tag all)" : ` (${skipped} locked — skipping)`) +
    "…"
  );

  for (const model of toProcess) {
    try {
      const fileNames = Array.isArray(model.modelFiles)
        ? (model.modelFiles as any[]).map((f: any) => f.name as string).filter(Boolean)
        : [];

      const matchedIds = await autoTagModel(model.id, model.name, fileNames, allTags);
      processed++;
      if (matchedIds.length > 0) tagged++;
    } catch {
      errors++;
    }
  }

  console.log(
    `[AutoTagger] Done. Processed: ${processed}, tagged: ${tagged}, skipped (locked): ${skipped}, errors: ${errors}`
  );
  return { processed, tagged, skipped, errors };
}
