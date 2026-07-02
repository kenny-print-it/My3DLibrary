import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Search, Filter, X, Heart, Box, FolderOpen, RefreshCw,
  ExternalLink, ArrowUpDown, CheckCheck, ChevronDown, ChevronRight,
  GripVertical, LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Clock } from "lucide-react";
import STLViewer from "@/components/STLViewer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModelImageUrl } from "@/lib/driveImage";

type SortOption = "name_asc" | "name_desc" | "newest" | "most_files" | "most_renders";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "newest", label: "Newest Scanned" },
  { value: "most_files", label: "Most Files" },
  { value: "most_renders", label: "Most Renders" },
];

function ModelCard({ model, onClick }: { model: any; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Prefer AI-selected heroImage, fall back to first image — use proxy to avoid expiring Drive URLs
  const thumb = getModelImageUrl(model.images, model.heroImage, 400);
  // First STL file for viewer fallback
  const firstStl = !thumb ? (model.modelFiles as any[] | null)?.find(
    (f: any) => f.name?.toLowerCase().endsWith(".stl") && f.webContentLink
  ) : null;

  // Derive the Google Drive folder link from the model's driveId
  const driveFolderUrl = `https://drive.google.com/drive/folders/${model.driveId}`;

  return (
    <div className="model-card group relative rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {!imgLoaded && !imgError && !firstStl && <div className="absolute inset-0 shimmer" />}
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt={model.name}
            className={cn("w-full h-full object-cover transition-all duration-300 group-hover:scale-105", imgLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : firstStl ? (
          <STLViewer
            url={firstStl.webContentLink}
            className="w-full h-full"
            bgColor="#0d0d0d"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Box className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">No preview</span>
          </div>
        )}
        <div className="absolute inset-0 card-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        {model.isFavorite && (
          <div className="absolute top-2 right-2">
            <Heart className="w-4 h-4 fill-primary text-primary" />
          </div>
        )}
        {/* Open in Drive button — appears on hover, stops propagation so it doesn't open the model detail */}
        <a
          href={driveFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full hover:bg-black/80"
          title="Open folder in Google Drive"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Drive</span>
        </a>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            {model.fileCount} file{model.fileCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-foreground leading-tight line-clamp-2 mb-1">{model.name}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{model.imageCount} img{model.imageCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{model.fileCount} file{model.fileCount !== 1 ? "s" : ""}</span>
        </div>
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {model.tags.slice(0, 3).map((tag: any) => (
              <span
                key={tag.id}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: tag.color + "33", color: tag.color }}
              >{tag.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border/50">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-3 w-1/2 bg-muted" />
      </div>
    </div>
  );
}

const FILE_TYPES = ["stl", "3mf", "obj", "step"];

const COLLAPSED_KEY = "printlib_collapsed_categories";

function useCategoryCollapse() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const persist = (next: Set<string>) => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(next))); } catch {}
  };

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const collapseAll = useCallback((ids: string[]) => {
    const next = new Set(ids);
    persist(next);
    setCollapsed(next);
  }, []);

  const expandAll = useCallback(() => {
    const next = new Set<string>();
    persist(next);
    setCollapsed(next);
  }, []);

  return { collapsed, toggle, collapseAll, expandAll };
}

function SortableCategoryRow({
  group,
  isReordering,
  collapsed,
  toggle,
  onNavigate,
  onViewAll,
}: {
  group: { category: any; models: any[] };
  isReordering: boolean;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  onNavigate: (path: string) => void;
  onViewAll: (id: number) => void;
}) {
  const catKey = String(group.category.id);
  const isCollapsed = collapsed.has(catKey);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mb-10">
      <Collapsible open={!isCollapsed} onOpenChange={() => !isReordering && toggle(catKey)}>
        <div className="flex items-center gap-3 mb-4">
          {/* Drag handle — only visible in reorder mode */}
          {isReordering && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-2 group/trigger focus:outline-none"
              aria-label={isCollapsed ? "Expand collection" : "Collapse collection"}
              disabled={isReordering}
            >
              <span className={cn("transition-transform duration-200 text-muted-foreground group-hover/trigger:text-foreground", isCollapsed ? "rotate-0" : "rotate-90")}>
                <ChevronRight className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-semibold text-foreground group-hover/trigger:text-foreground/80 transition-colors">
                {group.category.customLabel || group.category.name}
              </h2>
            </button>
          </CollapsibleTrigger>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full transition-colors", isCollapsed ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
            {group.models.length} model{group.models.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1 h-px bg-border/50" />
          {!isReordering && (
            <button onClick={() => onViewAll(group.category.id)} className="text-xs text-primary hover:text-primary/80 transition-colors">
              View all
            </button>
          )}
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {group.models.map((model) => (
              <ModelCard key={model.id} model={model} onClick={() => !isReordering && onNavigate(`/model/${model.id}`)} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function CategoryGallery({
  groups,
  onNavigate,
  onViewAll,
  isAdmin,
}: {
  groups: { category: any; models: any[] }[];
  onNavigate: (path: string) => void;
  onViewAll: (id: number) => void;
  isAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const allCategoryIds = useMemo(() => groups.map((g) => String(g.category.id)), [groups]);
  const { collapsed, toggle, collapseAll, expandAll } = useCategoryCollapse();
  const allCollapsed = allCategoryIds.length > 0 && allCategoryIds.every((id) => collapsed.has(id));

  const [isReordering, setIsReordering] = useState(false);
  const [localGroups, setLocalGroups] = useState(groups);
  useEffect(() => { if (!isReordering) setLocalGroups(groups); }, [groups, isReordering]);

  const reorder = trpc.categories.reorder.useMutation({
    onSuccess: () => utils.categories.list.invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalGroups((prev) => {
      const oldIndex = prev.findIndex((g) => g.category.id === active.id);
      const newIndex = prev.findIndex((g) => g.category.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSaveOrder() {
    reorder.mutate({ orderedIds: localGroups.map((g) => g.category.id) });
    setIsReordering(false);
  }

  function handleCancelReorder() {
    setLocalGroups(groups);
    setIsReordering(false);
  }

  return (
    <>
      {/* Toolbar: Collapse All / Expand All + Reorder toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isAdmin && !isReordering && (
            <button
              onClick={() => setIsReordering(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary border border-transparent hover:border-border/50"
            >
              <LayoutList className="w-3.5 h-3.5" />
              Reorder
            </button>
          )}
          {isReordering && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Drag sections to reorder</span>
              <button
                onClick={handleSaveOrder}
                disabled={reorder.isPending}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {reorder.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                Save Order
              </button>
              <button
                onClick={handleCancelReorder}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {!isReordering && (
          <button
            onClick={() => allCollapsed ? expandAll() : collapseAll(allCategoryIds)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", allCollapsed ? "-rotate-90" : "")} />
            {allCollapsed ? "Expand All" : "Collapse All"}
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localGroups.map((g) => g.category.id)} strategy={verticalListSortingStrategy}>
          {localGroups.map((group) => (
            <SortableCategoryRow
              key={group.category.id}
              group={group}
              isReordering={isReordering}
              collapsed={collapsed}
              toggle={toggle}
              onNavigate={onNavigate}
              onViewAll={onViewAll}
            />
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const { data: scanStatus } = trpc.scan.status.useQuery(undefined, { refetchInterval: 2000 });
  const { data: recentModels = [] } = trpc.models.recent.useQuery({ limit: 20 });
  const { data: models = [], isLoading: modelsLoading } = trpc.models.list.useQuery(
    {
      search: search || undefined,
      categoryId: selectedCategory ?? undefined,
      tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      fileType: selectedFileType ?? undefined,
      sortBy,
    },
    { keepPreviousData: true } as any
  );

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentDriveId || c.parentDriveId === "1sQRvAn0PbrvaKoJ8hqlqBBGhCLXhLXiZ"),
    [categories]
  );

  const isFiltered = !!(search || selectedCategory || selectedTags.length > 0 || selectedFileType);
  const activeFilterCount = (selectedCategory ? 1 : 0) + selectedTags.length + (selectedFileType ? 1 : 0);

  const grouped = useMemo(() => {
    if (isFiltered) return null;
    const map = new Map<string, { category: any; models: any[] }>();
    for (const cat of topCategories) map.set(String(cat.id), { category: cat, models: [] });
    const uncategorized: any[] = [];
    for (const model of models) {
      const key = String(model.categoryId);
      if (model.categoryId && map.has(key)) map.get(key)!.models.push(model);
      else uncategorized.push(model);
    }
    const result = Array.from(map.values()).filter((g) => g.models.length > 0);
    if (uncategorized.length > 0) result.push({ category: { id: -1, name: "Uncategorized", customLabel: null }, models: uncategorized });
    return result;
  }, [models, topCategories, isFiltered]);

  // isFirstScan: true only when the DB has zero models (regardless of scan log history)
  const isFirstScan = !modelsLoading && models.length === 0;
  const isScanning = scanStatus?.inProgress;
  const progress = scanStatus?.progress;

  // Auto-scan on first load: trigger automatically when the library is genuinely empty.
  // This fires even if a previous scan log exists (e.g. a failed or stale run).
  const autoScanFired = useRef(false);
  const utils = trpc.useUtils();
  const startScanMutation = trpc.scan.start.useMutation({
    onSuccess: () => {
      // Refresh models periodically while the scan runs so cards appear as they are indexed
      const poll = setInterval(async () => {
        utils.models.list.invalidate();
        utils.categories.list.invalidate();
        utils.models.recent.invalidate();
        const status = await utils.scan.status.fetch();
        if (!status.inProgress) {
          clearInterval(poll);
          // Show scan summary toast
          const log = status.lastScan;
          if (log?.status === "completed") {
            const parts: string[] = [];
            if (log.modelsFound != null) parts.push(`${log.modelsFound} model${log.modelsFound !== 1 ? "s" : ""}`);
            if (log.categoriesFound != null) parts.push(`${log.categoriesFound} collection${log.categoriesFound !== 1 ? "s" : ""}`);
            const summary = parts.length > 0 ? parts.join(", ") : "library updated";
            toast.success(`Scan complete — ${summary} found. AI tagging & thumbnails running in background.`, { duration: 6000 });
          } else if (log?.status === "failed") {
            toast.error(`Scan failed: ${log.errorMessage || "Unknown error"}`, { duration: 8000 });
          }
        }
      }, 4000);
    },
  });
  useEffect(() => {
    if (autoScanFired.current) return;
    if (isScanning) return; // a scan is already running — don't double-trigger
    if (modelsLoading || scanStatus === undefined) return; // still loading initial data
    if (isFirstScan) {
      autoScanFired.current = true;
      startScanMutation.mutate();
    }
  }, [isFirstScan, isScanning, modelsLoading, scanStatus]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">My 3D Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {models.length} model{models.length !== 1 ? "s" : ""} · {topCategories.length} collection{topCategories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-9 w-40 bg-secondary border-border/50 text-sm text-foreground focus:ring-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-9 py-2 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active tag chips shown inline when filters panel is closed */}
          {selectedTags.length > 0 && !showFilters && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <button
                    key={tagId}
                    onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tagId))}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors"
                    style={{ backgroundColor: (tag.color ?? "#6366f1") + "33", color: tag.color ?? "#6366f1", borderColor: (tag.color ?? "#6366f1") + "66" }}
                  >
                    {tag.name} <X className="w-2.5 h-2.5" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
              showFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary-foreground/20 text-xs flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl bg-card border border-border/50 space-y-4">
          {/* Collection filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Collection</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn("px-3 py-1 rounded-full text-sm transition-colors", !selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
              >All</button>
              {topCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={cn("px-3 py-1 rounded-full text-sm transition-colors", selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
                >{cat.customLabel || cat.name}</button>
              ))}
            </div>
          </div>

          {/* File type filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">File Type</p>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFileType(selectedFileType === ft ? null : ft)}
                  className={cn("px-3 py-1 rounded-full text-sm font-mono uppercase tracking-wide transition-colors", selectedFileType === ft ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
                >{ft}</button>
              ))}
            </div>
          </div>

          {/* Tags filter */}
          {allTags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTags((prev) => prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                    className="px-3 py-1 rounded-full text-sm transition-colors border"
                    style={selectedTags.includes(tag.id)
                      ? { backgroundColor: tag.color ?? "#6366f1", color: "#fff", borderColor: tag.color ?? "#6366f1" }
                      : { backgroundColor: (tag.color ?? "#6366f1") + "22", color: tag.color ?? "#6366f1", borderColor: (tag.color ?? "#6366f1") + "44" }}
                  >{tag.name}</button>
                ))}
              </div>
            </div>
          )}

          {(selectedCategory || selectedTags.length > 0 || selectedFileType) && (
            <button
              onClick={() => { setSelectedCategory(null); setSelectedTags([]); setSelectedFileType(null); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Recently Added horizontal strip */}
      {!isFiltered && !isFirstScan && recentModels.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recently Added</h2>
          </div>
          <Carousel
            opts={{ align: "start", dragFree: true, loop: true }}
            plugins={[Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })]}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {recentModels.map((model) => {
                const thumb = getModelImageUrl((model as any).images, (model as any).heroImage, 400);
                const firstStl = !thumb
                  ? (model.modelFiles as any[] | null)?.find(
                      (f: any) => f.name?.toLowerCase().endsWith(".stl") && f.webContentLink
                    )
                  : null;
                return (
                  <CarouselItem key={model.id} className="pl-3 basis-36 sm:basis-44">
                    <div
                      className="cursor-pointer group rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all hover:shadow-md"
                      onClick={() => navigate(`/model/${model.id}`)}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={model.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : firstStl ? (
                          <STLViewer url={firstStl.webContentLink} className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Box className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground truncate leading-tight">{model.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {((model as any).driveCreatedAt || model.lastScanned)
                            ? new Date((model as any).driveCreatedAt || model.lastScanned!).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden sm:flex" />
            <CarouselNext className="-right-4 hidden sm:flex" />
          </Carousel>
        </div>
      )}

      {/* Live scan progress banner */}
      {isScanning && (
        <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary">Scanning Google Drive…</p>
              {progress && (
                <p className="text-xs text-primary/70 mt-0.5 truncate">
                  {progress.modelsFound > 0
                    ? `${progress.modelsFound} model${progress.modelsFound !== 1 ? "s" : ""} found · ${progress.categoriesFound} collection${progress.categoriesFound !== 1 ? "s" : ""}`
                    : progress.currentFolder}
                </p>
              )}
            </div>
            {progress && progress.modelsFound > 0 && (
              <div className="shrink-0 flex items-center gap-1.5 text-primary/80">
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold tabular-nums">{progress.modelsFound}</span>
              </div>
            )}
          </div>
          {/* Animated progress bar */}
          <div className="h-0.5 bg-primary/20">
            <div className="h-full bg-primary/60 animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      )}

      {/* Empty state — first scan (auto-scan is firing, show spinner) */}
      {isFirstScan && !isScanning && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Starting your library scan…</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Connecting to Google Drive and indexing your 3D models. This may take a minute.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {modelsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <ModelCardSkeleton key={i} />)}
        </div>
      )}

      {/* Filtered results */}
      {!modelsLoading && isFiltered && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {models.length} result{models.length !== 1 ? "s" : ""}
            {search && <span> for "<span className="text-foreground">{search}</span>"</span>}
            {selectedFileType && <span className="ml-1 font-mono uppercase text-primary">.{selectedFileType}</span>}
          </p>
          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No models match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} onClick={() => navigate(`/model/${model.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grouped by category */}
      {!modelsLoading && grouped && <CategoryGallery groups={grouped} onNavigate={navigate} onViewAll={setSelectedCategory} isAdmin={isAdmin} />}
    </div>
  );
}
