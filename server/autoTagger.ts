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

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

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

  const prompt = `You are a tag classifier for a 3D printing model library.

Available tags: ${tagList}

Model name: "${modelName}"${filesSnippet}

Return a JSON array of tag names from the available list that best describe this model.
Rules:
- Only use tags from the available list — never invent new ones.
- Return an empty array [] if none fit.
- Be generous: if the model name contains a franchise name, character, or item type that matches a tag, include it.
- Return at most 6 tags.
- Return ONLY the JSON array, no explanation.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tag_list",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["tags"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) return [];

    let parsed: { tags: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    const selectedNames = new Set(
      (parsed.tags ?? []).map((n: string) => n.toLowerCase().trim())
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
