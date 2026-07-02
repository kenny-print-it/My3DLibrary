import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Settings as SettingsIcon, Key, FolderOpen, CheckCircle, AlertCircle,
  Save, RefreshCw, Tag, Trash2, Plus, Users, Clock, ShieldCheck,
  ShieldX, Mail, UserCheck, UserX, UserPlus, Moon, Zap, Image as ImageIcon,
  Lock, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type SettingsTab = "drive" | "tags" | "access";
type SyncSchedule = "hourly" | "nightly";

const SYNC_CRON: Record<SyncSchedule, string> = {
  hourly: "0 0 * * * *",
  nightly: "0 0 3 * * *",  // 3 AM UTC every night
};
const SYNC_TASK_UID = "YeLVQQNJAMhDVqnhjxHN7T";

export default function Settings() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<SettingsTab>("drive");

  // Drive settings
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: scanStatus, refetch: refetchScanStatus } = trpc.scan.status.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.inProgress ? 2000 : false),
  });
  const [apiKey, setApiKey] = useState("");
  const [folderId, setFolderId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [isDriveEditing, setIsDriveEditing] = useState(false);

  // Tags
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Sync schedule
  const [syncSchedule, setSyncSchedule] = useState<SyncSchedule>("hourly");
  const [syncLoading, setSyncLoading] = useState(false);
  const [nightlyHour, setNightlyHour] = useState(3); // 0-23 UTC

  // Auto-tagger
  const [reTagging, setReTagging] = useState(false);
  const [rePickingThumbs, setRePickingThumbs] = useState(false);
  const [rePickingUnset, setRePickingUnset] = useState(false);
  const rePickingAny = rePickingThumbs || rePickingUnset;
  const [rePickPollInterval, setRePickPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const { data: rePickProgress, refetch: refetchProgress } = trpc.thumbnails.progress.useQuery(undefined, {
    refetchInterval: rePickingAny ? 2000 : false,
  });

  // Access control
  const { data: pendingUsers = [] } = trpc.access.list.useQuery({ status: "pending" });
  const { data: approvedUsers = [] } = trpc.access.list.useQuery({ status: "approved" });
  const { data: deniedUsers = [] } = trpc.access.list.useQuery({ status: "denied" });
  const [preAddEmail, setPreAddEmail] = useState("");
  const [preAddName, setPreAddName] = useState("");

  useEffect(() => {
    if (settings) {
      setApiKey(settings.drive_api_key || "");
      setFolderId(settings.drive_folder_id || "");
      const stored = (settings as any).sync_schedule as SyncSchedule | undefined;
      if (stored === "hourly" || stored === "nightly") setSyncSchedule(stored);
      const storedHour = (settings as any).nightly_hour;
      if (typeof storedHour === "number" && storedHour >= 0 && storedHour <= 23) setNightlyHour(storedHour);
    }
  }, [settings]);

  const updateSyncSchedule = trpc.settings.updateSyncSchedule.useMutation({
    onMutate: () => setSyncLoading(true),
    onSuccess: (data) => {
      setSyncLoading(false);
      setSyncSchedule(data.schedule);
      const hourLabel = data.schedule === "nightly" ? ` (${String((data as any).hour ?? nightlyHour).padStart(2, "0")}:00 UTC)` : "";
      toast.success(data.schedule === "nightly" ? `Switched to nightly sync${hourLabel}` : "Switched to hourly sync");
      utils.settings.get.invalidate();
    },
    onError: () => {
      setSyncLoading(false);
      toast.error("Failed to update sync schedule");
    },
  });

  // Shared poll helper for both re-pick buttons
  const startRePickPoll = (setRunning: (v: boolean) => void, label: string) => {
    const interval = setInterval(async () => {
      const result = await refetchProgress();
      const prog = result.data;
      if (prog && !prog.running) {
        clearInterval(interval);
        setRePickPollInterval(null);
        setRunning(false);
        toast.success(`${label} complete — ${prog.updated} thumbnail${prog.updated !== 1 ? "s" : ""} updated, ${prog.errors} errors`);
      }
    }, 2000);
    setRePickPollInterval(interval);
  };

  const rePickThumbnails = trpc.thumbnails.rePickAll.useMutation({
    onMutate: () => setRePickingThumbs(true),
    onSuccess: () => startRePickPoll(setRePickingThumbs, "Re-pick (AI + unset)"),
    onError: () => { setRePickingThumbs(false); toast.error("Failed to start thumbnail re-pick"); },
  });

  const rePickUnset = trpc.thumbnails.rePickUnset.useMutation({
    onMutate: () => setRePickingUnset(true),
    onSuccess: () => startRePickPoll(setRePickingUnset, "Re-pick (unset only)"),
    onError: () => { setRePickingUnset(false); toast.error("Failed to start re-pick"); },
  });

  const reTagAll = trpc.tags.reTagAll.useMutation({
    onMutate: () => setReTagging(true),
    onSuccess: () => {
      toast.success("Re-tagging started — models will be tagged in the background");
      setTimeout(() => {
        setReTagging(false);
        utils.tags.list.invalidate();
      }, 3000);
    },
    onError: () => { setReTagging(false); toast.error("Failed to start re-tagging"); },
  });

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.settings.get.invalidate(); setValidationResult(null); },
    onError: () => toast.error("Failed to save settings"),
  });

  const validateSettings = trpc.settings.validate.useMutation({
    onMutate: () => setValidating(true),
    onSuccess: (data) => {
      setValidating(false);
      setValidationResult(data.valid);
      if (data.valid) toast.success("Connection verified!");
      else toast.error("Connection failed — check your API key and folder ID.");
    },
    onError: () => { setValidating(false); setValidationResult(false); toast.error("Validation failed"); },
  });

  const startScan = trpc.scan.start.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Scan started!");
        // Trigger immediate refetch so the UI switches to "running" state right away
        refetchScanStatus();
        // Also keep a manual poll as fallback to catch completion and invalidate caches
        const poll = setInterval(async () => {
          const status = await utils.scan.status.fetch();
          if (!status.inProgress) {
            clearInterval(poll);
            utils.models.list.invalidate();
            utils.categories.list.invalidate();
            const log = status.lastScan;
            if (log?.status === "completed") toast.success(`Scan complete — ${log.modelsFound} models found.`);
          }
        }, 2000);
      }
    },
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); setNewTagName(""); toast.success("Tag created"); },
    onError: () => toast.error("Tag name already exists"),
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); toast.success("Tag deleted"); },
  });

  const approveUser = trpc.access.approve.useMutation({
    onSuccess: () => {
      utils.access.list.invalidate();
      toast.success("User approved — they can now access the library.");
    },
  });

  const denyUser = trpc.access.deny.useMutation({
    onSuccess: () => { utils.access.list.invalidate(); toast.success("User denied."); },
  });

  const removeUser = trpc.access.remove.useMutation({
    onSuccess: () => { utils.access.list.invalidate(); toast.success("Entry removed."); },
  });

  const preAddUser = trpc.access.preAdd.useMutation({
    onSuccess: () => {
      utils.access.list.invalidate();
      setPreAddEmail("");
      setPreAddName("");
      toast.success("Email pre-approved — they will have access as soon as they sign in.");
    },
    onError: () => toast.error("Failed to pre-add email"),
  });

  const lastScan = scanStatus?.lastScan;
  const pendingCount = pendingUsers.length;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "drive", label: "Google Drive", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "tags", label: "Tags", icon: <Tag className="w-4 h-4" /> },
    { id: "access", label: "Access Control", icon: <Users className="w-4 h-4" />, badge: pendingCount },
  ];

  return (
    <div className="container py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your library configuration and access</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-card border border-border/50 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Drive Tab ── */}
      {activeTab === "drive" && (
        <div className="space-y-6">
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Google Drive Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDriveEditing ? "Edit your API key or folder ID, then save." : "Locked — click Edit to make changes."}
                </p>
              </div>
              <button
                onClick={() => { setIsDriveEditing((v) => !v); setValidationResult(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  isDriveEditing
                    ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                    : "bg-secondary border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {isDriveEditing ? <><Lock className="w-3.5 h-3.5" /> Lock</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Locked view — show masked values */}
              {!isDriveEditing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                    <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">API Key</p>
                      <p className="text-sm font-mono text-foreground truncate">
                        {settings?.drive_api_key ? settings.drive_api_key.slice(0, 8) + "••••••••••••••••" : <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Root Folder ID</p>
                      <p className="text-sm font-mono text-foreground truncate">
                        {settings?.drive_folder_id || <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                </div>
              )}
              {/* Edit view — live inputs */}
              {isDriveEditing && (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Key className="w-3.5 h-3.5" /> Google Drive API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); }}
                      placeholder="AIzaSy…"
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FolderOpen className="w-3.5 h-3.5" /> Root Folder ID
                    </label>
                    <input
                      type="text"
                      value={folderId}
                      onChange={(e) => { setFolderId(e.target.value); setValidationResult(null); }}
                      placeholder="1sQRvAn0Pbr…"
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Found in your Drive URL: drive.google.com/drive/folders/<span className="text-foreground font-mono">FOLDER_ID</span></p>
                  </div>
                  {validationResult !== null && (
                    <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm", validationResult ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20")}>
                      {validationResult ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {validationResult ? "Connection verified — API key and folder ID are valid." : "Connection failed — check your API key and folder ID."}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => validateSettings.mutate({ apiKey, folderId })} disabled={validating || !apiKey || !folderId} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                      {validating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Test Connection
                    </button>
                    <button onClick={() => { updateSettings.mutate({ drive_api_key: apiKey, drive_folder_id: folderId }); setIsDriveEditing(false); }} disabled={updateSettings.isPending || !apiKey || !folderId} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90">
                      {updateSettings.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save & Lock
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Sync schedule */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Auto-Sync Schedule
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Choose how often your library is automatically refreshed from Google Drive</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { if (syncSchedule !== "hourly") updateSyncSchedule.mutate({ schedule: "hourly" }); }}
                  disabled={syncLoading}
                  className={cn(
                    "flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left",
                    syncSchedule === "hourly"
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-secondary hover:border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={cn("w-4 h-4", syncSchedule === "hourly" ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-semibold", syncSchedule === "hourly" ? "text-primary" : "text-foreground")}>Hourly</span>
                    {syncSchedule === "hourly" && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Syncs every hour — best for active libraries</p>
                </button>
                <button
                  onClick={() => { if (syncSchedule !== "nightly") updateSyncSchedule.mutate({ schedule: "nightly", hour: nightlyHour }); }}
                  disabled={syncLoading}
                  className={cn(
                    "flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left",
                    syncSchedule === "nightly"
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-secondary hover:border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Moon className={cn("w-4 h-4", syncSchedule === "nightly" ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-semibold", syncSchedule === "nightly" ? "text-primary" : "text-foreground")}>Nightly</span>
                    {syncSchedule === "nightly" && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Syncs once per night — quieter option</p>
                </button>
              </div>
              {/* Nightly hour picker — shown when nightly is active */}
              {syncSchedule === "nightly" && (
                <div className="mt-4 flex items-center gap-3">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Sync at (UTC):</label>
                  <select
                    value={nightlyHour}
                    onChange={(e) => {
                      const h = parseInt(e.target.value, 10);
                      setNightlyHour(h);
                      updateSyncSchedule.mutate({ schedule: "nightly", hour: h });
                    }}
                    disabled={syncLoading}
                    className="text-sm bg-secondary border border-border/50 text-foreground rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}:00 UTC
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">
                    ({Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(
                      new Date(new Date().setUTCHours(nightlyHour, 0, 0, 0))
                    )} local)
                  </span>
                </div>
              )}
              {syncLoading && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Updating schedule…
                </p>
              )}
            </div>
          </section>

          {/* Scan status */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">Library Scan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Scan your Google Drive to import or refresh models</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Live progress panel — shown while scan is running */}
              {scanStatus?.inProgress && (() => {
                const p = scanStatus.progress as { modelsFound: number; categoriesFound: number; totalCollections: number; currentFolder: string; skippedCount: number; phase: string } | null;
                const total = p?.totalCollections ?? 0;
                const scanned = p?.categoriesFound ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;
                const phaseLabel = !p || p.phase === "discovering"
                  ? "Discovering collections…"
                  : p.phase === "saving"
                  ? "Saving to database…"
                  : p.phase === "done"
                  ? "Finishing up…"
                  : `Scanning “${p.currentFolder}”`;
                return (
                  <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">Running</span>
                      {total > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {scanned} / {total} collections
                        </span>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{phaseLabel}</p>
                    {p && (
                      <p className="text-xs text-muted-foreground">
                        {p.modelsFound} model{p.modelsFound !== 1 ? "s" : ""} updated
                        {p.skippedCount > 0 && ` · ${p.skippedCount} unchanged (skipped)`}
                      </p>
                    )}
                  </div>
                );
              })()}
              {/* Last scan result — shown only when idle */}
              {!scanStatus?.inProgress && lastScan && (
                <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", lastScan.status === "completed" ? "bg-green-400" : lastScan.status === "failed" ? "bg-destructive" : "bg-primary animate-pulse")} />
                    <span className="text-sm font-medium text-foreground capitalize">{lastScan.status}</span>
                  </div>
                  {lastScan.status === "completed" && <p className="text-xs text-muted-foreground">{lastScan.modelsFound} models · {lastScan.categoriesFound} folders found</p>}
                  {lastScan.status === "failed" && lastScan.errorMessage && <p className="text-xs text-destructive">{lastScan.errorMessage}</p>}
                  {lastScan.completedAt && <p className="text-xs text-muted-foreground">Last run: {new Date(lastScan.completedAt).toLocaleString()}</p>}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => startScan.mutate({ incremental: true })}
                  disabled={scanStatus?.inProgress || startScan.isPending}
                  title="Only scans folders modified since last sync — much faster"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className={cn("w-4 h-4", (scanStatus?.inProgress || startScan.isPending) && "animate-spin")} />
                  {scanStatus?.inProgress ? "Syncing…" : "Quick Sync"}
                </button>
                <button
                  onClick={() => startScan.mutate({ incremental: false })}
                  disabled={scanStatus?.inProgress || startScan.isPending}
                  title="Re-scans every folder from scratch"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Full Scan
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tags Tab ── */}
      {activeTab === "tags" && (
        <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Tag Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create and delete global tags for organizing your models</p>
          </div>
          <div className="p-5 space-y-4">
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-sm" style={{ backgroundColor: (tag.color || "#6366f1") + "22", color: tag.color || "#6366f1", borderColor: (tag.color || "#6366f1") + "44" }}>
                    <span>{tag.name}</span>
                    <button onClick={() => deleteTag.mutate({ id: tag.id })} className="hover:opacity-60 transition-opacity ml-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No tags yet.</p>}
            {/* Re-tag All */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-foreground">Auto-tag all models</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses AI to match model names against your tag library. Runs automatically after each scan.</p>
                </div>
                <button
                  onClick={() => reTagAll.mutate()}
                  disabled={reTagging}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50"
                >
                  {reTagging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {reTagging ? "Running…" : "Re-tag All"}
                </button>
              </div>
            </div>
            {/* Re-pick Thumbnails */}
            <div className="pt-2 border-t border-border/30 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">AI thumbnail selection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manually set hero images are always preserved regardless of which option you choose.</p>
              </div>
              {/* Shared progress bar — shown when either button is running */}
              {rePickingAny && rePickProgress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{rePickProgress.processed} / {rePickProgress.total} processed</span>
                    <span>{rePickProgress.updated} updated · {rePickProgress.errors} errors</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: rePickProgress.total > 0 ? `${Math.round((rePickProgress.processed / rePickProgress.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {/* Button 1: Re-pick unset only (same as auto-scan) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Re-pick Unset Only</p>
                    <p className="text-xs text-muted-foreground">Picks thumbnails only for models with no hero image yet. Same as what runs after a scan.</p>
                  </div>
                  <button
                    onClick={() => rePickUnset.mutate()}
                    disabled={rePickingAny}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border/50 transition-colors disabled:opacity-50"
                  >
                    {rePickingUnset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {rePickingUnset ? `${rePickProgress?.total ? Math.round((rePickProgress.processed / rePickProgress.total) * 100) : 0}%…` : "Re-pick Unset"}
                  </button>
                </div>
                {/* Button 2: Re-pick all AI + unset (force refresh) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Re-pick All (AI + Unset)</p>
                    <p className="text-xs text-muted-foreground">Re-evaluates every AI-picked thumbnail plus any unset ones. Use when you want a full AI refresh.</p>
                  </div>
                  <button
                    onClick={() => rePickThumbnails.mutate()}
                    disabled={rePickingAny}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50"
                  >
                    {rePickingThumbs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {rePickingThumbs ? `${rePickProgress?.total ? Math.round((rePickProgress.processed / rePickProgress.total) * 100) : 0}%…` : "Re-pick All"}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border/30">
              <p className="text-xs font-medium text-muted-foreground">Create new tag</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Tag name…" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }} className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <button onClick={() => { if (newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }} disabled={!newTagName.trim() || createTag.isPending} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewTagColor(c)} className={cn("w-6 h-6 rounded-full transition-all", newTagColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-card scale-110" : "")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Access Control Tab ── */}
      {activeTab === "access" && (
        <div className="space-y-6">

          {/* Pre-add email */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Pre-Approve an Email
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Add an email before they sign in — they'll have access immediately upon login</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={preAddEmail}
                  onChange={(e) => setPreAddEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={preAddName}
                  onChange={(e) => setPreAddName(e.target.value)}
                  className="w-36 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => { if (preAddEmail.trim()) preAddUser.mutate({ email: preAddEmail.trim(), name: preAddName.trim() || undefined }); }}
                  disabled={!preAddEmail.trim() || preAddUser.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </section>

          {/* Pending requests */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Pending Requests
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Users who have signed in and are waiting for approval</p>
              </div>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingCount} waiting
                </span>
              )}
            </div>
            <div className="divide-y divide-border/30">
              {pendingUsers.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No pending requests.</p>
              ) : pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground/50">{new Date(u.requestedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveUser.mutate({ id: u.id })} disabled={approveUser.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => denyUser.mutate({ id: u.id })} disabled={denyUser.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                      <UserX className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Approved users */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" /> Approved Users
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{approvedUsers.length} user{approvedUsers.length !== 1 ? "s" : ""} with access</p>
            </div>
            <div className="divide-y divide-border/30">
              {approvedUsers.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No approved users yet.</p>
              ) : approvedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{u.name ?? "Unknown"}</p>
                      {u.preAdded && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">pre-added</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => denyUser.mutate({ id: u.id })} disabled={denyUser.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-red-400 hover:border-red-500/30 transition-colors">
                      <UserX className="w-3.5 h-3.5" /> Revoke
                    </button>
                    <button onClick={() => removeUser.mutate({ id: u.id })} disabled={removeUser.isPending} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Denied users */}
          {deniedUsers.length > 0 && (
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldX className="w-4 h-4 text-red-400" /> Denied Users
                </h2>
              </div>
              <div className="divide-y divide-border/30">
                {deniedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <UserX className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approveUser.mutate({ id: u.id })} disabled={approveUser.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                        <UserCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => removeUser.mutate({ id: u.id })} disabled={removeUser.isPending} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
