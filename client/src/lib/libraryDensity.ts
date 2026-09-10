import { getPortableLibraryColumnCount } from "./libraryLayout";

export type LibraryCardDensity = "compact" | "comfortable" | "roomy";

export const LIBRARY_DENSITY_KEY = "my3dlibrary_card_density";

export const LIBRARY_CARD_DENSITY_OPTIONS: Array<{ value: LibraryCardDensity; label: string; description: string }> = [
  { value: "compact", label: "Compact", description: "More cards" },
  { value: "comfortable", label: "Comfortable", description: "Balanced" },
  { value: "roomy", label: "Roomy", description: "Larger cards" },
];

export function normalizeLibraryCardDensity(value: string | null | undefined): LibraryCardDensity {
  return value === "compact" || value === "roomy" || value === "comfortable" ? value : "comfortable";
}

export function getPortableDensityColumnCount(viewportWidth: number, density: LibraryCardDensity): number {
  const base = getPortableLibraryColumnCount(viewportWidth);
  if (density === "compact") return viewportWidth >= 640 ? base + 1 : base;
  if (density === "roomy") return viewportWidth >= 768 ? Math.max(2, base - 1) : base;
  return base;
}

export function getPortableDensityCardHeight(density: LibraryCardDensity): number {
  return density === "compact" ? 204 : density === "roomy" ? 244 : 220;
}
