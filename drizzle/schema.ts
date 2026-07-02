import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// App settings (key-value store for Drive API key, folder ID, etc.)
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;

// Top-level Drive categories (derived from folder structure)
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  driveId: varchar("driveId", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  customLabel: varchar("customLabel", { length: 255 }),
  parentDriveId: varchar("parentDriveId", { length: 128 }),
  path: text("path"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// Individual 3D model entries
export const models = mysqlTable("models", {
  id: int("id").autoincrement().primaryKey(),
  driveId: varchar("driveId", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 512 }).notNull(),
  categoryId: int("categoryId"),
  path: text("path"),
  // JSON array of { id, name, thumbnailLink, webViewLink }
  images: json("images").$type<DriveImage[]>().default([]),
  // JSON array of { id, name, size, webViewLink, webContentLink, mimeType }
  modelFiles: json("modelFiles").$type<DriveFile[]>().default([]),
  fileCount: int("fileCount").default(0),
  imageCount: int("imageCount").default(0),
  // First image thumbnail for card display
  thumbnailUrl: text("thumbnailUrl"),
  // AI-selected best image URL for card/hero display
  heroImage: text("heroImage"),
  // How the hero image was set: 'ai' = auto-picked, 'manual' = owner override
  heroImageSource: mysqlEnum("heroImageSource", ["ai", "manual"]),
  // Original folder creation date from Google Drive (not the scan date)
  driveCreatedAt: timestamp("driveCreatedAt"),
  customNotes: text("customNotes"),
  isFavorite: boolean("isFavorite").default(false),
  // When set, auto-tagger will skip this model (tags were manually curated)
  tagsLockedAt: timestamp("tagsLockedAt"),
  lastScanned: timestamp("lastScanned").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;

// Tags
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  color: varchar("color", { length: 32 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

// Model <-> Tag join table
export const modelTags = mysqlTable("model_tags", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull(),
  tagId: int("tagId").notNull(),
});

export type ModelTag = typeof modelTags.$inferSelect;

// Scan log
export const scanLogs = mysqlTable("scan_logs", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  modelsFound: int("modelsFound").default(0),
  categoriesFound: int("categoriesFound").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ScanLog = typeof scanLogs.$inferSelect;

// Access control: allowlist of approved users
export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  openId: varchar("openId", { length: 64 }),
  status: mysqlEnum("status", ["pending", "approved", "denied"]).default("pending").notNull(),
  preAdded: boolean("preAdded").default(false).notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

// Shared Drive file types
export interface DriveImage {
  id: string;
  name: string;
  thumbnailLink: string;
  webViewLink: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
}

// ─── Resources ───────────────────────────────────────────────────────────────
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
