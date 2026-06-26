import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Settings as SettingsIcon, FolderOpen, RefreshCw, Tag, Trash2, Plus, Users,
  ShieldCheck, ShieldX, UserCheck, UserX, Zap, Image as ImageIcon,
  Lock, Pencil, Save, Key, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type SettingsTab = "library" | "tags" | "access";

export default function Settings() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<SettingsTab>("library");

  // Library path settings
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: scanStatus, refetch: refetchScanStatus } = trpc.scan.status.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.inProgress ? 2000 : false),
  });
  const [libraryPath, setLibraryPath] = useState("");
  const [isLibraryEditing, setIsLibraryEditing] = useState(false);

  // LLM settings
  const [llmApiUrl, setLlmApiUrl] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [isLlmEditing, setIsLlmEditing] = useState(false);

  // Tags
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Auto-tagger
  const [reTagging, setReTagging] = useState(false);
  const [rePickingThumbs, setRePickingThumbs] = useState(false);
  const [rePickingUnset, setRePickingUnset] = useState(false);
  const rePickingAny = rePickingThumbs || rePickingUnset;
  const { data: rePickProgress, refetch: refetchProgress } = trpc.thumbnails.progress.useQuery(undefined, {
    refetchInterval: rePickingAny ? 2000 : false,
  });

  // Access control — local users
  const { data: allUsers = [] } = trpc.access.list.useQuery({ status: "all" });
  const pendingUsers = allUsers.filter((u: any) => u.status === "pending");
  const approvedUsers = allUsers.filter((u: any) => u.status === "approved");
  const deniedUsers = allUsers.filter((u: any) => u.status === "denied");

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (settings) {
      setLibraryPath((settings as any).library_path || "");
      setLlmApiUrl((settings as any).llm_api_url || "");
      setLlmApiKey((settings as any).llm_api_key || "");
      setLlmModel((settings as any).llm_model || "");
    }
  }, [settings]);

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.settings.get.invalidate(); },
    onError: () => toast.error("Failed to save settings"),
  });

  const startScan = trpc.scan.start.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Scan started!");
        refetchScanStatus();
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

  const startRePickPoll = (setRunning: (v: boolean) => void, label: string) => {
    const interval = setInterval(async () => {
      const result = await refetchProgress();
      const prog = result.data;
      if (prog && !prog.running) {
        clearInterval(interval);
        setRunning(false);
        toast.success(`${label} complete — ${prog.updated} thumbnail${prog.updated !== 1 ? "s" : ""} updated, ${prog.errors} errors`);
      }
    }, 2000);
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
      setTimeout(() => { setReTagging(false); utils.tags.list.invalidate(); }, 3000);
    },
    onError: () => { setReTagging(false); toast.error("Failed to start re-tagging"); },
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); setNewTagName(""); toast.success("Tag created"); },
    onError: () => toast.error("Tag name already exists"),
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); toast.success("Tag deleted"); },
  });

  const approveUser = trpc.access.approve.useMutation({
    onSuccess: () => { utils.access.list.invalidate(); toast.success("User approved."); },
  });

  const denyUser = trpc.access.deny.useMutation({
    onSuccess: () => { utils.access.list.invalidate(); toast.success("User denied."); },
  });

  const removeUser = trpc.access.remove.useMutation({
    onSuccess: () => { utils.access.list.invalidate(); toast.success("User removed."); },
  });

  const createUser = trpc.auth.createUser.useMutation({
    onSuccess: () => {
      utils.access.list.invalidate();
      setNewUsername("");
      setNewPassword("");
      toast.success("User created — they can now log in.");
    },
    onError: (e: { message?: string }) => toast.error(e.message || "Failed to create user"),
  });

  const lastScan = scanStatus?.lastScan;
  const pendingCount = pendingUsers.length;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "library", label: "Library", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "tags", label: "Tags", icon: <Tag className="w-4 h-4" /> },
    { id: "access", label: "Users", icon: <Users className="w-4 h-4" />, badge: pendingCount },
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

      {/* ── Library Tab ── */}
      {activeTab === "library" && (
        <div className="space-y-6">

          {/* Library path */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Library Folder</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isLibraryEditing ? "Enter the full path to your models folder." : "Locked — click Edit to make changes."}
                </p>
              </div>
              <button
                onClick={() => setIsLibraryEditing((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  isLibraryEditing
                    ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                    : "bg-secondary border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {isLibraryEditing ? <><Lock className="w-3.5 h-3.5" /> Lock</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!isLibraryEditing ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Library Path</p>
                    <p className="text-sm font-mono text-foreground truncate">
                      {(settings as any)?.library_path || <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FolderOpen className="w-3.5 h-3.5" /> Full path to your models folder
                    </label>
                    <input
                      type="text"
                      value={libraryPath}
                      onChange={(e) => setLibraryPath(e.target.value)}
                      placeholder="C:\Users\Kenny\3D Models  or  /mnt/nas/models"
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      The folder should contain sub-folders for each collection (e.g. <span className="font-mono text-foreground">Beasts and Minis/</span>, <span className="font-mono text-foreground">Star Wars/</span>).
                    </p>
                  </div>
                  <button
                    onClick={() => { updateSettings.mutate({ library_path: libraryPath }); setIsLibraryEditing(false); }}
                    disabled={updateSettings.isPending || !libraryPath.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90"
                  >
                    {updateSettings.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save & Lock
                  </button>
                </>
              )}
            </div>
          </section>

          {/* LLM settings */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">AI / LLM Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Used for auto-tagging and thumbnail selection. Supports any OpenAI-compatible API (OpenAI, Ollama, LM Studio, etc.).</p>
              </div>
              <button
                onClick={() => setIsLlmEditing((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  isLlmEditing
                    ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                    : "bg-secondary border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {isLlmEditing ? <><Lock className="w-3.5 h-3.5" /> Lock</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!isLlmEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">API URL</p>
                      <p className="text-sm font-mono text-foreground truncate">
                        {(settings as any)?.llm_api_url || <span className="text-muted-foreground italic">Not set (AI features disabled)</span>}
                      </p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                    <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Model</p>
                      <p className="text-sm font-mono text-foreground truncate">
                        {(settings as any)?.llm_model || <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">API Base URL</label>
                    <input
                      type="text"
                      value={llmApiUrl}
                      onChange={(e) => setLlmApiUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1  or  http://localhost:11434/v1"
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">API Key <span className="text-muted-foreground/50">(leave blank for Ollama/local)</span></label>
                    <div className="relative">
                      <input
                        type={showLlmKey ? "text" : "password"}
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder="sk-…"
                        className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLlmKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showLlmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Model name</label>
                    <input
                      type="text"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="gpt-4o-mini  or  llama3.2-vision"
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      updateSettings.mutate({ llm_api_url: llmApiUrl, llm_api_key: llmApiKey, llm_model: llmModel });
                      setIsLlmEditing(false);
                    }}
                    disabled={updateSettings.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90"
                  >
                    {updateSettings.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save & Lock
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Library Scan */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">Library Scan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Scan your library folder to import or refresh models</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Live progress */}
              {scanStatus?.inProgress && (() => {
                const p = scanStatus.progress as { modelsFound: number; categoriesFound: number; totalCollections: number; currentFolder: string; phase: string } | null;
                const total = p?.totalCollections ?? 0;
                const scanned = p?.categoriesFound ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;
                const phaseLabel = !p || p.phase === "discovering"
                  ? "Discovering collections…"
                  : p.phase === "saving"
                  ? "Saving to database…"
                  : p.phase === "done"
                  ? "Finishing up…"
                  : `Scanning "${p.currentFolder}"`;
                return (
                  <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">Running</span>
                      {total > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {scanned} / {total} collections
                        </span>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{phaseLabel}</p>
                    {p && <p className="text-xs text-muted-foreground">{p.modelsFound} model{p.modelsFound !== 1 ? "s" : ""} found so far</p>}
                  </div>
                );
              })()}
              {/* Last scan result */}
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
              <button
                onClick={() => startScan.mutate()}
                disabled={scanStatus?.inProgress || startScan.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", (scanStatus?.inProgress || startScan.isPending) && "animate-spin")} />
                {scanStatus?.inProgress ? "Scanning…" : "Start Scan"}
              </button>
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
                {allTags.map((tag: any) => (
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
                <button onClick={() => reTagAll.mutate()} disabled={reTagging} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50">
                  {reTagging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {reTagging ? "Running…" : "Re-tag All"}
                </button>
              </div>
            </div>
            {/* Re-pick Thumbnails */}
            <div className="pt-2 border-t border-border/30 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">AI thumbnail selection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manually set hero images are always preserved.</p>
              </div>
              {rePickingAny && rePickProgress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{rePickProgress.processed} / {rePickProgress.total} processed</span>
                    <span>{rePickProgress.updated} updated · {rePickProgress.errors} errors</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: rePickProgress.total > 0 ? `${Math.round((rePickProgress.processed / rePickProgress.total) * 100)}%` : "0%" }} />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Re-pick Unset Only</p>
                    <p className="text-xs text-muted-foreground">Picks thumbnails only for models with no hero image yet.</p>
                  </div>
                  <button onClick={() => rePickUnset.mutate()} disabled={rePickingAny} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border/50 transition-colors disabled:opacity-50">
                    {rePickingUnset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {rePickingUnset ? `${rePickProgress?.total ? Math.round((rePickProgress.processed / rePickProgress.total) * 100) : 0}%…` : "Re-pick Unset"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Re-pick All (AI + Unset)</p>
                    <p className="text-xs text-muted-foreground">Re-evaluates every AI-picked thumbnail plus any unset ones.</p>
                  </div>
                  <button onClick={() => rePickThumbnails.mutate()} disabled={rePickingAny} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50">
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

      {/* ── Users Tab ── */}
      {activeTab === "access" && (
        <div className="space-y-6">

          {/* Create new user */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Create New User
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Add a local user account. They can log in immediately with these credentials.</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => { if (newUsername.trim() && newPassword.length >= 8) createUser.mutate({ username: newUsername.trim(), password: newPassword }); }}
                  disabled={!newUsername.trim() || newPassword.length < 8 || createUser.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </section>

          {/* Pending requests */}
          {pendingUsers.length > 0 && (
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Pending Requests
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingUsers.length} waiting
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {pendingUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name ?? u.username ?? "Unknown"}</p>
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
          )}

          {/* All users */}
          <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" /> All Users
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{approvedUsers.length + deniedUsers.length} user{approvedUsers.length + deniedUsers.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-border/30">
              {[...approvedUsers, ...deniedUsers].length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No users yet.</p>
              ) : [...approvedUsers, ...deniedUsers].map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", u.role === "admin" ? "bg-primary/10 text-primary border border-primary/20" : u.status === "approved" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                    {(u.username || u.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{u.username || u.name || "Unknown"}</p>
                      {u.role === "admin" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Admin</span>}
                      {u.status === "approved" && u.role !== "admin" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Approved</span>}
                      {u.status === "denied" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Denied</span>}
                    </div>
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex gap-2 shrink-0">
                      {u.status === "denied" && (
                        <button onClick={() => approveUser.mutate({ id: u.id })} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {u.status === "approved" && (
                        <button onClick={() => denyUser.mutate({ id: u.id })} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                          <ShieldX className="w-3 h-3" /> Revoke
                        </button>
                      )}
                      <button onClick={() => removeUser.mutate({ id: u.id })} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-foreground transition-colors">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
