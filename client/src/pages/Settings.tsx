import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Settings as SettingsIcon, FolderOpen, RefreshCw, Tag, Trash2, Plus,
  Zap, Image as ImageIcon,
  Lock, Pencil, Save, Key, Eye, EyeOff, ChevronRight,
  HelpCircle, X, ArrowLeft, Folder, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type SettingsTab = "library" | "tags" | "trash";

// ── Folder Browser Dialog ──────────────────────────────────────────────────
function FolderBrowserDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}) {
  const [browsePath, setBrowsePath] = useState<string | undefined>(undefined);

  const { data: browseData, isLoading: browseLoading, error: browseError } = trpc.settings.browseFolder.useQuery(
    { path: browsePath },
    { enabled: open }
  );

  const handleNavigate = (path: string) => setBrowsePath(path);
  const handleUp = () => {
    if (browseData?.parent != null) setBrowsePath(browseData.parent);
  };
  const handleSelect = () => {
    if (browseData?.current) {
      onSelect(browseData.current);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Browse for Folder</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current path */}
        <div className="px-5 py-2.5 border-b border-border/50 bg-secondary/50 flex items-center gap-2 min-h-[40px]">
          {browseData?.parent != null && (
            <button
              onClick={handleUp}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Up
            </button>
          )}
          <span className="text-xs font-mono text-muted-foreground truncate">
            {browseData?.current || "Select a drive or folder"}
          </span>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto">
          {browseLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          )}
          {browseError && (
            <div className="px-5 py-4 text-sm text-destructive">
              {browseError.message}
            </div>
          )}
          {!browseLoading && browseData?.entries?.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No sub-folders found in this location.
            </div>
          )}
          {!browseLoading && browseData?.entries?.map((entry) => (
            <button
              key={entry.path}
              onClick={() => handleNavigate(entry.path)}
              className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/50 transition-colors text-left group"
            >
              <Folder className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-sm text-foreground truncate">{entry.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/50 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground truncate flex-1">
            {browseData?.current
              ? <><span className="font-medium text-foreground">Selected:</span> {browseData.current}</>
              : "Navigate into a folder, then click Select"}
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!browseData?.current}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90"
            >
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Setup Guide Dialog ──────────────────────────────────────────────────
function AISetupGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">AI Setup Guide</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">

          {/* What AI does */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-foreground font-medium mb-1">What does AI do in My3DLibrary?</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
              <li><strong>Auto-tagging</strong> — looks at your model images and suggests tags like "fantasy", "vehicle", "miniature"</li>
              <li><strong>Thumbnail selection</strong> — picks the best render image as the hero image for each model</li>
            </ul>
            <p className="text-muted-foreground text-xs mt-2">AI is completely optional. Your library works fine without it.</p>
          </div>

          {/* Option A: Ollama */}
          <div>
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
              Ollama (Free, runs on your PC)
            </h3>
            <div className="space-y-2.5 text-muted-foreground text-xs">
              <p>Ollama runs AI models locally — no internet, no subscription required. You need a reasonably modern PC (8GB+ RAM recommended).</p>

              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                <p className="font-medium text-foreground">Step 1 — Place ollama.exe in the app folder</p>
                <p>Download <strong>ollama.exe</strong> from <span className="font-mono text-primary">ollama.com/download</span> and place it inside the <span className="font-mono">ollama\</span> folder next to <span className="font-mono">My3DLibrary.exe</span>.</p>
                <p className="text-amber-400/90">⚠ The app looks for <span className="font-mono">ollama\ollama.exe</span> — it must be in that subfolder, not the root.</p>
              </div>

              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                <p className="font-medium text-foreground">Step 2 — Pull a vision model</p>
                <p>Open a Command Prompt, navigate to the <span className="font-mono">ollama\</span> folder, and run:</p>
                <code className="block bg-black/40 rounded px-2 py-1.5 font-mono text-green-400 text-[11px]">ollama.exe pull llama3.2-vision</code>
                <p>This downloads the model (~7 GB). You only need to do this once.</p>
              </div>

              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                <p className="font-medium text-foreground">Step 3 — Restart My3DLibrary</p>
                <p>Close and reopen the app. Ollama starts automatically in the background.</p>
              </div>

              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                <p className="font-medium text-foreground">Step 4 — Enter these settings below</p>
                <div className="space-y-1">
                  <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">http://localhost:11434</span></p>
                  <p><span className="font-medium text-foreground">API Key:</span> leave blank</p>
                  <p><span className="font-medium text-foreground">Model:</span> <span className="font-mono">llama3.2-vision</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Option B: OpenAI */}
          <div>
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
              OpenAI (Paid, cloud-based)
            </h3>
            <div className="space-y-2 text-muted-foreground text-xs">
              <p>If you have an OpenAI API key, you can use GPT-4o for better results. This costs a small amount per model scanned.</p>
              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1">
                <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">https://api.openai.com/v1</span></p>
                <p><span className="font-medium text-foreground">API Key:</span> your <span className="font-mono">sk-…</span> key from platform.openai.com</p>
                <p><span className="font-medium text-foreground">Model:</span> <span className="font-mono">gpt-4o-mini</span></p>
              </div>
            </div>
          </div>

          {/* Option C: LM Studio */}
          <div>
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">C</span>
              LM Studio (Free, GUI-based)
            </h3>
            <div className="space-y-2 text-muted-foreground text-xs">
              <p>LM Studio is a desktop app that lets you run local models with a friendly interface. Start the local server in LM Studio, then use:</p>
              <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1">
                <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">http://localhost:1234/v1</span></p>
                <p><span className="font-medium text-foreground">API Key:</span> leave blank</p>
                <p><span className="font-medium text-foreground">Model:</span> the model name shown in LM Studio</p>
              </div>
            </div>
          </div>

        </div>

        <div className="px-5 py-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Got it — close guide
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Component ────────────────────────────────────────────────
export default function Settings() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<SettingsTab>("library");

  // Library path settings
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: libraryPaths = [], refetch: refetchLibraryPaths } = trpc.settings.libraryPaths.useQuery();
  const { data: scanStatus, refetch: refetchScanStatus } = trpc.scan.status.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.inProgress ? 2000 : false),
  });
  // Multi-folder state
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [newFolderLabel, setNewFolderLabel] = useState("");
  const [newFolderScanDepth, setNewFolderScanDepth] = useState<2 | 3>(2);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [folderBrowserTarget, setFolderBrowserTarget] = useState<"new">("new");

  // LLM settings
  const [llmApiUrl, setLlmApiUrl] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [isLlmEditing, setIsLlmEditing] = useState(false);
  const [showAIGuide, setShowAIGuide] = useState(false);

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

  // (No user management in portable mode)

  useEffect(() => {
    if (settings) {
      setLlmApiUrl((settings as any).llm_api_url || "");
      setLlmApiKey((settings as any).llm_api_key || "");
      setLlmModel((settings as any).llm_model || "");
    }
  }, [settings]);

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.settings.get.invalidate(); },
    onError: () => toast.error("Failed to save settings"),
  });

  const addLibraryPath = trpc.settings.addLibraryPath.useMutation({
    onSuccess: () => {
      toast.success("Folder added");
      refetchLibraryPaths();
      setShowAddFolder(false);
      setNewFolderPath("");
      setNewFolderLabel("");
    },
    onError: (e) => toast.error(e.message || "Failed to add folder"),
  });

  const removeLibraryPath = trpc.settings.removeLibraryPath.useMutation({
    onSuccess: () => { toast.success("Folder removed"); refetchLibraryPaths(); },
    onError: () => toast.error("Failed to remove folder"),
  });

  const toggleLibraryPath = trpc.settings.toggleLibraryPath.useMutation({
    onSuccess: () => refetchLibraryPaths(),
    onError: () => toast.error("Failed to toggle folder"),
  });

  const updateLibraryPathDepth = trpc.settings.updateLibraryPathDepth.useMutation({
    onSuccess: () => refetchLibraryPaths(),
    onError: () => toast.error("Failed to update scan depth"),
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

  const lastScan = scanStatus?.lastScan;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "library", label: "Library", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "tags", label: "Tags", icon: <Tag className="w-4 h-4" /> },
    { id: "trash", label: "Trash", icon: <Trash2 className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Dialogs */}
      <FolderBrowserDialog
        open={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        onSelect={(p) => {
          setNewFolderPath(p);
          if (!newFolderLabel) setNewFolderLabel(p.split(/[\/\\]/).filter(Boolean).pop() || p);
        }}
      />
      <AISetupGuideDialog
        open={showAIGuide}
        onClose={() => setShowAIGuide(false)}
      />

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
            </button>
          ))}
        </div>

        {/* ── Library Tab ── */}
        {activeTab === "library" && (
          <div className="space-y-6">

            {/* Library Folders — multi-path */}
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Library Folders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Add one or more folders where your 3D models are stored.</p>
                </div>
                <button
                  onClick={() => setShowAddFolder((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-secondary border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Folder
                </button>
              </div>
              <div className="p-5 space-y-3">
                {/* Existing paths list */}
                {libraryPaths.length === 0 && !showAddFolder && (
                  <p className="text-sm text-muted-foreground italic text-center py-4">No folders added yet. Click "Add Folder" to get started.</p>
                )}
                {(libraryPaths as any[]).map((lp: any) => (
                  <div key={lp.id} className={cn(
                    "rounded-lg border transition-colors",
                    lp.enabled ? "bg-secondary border-border/50" : "bg-secondary/40 border-border/30 opacity-60"
                  )}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{lp.label}</p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">{lp.path}</p>
                      </div>
                      <button
                        onClick={() => toggleLibraryPath.mutate({ id: lp.id, enabled: !lp.enabled })}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title={lp.enabled ? "Disable this folder" : "Enable this folder"}
                      >
                        {lp.enabled
                          ? <ToggleRight className="w-5 h-5 text-primary" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove "${lp.label}"?`)) removeLibraryPath.mutate({ id: lp.id }); }}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                        title="Remove folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Scan depth selector per folder */}
                    <div className="px-3 pb-2.5 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Scan depth:</span>
                      <div className="flex gap-1">
                        {([2, 3] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => updateLibraryPathDepth.mutate({ id: lp.id, scanDepth: d })}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                              (lp.scanDepth ?? 2) === d
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
                            )}
                            title={d === 2 ? "2 levels: Folder/Collection/Model" : "3 levels: Folder/Group/Collection/Model"}
                          >
                            {d === 2 ? "2-level" : "3-level"}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60">
                        {(lp.scanDepth ?? 2) === 2
                          ? "Each subfolder = one model"
                          : "Subfolder → subfolder → model"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add folder form */}
                {showAddFolder && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground">Add a new library folder</p>
                    {/* Google Drive tip */}
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 flex gap-2.5 items-start">
                      <span className="text-blue-400 text-base leading-none mt-0.5">☁</span>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-blue-400">Using Google Drive?</span>{" "}
                        Install{" "}
                        <a
                          href="https://www.google.com/drive/download/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Google Drive for Desktop
                        </a>
                        {" "}— it mounts your Drive as a local drive letter (e.g.{" "}
                        <span className="font-mono">G:\</span>) so you can browse and add it here like any other folder.
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Folder path</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFolderPath}
                          onChange={(e) => setNewFolderPath(e.target.value)}
                          placeholder="G:\3d Print Files\YOSH - Cosplay"
                          className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                        />
                        <button
                          onClick={() => { setFolderBrowserTarget("new"); setShowFolderBrowser(true); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors shrink-0"
                        >
                          <Folder className="w-4 h-4" /> Browse
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Display label <span className="text-muted-foreground/50">(optional)</span></label>
                      <input
                        type="text"
                        value={newFolderLabel}
                        onChange={(e) => setNewFolderLabel(e.target.value)}
                        placeholder="e.g. YOSH Cosplay Models"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Scan depth</label>
                      <div className="flex gap-2">
                        {([2, 3] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setNewFolderScanDepth(d)}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                              newFolderScanDepth === d
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
                            )}
                          >
                            {d === 2 ? "2-level (Collection → Model)" : "3-level (Group → Collection → Model)"}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground/70">
                        {newFolderScanDepth === 2
                          ? "Each direct subfolder of your chosen folder = one model tile"
                          : "Two levels of subfolders before model tiles — use when your folder has categories inside categories"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const label = newFolderLabel.trim() || newFolderPath.split(/[\/\\]/).filter(Boolean).pop() || newFolderPath;
                          addLibraryPath.mutate({ path: newFolderPath.trim(), label, scanDepth: newFolderScanDepth });
                        }}
                        disabled={addLibraryPath.isPending || !newFolderPath.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90"
                      >
                        {addLibraryPath.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Folder
                      </button>
                      <button
                        onClick={() => { setShowAddFolder(false); setNewFolderPath(""); setNewFolderLabel(""); setNewFolderScanDepth(2); }}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* LLM settings */}
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI / LLM Configuration</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Used for auto-tagging and thumbnail selection. Supports Ollama, OpenAI, LM Studio, and more.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAIGuide(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="How to set up AI"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Setup Guide
                  </button>
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
                        placeholder="https://api.openai.com/v1  or  http://localhost:11434"
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
                  disabled={startScan.isPending || scanStatus?.inProgress}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border/50 text-foreground disabled:opacity-40 transition-opacity hover:bg-muted"
                >
                  <RefreshCw className={cn("w-4 h-4", (startScan.isPending || scanStatus?.inProgress) && "animate-spin")} />
                  Start Scan
                </button>

                {/* Thumbnail re-pick */}
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-0.5">Thumbnail Management</h3>
                    <p className="text-xs text-muted-foreground">Re-run AI thumbnail selection across your library.</p>
                  </div>
                  {rePickingAny && rePickProgress && (
                    <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground">Running thumbnail re-pick…</span>
                      </div>
                      {(rePickProgress as any).total > 0 && (
                        <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.round(((rePickProgress as any).processed / (rePickProgress as any).total) * 100)}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(rePickProgress as any).processed ?? 0} / {(rePickProgress as any).total ?? "?"} models
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => rePickThumbnails.mutate()}
                      disabled={rePickingAny}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <ImageIcon className={cn("w-3.5 h-3.5", rePickingThumbs && "animate-spin")} />
                      Re-pick All (AI + unset)
                    </button>
                    <button
                      onClick={() => rePickUnset.mutate()}
                      disabled={rePickingAny}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <ImageIcon className={cn("w-3.5 h-3.5", rePickingUnset && "animate-spin")} />
                      Re-pick Unset Only
                    </button>
                  </div>
                </div>

                {/* Re-tag */}
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-0.5">Auto-Tagging</h3>
                    <p className="text-xs text-muted-foreground">Re-run AI tag suggestions for all models. Requires AI to be configured.</p>
                  </div>
                  <button
                    onClick={() => reTagAll.mutate()}
                    disabled={reTagging}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  >
                    <Zap className={cn("w-3.5 h-3.5", reTagging && "animate-spin")} />
                    Re-tag All Models
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* ── Tags Tab ── */}
        {activeTab === "tags" && (
          <div className="space-y-6">
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">Manage Tags</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Create and delete tags for organizing your models</p>
              </div>
              <div className="p-5 space-y-4">
                {/* Create tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }}
                    placeholder="New tag name…"
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        className={cn("w-6 h-6 rounded-full transition-transform", newTagColor === c && "ring-2 ring-offset-2 ring-offset-background ring-white scale-110")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => { if (newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }}
                    disabled={!newTagName.trim() || createTag.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* Tag list — compact pill grid */}
                {allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tags yet. Create one above.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag: any) => (
                      <div
                        key={tag.id}
                        className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-border/50 bg-secondary text-sm"
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#6366f1" }} />
                        <span className="text-foreground leading-none">{tag.name}</span>
                        {(tag.modelCount ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground leading-none">({tag.modelCount})</span>
                        )}
                        <button
                          onClick={() => deleteTag.mutate({ id: tag.id })}
                          className="ml-0.5 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete tag"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

      {/* ── Trash Tab ── */}
      {activeTab === "trash" && <TrashTab />}

      </div>
    </>
  );
}

// ── Trash Tab Component ─────────────────────────────────────────────────────────────────────────────────────
function TrashTab() {
  const utils = trpc.useUtils();
  const { data: trashFiles = [], isLoading: loadingFiles } = trpc.trash.list.useQuery();
  const { data: trashModelItems = [], isLoading: loadingModels } = trpc.trash.listModels.useQuery();
  const [confirmPurgeAll, setConfirmPurgeAll] = React.useState(false);

  const totalCount = trashFiles.length + trashModelItems.length;
  const isLoading = loadingFiles || loadingModels;

  // File-level mutations
  const restoreFileMutation = trpc.trash.restore.useMutation({
    onSuccess: (res) => { toast.success(`Restored: ${res.message}`); utils.trash.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const purgeFileMutation = trpc.trash.purge.useMutation({
    onSuccess: () => { toast.success("File permanently deleted"); utils.trash.list.invalidate(); },
    onError: () => toast.error("Failed to permanently delete file"),
  });
  const purgeAllFilesMutation = trpc.trash.purgeAll.useMutation({
    onSuccess: () => { utils.trash.list.invalidate(); },
    onError: () => toast.error("Failed to empty file trash"),
  });

  // Model-level mutations
  const restoreModelMutation = trpc.trash.restoreModel.useMutation({
    onSuccess: (res) => { toast.success(res.message); utils.trash.listModels.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const purgeModelMutation = trpc.trash.purgeModel.useMutation({
    onSuccess: () => { toast.success("Model permanently deleted"); utils.trash.listModels.invalidate(); },
    onError: () => toast.error("Failed to permanently delete model"),
  });
  const purgeAllModelsMutation = trpc.trash.purgeAllModels.useMutation({
    onSuccess: () => { utils.trash.listModels.invalidate(); },
    onError: () => toast.error("Failed to empty model trash"),
  });

  const handleEmptyAll = async () => {
    await Promise.all([
      purgeAllFilesMutation.mutateAsync(),
      purgeAllModelsMutation.mutateAsync(),
    ]);
    toast.success("Trash emptied");
    setConfirmPurgeAll(false);
  };

  const formatDate = (ts: Date | number) => new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* ── Trashed Models ── */}
      <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="font-semibold text-foreground">Deleted Models</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Entire model folders moved to trash — restore to re-import on next scan</p>
          </div>
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : trashModelItems.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-muted-foreground">
            <FolderOpen className="w-7 h-7 opacity-25" />
            <p className="text-sm">No deleted models</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {trashModelItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-muted/50">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.modelName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.categoryName && <><span className="text-foreground/70">{item.categoryName}</span><span className="mx-1.5 opacity-40">·</span></>}
                    {item.fileCount} file{item.fileCount !== 1 ? "s" : ""}, {item.imageCount} image{item.imageCount !== 1 ? "s" : ""}
                    <span className="mx-1.5 opacity-40">·</span>
                    Deleted {formatDate(item.deletedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5" title={item.originalFolderPath}>{item.originalFolderPath}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => restoreModelMutation.mutate({ id: item.id })}
                    disabled={restoreModelMutation.isPending}
                    className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Restore folder to original location (then run a library scan to re-import)"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => purgeModelMutation.mutate({ id: item.id })}
                    disabled={purgeModelMutation.isPending}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Permanently delete folder from disk"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Trashed Files ── */}
      <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="font-semibold text-foreground">Deleted Files</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Individual files removed from models</p>
          </div>
          {totalCount > 0 && (
            <button
              onClick={() => setConfirmPurgeAll(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Empty All Trash
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : trashFiles.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-muted-foreground">
            <Trash2 className="w-7 h-7 opacity-25" />
            <p className="text-sm">No deleted files</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {trashFiles.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-muted/50">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.originalName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    From: <span className="text-foreground/70">{item.modelName}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {item.fileType === "image" ? "Render image" : "Model file"}
                    <span className="mx-1.5 opacity-40">·</span>
                    Deleted {formatDate(item.deletedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5" title={item.originalAbsPath}>{item.originalAbsPath}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => restoreFileMutation.mutate({ id: item.id })}
                    disabled={restoreFileMutation.isPending}
                    className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Restore file to original location"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => purgeFileMutation.mutate({ id: item.id })}
                    disabled={purgeFileMutation.isPending}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Permanently delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm empty all trash dialog */}
      {confirmPurgeAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmPurgeAll(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Empty All Trash?</h3>
                <p className="text-sm text-muted-foreground mt-1">This permanently deletes all {totalCount} item{totalCount !== 1 ? "s" : ""} in the trash. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmPurgeAll(false)} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={handleEmptyAll}
                disabled={purgeAllFilesMutation.isPending || purgeAllModelsMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {(purgeAllFilesMutation.isPending || purgeAllModelsMutation.isPending) ? "Deleting..." : "Empty Trash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
