import { eq, inArray, notInArray, like, and, sql, desc, asc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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
  const textFields = ["name", "email", "loginMethod"] as const;
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
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
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
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
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
    .onDuplicateKeyUpdate({ set: { name: data.name, path: data.path } });
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
    .onDuplicateKeyUpdate({
      set: {
        name: data.name,
        categoryId: data.categoryId ?? undefined,
        path: data.path,
        images: data.images,
        modelFiles: data.modelFiles,
        fileCount: data.modelFiles.length,
        imageCount: data.images.length,
        thumbnailUrl: data.thumbnailUrl,
        lastScanned: new Date(),
        // Only set driveCreatedAt if we have a value (don't overwrite with null on re-scans)
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

  return (result as any)?.[0]?.affectedRows ?? 0;
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
  const [result] = await db.insert(resources).values({ ...data, sortOrder });
  return (result as any).insertId as number;
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

/**
 * Returns a Map of driveId → lastScanned for all models.
 * Used by the incremental scan to skip unchanged folders.
 */
export async function getModelScanTimestamps(): Promise<Map<string, Date>> {
  const db = await getDb();
  if (!db) return new Map();
  const rows = await db.select({ driveId: models.driveId, lastScanned: models.lastScanned }).from(models);
  const map = new Map<string, Date>();
  for (const row of rows) {
    if (row.lastScanned) map.set(row.driveId, row.lastScanned);
  }
  return map;
}
