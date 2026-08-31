export function formatCompactListSummary(collection: string, fileCount: number | null, imageCount: number | null): string {
  const files = fileCount ?? 0;
  const renders = imageCount ?? 0;
  return `${collection} · ${files} file${files === 1 ? "" : "s"} · ${renders} render${renders === 1 ? "" : "s"}`;
}

export function getCompactListTagLabel(tags: Array<{ name: string }> | null | undefined): string {
  if (!tags || tags.length === 0) return "No tags";
  return tags.map((tag) => tag.name).join(", ");
}
