import { z } from "zod";
import yauzl from "yauzl";
import * as fs from "fs";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { scanLocalLibrary, scanMultipleLibraries, isPathAccessible } from "./localScanner";
import { autoTagAllModels } from "./autoTagger";
import { pickThumbnailsForAllModels, getThumbnailPickProgress, pickThumbnailForModel } from "./thumbnailPicker";
import * as db from "./db";

async function getLibraryPaths(): Promise<{ path: string; scanDepth: number }[]> {
  // First check the new library_paths table
  const paths = await db.getEnabledLibraryPaths();
  if (paths.length > 0) return paths;
  // Fall back to legacy single library_path setting
  const stored = await db.getSetting("library_path");
  return stored ? [{ path: stored, scanDepth: 2 }] : [];
}
// Legacy single-path helper (used by rescanOne)
async function getLibraryPath(): Promise<string> {
  const paths = await getLibraryPaths();
  return paths[0]?.path || "";
}

let scanInProgress = false;
let scanProgress = { modelsFound: 0, categoriesFound: 0, totalCollections: 0, currentFolder: "", phase: "discovering" as "discovering" | "scanning" | "saving" | "done" };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    setupRequired: publicProcedure.query(async () => {
      const exists = await db.adminExists();
      return { setupRequired: !exists };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    createUser: adminProcedure
      .input(z.object({ username: z.string().min(2), password: z.string().min(6), role: z.enum(["admin", "user"]).default("user") }))
      .mutation(async ({ input }) => {
        const { hashPassword } = await import("./_core/auth");
        const existing = await db.getUserByUsername(input.username);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
        const passwordHash = await hashPassword(input.password);
        await db.createLocalUser({ username: input.username, passwordHash, role: input.role });
        return { success: true };
      }),
  }),

  settings: router({
    update: adminProcedure
      .input(z.object({
        library_path: z.string().optional(),
        app_name: z.string().optional(),
        app_tagline: z.string().optional(),
        llm_api_url: z.string().optional(),
        llm_api_key: z.string().optional(),
        llm_model: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const keys = ["library_path", "app_name", "app_tagline", "llm_api_url", "llm_api_key", "llm_model"] as const;
        for (const key of keys) {
          if (input[key] !== undefined) await db.setSetting(key, input[key] as string);
        }
        // Sync LLM settings into ENV immediately so the LLM client picks them up
        // without requiring a server restart.
        const { ENV } = await import("./_core/env");
        if (input.llm_api_url !== undefined) ENV.llmApiUrl = input.llm_api_url;
        if (input.llm_api_key !== undefined) ENV.llmApiKey = input.llm_api_key;
        if (input.llm_model !== undefined) ENV.llmModel = input.llm_model;
        return { success: true };
      }),
    validateLibraryPath: adminProcedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input }) => {
        const { existsSync, statSync } = await import("fs");
        const exists = existsSync(input.path);
        if (!exists) return { valid: false, message: "Path does not exist" };
        const stat = statSync(input.path);
        if (!stat.isDirectory()) return { valid: false, message: "Path is not a directory" };
        return { valid: true, message: "Path is valid" };
      }),
    get: adminProcedure.query(async () => {
      const all = await db.getAllSettings();
      return {
        library_path: all["library_path"] || "",
        app_name: all["app_name"] || "",
        app_tagline: all["app_tagline"] || "",
        llm_api_url: all["llm_api_url"] || "",
        llm_api_key: all["llm_api_key"] || "",
        llm_model: all["llm_model"] || "",
      };
    }),
    llmStatus: publicProcedure.query(async () => {
      // Check whether the configured LLM is reachable and the model is available.
      // Used by the frontend startup check to show a setup reminder if needed.
      const { isLLMConfigured, listLLMModels } = await import("./_core/llm");
      const { ENV } = await import("./_core/env");
      if (!isLLMConfigured()) {
        return { configured: false, modelAvailable: false, availableModels: [] as string[], modelName: ENV.llmModel || "" };
      }
      try {
        const { data: models } = await listLLMModels();
        const modelName = ENV.llmModel?.toLowerCase() ?? "";
        const modelAvailable = models.some(
          (m) => m.id.toLowerCase() === modelName || m.id.toLowerCase().startsWith(modelName)
        );
        return {
          configured: true,
          modelAvailable,
          availableModels: models.map((m) => m.id),
          modelName: ENV.llmModel || "",
        };
      } catch {
        return { configured: true, modelAvailable: false, availableModels: [] as string[], modelName: ENV.llmModel || "" };
      }
    }),
    // Library paths management (multi-drive support)
    libraryPaths: adminProcedure.query(async () => {
      return db.getLibraryPaths();
    }),
    addLibraryPath: adminProcedure
      .input(z.object({ path: z.string().min(1), label: z.string().min(1), scanDepth: z.number().int().min(2).max(3).default(2) }))
      .mutation(async ({ input }) => {
        const { existsSync, statSync } = await import("fs");
        if (!existsSync(input.path)) throw new TRPCError({ code: "BAD_REQUEST", message: "Path does not exist" });
        if (!statSync(input.path).isDirectory()) throw new TRPCError({ code: "BAD_REQUEST", message: "Path is not a directory" });
        await db.addLibraryPath({ path: input.path, label: input.label, scanDepth: input.scanDepth });
        return { success: true };
      }),
    removeLibraryPath: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeLibraryPath(input.id);
        return { success: true };
      }),
    toggleLibraryPath: adminProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleLibraryPath(input.id, input.enabled);
        return { success: true };
      }),
    updateLibraryPathDepth: adminProcedure
      .input(z.object({ id: z.number(), scanDepth: z.number().int().min(2).max(3) }))
      .mutation(async ({ input }) => {
        await db.updateLibraryPathDepth(input.id, input.scanDepth);
        return { success: true };
      }),
    // Public settings (branding) — visible to all users
    branding: publicProcedure.query(async () => {
      const all = await db.getAllSettings();
      return {
        app_name: all["app_name"] || "PrintLib",
        app_tagline: all["app_tagline"] || "Your 3D Model Library",
        app_logo: all["app_logo"] || "",
      };
    }),
    // Folder browser for library path selection
    browseFolder: adminProcedure
      .input(z.object({ path: z.string().optional() }))
      .query(async ({ input }) => {
        const { readdirSync, statSync, existsSync } = await import("fs");
        const nodePath = await import("path");
        // No path = show drive roots (Windows) or / (Unix)
        if (!input.path) {
          if (process.platform === "win32") {
            const roots: { name: string; path: string }[] = [];
            for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
              const p = `${letter}:\\`;
              try { statSync(p); roots.push({ name: `${letter}:  (Drive)`, path: p }); } catch {}
            }
            return { current: "", parent: null, entries: roots };
          }
          const entries = readdirSync("/", { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith("."))
            .map(e => ({ name: e.name, path: `/${e.name}` }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return { current: "/", parent: null, entries };
        }
        const current = input.path;
        if (!existsSync(current)) throw new TRPCError({ code: "BAD_REQUEST", message: "Path does not exist" });
        const parentPath = nodePath.dirname(current);
        const parent = parentPath !== current ? parentPath : null;
        let entries: { name: string; path: string }[] = [];
        try {
          entries = readdirSync(current, { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith("."))
            .map(e => ({ name: e.name, path: nodePath.join(current, e.name) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot read this folder" });
        }
        return { current, parent, entries };
      }),
  }),

  scan: router({
    start: adminProcedure.mutation(async () => {
      if (scanInProgress) return { success: false, message: "Scan already in progress" };
      const libraryPaths = await getLibraryPaths();
      if (!libraryPaths.length) return { success: false, message: "No library paths configured. Go to Settings to add your library folders." };
      scanInProgress = true;
      scanProgress = { modelsFound: 0, categoriesFound: 0, totalCollections: 0, currentFolder: "Scanning folder structure…", phase: "discovering" };
      const log = await db.createScanLog();
      const logId = log?.id;
      (async () => {
        try {
          const scannedCategories = await scanMultipleLibraries(libraryPaths, (update) => {
            scanProgress.modelsFound = update.modelsFound;
            scanProgress.categoriesFound = update.collectionsScanned;
            scanProgress.totalCollections = update.totalCollections;
            scanProgress.currentFolder = update.currentFolder;
            scanProgress.phase = update.phase === "Saving to database" ? "saving" : "scanning";
          });

          scanProgress.phase = "saving";
          scanProgress.currentFolder = "Saving to database…";

          // Upsert categories (use localId as driveId for schema compatibility)
          for (const cat of scannedCategories) {
            await db.upsertCategory({
              driveId: cat.localId,
              name: cat.name,
              parentDriveId: null,
              path: cat.name,
            });
          }
          const allCats = await db.getAllCategories();
          const catByLocalId = new Map(allCats.map((c) => [c.driveId, c.id]));

          const allLocalIds: string[] = [];
          const allCatLocalIds: string[] = [];

          for (const cat of scannedCategories) {
            allCatLocalIds.push(cat.localId);
            for (const model of cat.models) {
              allLocalIds.push(model.localId);
              const categoryId = catByLocalId.get(cat.localId) ?? null;
              const modelRootPath = model.rootPath || "";
              const images = model.images.map((f) => ({
                fileId: f.relativePath,
                name: f.name,
                thumbnailLink: `/local-files/${f.relativePath}`,
                webContentLink: `/local-files/${f.relativePath}`,
                mimeType: f.mimeType,
                absPath: modelRootPath ? require("path").join(modelRootPath, f.relativePath) : "",
              }));
              const modelFiles = model.files.filter((f) => !f.isImage).map((f) => ({
                fileId: f.relativePath,
                name: f.name,
                size: String(f.size),
                mimeType: f.mimeType,
                webContentLink: `/local-files/${f.relativePath}`,
                absPath: modelRootPath ? require("path").join(modelRootPath, f.relativePath) : "",
              }));
              const thumbnailUrl = model.thumbnailPath ? `/local-files/${model.thumbnailPath}` : "";
              await db.upsertModel({
                driveId: model.localId,
                name: model.name,
                categoryId,
                path: model.relativePath,
                rootPath: modelRootPath,
                images,
                modelFiles,
                thumbnailUrl,
                driveCreatedAt: undefined,
              });
              scanProgress.modelsFound++;
            }
          }

          // Hard delete stale entries
          const deletedModels = await db.deleteModelsNotIn(allLocalIds);
          const deletedCats = await db.deleteCategoriesNotIn(allCatLocalIds);
          if (deletedModels > 0 || deletedCats > 0) {
            console.log(`[Scan] Removed ${deletedModels} stale model(s) and ${deletedCats} stale category(ies)`);
          }

          const totalModels = scannedCategories.reduce((sum, c) => sum + c.models.length, 0);
          if (logId) await db.updateScanLog(logId, { status: "completed", modelsFound: totalModels, categoriesFound: scannedCategories.length, completedAt: new Date() });

          autoTagAllModels().catch((err) => console.warn("[AutoTagger] Post-scan tagging failed:", err));
          pickThumbnailsForAllModels().catch((err) => console.warn("[ThumbnailPicker] Post-scan pick failed:", err));
        } catch (err: any) {
          if (logId) await db.updateScanLog(logId, { status: "failed", errorMessage: err?.message || "Unknown error", completedAt: new Date() });
        } finally {
          scanInProgress = false;
        }
      })();
      return { success: true, message: "Scan started", logId };
    }),
    status: protectedProcedure.query(async () => {
      const log = await db.getLastScanLog();
      const paths = await db.getEnabledLibraryPaths();
      return {
        inProgress: scanInProgress,
        lastScan: log,
        progress: scanInProgress ? scanProgress : null,
        isConfigured: paths.length > 0,
      };
    }),
  }),

  categories: router({
    list: protectedProcedure.query(async () => db.getAllCategories()),
    updateLabel: protectedProcedure
      .input(z.object({ driveId: z.string(), customLabel: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateCategoryLabel(input.driveId, input.customLabel);
        return { success: true };
      }),
    reorder: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.reorderCategories(input.orderedIds);
        return { success: true };
      }),
  }),

  models: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
        fileType: z.string().optional(),
        sortBy: z.enum(["name_asc", "name_desc", "newest", "drive_created", "most_files", "most_renders"]).optional(),
        favoritesOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => db.getAllModels(input)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const model = await db.getModelById(input.id);
        if (!model) return null;
        const modelTags = await db.getTagsForModel(input.id);
        // Build the full local folder path for Open in Explorer / Open in Slicer.
        // model.path stores the clean relative path (e.g. "Beasts and Minis/Dragon").
        // model.driveId is the prefixed localId (e.g. "__root__::Beasts and Minis/Dragon")
        // and must NOT be used here — joining rootPath + driveId produces a broken path.
        const nodePath = require("path");
        const rootPath = model.rootPath || "";
        const localFolderPath = rootPath && model.path
          ? nodePath.join(rootPath, model.path)
          : model.path || "";
        return { ...model, tags: modelTags, localFolderPath };
      }),
    updateMeta: protectedProcedure
      .input(z.object({
        id: z.number(),
        customNotes: z.string().optional(),
        isFavorite: z.boolean().optional(),
        categoryId: z.number().optional(),
        printSettings: z.object({
          material: z.string().optional(),
          layerHeight: z.string().optional(),
          infillDensity: z.string().optional(),
          infillPattern: z.string().optional(),
          supports: z.string().optional(),
          supportSpacing: z.string().optional(),
          supportInterfaceLayers: z.string().optional(),
          printSpeed: z.string().optional(),
          wallCount: z.string().optional(),
          nozzleSize: z.string().optional(),
        }).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, printSettings, ...rest } = input;
        await db.updateModelMeta(id, { ...rest, printSettings: printSettings as Record<string,string> | null | undefined });
        return { success: true };
      }),
    count: protectedProcedure.query(async () => db.getModelCount()),
    recent: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => db.getRecentModels(input?.limit ?? 20)),
    setHeroImage: protectedProcedure
      .input(z.object({ id: z.number(), heroImage: z.string().nullable() }))
      .mutation(async ({ input }) => {
        // Mark as "manual" so auto-scan never overwrites this choice
        await db.updateModelHeroImage(input.id, input.heroImage, "manual");
        return { success: true };
      }),

    clearHeroImage: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Clears both heroImage and heroImageSource so AI can re-pick on next scan
        await db.clearModelHeroImage(input.id);
        return { success: true };
      }),

    zipContents: protectedProcedure
      .input(z.object({ filePath: z.string(), fileName: z.string() }))
      .query(async ({ input }) => {
        if (!fs.existsSync(input.filePath)) throw new Error("ZIP file not found");
        return new Promise<{ name: string; size: number; isDirectory: boolean }[]>((resolve, reject) => {
          const entries: { name: string; size: number; isDirectory: boolean }[] = [];
          yauzl.open(input.filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) return reject(err || new Error("Could not open ZIP"));
            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
              const isDirectory = /\/$/.test(entry.fileName);
              if (!isDirectory) {
                entries.push({ name: entry.fileName, size: entry.uncompressedSize, isDirectory: false });
              }
              zipfile.readEntry();
            });
            zipfile.on("end", () => {
              entries.sort((a, b) => a.name.localeCompare(b.name));
              resolve(entries);
            });
            zipfile.on("error", reject);
          });
        });
      }),

    rescanOne: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const model = await db.getModelById(input.id);
        if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });

        const libraryPath = await getLibraryPath();
        if (!libraryPath) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Library path not configured" });

                // model.path stores the clean relative path (e.g. "Beasts and Minis/Dragon").
        // model.driveId is the prefixed localId and must NOT be used for filesystem operations.
        const modelRelPath = model.path || "";
        const modelFolderPath = require("path").join(libraryPath, modelRelPath);
        const { existsSync } = require("fs");
        if (!existsSync(modelFolderPath)) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Model folder not found at: ${modelFolderPath}` });
        }
        // Re-detect parent collection by checking the folder's parent directory name
        const parentFolderName = require("path").dirname(modelRelPath); // e.g. "Beasts and Minis"
        const allCategories = await db.getAllCategories();
        const matchedCategory = allCategories.find((c) => c.name === parentFolderName || c.driveId === parentFolderName);
        let newCategoryId: number | null = model.categoryId ?? null;
        let movedToCategory: string | null = null;
        if (matchedCategory) {
          newCategoryId = matchedCategory.id;
          if (matchedCategory.id !== model.categoryId) {
            movedToCategory = matchedCategory.customLabel || matchedCategory.name;
          }
        }

        // Re-scan the model folder for files
        const { scanLocalLibrary: _scan } = await import("./localScanner");
        // We only need to scan this one folder — use the parent collection as the root
        const collectionPath = require("path").join(libraryPath, parentFolderName);
        const scanned = await _scan(collectionPath);
        const scannedModel = scanned.flatMap((c) => c.models).find((m) => m.name === model.name);

        const rescanModelRoot = model.rootPath || libraryPath;
        const images = (scannedModel?.images ?? []).map((f) => ({
          fileId: f.relativePath,
          name: f.name,
          thumbnailLink: `/local-files/${f.relativePath}`,
          webContentLink: `/local-files/${f.relativePath}`,
          mimeType: f.mimeType,
          absPath: rescanModelRoot ? require("path").join(rescanModelRoot, f.relativePath) : "",
        }));
        const modelFiles = (scannedModel?.files ?? []).filter((f) => !f.isImage).map((f) => ({
          fileId: f.relativePath,
          name: f.name,
          size: String(f.size),
          mimeType: f.mimeType,
          webContentLink: `/local-files/${f.relativePath}`,
          absPath: rescanModelRoot ? require("path").join(rescanModelRoot, f.relativePath) : "",
        }));
        const thumbnailUrl = scannedModel?.thumbnailPath
          ? `/local-files/${scannedModel.thumbnailPath}`
          : model.thumbnailUrl ?? "";

        await db.upsertModel({
          driveId: model.driveId ?? "",
          name: model.name,
          categoryId: newCategoryId,
          path: model.path ?? "",
          images,
          modelFiles,
          thumbnailUrl,
          driveCreatedAt: model.driveCreatedAt ? new Date(model.driveCreatedAt) : undefined,
        });

        await pickThumbnailForModel(input.id, images).catch((err: any) =>
          console.warn("[RescanOne] Thumbnail pick failed:", err)
        );

        return {
          success: true,
          imagesFound: images.length,
          filesFound: modelFiles.length,
          movedToCategory,
        };
      }),

    updateSource: protectedProcedure
      .input(z.object({ id: z.number(), sourceUrl: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await db.updateModelSource(input.id, input.sourceUrl);
        return { success: true };
      }),

    bulkTag: protectedProcedure
      .input(z.object({
        modelIds: z.array(z.number()).min(1),
        addTagIds: z.array(z.number()).default([]),
        removeTagIds: z.array(z.number()).default([]),
      }))
      .mutation(async ({ input }) => {
        await db.bulkTagModels(input.modelIds, input.addTagIds, input.removeTagIds);
        return { success: true, count: input.modelIds.length };
      }),

    renameFile: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        fileType: z.enum(["image", "model"]),
        fileId: z.string(),
        newName: z.string().min(1).max(512),
      }))
      .mutation(async ({ input }) => {
        await db.renameModelFile(input.modelId, input.fileType, input.fileId, input.newName);
        return { success: true };
      }),
  }),

  tags: router({
    list: protectedProcedure.query(async () => db.getAllTags()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), color: z.string().default("#6366f1") }))
      .mutation(async ({ input }) => db.createTag(input.name, input.color)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteTag(input.id); return { success: true }; }),
    addToModel: protectedProcedure
      .input(z.object({ modelId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => { await db.addTagToModel(input.modelId, input.tagId); return { success: true }; }),
    removeFromModel: protectedProcedure
      .input(z.object({ modelId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => { await db.removeTagFromModel(input.modelId, input.tagId); return { success: true }; }),
        getForModel: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => db.getTagsForModel(input.modelId)),
    reTagAll: adminProcedure.mutation(async () => {
      // Fire-and-forget so the HTTP response returns immediately
      // forceAll=true: re-tag even locked models when manually triggered
      autoTagAllModels(true).catch((err) => console.warn("[AutoTagger] Manual re-tag failed:", err));
      return { success: true, message: "Re-tagging started in background" };
    }),
  }),

  thumbnails: router({
    // Re-pick ALL models (AI + unset), always skips manual picks
    rePickAll: adminProcedure.mutation(async () => {
      pickThumbnailsForAllModels(true).catch((err) => console.warn("[ThumbnailPicker] Manual re-pick failed:", err));
      return { success: true, message: "Thumbnail re-pick (AI + unset) started in background" };
    }),
    // Re-pick only models with no heroImage yet (auto-scan equivalent)
    rePickUnset: adminProcedure.mutation(async () => {
      pickThumbnailsForAllModels(false).catch((err) => console.warn("[ThumbnailPicker] Re-pick unset failed:", err));
      return { success: true, message: "Thumbnail re-pick (unset only) started in background" };
    }),
    progress: adminProcedure.query(() => getThumbnailPickProgress()),
  }),

  access: router({
    // In local mode, all logged-in users are approved (access is controlled by who has a login account)
    check: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      if (user.role === "admin") return { status: "approved" as const };
      // Non-admin users: check if they have an approved access record, or default to approved
      // (local installs typically trust everyone with a login)
      const record = user.username ? await db.getAccessRequestByUsername(user.username) : null;
      if (!record) return { status: "approved" as const }; // no record = approved by default
      return { status: record.status };
    }),

    // Admin: list all access requests
    list: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "denied", "all"]).optional() }))
      .query(async ({ input }) => db.listAccessRequests(input.status === "all" ? undefined : input.status)),

    // Admin: approve a user
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAccessStatus(input.id, "approved");
        return { success: true };
      }),

    // Admin: deny a user
    deny: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAccessStatus(input.id, "denied");
        return { success: true };
      }),

    // Admin: pre-add an email to the approved list
    preAdd: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.preAddApprovedEmail(input.email, input.name);
        return { success: true };
      }),

    // Admin: remove an entry from the access list
    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeAccessEntry(input.id);
        return { success: true };
      }),
  }),

  resources: router({
    list: protectedProcedure.query(() => db.listResources()),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        url: z.string().url(),
        logoUrl: z.string().url().nullable().optional(),
        description: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createResource(input);
        return { success: true, id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        url: z.string().url().optional(),
        logoUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateResource(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteResource(input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
