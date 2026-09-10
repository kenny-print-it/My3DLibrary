import { describe, expect, it } from "vitest";
import { rankPortableThumbnailCandidates } from "./thumbnailCandidates";

describe("rankPortableThumbnailCandidates", () => {
  it("places a clean final render ahead of exploded and contact-sheet names", () => {
    const candidates = rankPortableThumbnailCandidates([
      { id: "1", name: "dragon_exploded_parts_sheet.jpg" } as any,
      { id: "2", name: "dragon_final_render.jpg" } as any,
      { id: "3", name: "dragon_reference_views_grid.jpg" } as any,
    ]);

    expect(candidates[0].originalIndex).toBe(1);
    expect(candidates.slice(1).map((candidate) => candidate.originalIndex).sort()).toEqual([0, 2]);
    expect(candidates[0].label).toContain("Candidate 1 — dragon_final_render.jpg");
  });
});
