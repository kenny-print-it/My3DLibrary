export function pickCollectionCover<T>(
  models: T[],
  getImageUrl: (model: T) => string | null | undefined,
): string | undefined {
  return models.map(getImageUrl).find((url): url is string => Boolean(url));
}
