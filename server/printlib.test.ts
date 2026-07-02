import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getAllSettings: vi.fn().mockResolvedValue({}),
  getAllCategories: vi.fn().mockResolvedValue([]),
  getAllModels: vi.fn().mockResolvedValue([]),
  getModelById: vi.fn().mockResolvedValue(null),
  getTagsForModel: vi.fn().mockResolvedValue([]),
  getAllTags: vi.fn().mockResolvedValue([]),
  getLastScanLog: vi.fn().mockResolvedValue(null),
  createScanLog: vi.fn().mockResolvedValue({ id: 1, status: "running" }),
  updateScanLog: vi.fn().mockResolvedValue(undefined),
  getModelCount: vi.fn().mockResolvedValue(0),
  createTag: vi.fn().mockResolvedValue({ id: 1, name: "test", color: "#6366f1" }),
  deleteTag: vi.fn().mockResolvedValue(undefined),
  addTagToModel: vi.fn().mockResolvedValue(undefined),
  removeTagFromModel: vi.fn().mockResolvedValue(undefined),
  upsertCategory: vi.fn().mockResolvedValue(undefined),
  upsertModel: vi.fn().mockResolvedValue(undefined),
  updateCategoryLabel: vi.fn().mockResolvedValue(undefined),
  updateModelMeta: vi.fn().mockResolvedValue(undefined),
  deleteModelsNotIn: vi.fn().mockResolvedValue(2),
  deleteCategoriesNotIn: vi.fn().mockResolvedValue(1),
  // Access control helpers
  getAccessRequestByOpenId: vi.fn().mockResolvedValue(null),
  upsertAccessRequest: vi.fn().mockResolvedValue({ id: 1, email: "viewer@example.com", name: "Viewer", openId: "viewer-open-id", status: "pending", preAdded: false, requestedAt: new Date(), updatedAt: new Date() }),
  listAccessRequests: vi.fn().mockResolvedValue([]),
  updateAccessStatus: vi.fn().mockResolvedValue(undefined),
  preAddApprovedEmail: vi.fn().mockResolvedValue(undefined),
  removeAccessEntry: vi.fn().mockResolvedValue(undefined),
}));

// Mock the driveScanner module
vi.mock("./driveScanner", () => ({
  scanDrive: vi.fn().mockResolvedValue({ categories: [], models: [] }),
  validateDriveApiKey: vi.fn().mockResolvedValue(true),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-open-id",
      name: "Kenny",
      email: "kenny@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("settings router", () => {
  it("returns default settings when called by admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.settings.get();
    expect(result).toHaveProperty("drive_api_key");
    expect(result).toHaveProperty("drive_folder_id");
  });

  it("saves settings successfully when called by admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.settings.update({
      drive_api_key: "test-key",
      drive_folder_id: "test-folder",
    });
    expect(result.success).toBe(true);
  });

  it("validates connection successfully when called by admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.settings.validate({
      apiKey: "test-key",
      folderId: "test-folder",
    });
    expect(result.valid).toBe(true);
  });

  it("blocks viewer from accessing settings", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.settings.get()).rejects.toThrow();
  });
});

describe("models router", () => {
  it("returns empty list when no models exist", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.models.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("returns null for non-existent model", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.models.get({ id: 9999 });
    expect(result).toBeNull();
  });

  it("returns model count", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.models.count();
    expect(typeof result).toBe("number");
  });

  it("blocks unauthenticated access to models", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.models.list({})).rejects.toThrow();
  });
});

describe("categories router", () => {
  it("returns empty list when no categories exist", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tags router", () => {
  it("returns empty list when no tags exist", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.tags.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a tag", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.tags.create({ name: "test-tag", color: "#6366f1" });
    expect(result).not.toBeNull();
  });
});

describe("scan router", () => {
  it("returns scan status when authenticated", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.scan.status();
    expect(result).toHaveProperty("inProgress");
    expect(result).toHaveProperty("lastScan");
  });

  it("blocks unauthenticated access to scan status", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.scan.status()).rejects.toThrow();
  });
});

describe("auth router", () => {
  it("returns null user when not authenticated", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Helper: create a viewer (non-admin) context ────────────────────────────
function createViewerCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "viewer-open-id",
      name: "Viewer",
      email: "viewer@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("access router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("access.check returns approved for admin (owner)", async () => {
    // Admin is always approved regardless of access_requests table
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.check();
    expect(result.status).toBe("approved");
  });

  it("access.check returns pending for a new viewer (no prior record)", async () => {
    const dbMock = await import("./db");
    vi.mocked(dbMock.upsertAccessRequest).mockResolvedValueOnce({
      id: 1,
      email: "viewer@example.com",
      name: "Viewer",
      openId: "viewer-open-id",
      status: "pending",
      preAdded: false,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(createViewerCtx());
    const result = await caller.access.check();
    expect(result.status).toBe("pending");
  });

  it("access.check returns approved for a viewer whose request was approved", async () => {
    const dbMock = await import("./db");
    vi.mocked(dbMock.upsertAccessRequest).mockResolvedValueOnce({
      id: 1,
      email: "viewer@example.com",
      name: "Viewer",
      openId: "viewer-open-id",
      status: "approved",
      preAdded: false,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(createViewerCtx());
    const result = await caller.access.check();
    expect(result.status).toBe("approved");
  });

  it("access.approve updates status to approved (admin only)", async () => {
    const dbMock = await import("./db");
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.approve({ id: 1 });
    expect(result.success).toBe(true);
    expect(dbMock.updateAccessStatus).toHaveBeenCalledWith(1, "approved");
  });

  it("access.deny updates status to denied (admin only)", async () => {
    const dbMock = await import("./db");
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.deny({ id: 1 });
    expect(result.success).toBe(true);
    expect(dbMock.updateAccessStatus).toHaveBeenCalledWith(1, "denied");
  });

  it("access.approve is blocked for non-admin viewers", async () => {
    const caller = appRouter.createCaller(createViewerCtx());
    await expect(caller.access.approve({ id: 1 })).rejects.toThrow();
  });

  it("access.deny is blocked for non-admin viewers", async () => {
    const caller = appRouter.createCaller(createViewerCtx());
    await expect(caller.access.deny({ id: 1 })).rejects.toThrow();
  });

  it("access.preAdd calls preAddApprovedEmail (admin only)", async () => {
    const dbMock = await import("./db");
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.preAdd({ email: "friend@example.com", name: "Friend" });
    expect(result.success).toBe(true);
    expect(dbMock.preAddApprovedEmail).toHaveBeenCalledWith("friend@example.com", "Friend");
  });

  it("access.preAdd is blocked for non-admin viewers", async () => {
    const caller = appRouter.createCaller(createViewerCtx());
    await expect(caller.access.preAdd({ email: "friend@example.com" })).rejects.toThrow();
  });

  it("access.remove calls removeAccessEntry (admin only)", async () => {
    const dbMock = await import("./db");
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.remove({ id: 5 });
    expect(result.success).toBe(true);
    expect(dbMock.removeAccessEntry).toHaveBeenCalledWith(5);
  });

  it("access.remove is blocked for non-admin viewers", async () => {
    const caller = appRouter.createCaller(createViewerCtx());
    await expect(caller.access.remove({ id: 5 })).rejects.toThrow();
  });

  it("access.list returns all access requests (admin only)", async () => {
    const dbMock = await import("./db");
    vi.mocked(dbMock.listAccessRequests).mockResolvedValueOnce([
      { id: 1, email: "viewer@example.com", name: "Viewer", openId: "viewer-open-id", status: "pending", preAdded: false, requestedAt: new Date(), updatedAt: new Date() },
    ]);
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.access.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });

  it("access.list is blocked for non-admin viewers", async () => {
    const caller = appRouter.createCaller(createViewerCtx());
    await expect(caller.access.list({})).rejects.toThrow();
  });
});

describe("hard delete on scan", () => {
  it("calls deleteModelsNotIn and deleteCategoriesNotIn after a successful scan", async () => {
    const { scanDrive } = await import("./driveScanner");
    const dbMock = await import("./db");

    // Simulate scan returning 1 model and 1 category
    vi.mocked(scanDrive).mockResolvedValueOnce({
      categories: [{ driveId: "cat-1", name: "Beasts and Minis", parentDriveId: "root" }],
      models: [{
        driveId: "model-1",
        name: "Test Model",
        path: "Root / Beasts and Minis / Test Model",
        images: [],
        modelFiles: [],
        thumbnailUrl: null,
      }],
    });
    vi.mocked(dbMock.getAllCategories).mockResolvedValueOnce([
      { id: 1, driveId: "cat-1", name: "Beasts and Minis", parentDriveId: "root", customLabel: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const caller = appRouter.createCaller(createAdminCtx());
    await caller.scan.start();

    // Allow the async scan to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(dbMock.deleteModelsNotIn).toHaveBeenCalledWith(["model-1"]);
    expect(dbMock.deleteCategoriesNotIn).toHaveBeenCalledWith(["cat-1"]);
  });

  it("deleteModelsNotIn is called with empty array when scan finds no models", async () => {
    const { scanDrive } = await import("./driveScanner");
    const dbMock = await import("./db");

    vi.mocked(scanDrive).mockResolvedValueOnce({ categories: [], models: [] });

    const caller = appRouter.createCaller(createAdminCtx());
    await caller.scan.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(dbMock.deleteModelsNotIn).toHaveBeenCalledWith([]);
    expect(dbMock.deleteCategoriesNotIn).toHaveBeenCalledWith([]);
  });
});
