import type { DriveImage } from "../drizzle/schema";

export type ThumbnailCandidate = {
  image: DriveImage;
  originalIndex: number;
  label: string;
  score: number;
};

const CLEAN_RENDER_TERMS = ["render", "hero", "cover", "beauty", "final", "main", "front", "portrait", "product"];
const MULTI_VIEW_TERMS = ["exploded", "explode", "assembly", "instruction", "step", "parts", "part", "sheet", "grid", "collage", "angle", "views", "reference", "wip", "process"];

function displayName(image: DriveImage, fallbackIndex: number) {
  return image.name || image.fileId || image.id || `Image ${fallbackIndex + 1}`;
}

function scoreImage(image: DriveImage, index: number) {
  const normalized = displayName(image, index).toLowerCase();
  const cleanScore = CLEAN_RENDER_TERMS.reduce((total, term) => total + (normalized.includes(term) ? 10 : 0), 0);
  const multiViewPenalty = MULTI_VIEW_TERMS.reduce((total, term) => total + (normalized.includes(term) ? 22 : 0), 0);
  return cleanScore - multiViewPenalty - index * 0.05;
}

export function rankPortableThumbnailCandidates(images: DriveImage[], limit = 4): ThumbnailCandidate[] {
  return images
    .map((image, originalIndex) => ({ image, originalIndex, score: scoreImage(image, originalIndex), label: "" }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate,
      label: `Candidate ${index + 1} — ${displayName(candidate.image, candidate.originalIndex)}`,
    }));
}
