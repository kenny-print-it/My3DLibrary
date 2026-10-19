import { ExternalLink } from "lucide-react";

interface ChangeEntry {
  type: "feat" | "fix" | "improve";
  text: string;
}

interface Release {
  version: string;
  date: string;
  label?: string;
  entries: ChangeEntry[];
}

const RELEASES: Release[] = [
  {
    version: "v1.3 Beta — Build 5 Test",
    date: "October 2026",
    label: "Test build",
    entries: [
      { type: "fix", text: "3MF preview compatibility — the built-in viewer now uses the standard Three.js 3MF reader, so multi-part 3MF projects and transformed model parts can display correctly" },
      { type: "feat", text: "View 3D model — when a model already has render images, select this option to open its interactive STL or 3MF preview without replacing the current thumbnail" },
      { type: "improve", text: "Safer thumbnail generation — the thumbnail tool now uses the same updated 3MF reader as the interactive preview" },
      { type: "fix", text: "Folder opening reliability — the model-folder action continues to bring the selected folder to the front rather than leaving it behind another window" },
    ],
  },
  {
    version: "v1.3 Beta — Build 4",
    date: "September 2026",
    entries: [
      { type: "feat", text: "My3DLibrary Light, Dark, and High Contrast themes — choose your preferred look in Settings → Appearance; the app remembers the choice" },
      { type: "feat", text: "Startup preferences — select Quick, Standard, or Leisurely opening timing, with an optional startup sound that remains off by default" },
      { type: "feat", text: "Card density — choose Compact, Comfortable, or Roomy model cards from the Library toolbar" },
      { type: "feat", text: "Prefer This Hero — lock the active model image as your manual choice so later AI re-picks do not replace it" },
      { type: "improve", text: "Cleaner AI hero selections — AI now favors clean, assembled single-model renders and avoids exploded views, contact sheets, collages, and multi-angle image layouts" },
    ],
  },
  {
    version: "v1.3 Beta — Build 3",
    date: "September 2026",
    entries: [
      { type: "improve", text: "Ultra-wide Library layout — the content area expands in measured steps on large and ultra-wide displays, showing more model cards per row without making them awkwardly large" },
      { type: "feat", text: "My3DLibrary branding beside the Library title — the product logo now sits beside the My 3D Library heading, version, model count, and collection count" },
      { type: "feat", text: "Sticky Library controls — the title, sort menu, search field, favorites, thumbnail-generation, selection, and Filters controls remain available below the app navigation while browsing" },
      { type: "improve", text: "Simplified top navigation — the duplicate My3DLibrary product mark was removed from the top bar now that the full logo identifies the Library page" },
    ],
  },
  {
    version: "v1.3 Beta — Build 2",
    date: "August 2026",
    entries: [
      { type: "improve", text: "Google Gemini online AI — the recommended online setup supports both text tags and render-image selection using your own Gemini API key and free-tier quota. The Setup Guide asks for clear privacy confirmation before render thumbnails are sent to Google." },
      { type: "feat", text: "Collections, Tabs, and Compact List layouts — browse by expandable collection sections, jump between horizontal category tabs, or use dense model rows" },
      { type: "feat", text: "Compact List sorting — sort by model name, collection, tags, or file count; mobile users get the same choices in a selector" },
      { type: "feat", text: "Pinned collections — owners can pin favorite collections so they stay first in Collections and Tabs" },
      { type: "feat", text: "Collection covers — collection headers and selected Tabs use an existing model hero image as a banner, with a graceful fallback when no render exists" },
      { type: "feat", text: "Remembered browsing preferences — chosen layout, selected tab, Compact List sort, and Recently Added visibility are saved on the device" },
      { type: "feat", text: "Recently Added can now be collapsed when you prefer a more compact library page" },
    ],
  },
  {
    version: "v1.2 Beta",
    date: "July 2026",
    entries: [
      { type: "improve", text: "AI provider guidance updated — Ollama is now the recommended free text-and-image option. Groq is retained only as an optional text-only compatibility option because the previously suggested Groq models are being retired and its replacement does not analyse images." },
      { type: "feat", text: "Dual-model AI tagging — separate Text Model (name/file tagging) and Vision Model (hero image analysis)" },
      { type: "feat", text: "GPU / CPU mode selection in Download-AI-Model.bat — the full local setup uses a text model plus a vision model, while CPU mode uses smaller models for PCs without a dedicated GPU" },
      { type: "feat", text: "Groq cloud AI support — optional text-only provider for users who choose a Groq API key" },
      { type: "feat", text: "Ollama auto-installer in Download-AI-Model.bat — no manual Ollama setup needed" },
      { type: "feat", text: "App auto-restarts after Download-AI-Model.bat completes — browser reopens automatically" },
      { type: "feat", text: "Silent launcher — no terminal windows visible when opening the app" },
      { type: "feat", text: "Click filename to open with default slicer app" },
      { type: "feat", text: "Open model folder in Explorer directly from the model detail view" },
      { type: "feat", text: "Inline file rename in model detail window" },
      { type: "feat", text: "Recycle bin — soft-delete models to .trash folder with restore and purge in Settings" },
      { type: "feat", text: "Bulk tagging — apply or remove tags across multiple models at once" },
      { type: "feat", text: "Source URL field — store a link to where the model was downloaded from" },
      { type: "feat", text: "3MF 3D viewer support — built-in viewer now handles both STL and 3MF files" },
      { type: "feat", text: "Multi-file viewer selector — switch between STL/3MF files with amber/blue badges" },
      { type: "feat", text: "Generate Thumbnail — takes a canvas screenshot of the Three.js viewer (auto-orients to a hero angle first, or captures your current rotation), saves the PNG to the model folder, and sets it as the hero image instantly" },
      { type: "feat", text: "Bulk thumbnail generation — sparkle ✦ button generates thumbnails for all models missing renders" },
      { type: "feat", text: "Retake Thumbnail — hover over an existing image and click \"Retake Thumbnail\" to re-orient the 3D viewer and capture a replacement" },
      { type: "feat", text: "AI Setup Guide auto-fill — click any option card to auto-populate API URL and model fields" },
      { type: "feat", text: "Print Settings card — record Material, Layer Height, Infill, and Support settings per model" },
      { type: "feat", text: "Sticky model title bar — model name stays visible while scrolling the detail page" },
      { type: "feat", text: "Newest on Drive sort option — sort library by original folder creation date" },
      { type: "feat", text: "Persistent sort preference — chosen sort order is remembered across navigation" },
      { type: "feat", text: "File search, sort, and type filter in the Files section of model detail" },
      { type: "feat", text: "ZIP file contents viewer — expand ZIP entries to see files inside the archive" },
      { type: "feat", text: "Hero image always shown first in the image carousel" },
      { type: "fix", text: "App Controls moved to Library tab (was hidden in Trash tab)" },
      { type: "fix", text: "Check Again button added to AI Status section for manual connection refresh" },
      { type: "fix", text: "Restart button now correctly shuts down and relaunches the app" },
      { type: "fix", text: "AI startup banner now correctly reflects dual-model availability" },
      { type: "fix", text: "Model settings (Text/Vision model names) now auto-apply from model-config.txt on startup" },
      { type: "fix", text: "Ollama now launches in CPU mode correctly — CUDA crash on incompatible GPU drivers resolved" },
      { type: "fix", text: "Folder open sometimes opened in the background or not at all — now reliably brings window to front" },
    ],
  },
  {
    version: "v1.1 Beta",
    date: "June 2026",
    entries: [
      { type: "feat", text: "VirtualModelGrid — smooth scrolling for large libraries (1000+ models)" },
      { type: "feat", text: "Favorites filter — quickly view starred models" },
      { type: "feat", text: "First-run onboarding — guided setup for new users" },
      { type: "feat", text: "isConfigured check — app prompts for library folder before showing the grid" },
      { type: "fix", text: "Start.bat reliability improvements — CRLF line endings, ASCII-only characters, removed LIBRARY_PATH env var" },
    ],
  },
  {
    version: "v1.0 Beta",
    date: "May 2026",
    entries: [
      { type: "feat", text: "Initial release — local 3D model library browser" },
      { type: "feat", text: "Scan library folder and display models in a grid" },
      { type: "feat", text: "Tag models with custom tags, filter and search by tag" },
      { type: "feat", text: "AI auto-tagging via Ollama (local LLM)" },
      { type: "feat", text: "Model detail view with hero image, file list, and notes" },
      { type: "feat", text: "Resources tab — links to 3D print communities and marketplaces" },
      { type: "feat", text: "About page — Kenny Print It bio and social links" },
      { type: "feat", text: "Windows portable app — no installation required" },
    ],
  },
];

const TYPE_STYLES: Record<ChangeEntry["type"], { label: string; className: string }> = {
  feat: { label: "New", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  fix: { label: "Fix", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  improve: { label: "Improved", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
};

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Changelog</h1>
          <p className="text-muted-foreground text-sm">
            What's new in My3DLibrary — release notes for every version.
          </p>
          <a
            href="https://github.com/kenny-print-it/My3DLibrary/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
          >
            View all releases on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Releases */}
        <div className="space-y-10">
          {RELEASES.map((release) => (
            <div key={release.version}>
              {/* Version header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">{release.version}</h2>
                {release.label && (
                  <span className="text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded px-2 py-0.5">
                    {release.label}
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{release.date}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50 mb-4" />

              {/* Entries */}
              <ul className="space-y-2.5">
                {release.entries.map((entry, i) => {
                  const style = TYPE_STYLES[entry.type];
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`shrink-0 text-[10px] font-semibold rounded px-1.5 py-0.5 mt-0.5 ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{entry.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            My3DLibrary is built by{" "}
            <a
              href="https://www.youtube.com/@KennyPrintIt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Kenny Print It
            </a>
            . Have a bug or feature request?{" "}
            <a
              href="https://github.com/kenny-print-it/My3DLibrary/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Open an issue on GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
