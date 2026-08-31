export type CompactListSortField = "name" | "collection" | "tags" | "files";
export type CompactListSortDirection = "asc" | "desc";

type SortableCompactModel = {
  name: string;
  categoryId: number | null;
  fileCount: number | null;
  tags?: Array<{ name: string }> | null;
};

export function sortCompactModels<T extends SortableCompactModel>(
  models: T[],
  field: CompactListSortField,
  direction: CompactListSortDirection,
  categoryLabels: Map<number, string>,
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  const textFor = (model: T) => {
    if (field === "name") return model.name;
    if (field === "collection") return categoryLabels.get(model.categoryId ?? -1) ?? "Uncategorized";
    if (field === "tags") return (model.tags ?? []).map((tag) => tag.name).join(", ") || "\uffff";
    return "";
  };

  return [...models].sort((left, right) => {
    if (field === "files") return ((left.fileCount ?? 0) - (right.fileCount ?? 0)) * factor;
    return textFor(left).localeCompare(textFor(right), undefined, { sensitivity: "base" }) * factor;
  });
}

export function nextCompactSort(
  currentField: CompactListSortField,
  currentDirection: CompactListSortDirection,
  clickedField: CompactListSortField,
): { field: CompactListSortField; direction: CompactListSortDirection } {
  if (clickedField === currentField) {
    return { field: currentField, direction: currentDirection === "asc" ? "desc" : "asc" };
  }
  return { field: clickedField, direction: "asc" };
}

export function parseCompactListSortSelection(value: string): { field: CompactListSortField; direction: CompactListSortDirection } {
  const [field, direction] = value.split(":");
  const validFields: CompactListSortField[] = ["name", "collection", "tags", "files"];
  const validDirections: CompactListSortDirection[] = ["asc", "desc"];
  if (validFields.includes(field as CompactListSortField) && validDirections.includes(direction as CompactListSortDirection)) {
    return { field: field as CompactListSortField, direction: direction as CompactListSortDirection };
  }
  return { field: "name", direction: "asc" };
}

export function nextRecentlyAddedCollapsed(currentlyCollapsed: boolean): boolean {
  return !currentlyCollapsed;
}

export function normalizeRecentlyAddedCollapsed(value: string | null | undefined): boolean {
  return value === "true";
}
