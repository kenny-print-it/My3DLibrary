/**
 * Drive Image Proxy
 *
 * Fetches a fresh Google Drive thumbnail for a given fileId using the stored
 * API key, then streams it back to the browser. This avoids the expiring
 * lh3.googleusercontent.com thumbnail URLs that go stale after a few hours.
 *
 * Route: GET /api/drive-image/:fileId?size=400
 */
import type { Request, Response } from "express";
import { getSetting } from "./db";

// Simple in-memory cache: fileId → { url, fetchedAt }
const urlCache = new Map<string, { url: string; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getFreshThumbnailUrl(fileId: string, apiKey: string, size: number): Promise<string> {
  const cached = urlCache.get(fileId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  // Use the Drive API to get a fresh thumbnailLink
  const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink&key=${apiKey}`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    throw new Error(`Drive API error ${metaRes.status} for file ${fileId}`);
  }
  const meta = await metaRes.json() as { thumbnailLink?: string };
  if (!meta.thumbnailLink) {
    throw new Error(`No thumbnailLink for file ${fileId}`);
  }

  // Replace the size suffix (=s220) with the requested size
  const url = meta.thumbnailLink.replace(/=s\d+$/, `=s${size}`);
  urlCache.set(fileId, { url, fetchedAt: Date.now() });
  return url;
}

export async function driveImageProxyHandler(req: Request, res: Response) {
  const { fileId } = req.params;
  const size = Math.min(parseInt((req.query.size as string) || "400", 10), 1600);

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    res.status(400).json({ error: "Invalid fileId" });
    return;
  }

  try {
    const apiKey = await getSetting("drive_api_key");
    if (!apiKey) {
      res.status(503).json({ error: "Drive API key not configured" });
      return;
    }

    const thumbnailUrl = await getFreshThumbnailUrl(fileId, apiKey, size);

    // Proxy the image bytes to avoid CORS issues
    const imgRes = await fetch(thumbnailUrl);
    if (!imgRes.ok) {
      // Cache miss — evict and retry once with a fresh URL
      urlCache.delete(fileId);
      const freshUrl = await getFreshThumbnailUrl(fileId, apiKey, size);
      const retryRes = await fetch(freshUrl);
      if (!retryRes.ok) {
        res.status(502).json({ error: "Failed to fetch image from Drive" });
        return;
      }
      const contentType = retryRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=1800"); // 30 min browser cache
      const buffer = await retryRes.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 min browser cache
    const buffer = await imgRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.warn("[DriveImageProxy] Error:", err?.message);
    res.status(502).json({ error: "Image proxy error", detail: err?.message });
  }
}
