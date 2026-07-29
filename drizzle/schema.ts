import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(unixepoch('now') * 1000)`;

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  username: text("username").unique(),
  passwordHash: text("passwordHash"),
  openId: text("openId").unique(),
  email: text("email"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Settings ────────────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type Setting = typeof settings.$inferSelect;

// ─── Categories ──────────────────────────────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driveId: text("driveId").unique(),
  name: text("name").notNull(),
  customLabel: text("customLabel"),
  parentDriveId: text("parentDriveId"),
  path: text("path"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type Category = typeof categories.$inferSelect;

// ─── Models ──────────────────────────────────────────────────────────────────
export const models = sqliteTable("models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driveId: text("driveId").unique(),
  name: text("name").notNull(),
  categoryId: integer("categoryId"),
  path: text("path"),
  images: text("images", { mode: "json" }).$type<DriveImage[]>().default([]),
  modelFiles: text("modelFiles", { mode: "json" }).$type<DriveFile[]>().default([]),
  files: text("files", { mode: "json" }).$type<DriveFile[]>().default([]),
  fileCount: integer("fileCount").default(0),
  imageCount: integer("imageCount").default(0),
  thumbnailUrl: text("thumbnailUrl"),
  heroImage: text("heroImage"),
  heroImageSource: text("heroImageSource", { enum: ["ai", "manual"] }),
  driveCreatedAt: integer("driveCreatedAt", { mode: "timestamp_ms" }),
  customNotes: text("customNotes"),
  printSettings: text("printSettings"),
  sourceUrl: text("sourceUrl"),
  isFavorite: integer("isFavorite", { mode: "boolean" }).default(false),
  tagsLockedAt: integer("tagsLockedAt", { mode: "timestamp_ms" }),
  lastScanned: integer("lastScanned", { mode: "timestamp_ms" }).default(now),
  rootPath: text("rootPath"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366f1"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type Tag = typeof tags.$inferSelect;

// ─── Model <-> Tag join ───────────────────────────────────────────────────────
export const modelTags = sqliteTable("model_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("modelId").notNull(),
  tagId: integer("tagId").notNull(),
});
export type ModelTag = typeof modelTags.$inferSelect;

// ─── Scan Logs ────────────────────────────────────────────────────────────────
export const scanLogs = sqliteTable("scan_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status", { enum: ["running", "completed", "failed"] }).default("running").notNull(),
  modelsFound: integer("modelsFound").default(0),
  categoriesFound: integer("categoriesFound").default(0),
  errorMessage: text("errorMessage"),
  startedAt: integer("startedAt", { mode: "timestamp_ms" }).default(now).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp_ms" }),
});
export type ScanLog = typeof scanLogs.$inferSelect;

// ─── Access Requests ──────────────────────────────────────────────────────────
export const accessRequests = sqliteTable("access_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  openId: text("openId"),
  status: text("status", { enum: ["pending", "approved", "denied"] }).default("pending").notNull(),
  preAdded: integer("preAdded", { mode: "boolean" }).default(false).notNull(),
  requestedAt: integer("requestedAt", { mode: "timestamp_ms" }).default(now).notNull(),
  reviewedAt: integer("reviewedAt", { mode: "timestamp_ms" }),
});
export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

// ─── Library Paths ────────────────────────────────────────────────────────────
export const libraryPaths = sqliteTable("library_paths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  path: text("path").notNull(),
  label: text("label").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  scanDepth: integer("scanDepth").default(2).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type LibraryPath = typeof libraryPaths.$inferSelect;
export type InsertLibraryPath = typeof libraryPaths.$inferInsert;

// ─── Resources ────────────────────────────────────────────────────────────────
export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

// ─── Trash (soft-deleted files) ─────────────────────────────────────────────
export const trashedFiles = sqliteTable("trashed_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id").notNull(),
  modelName: text("model_name").notNull(),
  fileType: text("file_type", { enum: ["image", "model"] }).notNull(),
  fileId: text("file_id").notNull(),
  originalName: text("original_name").notNull(),
  originalAbsPath: text("original_abs_path").notNull(),
  trashAbsPath: text("trash_abs_path").notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }).default(now).notNull(),
});
export type TrashedFile = typeof trashedFiles.$inferSelect;
export type InsertTrashedFile = typeof trashedFiles.$inferInsert;

// ─── Shared file types ────────────────────────────────────────────────────────
export interface DriveImage {
  fileId: string;
  name: string;
  thumbnailLink: string;
  webContentLink: string;
  mimeType: string;
  id?: string;
  webViewLink?: string;
  absPath?: string; // absolute local filesystem path — stored in DB so thumbnail picker can read file bytes
}

export interface DriveFile {
  fileId: string;
  name: string;
  size: string;
  webContentLink: string;
  mimeType: string;
  id?: string;
  webViewLink?: string;
  absPath?: string; // absolute local filesystem path — used for disk rename
}
