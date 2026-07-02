import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { scanDrive, validateDriveApiKey, collectAllFilesForModel, getParentCollectionForModel } from "./driveScanner";
import { updateHeartbeatJob } from "./_core/heartbeat";
import { autoTagAllModels } from "./autoTagger";
import { pickThumbnailsForAllModels, getThumbnailPickProgress, pickThumbnailForModel } from "./thumbnailPicker";
import * as db from "./db";

const SYNC_TASK_UID = "YeLVQQNJAMhDVqnhjxHN7T";
function buildCron(schedule: "hourly" | "nightly", hour = 3): string {
  if (schedule === "hourly") return "0 0 * * * *";
  return `0 0 ${hour} * * *`;
}

const DEFAULT_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || "";
const DEFAULT_FOLDER_ID = "1sQRvAn0PbrvaKoJ8hqlqBBGhCLXhLXiZ";

async function getApiKey(): Promise<string> {
  const stored = await db.getSetting("drive_api_key");
  return stored || DEFAULT_API_KEY;
}

async function getFolderId(): Promise<string> {
  const stored = await db.getSetting("drive_folder_id");
  return stored || DEFAULT_FOLDER_ID;
}

let scanInProgress = false;
let scanProgress = { modelsFound: 0, categoriesFound: 0, totalCollections: 0, currentFolder: "", skippedCount: 0, phase: "discovering" as "discovering" | "scanning" | "saving" | "done" };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  settings: router({
    // Owner-only: exposes Drive API key — never visible to Viewers
    update: adminProcedure
      .input(z.object({ drive_api_key: z.string().optional(), drive_folder_id: z.string().optional() }))
      .mutation(async ({ input }) => {
        if (input.drive_api_key !== undefined) await db.setSetting("drive_api_key", input.drive_api_key);
        if (input.drive_folder_id !== undefined) await db.setSetting("drive_folder_id", input.drive_folder_id);
        return { success: true };
      }),
    validate: adminProcedure
      .input(z.object({ apiKey: z.string(), folderId: z.string() }))
      .mutation(async ({ input }) => {
        const valid = await validateDriveApiKey(input.apiKey, input.folderId);
        return { valid };
      }),
    updateSyncSchedule: adminProcedure
      .input(z.object({ schedule: z.enum(["hourly", "nightly"]), hour: z.number().int().min(0).max(23).optional() }))
      .mutation(async ({ ctx, input }) => {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        // Resolve the hour: use provided value, fall back to stored, then default 3
        const storedHour = await db.getSetting("nightly_hour");
        const resolvedHour = input.hour ?? (storedHour ? parseInt(storedHour, 10) : 3);
        const cron = buildCron(input.schedule, resolvedHour);
        const hourLabel = String(resolvedHour).padStart(2, "0");
        const description = input.schedule === "nightly"
          ? `Nightly background rescan of Google Drive for new 3D models (${hourLabel}:00 UTC)`
          : "Hourly background rescan of Google Drive for new 3D models";
        await updateHeartbeatJob(SYNC_TASK_UID, { cron, description }, sessionToken);
        await db.setSetting("sync_schedule", input.schedule);
        if (input.schedule === "nightly" && input.hour !== undefined) {
          await db.setSetting("nightly_hour", String(input.hour));
        }
        return { schedule: input.schedule, hour: resolvedHour };
      }),
    get: adminProcedure.query(async () => {
      const all = await db.getAllSettings();
      const nightlyHourRaw = all["nightly_hour"];
      return {
        drive_api_key: all["drive_api_key"] || DEFAULT_API_KEY,
        drive_folder_id: all["drive_folder_id"] || DEFAULT_FOLDER_ID,
        sync_schedule: (all["sync_schedule"] as "hourly" | "nightly" | undefined) ?? "hourly",
        nightly_hour: nightlyHourRaw ? parseInt(nightlyHourRaw, 10) : 3,
      };
    }),
  }),

  scan: router({
    start: adminProcedure
      .input(z.object({ incremental: z.boolean().optional() }).optional())
      .mutation(async ({ input }) => {
      if (scanInProgress) return { success: false, message: "Scan already in progress" };
      scanInProgress = true;
      const isIncremental = input?.incremental ?? false;
      scanProgress = { modelsFound: 0, categoriesFound: 0, totalCollections: 0, currentFolder: "Connecting to Google Drive…", skippedCount: 0, phase: "discovering" };
      const log = await db.createScanLog();
      const logId = log?.id;
      (async () => {
        try {
          const apiKey = await getApiKey();
          const folderId = await getFolderId();
          scanProgress.currentFolder = isIncremental ? "Checking for changes…" : "Scanning folder structure…";
          // For incremental sync, load existing model timestamps to skip unchanged folders
          const existingTimestamps = isIncremental ? await db.getModelScanTimestamps() : undefined;
          const result = await scanDrive(apiKey, folderId, (update) => {
            scanProgress.modelsFound = update.modelsFound;
            scanProgress.categoriesFound = update.categoriesFound;
            scanProgress.totalCollections = update.totalCollections;
            scanProgress.currentFolder = update.currentFolder;
            scanProgress.skippedCount = update.skippedCount;
            scanProgress.phase = update.phase;
          }, existingTimestamps);
          // Upsert all Level-1 collection folders as categories
          scanProgress.phase = "saving";
          scanProgress.currentFolder = "Saving to database…";
          for (const cat of result.categories) {
            await db.upsertCategory(cat);
            // Do NOT increment categoriesFound here — it's already set by the Drive scan phase
            // and incrementing again would push it past totalCollections
          }
          const allCats = await db.getAllCategories();
          // Build a lookup: collection driveId → category db id
          const catByDriveId = new Map(allCats.map((c) => [c.driveId, c.id]));
          for (const model of result.models) {
            // Skip models that were unchanged in incremental mode
            if (model.skipped) continue;
            // The model's path is: rootName / CollectionName / ModelName
            // The collection driveId is embedded in the path as the 2nd segment's folder.
            // We derive it by matching path segment against categories.
            const pathParts = model.path.split(" / ");
            const collectionName = pathParts[1]; // e.g. "Beasts and Minis"
            const matchedCat = allCats.find(
              (c) => c.name === collectionName && c.parentDriveId === folderId
            );
            scanProgress.currentFolder = model.name;
            scanProgress.phase = "saving";
            await db.upsertModel({
              driveId: model.driveId,
              name: model.name,
              categoryId: matchedCat?.id ?? null,
              path: model.path,
              images: model.images,
              modelFiles: model.modelFiles,
              thumbnailUrl: model.thumbnailUrl,
              driveCreatedAt: model.driveCreatedAt,
            });
            scanProgress.modelsFound++;
          }
          // Hard delete: remove models and categories no longer in Drive
          const scannedModelDriveIds = result.models.map((m) => m.driveId);
          const scannedCatDriveIds = result.categories.map((c) => c.driveId);
          const deletedModels = await db.deleteModelsNotIn(scannedModelDriveIds);
          const deletedCats = await db.deleteCategoriesNotIn(scannedCatDriveIds);
          if (deletedModels > 0 || deletedCats > 0) {
            console.log(`[Scan] Hard deleted ${deletedModels} stale model(s) and ${deletedCats} stale category(ies)`);
          }
          const updatedCount = result.models.filter(m => !m.skipped).length;
          if (logId) await db.updateScanLog(logId, { status: "completed", modelsFound: updatedCount, categoriesFound: result.categories.length, completedAt: new Date() });
          // Auto-tag all models after a successful scan (fire-and-forget, non-blocking)
          autoTagAllModels().catch((err) => console.warn("[AutoTagger] Post-scan tagging failed:", err));
          // Pick best thumbnails after scan (fire-and-forget, non-blocking)
          pickThumbnailsForAllModels().catch((err) => console.warn("[ThumbnailPicker] Post-scan pick failed:", err));
        } catch (err: any) {
          if (logId) await db.updateScanLog(logId, { status: "failed", errorMessage: err?.message || "Unknown error", completedAt: new Date() });
        } finally {
          scanInProgress = false;
        }
      })();
      return { success: true, message: isIncremental ? "Incremental sync started" : "Full scan started", logId };
    }),
    status: protectedProcedure.query(async () => {
      const log = await db.getLastScanLog();
      return {
        inProgress: scanInProgress,
        lastScan: log,
        progress: scanInProgress ? scanProgress : null,
        skippedCount: scanProgress.skippedCount,
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
        sortBy: z.enum(["name_asc", "name_desc", "newest", "most_files", "most_renders"]).optional(),
      }).optional())
      .query(async ({ input }) => db.getAllModels(input)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const model = await db.getModelById(input.id);
        if (!model) return null;
        const modelTags = await db.getTagsForModel(input.id);
        return { ...model, tags: modelTags };
      }),
    updateMeta: protectedProcedure
      .input(z.object({ id: z.number(), customNotes: z.string().optional(), isFavorite: z.boolean().optional(), categoryId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateModelMeta(id, data);
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

    rescanOne: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Fetch the model record to get its driveId
        const model = await db.getModelById(input.id);
        if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });

        const apiKey = await getApiKey();

        // ── Re-detect parent collection folder from Drive ──────────────────
        // The Drive API with an API key does not return the `parents` field, so we
        // instead scan each known collection folder's children to find this model.
        let newCategoryId: number | null = model.categoryId ?? null;
        let movedToCategory: string | null = null;
        try {
          const allCategories = await db.getAllCategories();
          const collectionDriveIds = allCategories.map((c) => c.driveId);
          const foundCollectionDriveId = await getParentCollectionForModel(
            model.driveId,
            collectionDriveIds,
            apiKey
          );
          if (foundCollectionDriveId) {
            const matchedCategory = allCategories.find((c) => c.driveId === foundCollectionDriveId);
            if (matchedCategory) {
              newCategoryId = matchedCategory.id;
              if (matchedCategory.id !== model.categoryId) {
                movedToCategory = matchedCategory.customLabel || matchedCategory.name;
                console.log(`[RescanOne] Model ${model.id} moved to category: ${matchedCategory.name}`);
              }
            }
          } else {
            console.warn(`[RescanOne] Model ${model.id} (${model.driveId}) not found in any collection folder`);
          }
        } catch (err) {
          console.warn("[RescanOne] Could not detect parent collection:", err);
        }

        const { images, modelFiles } = await collectAllFilesForModel(model.driveId, apiKey);

        // Pick a basic thumbnail from the refreshed images
        const firstImg = images[0];
        const thumbnailUrl = firstImg?.thumbnailLink
          ? firstImg.thumbnailLink.replace("=s220", "=s400")
          : model.thumbnailUrl ?? "";

        // Update the model record with fresh files/images and (possibly new) category
        await db.upsertModel({
          driveId: model.driveId,
          name: model.name,
          categoryId: newCategoryId,
          path: model.path ?? "",
          images,
          modelFiles,
          thumbnailUrl,
          driveCreatedAt: model.driveCreatedAt ? new Date(model.driveCreatedAt) : undefined,
        });

        // Re-run thumbnail picker for this model only (skips if manually set)
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
    // Called on every page load for authenticated users to check their approval status
    check: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      const ownerOpenId = process.env.OWNER_OPEN_ID || "";
      // Owner is always approved
      if (user.openId === ownerOpenId || user.role === "admin") {
        return { status: "approved" as const };
      }
      const email = user.email?.toLowerCase();
      if (!email) return { status: "pending" as const };
      // Upsert the access request (creates pending entry if first time)
      // Check if this is a brand-new request (no existing record) before upsert
      const existingRecord = await db.getAccessRequestByOpenId(user.openId);
      const isNewRequest = !existingRecord;
      const record = await db.upsertAccessRequest({
        email,
        name: user.name ?? null,
        openId: user.openId,
      });
      if (!record) return { status: "pending" as const };
      // Notify owner only on first-time access request creation
      if (isNewRequest && record.status === "pending" && !record.preAdded) {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: "New access request — Kenny Print It?",
          content: `${user.name ?? "Someone"} (${email}) has signed in and is waiting for approval. Go to Settings → Access Control to approve or deny.`,
        }).catch(() => {});
      }
      return { status: record.status };
    }),

    // Admin: list all access requests
    list: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "denied"]).optional() }))
      .query(async ({ input }) => db.listAccessRequests(input.status)),

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
