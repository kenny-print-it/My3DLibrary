import { eq, inArray, notInArray, like, and, sql, desc, asc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  InsertUser,
  users,
  models,
  categories,
  tags,
  modelTags,
  settings,
  scanLogs,
  accessRequests,
  resources,
  type InsertModel,
  type DriveImage,
  type DriveFile,
  type AccessRequest,
  type Resource,
  libraryPaths,
  type LibraryPath,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

function getDbPath(): string {
  return ENV.dbPath;
}

export async function getDb() {
  if (!_db) {
    try {
      const dbPath = getDbPath();
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to open SQLite:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  // SQLite: check if exists, then insert or update
  const existingUser = await db.select().from(users).where(eq(users.openId, values.openId!)).limit(1);
  if (existingUser.length > 0) {
    await db.update(users).set(updateSet).where(eq(users.openId, values.openId!));
  } else {
    await db.insert(users).values(values);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function createLocalUser(user: { username: string; passwordHash: string; role: "admin" | "user" }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values({
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role,
    lastSignedIn: new Date(),
  });
}

export async function adminExists(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  return result.length > 0;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existingSetting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existingSetting.length > 0) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

// ─── Library Paths ───────────────────────────────────────────────────────────

export async function getLibraryPaths() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(libraryPaths).orderBy(asc(libraryPaths.sortOrder), asc(libraryPaths.id));
}
export async function getEnabledLibraryPaths(): Promise<{ path: string; scanDepth: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(libraryPaths).where(eq(libraryPaths.enabled, true)).orderBy(asc(libraryPaths.sortOrder));
  return rows.map(r => ({ path: r.path, scanDepth: r.scanDepth ?? 2 }));
}
export async function addLibraryPath(data: { path: string; label: string; scanDepth?: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(libraryPaths).orderBy(desc(libraryPaths.sortOrder)).limit(1);
  const nextSort = existing.length > 0 ? (existing[0].sortOrder + 1) : 0;
  await db.insert(libraryPaths).values({ path: data.path, label: data.label, scanDepth: data.scanDepth ?? 2, sortOrder: nextSort });
}
export async function removeLibraryPath(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(libraryPaths).where(eq(libraryPaths.id, id));
}
export async function toggleLibraryPath(id: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(libraryPaths).set({ enabled }).where(eq(libraryPaths.id, id));
}
export async function updateLibraryPathLabel(id: number, label: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(libraryPaths).set({ label }).where(eq(libraryPaths.id, id));
}
export async function updateLibraryPathDepth(id: number, scanDepth: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(libraryPaths).set({ scanDepth }).where(eq(libraryPaths.id, id));
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function upsertCategory(data: {
  driveId: string;
  name: string;
  path: string;
  parentDriveId: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(categories)
    .values(data)
    .onConflictDoUpdate({ target: categories.driveId, set: { name: data.name, path: data.path } });
}

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function reorderCategories(orderedIds: number[]) {
  const db = await getDb();
  if (!db) return;
  // Update each category's sortOrder based on its position in the array
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id))
    )
  );
}

export async function updateCategoryLabel(driveId: string, customLabel: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set({ customLabel }).where(eq(categories.driveId, driveId));
}

// ─── Models ──────────────────────────────────────────────────────────────────

export async function upsertModel(data: {
  driveId: string;
  name: string;
  categoryId: number | null;
  path: string;
  rootPath?: string;
  images: DriveImage[];
  modelFiles: DriveFile[];
  thumbnailUrl: string;
  driveCreatedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  const values: InsertModel = {
    driveId: data.driveId,
    name: data.name,
    categoryId: data.categoryId ?? undefined,
    path: data.path,
    rootPath: data.rootPath,
    images: data.images,
    modelFiles: data.modelFiles,
    fileCount: data.modelFiles.length,
    imageCount: data.images.length,
    thumbnailUrl: data.thumbnailUrl,
    lastScanned: new Date(),
    driveCreatedAt: data.driveCreatedAt,
  };
  await db
    .insert(models)
    .values(values)
    .onConflictDoUpdate({
      target: models.driveId,
      set: {
        name: data.name,
        categoryId: data.categoryId ?? undefined,
        path: data.path,
        ...(data.rootPath !== undefined ? { rootPath: data.rootPath } : {}),
        images: data.images,
        modelFiles: data.modelFiles,
        fileCount: data.modelFiles.length,
        imageCount: data.images.length,
        thumbnailUrl: data.thumbnailUrl,
        lastScanned: new Date(),
        ...(data.driveCreatedAt ? { driveCreatedAt: data.driveCreatedAt } : {}),
      },
    });
}

export async function getAllModels(filters?: {
  search?: string;
  categoryId?: number;
  tagIds?: number[];
  fileType?: string;
  sortBy?: "name_asc" | "name_desc" | "newest" | "most_files" | "most_renders";
  favoritesOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  // Helper to apply client-side sort to a result set
  function applySort<T extends { name: string; fileCount: number | null; imageCount: number | null; lastScanned: Date | null }>(rows: T[]): T[] {
    const sortBy = filters?.sortBy;
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "newest") return (b.lastScanned?.getTime() ?? 0) - (a.lastScanned?.getTime() ?? 0);
      if (sortBy === "most_files") return (b.fileCount ?? 0) - (a.fileCount ?? 0);
      if (sortBy === "most_renders") return (b.imageCount ?? 0) - (a.imageCount ?? 0);
      return 0;
    });
  }

  if (filters?.tagIds && filters.tagIds.length > 0) {
    const taggedModelIds = await db
      .select({ modelId: modelTags.modelId })
      .from(modelTags)
      .where(inArray(modelTags.tagId, filters.tagIds));
    const ids = Array.from(new Set(taggedModelIds.map((r) => r.modelId)));
    if (ids.length === 0) return [];
    const conditions: ReturnType<typeof eq>[] = [inArray(models.id, ids) as any];
    if (filters.search) conditions.push(like(models.name, `%${filters.search}%`) as any);
    if (filters.categoryId) conditions.push(eq(models.categoryId, filters.categoryId) as any);
    let tagRows = await db.select().from(models).where(and(...conditions));
    if (filters.fileType) tagRows = tagRows.filter((m) => (m.modelFiles as any[])?.some((f: any) => f.name?.toLowerCase().endsWith(`.${filters!.fileType!.toLowerCase()}`)));
    return applySort(tagRows);
  }

  // When searching by text, also find models whose tags match the search term
  let tagMatchIds: Set<number> | null = null;
  if (filters?.search) {
    const matchingTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(like(tags.name, `%${filters.search}%`));
    if (matchingTags.length > 0) {
      const taggedRows = await db
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .where(inArray(modelTags.tagId, matchingTags.map((t) => t.id)));
      tagMatchIds = new Set(taggedRows.map((r) => r.modelId));
    } else {
      tagMatchIds = new Set();
    }
  }

  const conditions = [];
  if (filters?.categoryId) conditions.push(eq(models.categoryId, filters.categoryId));
  let allRows = conditions.length > 0 ? await db.select().from(models).where(and(...conditions)) : await db.select().from(models);

  // Filter by search: match model name OR tag name
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    allRows = allRows.filter((m) =>
      m.name.toLowerCase().includes(term) || (tagMatchIds?.has(m.id) ?? false)
    );
  }

  if (filters?.fileType) allRows = allRows.filter((m) => (m.modelFiles as any[])?.some((f: any) => f.name?.toLowerCase().endsWith(`.${filters!.fileType!.toLowerCase()}`)));
  if (filters?.favoritesOnly) allRows = allRows.filter((m) => m.isFavorite);
  return applySort(allRows);
}

export async function getRecentModels(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // Sort by Drive folder creation date when available, fall back to scan date
  return db
    .select()
    .from(models)
    .orderBy(desc(sql`COALESCE(${models.driveCreatedAt}, ${models.lastScanned})`))
    .limit(limit);
}

export async function getModelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(models).where(eq(models.id, id)).limit(1);
  return result[0];
}

export async function updateModelMeta(
  id: number,
  data: { customNotes?: string; isFavorite?: boolean; categoryId?: number }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(models).set(data).where(eq(models.id, id));
}

export async function updateModelHeroImage(id: number, heroImage: string | null, source: "ai" | "manual" = "ai") {
  const db = await getDb();
  if (!db) return;
  await db.update(models).set({ heroImage, heroImageSource: source }).where(eq(models.id, id));
}

export async function clearModelHeroImage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(models).set({ heroImage: null, heroImageSource: null }).where(eq(models.id, id));
}

export async function getModelCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(models);
  return result[0]?.count ?? 0;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getAllTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags);
}

export async function createTag(name: string, color: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(tags).values({ name, color });
  const result = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  return result[0] ?? null;
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(modelTags).where(eq(modelTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
}

export async function getTagsForModel(modelId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ tag: tags })
    .from(modelTags)
    .innerJoin(tags, eq(modelTags.tagId, tags.id))
    .where(eq(modelTags.modelId, modelId));
  return rows.map((r) => r.tag);
}

export async function addTagToModel(modelId: number, tagId: number, skipLock = false) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(modelTags)
    .where(and(eq(modelTags.modelId, modelId), eq(modelTags.tagId, tagId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(modelTags).values({ modelId, tagId });
  }
  // Lock tags so auto-tagger won't overwrite manual edits (skip when called by auto-tagger)
  if (!skipLock) {
    await db.update(models).set({ tagsLockedAt: new Date() }).where(eq(models.id, modelId));
  }
}

export async function removeTagFromModel(modelId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(modelTags)
    .where(and(eq(modelTags.modelId, modelId), eq(modelTags.tagId, tagId)));
  // Lock tags so auto-tagger won't overwrite manual edits
  await db.update(models).set({ tagsLockedAt: new Date() }).where(eq(models.id, modelId));
}

export async function unlockModelTags(modelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(models).set({ tagsLockedAt: null }).where(eq(models.id, modelId));
}

// ─── Scan Logs ───────────────────────────────────────────────────────────────

export async function createScanLog() {
  const db = await getDb();
  if (!db) return null;
  await db.insert(scanLogs).values({ status: "running" });
  const result = await db.select().from(scanLogs).orderBy(sql`id desc`).limit(1);
  return result[0] ?? null;
}

export async function updateScanLog(
  id: number,
  data: {
    status: "running" | "completed" | "failed";
    modelsFound?: number;
    categoriesFound?: number;
    errorMessage?: string;
    completedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(scanLogs).set(data).where(eq(scanLogs.id, id));
}

export async function getLastScanLog() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scanLogs).orderBy(sql`id desc`).limit(1);
  return result[0] ?? null;
}

// ─── Hard Delete (stale Drive items) ─────────────────────────────────────────

/**
 * Deletes all models whose driveId is NOT in the provided set.
 * Also cascades to model_tags for those models.
 */
export async function deleteModelsNotIn(driveIds: string[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (driveIds.length === 0) return 0;

  // Find stale model IDs first so we can cascade-delete model_tags
  const stale = await db
    .select({ id: models.id })
    .from(models)
    .where(notInArray(models.driveId, driveIds));

  if (stale.length === 0) return 0;

  const staleIds = stale.map((r) => r.id);

  // Remove model_tags for stale models
  await db.delete(modelTags).where(inArray(modelTags.modelId, staleIds));

  // Remove the models themselves
  await db.delete(models).where(inArray(models.id, staleIds));

  return staleIds.length;
}

/**
 * Deletes all categories whose driveId is NOT in the provided set.
 */
export async function deleteCategoriesNotIn(driveIds: string[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (driveIds.length === 0) return 0;

  const result = await db
    .delete(categories)
    .where(notInArray(categories.driveId, driveIds));

  return (result as any)?.changes ?? 0;
}

// ─── Access Control Helpers ───────────────────────────────────────────────────

/**
 * Look up an access request by email. Returns null if not found.
 */
export async function getAccessRequestByEmail(email: string): Promise<AccessRequest | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(accessRequests).where(eq(accessRequests.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

/**
 * Look up an access request by openId. Returns null if not found.
 */
export async function getAccessRequestByOpenId(openId: string): Promise<AccessRequest | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(accessRequests).where(eq(accessRequests.openId, openId)).limit(1);
  return rows[0] ?? null;
}

export async function getAccessRequestByUsername(username: string): Promise<AccessRequest | null> {
  const db = await getDb();
  if (!db) return null;
  // In local mode, access requests use email field to store username
  const rows = await db.select().from(accessRequests).where(eq(accessRequests.email, username.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

/**
 * Upsert an access request when a user signs in for the first time.
 * If the email is pre-added as approved, the status stays approved.
 * If already exists, updates name and openId without changing status.
 */
export async function upsertAccessRequest(data: {
  email: string;
  name: string | null;
  openId: string;
}): Promise<AccessRequest | null> {
  const db = await getDb();
  if (!db) return null;
  const email = data.email.toLowerCase();
  const existing = await getAccessRequestByEmail(email);
  if (existing) {
    // Update name and openId but preserve status
    await db.update(accessRequests)
      .set({ name: data.name, openId: data.openId })
      .where(eq(accessRequests.email, email));
    return getAccessRequestByEmail(email);
  }
  await db.insert(accessRequests).values({
    email,
    name: data.name,
    openId: data.openId,
    status: "pending",
    preAdded: false,
  });
  return getAccessRequestByEmail(email);
}

/**
 * List all access requests, optionally filtered by status.
 */
export async function listAccessRequests(status?: "pending" | "approved" | "denied"): Promise<AccessRequest[]> {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(accessRequests).where(eq(accessRequests.status, status)).orderBy(accessRequests.requestedAt);
  }
  return db.select().from(accessRequests).orderBy(accessRequests.requestedAt);
}

/**
 * Update the status of an access request (approve or deny).
 */
export async function updateAccessStatus(id: number, status: "approved" | "denied"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(accessRequests)
    .set({ status, reviewedAt: new Date() })
    .where(eq(accessRequests.id, id));
}

/**
 * Pre-add an email to the approved list before the user signs in.
 */
export async function preAddApprovedEmail(email: string, name?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const normalized = email.toLowerCase();
  const existing = await getAccessRequestByEmail(normalized);
  if (existing) {
    await db.update(accessRequests)
      .set({ status: "approved", preAdded: true, reviewedAt: new Date(), name: name ?? existing.name })
      .where(eq(accessRequests.email, normalized));
  } else {
    await db.insert(accessRequests).values({
      email: normalized,
      name: name ?? null,
      openId: null,
      status: "approved",
      preAdded: true,
      reviewedAt: new Date(),
    });
  }
}

/**
 * Remove an entry from the access list entirely.
 */
export async function removeAccessEntry(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(accessRequests).where(eq(accessRequests.id, id));
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function listResources(): Promise<Resource[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resources).orderBy(asc(resources.sortOrder), asc(resources.name));
}

export async function createResource(data: {
  name: string;
  url: string;
  logoUrl?: string | null;
  description?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("No database connection");
  // Place new resource at the end
  const existing = await db.select({ id: resources.id }).from(resources);
  const sortOrder = existing.length;
  await db.insert(resources).values({ ...data, sortOrder });
  const inserted = await db.select({ id: resources.id }).from(resources).where(eq(resources.name, data.name)).orderBy(desc(resources.id)).limit(1);
  return inserted[0]?.id ?? 0;
}

export async function updateResource(
  id: number,
  data: Partial<{ name: string; url: string; logoUrl: string | null; description: string | null; sortOrder: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(resources).set(data).where(eq(resources.id, id));
}

export async function deleteResource(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(resources).where(eq(resources.id, id));
}

// ─── Embedded migration SQL (avoids file system dependency in pkg bundle) ────
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS \`access_requests\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`email\` text NOT NULL,\n\t\`name\` text,\n\t\`openId\` text,\n\t\`status\` text DEFAULT 'pending' NOT NULL,\n\t\`preAdded\` integer DEFAULT false NOT NULL,\n\t\`requestedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`reviewedAt\` integer\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`access_requests_email_unique\` ON \`access_requests\` (\`email\`);
CREATE TABLE IF NOT EXISTS \`categories\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`driveId\` text,\n\t\`name\` text NOT NULL,\n\t\`customLabel\` text,\n\t\`parentDriveId\` text,\n\t\`path\` text,\n\t\`sortOrder\` integer DEFAULT 0 NOT NULL,\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`categories_driveId_unique\` ON \`categories\` (\`driveId\`);
CREATE TABLE IF NOT EXISTS \`library_paths\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`path\` text NOT NULL,\n\t\`label\` text NOT NULL,\n\t\`enabled\` integer DEFAULT true NOT NULL,\n\t\`scanDepth\` integer DEFAULT 2 NOT NULL,\n\t\`sortOrder\` integer DEFAULT 0 NOT NULL,\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE TABLE IF NOT EXISTS \`model_tags\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`modelId\` integer NOT NULL,\n\t\`tagId\` integer NOT NULL\n);
CREATE TABLE IF NOT EXISTS \`models\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`driveId\` text,\n\t\`name\` text NOT NULL,\n\t\`categoryId\` integer,\n\t\`path\` text,\n\t\`images\` text DEFAULT '[]',\n\t\`modelFiles\` text DEFAULT '[]',\n\t\`files\` text DEFAULT '[]',\n\t\`fileCount\` integer DEFAULT 0,\n\t\`imageCount\` integer DEFAULT 0,\n\t\`thumbnailUrl\` text,\n\t\`heroImage\` text,\n\t\`heroImageSource\` text,\n\t\`driveCreatedAt\` integer,\n\t\`customNotes\` text,\n\t\`isFavorite\` integer DEFAULT false,\n\t\`tagsLockedAt\` integer,\n\t\`lastScanned\` integer DEFAULT (unixepoch('now') * 1000),\n\t\`rootPath\` text,\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`models_driveId_unique\` ON \`models\` (\`driveId\`);
CREATE TABLE IF NOT EXISTS \`resources\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`name\` text NOT NULL,\n\t\`url\` text NOT NULL,\n\t\`logoUrl\` text,\n\t\`description\` text,\n\t\`sortOrder\` integer DEFAULT 0 NOT NULL,\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE TABLE IF NOT EXISTS \`scan_logs\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`status\` text DEFAULT 'running' NOT NULL,\n\t\`modelsFound\` integer DEFAULT 0,\n\t\`categoriesFound\` integer DEFAULT 0,\n\t\`errorMessage\` text,\n\t\`startedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`completedAt\` integer\n);
CREATE TABLE IF NOT EXISTS \`settings\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`key\` text NOT NULL,\n\t\`value\` text,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`settings_key_unique\` ON \`settings\` (\`key\`);
CREATE TABLE IF NOT EXISTS \`tags\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`name\` text NOT NULL,\n\t\`color\` text DEFAULT '#6366f1',\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`tags_name_unique\` ON \`tags\` (\`name\`);
CREATE TABLE IF NOT EXISTS \`users\` (\n\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t\`name\` text,\n\t\`username\` text,\n\t\`passwordHash\` text,\n\t\`openId\` text,\n\t\`email\` text,\n\t\`role\` text DEFAULT 'user' NOT NULL,\n\t\`createdAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`updatedAt\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,\n\t\`lastSignedIn\` integer DEFAULT (unixepoch('now') * 1000) NOT NULL\n);
CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_unique\` ON \`users\` (\`username\`);
`;

// ─── Auto-init: apply embedded migration SQL if DB is empty ──────────────────
export async function initDbIfNeeded(): Promise<void> {
  const dbPath = getDbPath();
  const fs = await import("fs");
  const path = await import("path");
  const Database = (await import("better-sqlite3")).default;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // Check if tables exist
  const tables = sqlite.prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table' AND name='users'").get() as { n: number };
  // Always run additive migrations (safe for existing DBs)
  try {
    sqlite.exec("ALTER TABLE library_paths ADD COLUMN scanDepth integer DEFAULT 2 NOT NULL;");
    console.log("[DB Migrate] Added scanDepth column to library_paths.");
  } catch { /* column already exists — ignore */ }
  if (tables.n === 0) {
    // Apply embedded migration SQL (no file system dependency)
    const stmts = MIGRATION_SQL.split(";").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    for (const stmt of stmts) {
      try { sqlite.exec(stmt + ";"); } catch (e: any) { console.warn("[DB Init] Skipped:", e.message?.substring(0, 80)); }
    }
    console.log("[DB Init] Database initialized.");
    // Auto-seed library path from LIBRARY_PATH env if set
    const libraryPath = process.env.LIBRARY_PATH;
    if (libraryPath && fs.existsSync(libraryPath)) {
      try {
        sqlite.prepare("INSERT INTO library_paths (path, label, enabled, sortOrder) VALUES (?, ?, 1, 0)").run(libraryPath, "My 3D Library");
        console.log("[DB Init] Library path seeded:", libraryPath);
      } catch (e: any) { console.warn("[DB Init] Could not seed library path:", e.message); }
    }
  }

  // Seed default resources if the table is empty (covers both fresh installs and
  // existing DBs that were created before seeding was added).
  const resourceCount = (sqlite.prepare("SELECT count(*) as n FROM resources").get() as { n: number }).n;
  if (resourceCount === 0) {
    const defaultResources = [
      { name: "Yosh Studios", url: "https://www.patreon.com/yoshstudios",  logoUrl: "/res-yosh.jpg",        description: "Monthly 3D printable miniatures and terrain by Yosh",    sortOrder: 0 },
      { name: "MakerWorld",   url: "https://makerworld.com",               logoUrl: "/res-makerworld.png",  description: "Bambu Lab's model platform",                             sortOrder: 1 },
      { name: "Makeronline",  url: "https://makeronline.com",              logoUrl: "/res-makeronline.png", description: "3D printing community and model sharing platform",        sortOrder: 2 },
      { name: "Printables",   url: "https://www.printables.com",           logoUrl: "/res-printables.png",  description: "Free models from Prusa, huge community",                  sortOrder: 3 },
      { name: "Thingiverse",  url: "https://www.thingiverse.com",          logoUrl: "/res-thingiverse.png", description: "One of the original 3D model repositories",              sortOrder: 4 },
      { name: "Cults3D",      url: "https://cults3d.com",                  logoUrl: "/res-cults3d.png",     description: "Designer marketplace — free and paid models",             sortOrder: 5 },
      { name: "Thangs",       url: "https://thangs.com",                   logoUrl: "/res-thangs.jpg",      description: "3D search engine across multiple sites",                  sortOrder: 6 },
      { name: "YouMagine",    url: "https://www.youmagine.com",            logoUrl: "/res-youmagine.png",   description: "Ultimaker's open-source model community",                sortOrder: 7 },
    ];
    const insertResource = sqlite.prepare("INSERT INTO resources (name, url, logoUrl, description, sortOrder) VALUES (?, ?, ?, ?, ?)");
    for (const r of defaultResources) {
      try { insertResource.run(r.name, r.url, (r as any).logoUrl ?? null, r.description, r.sortOrder); } catch (e: any) { console.warn("[DB Seed] Could not seed resource:", r.name, e.message); }
    }
    console.log("[DB Seed] Default resources seeded.");
  }

  // Seed default tags if the table is empty (covers both fresh installs and
  // existing DBs created before tag seeding was added).
  const tagCount = (sqlite.prepare("SELECT count(*) as n FROM tags").get() as { n: number }).n;
  if (tagCount === 0) {
    const defaultTags: Array<{ name: string; color: string }> = [
      // Vehicles
      { name: "Bronco",                color: "#6b7280" },
      { name: "RC",                    color: "#6b7280" },
      { name: "Truck",                 color: "#6b7280" },
      { name: "Ford",                  color: "#6b7280" },
      { name: "Car",                   color: "#6b7280" },
      // Franchises / IPs
      { name: "Pokemon",               color: "#eab308" },
      { name: "Mandalorian",           color: "#6b7280" },
      { name: "Star Wars",             color: "#3b82f6" },
      { name: "Marvel",                color: "#ef4444" },
      { name: "Avengers",              color: "#ef4444" },
      { name: "Thanos",                color: "#8b5cf6" },
      { name: "Red Guardian",          color: "#ef4444" },
      { name: "Borderlands",           color: "#eab308" },
      { name: "Yu-Gi-Oh",              color: "#eab308" },
      { name: "Blue Eyes White Dragon",color: "#3b82f6" },
      { name: "Lord of the Rings",     color: "#6b7280" },
      { name: "Nazgul",                color: "#6b7280" },
      { name: "Morgoth",               color: "#6b7280" },
      { name: "Doom",                  color: "#ef4444" },
      { name: "Doomslayer",            color: "#ef4444" },
      { name: "Digimon",               color: "#3b82f6" },
      { name: "Attack on Titan",       color: "#6b7280" },
      { name: "Anime",                 color: "#ec4899" },
      { name: "One Piece",             color: "#eab308" },
      { name: "Disney",                color: "#3b82f6" },
      { name: "Nintendo",              color: "#ef4444" },
      { name: "Mario",                 color: "#ef4444" },
      { name: "My Hero Academia",      color: "#3b82f6" },
      { name: "Stranger Things",       color: "#6b7280" },
      { name: "He-Man",                color: "#eab308" },
      { name: "Gundam",                color: "#3b82f6" },
      { name: "Transformers",          color: "#6b7280" },
      { name: "Arc Raiders",           color: "#6b7280" },
      { name: "Chainsawman",           color: "#ef4444" },
      { name: "Demon Slayer",           color: "#ef4444" },
      { name: "TMNT",                   color: "#22c55e" },
      // Categories / types
      { name: "cosplay",               color: "#ec4899" },
      { name: "props",                 color: "#6b7280" },
      { name: "life size",             color: "#6b7280" },
      { name: "statues",               color: "#6b7280" },
      { name: "masks",                 color: "#6b7280" },
      { name: "helmets",               color: "#6b7280" },
      { name: "armor",                 color: "#6b7280" },
      { name: "lamps",                 color: "#eab308" },
      { name: "replicas",              color: "#6b7280" },
      { name: "minis",                 color: "#22c55e" },
      { name: "weapons",               color: "#6b7280" },
      { name: "flail",                 color: "#6b7280" },
      { name: "crown",                 color: "#eab308" },
      { name: "Bone",                  color: "#6b7280" },
      { name: "Skeleton",              color: "#6b7280" },
    ];
    const insertTag = sqlite.prepare("INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)");
    for (const t of defaultTags) {
      try { insertTag.run(t.name, t.color); } catch (e: any) { console.warn("[DB Seed] Could not seed tag:", t.name, e.message); }
    }
    console.log("[DB Seed] Default tags seeded.");
  }

  // Seed default AI/LLM settings on every startup (INSERT OR IGNORE preserves user changes)
  const defaultSettings: Array<{ key: string; value: string }> = [
    { key: "llm_api_url", value: "http://localhost:11434" },
    { key: "llm_model",   value: "llava" },
  ];
  const insertSetting = sqlite.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const s of defaultSettings) {
    try { insertSetting.run(s.key, s.value); } catch (e: any) { console.warn("[DB Seed] Could not seed setting:", s.key, e.message); }
  }

  sqlite.close();
}
