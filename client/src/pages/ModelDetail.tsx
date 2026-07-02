import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Heart, ExternalLink, Download, Box, ChevronLeft, ChevronRight,
  Tag, Plus, X, Pencil, Check, FolderOpen, FileBox, Archive, FileText, File, Star
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import STLViewer from "@/components/STLViewer";
import { driveImageUrl } from "@/lib/driveImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function formatBytes(bytes: string | number) {
  const n = Number(bytes);
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const modelId = parseInt(params.id || "0");

  // Always start at the top of the page when navigating to a model
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [modelId]);

  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [editingCatLabel, setEditingCatLabel] = useState(false);
  const [catLabelValue, setCatLabelValue] = useState("");
  const { user } = useAuth();
  const isOwner = !!(user?.role === "admin" || user?.openId === (window as any).__OWNER_OPEN_ID);

  const utils = trpc.useUtils();

  const { data: model, isLoading } = trpc.models.get.useQuery(
    { id: modelId },
    {
      enabled: !!modelId,
      onSuccess: (data: any) => {
        if (data) setNotesValue(data.customNotes || "");
      },
    } as any
  );

  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();

  const toggleFavorite = trpc.models.updateMeta.useMutation({
    onSuccess: () => utils.models.get.invalidate({ id: modelId }),
  });

  const saveNotes = trpc.models.updateMeta.useMutation({
    onSuccess: () => {
      setEditingNotes(false);
      utils.models.get.invalidate({ id: modelId });
      toast.success("Notes saved");
    },
  });

  const addTagToModel = trpc.tags.addToModel.useMutation({
    onSuccess: () => utils.models.get.invalidate({ id: modelId }),
  });

  const removeTagFromModel = trpc.tags.removeFromModel.useMutation({
    onSuccess: () => utils.models.get.invalidate({ id: modelId }),
  });

  const updateCategoryLabel = trpc.categories.updateLabel.useMutation({
    onSuccess: () => {
      setEditingCatLabel(false);
      utils.categories.list.invalidate();
      toast.success("Collection label updated");
    },
  });

  const setHeroImage = trpc.models.setHeroImage.useMutation({
    onSuccess: () => {
      utils.models.get.invalidate({ id: modelId });
      toast.success("Hero image updated");
    },
    onError: () => toast.error("Failed to update hero image"),
  });

  const clearHeroImage = trpc.models.clearHeroImage.useMutation({
    onSuccess: () => {
      utils.models.get.invalidate({ id: modelId });
      toast.success("Hero image cleared — AI will re-pick on next scan");
    },
    onError: () => toast.error("Failed to clear hero image"),
  });

  const rescanOne = trpc.models.rescanOne.useMutation({
    onSuccess: (result) => {
      utils.models.get.invalidate({ id: modelId });
      utils.models.list.invalidate();
      const parts = [
        `${result.imagesFound} image${result.imagesFound !== 1 ? "s" : ""}`,
        `${result.filesFound} file${result.filesFound !== 1 ? "s" : ""} found`,
      ];
      if (result.movedToCategory) {
        parts.push(`moved to "${result.movedToCategory}"`);
      }
      toast.success(`Rescan complete — ${parts.join(", ")}`);
    },
    onError: (err) => toast.error(`Rescan failed: ${err.message}`),
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: (tag) => {
      if (tag) {
        addTagToModel.mutate({ modelId, tagId: tag.id });
        utils.tags.list.invalidate();
      }
      setNewTagName("");
      setShowTagInput(false);
    },
  });

  // Carousel wheel scroll — must be declared before any early returns (Rules of Hooks)
  const carouselRef = useRef<HTMLDivElement>(null);
  const imagesLengthRef = useRef(0);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const len = imagesLengthRef.current;
      if (len <= 1) return;
      e.preventDefault();
      if (e.deltaY > 0) setActiveImg((i) => (i + 1) % len);
      else setActiveImg((i) => (i - 1 + len) % len);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isLoading]); // re-run after loading clears so the carousel element is in the DOM

  // Keyboard arrow navigation — works on model page and inside lightbox
  const lightboxRef = useRef(false);
  useEffect(() => { lightboxRef.current = lightbox; }, [lightbox]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const len = imagesLengthRef.current;
      if (len <= 1) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveImg((i) => (i + 1) % len);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveImg((i) => (i - 1 + len) % len);
      } else if (e.key === "Escape" && lightboxRef.current) {
        setLightbox(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading]); // re-run after loading so imagesLengthRef is populated

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-6 bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3"><Skeleton className="aspect-[4/3] rounded-xl bg-muted" /></div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/2 bg-muted" />
            <Skeleton className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container py-16 text-center">
        <Box className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Model not found.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-primary text-sm hover:underline">Back to library</button>
      </div>
    );
  }

  const images: any[] = model.images as any[] || [];
  const heroImageUrl: string | null = (model as any).heroImage || null;
  // Find the active image index matching the current heroImage (match by fileId)
  const heroIdx = heroImageUrl
    ? images.findIndex((img) =>
        heroImageUrl.includes(img.id) ||
        img.thumbnailLink === heroImageUrl ||
        heroImageUrl === `/api/drive-image/${img.id}`
      )
    : -1;
  // First STL for viewer fallback
  const firstStlFile = images.length === 0
    ? (model.modelFiles as any[] | null)?.find((f: any) => f.name?.toLowerCase().endsWith(".stl") && f.webContentLink) ?? null
    : null;
  const rawFiles: any[] = model.modelFiles as any[] || [];

  // Prioritize: docs/PDFs/instructions first, then images, then 3D model files
  const DOC_EXTS = new Set(["pdf", "txt", "md", "doc", "docx", "rtf", "xlsx", "csv", "zip"]);
  const IMG_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);
  const MODEL_EXTS = new Set(["stl", "3mf", "obj", "step", "stp", "gcode", "f3d", "blend"]);
  const getFilePriority = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (DOC_EXTS.has(ext)) return 0;
    if (IMG_EXTS.has(ext)) return 1;
    if (MODEL_EXTS.has(ext)) return 2;
    return 3;
  };
  const modelFiles = [...rawFiles].sort((a, b) => getFilePriority(a.name) - getFilePriority(b.name));
  const modelTags: any[] = (model as any).tags || [];
  const category = categories.find((c) => c.id === model.categoryId);

  // Keep the ref in sync so the stable wheel handler always has the current count
  imagesLengthRef.current = images.length;

  const prevImg = () => setActiveImg((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg((i) => (i + 1) % images.length);

  const unassignedTags = allTags.filter((t) => !modelTags.some((mt) => mt.id === t.id));

  return (
    <div className="container py-8">
      {/* Header row: back button + admin actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Library
        </button>

        {isOwner && (
          <button
            onClick={() => rescanOne.mutate({ id: modelId })}
            disabled={rescanOne.isPending}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Re-fetch this model's files and images from Google Drive, then re-pick the best thumbnail"
          >
            {rescanOne.isPending ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Rescanning…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Rescan Model
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Image carousel */}
        <div className="lg:col-span-3 space-y-3">
          {/* Main image */}
          <div
            ref={carouselRef}
            className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-pointer group"
            onClick={() => images.length > 0 && setLightbox(true)}
          >
            {images.length > 0 ? (
              <img
                src={driveImageUrl(images[activeImg]?.id, 800) || ""}
                alt={images[activeImg]?.name}
                className="w-full h-full object-contain bg-muted"
                onError={(e) => { (e.target as HTMLImageElement).src = images[activeImg]?.thumbnailLink?.replace("=s220", "=s800") || ""; }}
              />
            ) : firstStlFile ? (
              <STLViewer url={firstStlFile.webContentLink} className="w-full h-full" bgColor="#0d0d0d" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Box className="w-16 h-16 opacity-20" />
                <span className="text-sm opacity-50">No render images available</span>
              </div>
            )}
            {/* Hero image badge */}
            {images.length > 0 && heroIdx === activeImg && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-500/90 text-black text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-black" /> Hero
                </div>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearHeroImage.mutate({ id: modelId }); }}
                    className="flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                    title="Clear hero image — AI will re-pick on next scan"
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            )}

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImg(i); }} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === activeImg ? "bg-white w-4" : "bg-white/50 hover:bg-white/80")} />
                  ))}
                </div>
              </>
            )}

            {images.length > 0 && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full backdrop-blur-sm">{activeImg + 1} / {images.length}</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 0 && (
            <div className="space-y-1.5">
              {images.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {isOwner ? "Click a photo to view · hover for \"Set as Hero\" option" : "Click a photo to view"}
                </p>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => {
                  const isHero = i === heroIdx;
                  return (
                    <div key={img.id} className="relative shrink-0 group/thumb">
                      <button
                        onClick={() => setActiveImg(i)}
                        className={cn(
                          "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all block",
                          i === activeImg ? "border-primary" : isHero ? "border-amber-500" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img
                          src={driveImageUrl(img.id, 120) || ""}
                          alt={img.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = img.thumbnailLink?.replace("=s220", "=s120") || ""; }}
                        />
                      </button>
                      {/* Hero badge */}
                      {isHero && (
                        <div className="absolute top-0.5 left-0.5 bg-amber-500 rounded-full p-0.5 pointer-events-none">
                          <Star className="w-2.5 h-2.5 fill-black text-black" />
                        </div>
                      )}
                      {/* Set as Hero button (owner only) */}
                      {isOwner && !isHero && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Store the proxy URL as heroImage so it never expires
                            const heroUrl = `/api/drive-image/${img.id}`;
                            setHeroImage.mutate({ id: modelId, heroImage: heroUrl });
                          }}
                          className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white text-[9px] font-medium"
                          title="Set as hero image"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Set Hero
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Model files — grouped by extension */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <FileBox className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Files</h3>
              <span className="text-xs text-muted-foreground">{modelFiles.length} file{modelFiles.length !== 1 ? "s" : ""}</span>
              {modelFiles.length > 0 && (
                <a
                  href={`/api/download/zip/${modelId}`}
                  download
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  title="Download all files as ZIP"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Download All (.zip)
                </a>
              )}
            </div>
            {modelFiles.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No model files found in this folder or its subfolders</div>
            ) : (
              <div className="divide-y divide-border/30">
                {modelFiles.map((file) => {
                  const dotIdx = file.name.lastIndexOf(".");
                  const fileExt = dotIdx >= 0 ? file.name.slice(dotIdx + 1).toUpperCase() : "FILE";
                  const extColors: Record<string, string> = { STL: "#6366f1", OBJ: "#8b5cf6", "3MF": "#14b8a6", STEP: "#f97316", STP: "#f97316", GCODE: "#22c55e", PDF: "#ef4444", TXT: "#94a3b8", MD: "#94a3b8", DOC: "#3b82f6", DOCX: "#3b82f6", ZIP: "#eab308", PNG: "#22c55e", JPG: "#22c55e", JPEG: "#22c55e" };
                  const extColor = extColors[fileExt] || "#6b7280";
                  return (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
                      <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: extColor + "22", color: extColor }}>{fileExt}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="View in Drive">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {file.webContentLink && (
                          <a href={file.webContentLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title & favorite */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground leading-tight">{model.name}</h1>
              {category && (
                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  {editingCatLabel ? (
                    <form onSubmit={(e) => { e.preventDefault(); if (catLabelValue.trim()) updateCategoryLabel.mutate({ driveId: category.driveId, customLabel: catLabelValue.trim() }); }} className="flex items-center gap-1">
                      <input autoFocus value={catLabelValue} onChange={(e) => setCatLabelValue(e.target.value)} className="text-sm bg-muted border border-border rounded px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-40" placeholder="Custom label…" />
                      <button type="submit" className="p-1 text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setEditingCatLabel(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </form>
                  ) : (
                    <button onClick={() => { setCatLabelValue(category.customLabel || category.name); setEditingCatLabel(true); }} className="flex items-center gap-1 hover:text-foreground transition-colors group" title="Edit collection label">
                      <span>{category.customLabel || category.name}</span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => toggleFavorite.mutate({ id: modelId, isFavorite: !model.isFavorite })}
              className={cn("p-2 rounded-lg transition-colors", model.isFavorite ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
              title={model.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("w-5 h-5", model.isFavorite && "fill-current")} />
            </button>
          </div>

          {/* Path */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Path</p>
            <p className="text-xs text-foreground/80 break-all leading-relaxed">{model.path}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
              <p className="text-2xl font-semibold text-foreground">{model.imageCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Render{model.imageCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
              <p className="text-2xl font-semibold text-foreground">{model.fileCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Model File{model.fileCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Tags</h3>
              <button onClick={() => setShowTagInput(!showTagInput)} className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current tags */}
            <div className="flex flex-wrap gap-1.5">
              {modelTags.length === 0 && !showTagInput && (
                <p className="text-xs text-muted-foreground">No tags yet. Click + to add one.</p>
              )}
              {modelTags.map((tag) => (
                <span key={tag.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: tag.color + "33", color: tag.color }}>
                  {tag.name}
                  <button onClick={() => removeTagFromModel.mutate({ modelId, tagId: tag.id })} className="hover:opacity-70 transition-opacity ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add existing tag */}
            {unassignedTags.length > 0 && showTagInput && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                <p className="w-full text-xs text-muted-foreground mb-1">Add existing tag:</p>
                {unassignedTags.map((tag) => (
                  <button key={tag.id} onClick={() => { addTagToModel.mutate({ modelId, tagId: tag.id }); }} className="text-xs px-2 py-1 rounded-full border transition-colors hover:opacity-80" style={{ backgroundColor: (tag.color ?? '#6366f1') + "22", color: tag.color ?? '#6366f1', borderColor: (tag.color ?? '#6366f1') + "44" }}>
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Create new tag */}
            {showTagInput && (
              <div className="pt-1 border-t border-border/30 space-y-2">
                <p className="text-xs text-muted-foreground">Create new tag:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tag name…"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button onClick={() => { if (newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor }); }} disabled={!newTagName.trim()} className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity">
                    Add
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewTagColor(c)} className={cn("w-5 h-5 rounded-full transition-all", newTagColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-card scale-110" : "")} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Notes</h3>
              {!editingNotes ? (
                <button onClick={() => setEditingNotes(true)} className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="ml-auto flex gap-1">
                  <button onClick={() => { setEditingNotes(false); setNotesValue(model.customNotes || ""); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><X className="w-3.5 h-3.5" /></button>
                  <button onClick={() => saveNotes.mutate({ id: modelId, customNotes: notesValue })} className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes about this model…"
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            ) : (
              <p className={cn("text-sm leading-relaxed", model.customNotes ? "text-foreground/80" : "text-muted-foreground italic")}>
                {model.customNotes || "No notes yet. Click the edit icon to add some."}
              </p>
            )}
          </div>

          {/* View in Drive */}
          <a
            href={`https://drive.google.com/drive/folders/${model.driveId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open folder in Google Drive
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(false)}
          onWheel={(e) => {
            if (images.length <= 1) return;
            e.preventDefault();
            if (e.deltaY > 0) nextImg(); else prevImg();
          }}
        >
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={driveImageUrl(images[activeImg].id, 2400) || ""}
            alt={images[activeImg].name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).src = images[activeImg].thumbnailLink?.replace("=s220", "=s2400") || ""; }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-white font-semibold text-sm tracking-wide">
              {activeImg + 1} <span className="text-white/50">/</span> {images.length}
            </div>
            <div className="text-white/50 text-xs max-w-xs truncate text-center">{images[activeImg].name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
