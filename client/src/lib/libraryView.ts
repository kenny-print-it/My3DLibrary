export type LibraryViewMode = "collections" | "tabs" | "list";

export function normalizeLibraryView(value: string | null | undefined): LibraryViewMode {
  return value === "tabs" || value === "list" ? value : "collections";
}

export function normalizeCategoryTab(
  value: string | null | undefined,
  categoryIds: string[],
): string {
  if (!value || value === "all") return "all";
  return categoryIds.includes(value) ? value : "all";
}

export function preserveRequestedCategoryTabWhileLoading(
  value: string,
  categoryIds: string[],
): string {
  return categoryIds.length === 0 ? value : normalizeCategoryTab(value, categoryIds);
}
