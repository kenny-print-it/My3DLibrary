/**
 * Build a server-proxied image URL for a Google Drive file.
 *
 * Instead of using the raw `thumbnailLink` from Drive (which expires after a
 * few hours), we route through our own `/api/drive-image/:fileId` endpoint
 * which fetches a fresh thumbnail on demand and caches it for 30 minutes.
 *
 * @param fileId  The Google Drive file ID (stored in images[].id)
 * @param size    Desired image size in pixels (default 400)
 */
export function driveImageUrl(fileId: string | null | undefined, size = 400): string | null {
  if (!fileId) return null;
  return `/api/drive-image/${fileId}?size=${size}`;
}

/**
 * Given a model's images array and optional heroImage field (which may be a
 * raw Drive URL or a proxy URL), return the best proxy URL to display.
 *
 * Priority:
 *   1. heroImage — if it contains a Drive fileId we can proxy, use that
 *   2. First image in the images array — proxy via fileId
 *   3. null — no image available
 */
export function getModelImageUrl(
  images: Array<{ id: string; thumbnailLink: string }> | null | undefined,
  heroImage: string | null | undefined,
  size = 400
): string | null {
  // If heroImage looks like a proxy URL already, use it directly
  if (heroImage?.startsWith("/api/drive-image/")) return heroImage;

  // If heroImage is a raw Drive URL, try to extract the fileId from the images array
  // by matching the thumbnailLink prefix
  if (heroImage && images?.length) {
    const match = images.find(img => heroImage.includes(img.id) || heroImage === img.thumbnailLink);
    if (match) return driveImageUrl(match.id, size);
    // heroImage might be a thumbnailLink that matches by URL prefix
    const byUrl = images.find(img => img.thumbnailLink && heroImage.startsWith(img.thumbnailLink.split("=s")[0]));
    if (byUrl) return driveImageUrl(byUrl.id, size);
  }

  // Fall back to first image in the array
  if (images?.length) return driveImageUrl(images[0].id, size);

  return null;
}
