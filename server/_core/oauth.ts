/**
 * OAuth routes — not used in local version.
 * Local auth is handled by server/_core/auth.ts instead.
 */
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: local version uses username/password auth
}
