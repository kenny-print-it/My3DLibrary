import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Settings as SettingsIcon, FolderOpen, RefreshCw, Tag, Trash2, Plus,
  Zap, Image as ImageIcon,
  Lock, Pencil, Save, Key, Eye, EyeOff, ChevronRight,
  HelpCircle, X, ArrowLeft, Folder, ToggleLeft, ToggleRight,
  CheckCircle2, AlertCircle, Loader2, Square,
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
    if (browseData?.parent != null) {
      // Empty string means "go back to drive list" on Windows
      setBrowsePath(browseData.parent === "" ? undefined : browseData.parent);
    }
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
interface AIPreset {
  apiUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
}

function AISetupGuideDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply?: (preset: AIPreset) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);

  const presets: Record<"A" | "B" | "C" | "D", AIPreset> = {
    A: { apiUrl: "http://localhost:11434", apiKey: "", textModel: "llama3.2-vision", visionModel: "llama3.2-vision" },
    B: { apiUrl: "https://api.groq.com/openai/v1", apiKey: "", textModel: "llama-3.1-8b-instant", visionModel: "llama-3.2-11b-vision-preview" },
    C: { apiUrl: "https://api.openai.com/v1", apiKey: "", textModel: "gpt-4o-mini", visionModel: "gpt-4o-mini" },
    D: { apiUrl: "http://localhost:1234/v1", apiKey: "", textModel: "", visionModel: "" },
  };

  const handleApply = (option: "A" | "B" | "C" | "D") => {
    onApply?.(presets[option]);
    onClose();
  };

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
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3">
            <p className="text-foreground font-medium mb-1">🤖 What does AI do in My3DLibrary?</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
              <li><strong>Auto-tagging</strong> — reads your model names and file lists, then automatically applies matching tags (e.g. "fantasy", "vehicle", "miniature")</li>
              <li><strong>Thumbnail selection</strong> — picks the best render image as the cover photo for each model</li>
            </ul>
            <p className="text-muted-foreground text-xs mt-2">✅ AI is completely optional — your library works perfectly without it.</p>
          </div>

          {/* Quick-select tip */}
          {onApply && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-foreground"><strong>Tip:</strong> Click <strong>Use This Option</strong> on any option below to auto-fill the settings form — then just add your API key if needed.</p>
            </div>
          )}

          {/* Option A: Ollama */}
          <div
            className={cn(
              "rounded-xl border transition-all",
              selectedOption === "A" ? "border-primary bg-primary/5" : "border-border/50"
            )}
          >
            <button
              className="w-full text-left px-4 pt-4 pb-2 flex items-center gap-2"
              onClick={() => setSelectedOption(selectedOption === "A" ? null : "A")}
            >
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
              <span className="font-semibold text-foreground text-sm">Ollama (Free, runs on your PC)</span>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", selectedOption === "A" && "rotate-90")} />
            </button>
            {selectedOption === "A" && (
              <div className="px-4 pb-4 space-y-2.5 text-muted-foreground text-xs">
                <p>Ollama runs AI models directly on your computer — <strong className="text-foreground">no internet connection, no account, and no monthly fee required.</strong> You need a PC with at least 8 GB of RAM.</p>

                <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2.5 space-y-2">
                  <p className="font-medium text-green-400">⚡ Easiest way — use the included batch file</p>
                  <p>In your <span className="font-mono">My3DLibrary-Portable</span> folder, double-click <strong className="text-foreground">Download-AI-Model.bat</strong>. It will download and install everything automatically. Then skip to Step 3.</p>
                </div>

                <p className="font-medium text-foreground/70">— or set it up manually —</p>

                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                  <p className="font-medium text-foreground">Step 1 — Download and install Ollama</p>
                  <p>Go to <span className="font-mono text-primary">ollama.com/download</span> in your browser and download the Windows version. You'll get a file called <span className="font-mono">OllamaSetup.exe</span>. Run it to install Ollama like any normal program.</p>
                </div>

                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                  <p className="font-medium text-foreground">Step 2 — Download the AI model</p>
                  <p>Open the <strong className="text-foreground">Start menu</strong>, search for <strong className="text-foreground">Command Prompt</strong>, and open it. Then type the command below and press <strong className="text-foreground">Enter</strong>:</p>
                  <code className="block bg-black/40 rounded px-2 py-1.5 font-mono text-green-400 text-[11px]">ollama pull llama3.2-vision</code>
                  <p>This downloads the AI model (about 7 GB). It may take 10–30 minutes. <strong className="text-foreground">You only need to do this once.</strong></p>
                </div>

                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-2">
                  <p className="font-medium text-foreground">Step 3 — Restart My3DLibrary</p>
                  <p>Close the app completely and reopen it using <span className="font-mono">My3DLibrary.exe</span>. Ollama will start automatically in the background.</p>
                </div>

                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Settings that will be filled in:</p>
                  <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">http://localhost:11434</span></p>
                  <p><span className="font-medium text-foreground">API Key:</span> <span className="italic">leave blank</span></p>
                  <p><span className="font-medium text-foreground">Model:</span> <span className="font-mono">llama3.2-vision</span></p>
                </div>

                {onApply && (
                  <button
                    onClick={() => handleApply("A")}
                    className="w-full mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Use This Option — Auto-fill Settings
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Option B: Groq — Recommended */}
          <div
            className={cn(
              "rounded-xl border transition-all",
              selectedOption === "B" ? "border-orange-500 bg-orange-500/5" : "border-border/50"
            )}
          >
            <button
              className="w-full text-left px-4 pt-4 pb-2 flex items-center gap-2"
              onClick={() => setSelectedOption(selectedOption === "B" ? null : "B")}
            >
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
              <span className="font-semibold text-foreground text-sm">Groq (Free, cloud-based)</span>
              <span className="text-[10px] font-normal text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded px-1.5 py-0.5">Recommended</span>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", selectedOption === "B" && "rotate-90")} />
            </button>
            {selectedOption === "B" && (
              <div className="px-4 pb-4 space-y-2.5 text-muted-foreground text-xs">
                <p>Groq is a free cloud AI service — <strong className="text-foreground">no GPU required, no large downloads.</strong> It works on any PC and is very fast. You just need a free account.</p>

                <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2.5 space-y-2">
                  <p className="font-medium text-orange-400">Step 1 — Get your free API key</p>
                  <p>Go to <span className="font-mono text-primary">console.groq.com</span> and sign up for free (no credit card needed). Once logged in, click <strong className="text-foreground">API Keys</strong> in the <strong className="text-foreground">top menu bar</strong>, then click <strong className="text-foreground">+ Create API Key</strong>. Copy the key — it starts with <span className="font-mono">gsk_</span>.</p>
                </div>

                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Settings that will be filled in:</p>
                  <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">https://api.groq.com/openai/v1</span></p>
                  <p><span className="font-medium text-foreground">API Key:</span> <span className="italic">you'll paste your <span className="font-mono">gsk_…</span> key after closing</span></p>
                  <p><span className="font-medium text-foreground">Text Model:</span> <span className="font-mono">llama-3.1-8b-instant</span></p>
                  <p><span className="font-medium text-foreground">Vision Model:</span> <span className="font-mono">llama-3.2-11b-vision-preview</span></p>
                </div>

                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2.5">
                  <p className="font-medium text-blue-400">✅ After applying</p>
                  <p className="mt-1">Paste your API key into the form, save, then scroll down to <strong className="text-foreground">AI Status</strong> and click <strong className="text-foreground">Check Again</strong>.</p>
                </div>

                {onApply && (
                  <button
                    onClick={() => handleApply("B")}
                    className="w-full mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Use This Option — Auto-fill Settings
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Option C: OpenAI */}
          <div
            className={cn(
              "rounded-xl border transition-all",
              selectedOption === "C" ? "border-primary bg-primary/5" : "border-border/50"
            )}
          >
            <button
              className="w-full text-left px-4 pt-4 pb-2 flex items-center gap-2"
              onClick={() => setSelectedOption(selectedOption === "C" ? null : "C")}
            >
              <span className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">C</span>
              <span className="font-semibold text-foreground text-sm">OpenAI (Paid, cloud-based)</span>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", selectedOption === "C" && "rotate-90")} />
            </button>
            {selectedOption === "C" && (
              <div className="px-4 pb-4 space-y-2 text-muted-foreground text-xs">
                <p>If you have an OpenAI API key, you can use GPT-4o for better results. This costs a small amount per model scanned.</p>
                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Settings that will be filled in:</p>
                  <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">https://api.openai.com/v1</span></p>
                  <p><span className="font-medium text-foreground">API Key:</span> <span className="italic">you'll paste your <span className="font-mono">sk-…</span> key after closing</span></p>
                  <p><span className="font-medium text-foreground">Text Model:</span> <span className="font-mono">gpt-4o-mini</span></p>
                  <p><span className="font-medium text-foreground">Vision Model:</span> <span className="font-mono">gpt-4o-mini</span></p>
                </div>
                {onApply && (
                  <button
                    onClick={() => handleApply("C")}
                    className="w-full mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Use This Option — Auto-fill Settings
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Option D: LM Studio */}
          <div
            className={cn(
              "rounded-xl border transition-all",
              selectedOption === "D" ? "border-primary bg-primary/5" : "border-border/50"
            )}
          >
            <button
              className="w-full text-left px-4 pt-4 pb-2 flex items-center gap-2"
              onClick={() => setSelectedOption(selectedOption === "D" ? null : "D")}
            >
              <span className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">D</span>
              <span className="font-semibold text-foreground text-sm">LM Studio (Free, GUI-based)</span>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", selectedOption === "D" && "rotate-90")} />
            </button>
            {selectedOption === "D" && (
              <div className="px-4 pb-4 space-y-2 text-muted-foreground text-xs">
                <p>LM Studio is a desktop app that lets you run local models with a friendly interface. Start the local server in LM Studio, then use:</p>
                <div className="rounded-lg bg-secondary border border-border/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Settings that will be filled in:</p>
                  <p><span className="font-medium text-foreground">API URL:</span> <span className="font-mono">http://localhost:1234/v1</span></p>
                  <p><span className="font-medium text-foreground">API Key:</span> <span className="italic">leave blank</span></p>
                  <p><span className="font-medium text-foreground">Text/Vision Model:</span> <span className="italic">enter the model name shown in LM Studio after applying</span></p>
                </div>
                {onApply && (
                  <button
                    onClick={() => handleApply("D")}
                    className="w-full mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Use This Option — Auto-fill Settings
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="px-5 py-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-accent transition-colors border border-border/50"
          >
            Close guide
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
  const [llmTextModel, setLlmTextModel] = useState("");
  const [llmVisionModel, setLlmVisionModel] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [isLlmEditing, setIsLlmEditing] = useState(false);
  const [showAIGuide, setShowAIGuide] = useState(false);
  // AI status — poll every 10s so it refreshes after settings save
  const { data: llmStatus, isLoading: llmStatusLoading, refetch: refetchLlmStatus } = trpc.settings.llmStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });

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
      // Pre-populate with recommended defaults when fields are blank so new users
      // get the correct models without having to know the names.
      const recText = (settings as any).recommended_text_model || "llama3.2";
      const recVision = (settings as any).recommended_vision_model || "llava";
      setLlmTextModel((settings as any).llm_text_model || (settings as any).llm_model || recText);
      setLlmVisionModel((settings as any).llm_vision_model || (settings as any).llm_model || recVision);
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
      toast.success("Re-tagging started — this may take 10–30 minutes depending on your library size");
    },
    onError: () => { setReTagging(false); toast.error("Failed to start re-tagging"); },
  });

  const cancelAutoTag = trpc.tags.cancelAutoTag.useMutation({
    onSuccess: () => { toast.success("Stop signal sent — finishing current model then stopping"); setReTagging(false); },
    onError: () => toast.error("Failed to send stop signal"),
  });

  const [showTagLog, setShowTagLog] = React.useState(false);
  const clearAutoTagLog = trpc.tags.clearAutoTagLog.useMutation();
  const { data: autoTagLog, refetch: refetchTagLog } = trpc.tags.autoTagLog.useQuery(
    { lines: 200 },
    { enabled: showTagLog, refetchInterval: showTagLog ? 3000 : false }
  );

  const { data: autoTagProgress } = trpc.tags.autoTagProgress.useQuery(undefined, {
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.inProgress) return 2000;
      if (reTagging) return 1000;
      return false;
    },
    onSuccess: (d) => {
      if (!d.inProgress && reTagging) {
        setReTagging(false);
        utils.tags.list.invalidate();
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
        onApply={(preset) => {
          setLlmApiUrl(preset.apiUrl);
          setLlmApiKey(preset.apiKey);
          setLlmTextModel(preset.textModel);
          setLlmVisionModel(preset.visionModel);
          // Also set the legacy single-model field to the vision model for backward compat
          setLlmModel(preset.visionModel || preset.textModel);
          // Ensure the form is in edit mode so the user can see and save the values
          setIsLlmEditing(true);
          toast.success("Settings filled in — add your API key if needed, then click Save.");
        }}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-orange-500/60 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 hover:text-orange-300 transition-colors"
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Text Model <span className="normal-case text-muted-foreground/60">(name/file tagging)</span></p>
                        <p className="text-sm font-mono text-foreground truncate">
                          {(settings as any)?.llm_text_model || (settings as any)?.llm_model || <span className="text-muted-foreground italic">{(settings as any)?.recommended_text_model || "llama3.2"}</span>}
                        </p>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border/50">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Vision Model <span className="normal-case text-muted-foreground/60">(image analysis)</span></p>
                        <p className="text-sm font-mono text-foreground truncate">
                          {(settings as any)?.llm_vision_model || (settings as any)?.llm_model || <span className="text-muted-foreground italic">{(settings as any)?.recommended_vision_model || "llava"}</span>}
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
                      <label className="text-xs font-medium text-muted-foreground">
                        Text Model
                        <span className="ml-1.5 text-muted-foreground/60 font-normal">— fast model for name/file-based tag matching</span>
                      </label>
                      <input
                        type="text"
                        value={llmTextModel}
                        onChange={(e) => setLlmTextModel(e.target.value)}
                        placeholder="llama3.2"
                        className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground/60">Leave blank to use the legacy Model field as fallback</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Vision Model
                        <span className="ml-1.5 text-muted-foreground/60 font-normal">— vision model for hero image analysis</span>
                      </label>
                      <input
                        type="text"
                        value={llmVisionModel}
                        onChange={(e) => setLlmVisionModel(e.target.value)}
                        placeholder="llava"
                        className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground/60">Leave blank to use the legacy Model field as fallback</p>
                    </div>
                    <details className="group">
                      <summary className="text-xs text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors select-none">
                        Advanced: Legacy single-model field (optional)
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Legacy Model name <span className="text-muted-foreground/50">(fallback when Text/Vision fields are blank)</span></label>
                        <input
                          type="text"
                          value={llmModel}
                          onChange={(e) => setLlmModel(e.target.value)}
                          placeholder="gpt-4o-mini  or  llama3.2-vision"
                          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                        />
                      </div>
                    </details>
                    <button
                      onClick={() => {
                        updateSettings.mutate({ llm_api_url: llmApiUrl, llm_api_key: llmApiKey, llm_model: llmModel, llm_text_model: llmTextModel, llm_vision_model: llmVisionModel });
                        setIsLlmEditing(false);
                        setTimeout(() => refetchLlmStatus(), 1500);
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

            {/* AI Status */}
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI Status</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Live connection check for your configured AI model</p>
                </div>
                <button
                  onClick={() => refetchLlmStatus()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Re-check AI connection"
                >
                  <RefreshCw className="w-3 h-3" />
                  Check Again
                </button>
              </div>
              <div className="p-5 space-y-3">
                {llmStatusLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking AI connection…
                  </div>
                ) : !llmStatus?.configured ? (
                  <div className="flex items-start gap-3 rounded-lg bg-secondary border border-border/50 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">AI not configured</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Set an API URL above and save to enable AI features.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Text model status */}
                    {(() => {
                      const name = llmStatus.textModelName || llmStatus.modelName || "llama3.2";
                      const available = llmStatus.textModelName ? llmStatus.textModelAvailable : llmStatus.modelAvailable;
                      return available ? (
                        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-300">Text model ready — <span className="font-mono">{name}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">Used for name/file-based tag matching.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3">
                          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-300">Text model not found: <span className="font-mono">{name}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">Run <span className="font-mono">Download-AI-Model.bat</span> or set the Text Model field above.</p>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Vision model status */}
                    {(() => {
                      const name = llmStatus.visionModelName || llmStatus.modelName || "llava";
                      const available = llmStatus.visionModelName ? llmStatus.visionModelAvailable : llmStatus.modelAvailable;
                      return available ? (
                        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-300">Vision model ready — <span className="font-mono">{name}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">Used for hero image analysis.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3">
                          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-300">Vision model not found: <span className="font-mono">{name}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">Run <span className="font-mono">Download-AI-Model.bat</span> or set the Vision Model field above.</p>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Available models list (shown when any model is missing) */}
                    {(!llmStatus.textModelAvailable || !llmStatus.visionModelAvailable) && llmStatus.availableModels && llmStatus.availableModels.length > 0 && (
                      <div className="rounded-lg bg-secondary border border-border/50 px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Models available in Ollama — click to set as Text or Vision model:</p>
                        <div className="flex flex-wrap gap-2">
                          {llmStatus.availableModels.map((m) => (
                            <div key={m} className="flex gap-1">
                              <button
                                onClick={() => {
                                  const baseName = m.replace(/:latest$/, "");
                                  updateSettings.mutate({ llm_text_model: baseName });
                                  setLlmTextModel(baseName);
                                  setTimeout(() => refetchLlmStatus(), 1500);
                                  toast.success(`Text model set to ${baseName}`);
                                }}
                                className="px-2 py-1 rounded-l-md bg-card border border-border text-[11px] font-mono text-foreground hover:border-primary hover:text-primary transition-colors"
                                title={`Set ${m} as text model`}
                              >
                                {m}
                              </button>
                              <button
                                onClick={() => {
                                  const baseName = m.replace(/:latest$/, "");
                                  updateSettings.mutate({ llm_vision_model: baseName });
                                  setLlmVisionModel(baseName);
                                  setTimeout(() => refetchLlmStatus(), 1500);
                                  toast.success(`Vision model set to ${baseName}`);
                                }}
                                className="px-1.5 py-1 rounded-r-md bg-card border-y border-r border-border text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                title={`Set ${m} as vision model`}
                              >
                                <ImageIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-2">Click the name to set as Text model · click the image icon to set as Vision model</p>
                      </div>
                    )}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reTagAll.mutate()}
                      disabled={reTagging || autoTagProgress?.inProgress}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <Zap className={cn("w-3.5 h-3.5", (reTagging || autoTagProgress?.inProgress) && "animate-spin")} />
                      Re-tag All Models
                    </button>
                    {autoTagProgress?.inProgress && (
                      <button
                        onClick={() => cancelAutoTag.mutate()}
                        disabled={cancelAutoTag.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/60 border border-red-800/50 text-red-400 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-40 transition-colors"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    )}
                  </div>

                  {/* Live progress */}
                  {autoTagProgress?.inProgress && (
                    <div className="rounded-lg bg-secondary/60 border border-border/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Tagging in progress…
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {autoTagProgress.processed} / {autoTagProgress.total}
                        </span>
                      </div>
                      {autoTagProgress.total > 0 && (
                        <div className="w-full bg-border/50 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((autoTagProgress.processed / autoTagProgress.total) * 100)}%` }}
                          />
                        </div>
                      )}
                      {autoTagProgress.currentModel && (
                        <p className="text-xs text-muted-foreground truncate">
                          Currently tagging: <span className="text-foreground">{autoTagProgress.currentModel}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Tagged so far: <span className="text-green-400 font-medium">{autoTagProgress.tagged}</span>
                        {autoTagProgress.errors > 0 && (
                          <span className="text-red-400 ml-2">· {autoTagProgress.errors} errors</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Last run summary */}
                  {!autoTagProgress?.inProgress && autoTagProgress?.lastResult && (
                    <div className="rounded-lg bg-secondary/40 border border-border/50 p-3">
                      <p className="text-xs font-medium text-foreground mb-1">Last run summary</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground">Models processed</span>
                        <span className="text-foreground font-medium">{autoTagProgress.lastResult.processed}</span>
                        <span className="text-muted-foreground">Models tagged</span>
                        <span className="text-green-400 font-medium">{autoTagProgress.lastResult.tagged}</span>
                        <span className="text-muted-foreground">Skipped (locked)</span>
                        <span className="text-foreground font-medium">{autoTagProgress.lastResult.skipped}</span>
                        {autoTagProgress.lastResult.errors > 0 && (
                          <>
                            <span className="text-muted-foreground">Errors</span>
                            <span className="text-red-400 font-medium">{autoTagProgress.lastResult.errors}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  {/* AI Tagging Log */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => { setShowTagLog(v => !v); if (!showTagLog) refetchTagLog(); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/40 hover:bg-secondary/60 transition-colors text-xs"
                    >
                      <span className="font-medium text-foreground">AI Tagging Log</span>
                      <span className="text-muted-foreground">{showTagLog ? "▲ Hide" : "▼ Show"}</span>
                    </button>
                    {showTagLog && (
                      <div className="bg-black/40">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
                          <span className="text-[10px] text-muted-foreground">
                            {autoTagLog?.exists ? `Last ${autoTagLog.lines.length} lines · auto-refreshes every 3s` : "No log file yet — start a Re-tag to generate one"}
                          </span>
                          <button
                            onClick={() => { clearAutoTagLog.mutate(); setTimeout(() => refetchTagLog(), 300); }}
                            className="text-[10px] text-muted-foreground/60 hover:text-red-400 transition-colors"
                          >
                            Clear log
                          </button>
                        </div>
                        <div className="p-3 max-h-72 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-0.5">
                          {!autoTagLog?.exists || autoTagLog.lines.length === 0 ? (
                            <p className="text-muted-foreground italic">No log entries yet.</p>
                          ) : (
                            [...autoTagLog.lines].reverse().map((line, i) => {
                              const isError = line.includes("ERROR");
                              const isMatch = line.includes("matched tags:") && !line.includes("[none]") && !line.includes("[]");
                              const isNone = line.includes("matched tags: []") || line.includes("matched tags: [none]");
                              const isStart = line.includes("=== START") || line.includes("=== DONE");
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "truncate",
                                    isError && "text-red-400",
                                    isMatch && "text-green-400",
                                    isNone && "text-muted-foreground/50",
                                    isStart && "text-yellow-400 font-semibold",
                                    !isError && !isMatch && !isNone && !isStart && "text-muted-foreground"
                                  )}
                                  title={line}
                                >
                                  {line}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </section>

            {/* App Controls */}
            <section className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">App Controls</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Restart the server after changing AI settings or running the model downloader</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Restart App</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Closes the server process. To restart, close this browser tab and re-open <span className="font-mono">My3DLibrary.exe</span>.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      toast.info('Shutting down… close this tab and re-open My3DLibrary.exe to restart.', { duration: 8000 });
                      try { await fetch('/api/restart', { method: 'POST' }); } catch {}
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restart
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
