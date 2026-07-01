/**
 * Local authentication — username/password with bcrypt + JWT session cookie.
 * Replaces the Manus OAuth SDK for the self-hosted local version.
 */
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Request, Response, Express } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";
import * as db from "../db";
import type { User } from "../../drizzle/schema";

const SALT_ROUNDS = 12;

// ─── Password helpers ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT session helpers ─────────────────────────────────────────────────────

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(userId: number, username: string): Promise<string> {
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ userId: number; username: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const { userId, username } = payload as Record<string, unknown>;
    if (typeof userId !== "number" || typeof username !== "string") return null;
    return { userId, username };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) map.set(key.trim(), decodeURIComponent(rest.join("=")));
  }
  return map;
}

export function getSessionCookieOptions(req: Request) {
  return {
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax" as const,
    path: "/",
  };
}

// ─── Request authentication ───────────────────────────────────────────────────

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.get(COOKIE_NAME);
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await db.getUserById(session.userId);
  return user ?? null;
}

// ─── Express auth routes ──────────────────────────────────────────────────────

export function registerAuthRoutes(app: Express) {
  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }
    const user = await db.getUserByUsername(username);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const token = await createSessionToken(user.id, user.username!);
    const opts = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  });

  // POST /api/auth/setup — first-run admin account creation
  app.post("/api/auth/setup", async (req: Request, res: Response) => {
    const adminExists = await db.adminExists();
    if (adminExists) {
      res.status(403).json({ error: "Setup already completed" });
      return;
    }
    const { username, password } = req.body ?? {};
    if (!username || !password || password.length < 8) {
      res.status(400).json({ error: "username and password (min 8 chars) are required" });
      return;
    }
    const passwordHash = await hashPassword(password);
    await db.createLocalUser({ username, passwordHash, role: "admin" });
    const user = await db.getUserByUsername(username);
    if (!user) {
      res.status(500).json({ error: "Failed to create admin account" });
      return;
    }
    const token = await createSessionToken(user.id, user.username!);
    const opts = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
    res.json({ ok: true });
  });

  // GET /api/auth/setup-required — check if first-run setup is needed
  app.get("/api/auth/setup-required", async (_req: Request, res: Response) => {
    const adminExists = await db.adminExists();
    res.json({ setupRequired: !adminExists });
  });

  // POST /api/auth/guest-login — no-credential login for portable/local mode
  // Auto-creates the owner admin account on first call, then issues a session.
  app.post("/api/auth/guest-login", async (req: Request, res: Response) => {
    let user = await db.getUserByUsername("owner");
    if (!user) {
      // First launch: seed the owner account silently
      const passwordHash = await hashPassword("local-owner-no-password");
      await db.createLocalUser({ username: "owner", passwordHash, role: "admin" });
      user = await db.getUserByUsername("owner");
    }
    if (!user) {
      res.status(500).json({ error: "Failed to initialise owner account" });
      return;
    }
    const token = await createSessionToken(user.id, user.username!);
    const opts = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  });
}
