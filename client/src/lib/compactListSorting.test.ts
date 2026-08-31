import { describe, expect, it } from "vitest";
import {
  nextCompactSort,
  nextRecentlyAddedCollapsed,
  normalizeRecentlyAddedCollapsed,
  parseCompactListSortSelection,
  sortCompactModels,
} from "./compactListSorting";

const models = [
  { id: 1, name: "Zephyr Helmet", categoryId: 2, fileCount: 4, tags: [{ name: "Cosplay" }] },
  { id: 2, name: "Alpha Stand", categoryId: 1, fileCount: 1, tags: [{ name: "Display" }] },
  { id: 3, name: "Bravo Ship", categoryId: 1, fileCount: 8, tags: [] },
];

const categories = new Map<number, string>([[1, "Vehicles"], [2, "Cosplay"]]);

describe("portable Compact List sorting", () => {
  it("sorts model name, collection, tags, and file count without changing source data", () => {
    expect(sortCompactModels(models, "name", "asc", categories).map((model) => model.id)).toEqual([2, 3, 1]);
    expect(sortCompactModels(models, "collection", "asc", categories).map((model) => model.id)).toEqual([1, 2, 3]);
    expect(sortCompactModels(models, "tags", "asc", categories).map((model) => model.id)).toEqual([1, 2, 3]);
    expect(sortCompactModels(models, "files", "desc", categories).map((model) => model.id)).toEqual([3, 1, 2]);
    expect(models.map((model) => model.id)).toEqual([1, 2, 3]);
  });

  it("toggles desktop headers and accepts valid mobile selector values", () => {
    expect(nextCompactSort("name", "asc", "name")).toEqual({ field: "name", direction: "desc" });
    expect(nextCompactSort("name", "desc", "collection")).toEqual({ field: "collection", direction: "asc" });
    expect(parseCompactListSortSelection("files:desc")).toEqual({ field: "files", direction: "desc" });
    expect(parseCompactListSortSelection("invalid:value")).toEqual({ field: "name", direction: "asc" });
  });

  it("restores and toggles the saved Recently Added visibility preference", () => {
    expect(normalizeRecentlyAddedCollapsed("true")).toBe(true);
    expect(normalizeRecentlyAddedCollapsed("false")).toBe(false);
    expect(nextRecentlyAddedCollapsed(false)).toBe(true);
    expect(nextRecentlyAddedCollapsed(true)).toBe(false);
  });
});
