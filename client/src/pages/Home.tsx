import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Search, Filter, X, Heart, Box, FolderOpen, RefreshCw,
  ArrowUpDown, CheckCheck, ChevronDown, ChevronRight,
  GripVertical, LayoutList, Settings, Archive,
  CheckSquare, Square, Tags, Plus,
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

// Local version: images served directly from local filesystem
function getModelImageUrl(images: any[] | null | undefined, heroImage: string | null | undefined, _size: number): string | null {
  if (!images || images.length === 0) return null;
  if (heroImage) {
    // If heroImage is already a usable URL (local-files proxy, Drive proxy, or absolute URL), return it directly.
    // This covers local files where heroImage = thumbnailLink = "/local-files/..."
    if (heroImage.startsWith('/local-files/') || heroImage.startsWith('/api/drive-image/') || heroImage.startsWith('http')) {
      return heroImage;
    }
    // Fallback: find the matching image object by any known field
    const hero = images.find((img: any) =>
      img.thumbnailLink === heroImage ||
      img.webContentLink === heroImage ||
      img.localUrl === heroImage ||
      img.thumbnailUrl === heroImage ||
      (img.id && (heroImage.includes(img.id) || heroImage === `/api/drive-image/${img.id}`))
    );
    if (hero) return hero.localUrl || hero.thumbnailUrl || hero.thumbnailLink || null;
  }
  return images[0]?.localUrl || images[0]?.thumbnailUrl || images[0]?.thumbnailLink || null;
}

type SortOption = "name_asc" | "name_desc" | "newest" | "drive_created" | "most_files" | "most_renders";

const SORT_KEY = "printlib_sort_v1";
const VALID_SORTS: SortOption[] = ["name_asc", "name_desc", "newest", "drive_created", "most_files", "most_renders"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "newest", label: "Newest Scanned" },
  { value: "drive_created", label: "Newest on Drive" },
  { value: "most_files", label: "Most Files" },
  { value: "most_renders", label: "Most Renders" },
];

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function ModelCard({ model, onClick, selectMode = false, isSelected = false, onToggleSelect }: {
  model: any;
  onClick: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Prefer AI-selected heroImage, fall back to first image — use proxy to avoid expiring Drive URLs
  const thumb = getModelImageUrl(model.images, model.heroImage, 400);
  // First viewable 3D file for viewer fallback — 3MF preferred over STL
  const firstViewable = !thumb ? (
    (model.modelFiles as any[] | null)
      ?.filter((f: any) => (f.name?.toLowerCase().endsWith(".3mf") || f.name?.toLowerCase().endsWith(".stl")) && f.webContentLink)
      ?.sort((a: any, b: any) => (a.name?.toLowerCase().endsWith(".3mf") ? 0 : 1) - (b.name?.toLowerCase().endsWith(".3mf") ? 0 : 1))
      ?.[0] ?? null
  ) : null;
  const hasZip = (model.modelFiles as any[] | null)?.some((f: any) => f.name?.toLowerCase().endsWith(".zip"));

  return (
    <div
      className={cn(
        "model-card group relative rounded-xl overflow-hidden bg-card border cursor-pointer transition-all",
        selectMode && isSelected ? "border-primary ring-2 ring-primary/40" : "border-border/50"
      )}
      onClick={() => selectMode ? onToggleSelect?.(model.id) : onClick()}
    >
      {/* Selection checkbox overlay */}
      {selectMode && (
        <div className="absolute top-2 right-2 z-10">
          {isSelected
            ? <CheckSquare className="w-5 h-5 text-primary drop-shadow" />
            : <Square className="w-5 h-5 text-white/80 drop-shadow" />}
        </div>
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {!imgLoaded && !imgError && !firstViewable && <div className="absolute inset-0 shimmer" />}
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt={model.name}
            className={cn("w-full h-full object-cover transition-all duration-300 group-hover:scale-105", imgLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : firstViewable ? (
          <STLViewer
            url={firstViewable.webContentLink}
            fileType={firstViewable.name?.toLowerCase().endsWith(".3mf") ? "3mf" : "stl"}
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
        {hasZip && (
          <div className="absolute top-2 left-2 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
            <span className="flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full">
              <Archive className="w-2.5 h-2.5" />
              ZIP
            </span>
          </div>
        )}

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

// Responsive column count hook
function useColumnCount() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= 1280) setCols(6);
      else if (w >= 1024) setCols(5);
      else if (w >= 768) setCols(4);
      else if (w >= 640) setCols(3);
      else setCols(2);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

// Virtual scrolling grid for large model lists
function VirtualModelGrid({
  models,
  isReordering,
  onNavigate,
  selectMode = false,
  selectedModels,
  onToggleSelect,
}: {
  models: any[];
  isReordering: boolean;
  onNavigate: (path: string) => void;
  selectMode?: boolean;
  selectedModels?: Set<number>;
  onToggleSelect?: (id: number) => void;
}) {
  const cols = useColumnCount();
  const CARD_HEIGHT = 220; // approximate card height in px
  const GAP = 16;
  const rows = Math.ceil(models.length / cols);
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => document.documentElement,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  });
  const totalHeight = rowVirtualizer.getTotalSize();
  return (
    <div ref={parentRef} style={{ position: "relative", height: `${totalHeight}px` }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const startIdx = virtualRow.index * cols;
        const rowModels = models.slice(startIdx, startIdx + cols);
        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: `${GAP}px`,
              paddingBottom: `${GAP}px`,
            }}
          >
            {rowModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onClick={() => !isReordering && onNavigate(`/model/${model.id}`)}
                selectMode={selectMode}
                isSelected={selectedModels?.has(model.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SortableCategoryRow({
  group,
  isReordering,
  collapsed,
  toggle,
  onNavigate,
  onViewAll,
  selectMode = false,
  selectedModels,
  onToggleSelect,
}: {
  group: { category: any; models: any[] };
  isReordering: boolean;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  onNavigate: (path: string) => void;
  onViewAll: (id: number) => void;
  selectMode?: boolean;
  selectedModels?: Set<number>;
  onToggleSelect?: (id: number) => void;
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
          <VirtualModelGrid models={group.models} isReordering={isReordering} onNavigate={onNavigate} selectMode={selectMode} selectedModels={selectedModels} onToggleSelect={onToggleSelect} />
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
  selectMode = false,
  selectedModels,
  onToggleSelect,
}: {
  groups: { category: any; models: any[] }[];
  onNavigate: (path: string) => void;
  onViewAll: (id: number) => void;
  isAdmin: boolean;
  selectMode?: boolean;
  selectedModels?: Set<number>;
  onToggleSelect?: (id: number) => void;
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
              selectMode={selectMode}
              selectedModels={selectedModels}
              onToggleSelect={onToggleSelect}
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<number>>(new Set());
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const [bulkAddTags, setBulkAddTags] = useState<number[]>([]);
  const [bulkRemoveTags, setBulkRemoveTags] = useState<number[]>([]);
  const [bulkTagSearch, setBulkTagSearch] = useState("");
  const [bulkNewTagName, setBulkNewTagName] = useState("");
  const [bulkNewTagColor, setBulkNewTagColor] = useState(TAG_COLORS[0]);
  const [bulkShowNewTag, setBulkShowNewTag] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      if (saved && VALID_SORTS.includes(saved as SortOption)) return saved as SortOption;
    } catch {}
    return "name_asc";
  });
  const handleSortChange = (v: string) => {
    const sort = v as SortOption;
    setSortBy(sort);
    try { localStorage.setItem(SORT_KEY, sort); } catch {}
  };
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
      favoritesOnly: favoritesOnly || undefined,
    },
    { keepPreviousData: true } as any
  );

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentDriveId),
    [categories]
  );

  const isFiltered = !!(search || selectedCategory || selectedTags.length > 0 || selectedFileType || favoritesOnly);
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

  // isConfigured: false means no library paths set up yet (first-run state)
  const isConfigured = scanStatus?.isConfigured !== false; // default true until data loads

  // isFirstScan: true only when the DB has zero models (regardless of scan log history)
  const isFirstScan = !modelsLoading && models.length === 0;
  const isScanning = scanStatus?.inProgress;
  const progress = scanStatus?.progress;

  // Auto-scan on first load: trigger automatically when the library is genuinely empty.
  // Only fires when the library is configured (has paths set up).
  const autoScanFired = useRef(false);
  // Bulk thumbnail generation state
  const [bulkThumbState, setBulkThumbState] = useState<{
    running: boolean;
    queue: Array<{ id: number; name: string; fileUrl: string; fileType: "stl" | "3mf" }>;
    current: number;
    done: number;
    failed: number;
    total: number;
    currentName: string;
  } | null>(null);
  const bulkViewerRef = useRef<STLViewerHandle>(null);
  const bulkThumbResolveRef = useRef<((loaded: boolean) => void) | null>(null);
  const utils = trpc.useUtils();

  // Bulk thumbnail: save PNG blob for a model
  const saveThumbnailBlob = async (modelId: number, blob: Blob) => {
    const resp = await fetch(`/api/save-thumbnail?modelId=${modelId}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      let errMsg = `HTTP ${resp.status}`;
      try { const p = JSON.parse(text); errMsg = p.error || p.message || errMsg; } catch { errMsg = text.slice(0, 80) || errMsg; }
      throw new Error(errMsg);
    }
    return resp.json();
  };

  // Start bulk thumbnail generation for all models missing renders that have STL/3MF files
  const startBulkThumbnails = () => {
    const queue = (models as any[])
      .filter((m: any) => m.imageCount === 0)
      .flatMap((m: any) => {
        const files: any[] = m.modelFiles || [];
        const viewable = files
          .filter((f: any) => (f.name?.toLowerCase().endsWith(".3mf") || f.name?.toLowerCase().endsWith(".stl")) && f.webContentLink)
          .sort((a: any, b: any) => (a.name?.toLowerCase().endsWith(".3mf") ? 0 : 1) - (b.name?.toLowerCase().endsWith(".3mf") ? 0 : 1));
        if (!viewable.length) return [];
        return [{ id: m.id, name: m.name, fileUrl: viewable[0].webContentLink, fileType: (viewable[0].name?.toLowerCase().endsWith(".3mf") ? "3mf" : "stl") as "stl" | "3mf" }];
      });
    if (!queue.length) { toast.info("All models already have thumbnails."); return; }
    setBulkThumbState({ running: true, queue, current: 0, done: 0, failed: 0, total: queue.length, currentName: queue[0]?.name || "" });
  };

  const bulkCreateTagMutation = trpc.tags.create.useMutation({
    onSuccess: (tag) => {
      if (tag) {
        setBulkAddTags((prev) => prev.includes(tag.id) ? prev : [...prev, tag.id]);
        utils.tags.list.invalidate();
      }
      setBulkNewTagName("");
      setBulkShowNewTag(false);
    },
    onError: () => toast.error("Failed to create tag"),
  });

  const bulkTagMutation = trpc.models.bulkTag.useMutation({
    onSuccess: (data) => {
      toast.success(`Tags updated for ${data.count} model${data.count !== 1 ? "s" : ""}`);
      utils.models.list.invalidate();
      setShowBulkTagDialog(false);
      setBulkMode(false);
      setSelectedModels(new Set());
      setBulkAddTags([]);
      setBulkRemoveTags([]);
    },
    onError: () => toast.error("Failed to update tags"),
  });

  const toggleModelSelection = (id: number) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedModels(new Set());
    setShowBulkTagDialog(false);
    setBulkAddTags([]);
    setBulkRemoveTags([]);
    setBulkTagSearch("");
    setBulkNewTagName("");
    setBulkShowNewTag(false);
  };

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
    if (isFirstScan && isConfigured) {
      autoScanFired.current = true;
      startScanMutation.mutate();
    }
  }, [isFirstScan, isScanning, modelsLoading, scanStatus, isConfigured]);

  // Bulk thumbnail processing: when bulkThumbState advances, process next item
  useEffect(() => {
    if (!bulkThumbState?.running) return;
    const { queue, current } = bulkThumbState;
    if (current >= queue.length) {
      // All done
      setBulkThumbState((s) => s ? { ...s, running: false } : null);
      utils.models.list.invalidate();
      utils.models.recent.invalidate();
      return;
    }
    const item = queue[current];
    setBulkThumbState((s) => s ? { ...s, currentName: item.name } : null);
    // Wait for the hidden viewer to signal it's loaded via the resolve ref
    const timeout = setTimeout(() => {
      if (bulkThumbResolveRef.current) {
        bulkThumbResolveRef.current(false); // timed out
        bulkThumbResolveRef.current = null;
      }
    }, 30000); // 30s timeout per model
    const loadPromise = new Promise<boolean>((resolve) => {
      bulkThumbResolveRef.current = resolve;
    });
    loadPromise.then(async (loaded) => {
      clearTimeout(timeout);
      if (!loaded) {
        setBulkThumbState((s) => s ? { ...s, current: s.current + 1, failed: s.failed + 1 } : null);
        return;
      }
      try {
        const blob = await bulkViewerRef.current?.captureScreenshot();
        if (!blob) throw new Error("No canvas data");
        await saveThumbnailBlob(item.id, blob);
        setBulkThumbState((s) => s ? { ...s, current: s.current + 1, done: s.done + 1 } : null);
      } catch {
        setBulkThumbState((s) => s ? { ...s, current: s.current + 1, failed: s.failed + 1 } : null);
      }
    });
  }, [bulkThumbState?.current, bulkThumbState?.running]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">My 3D Library</h1>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 tracking-wide">
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {models.length} model{models.length !== 1 ? "s" : ""} · {topCategories.length} collection{topCategories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={sortBy} onValueChange={handleSortChange}>
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

          {/* Favorites toggle */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            title={favoritesOnly ? "Showing favorites only — click to show all" : "Show favorites only"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
              favoritesOnly
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            <Heart className={cn("w-4 h-4", favoritesOnly ? "fill-primary-foreground" : "")} />
          </button>

          {/* Generate All Thumbnails button */}
          {isAdmin && (
            <button
              onClick={startBulkThumbnails}
              title="Generate thumbnails for all models missing renders"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Bulk select toggle */}
          {isAdmin && (
            <button
              onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                bulkMode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground"
              )}
            >
              <CheckSquare className="w-4 h-4" />
              {bulkMode ? "Exit Select" : "Select"}
            </button>
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

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-primary">
            {selectedModels.size} model{selectedModels.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setSelectedModels(new Set(models.map((m: any) => m.id)))}
            className="text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
          >Select All</button>
          <button
            onClick={() => setSelectedModels(new Set())}
            className="text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
          >Clear</button>
          <div className="flex-1" />
          <button
            disabled={selectedModels.size === 0}
            onClick={() => setShowBulkTagDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Tags className="w-4 h-4" />
            Tag Selected
          </button>
        </div>
      )}

      {/* Bulk Tag Dialog */}
      {showBulkTagDialog && (() => {
        const filteredTags = bulkTagSearch.trim()
          ? allTags.filter((t) => t.name.toLowerCase().includes(bulkTagSearch.toLowerCase()))
          : allTags;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkTagDialog(false)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 pb-3 border-b border-border/50 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-foreground">Bulk Tag</h2>
                  <button onClick={() => setShowBulkTagDialog(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Apply tag changes to {selectedModels.size} selected model{selectedModels.size !== 1 ? "s" : ""}.
                </p>
                {/* Search + New Tag */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tags…"
                      value={bulkTagSearch}
                      onChange={(e) => setBulkTagSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={() => setBulkShowNewTag((v) => !v)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", bulkShowNewTag ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border/50 hover:text-foreground")}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Tag
                  </button>
                </div>
                {/* Inline new-tag form */}
                {bulkShowNewTag && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/60 border border-border/50 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tag name…"
                        value={bulkNewTagName}
                        onChange={(e) => setBulkNewTagName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && bulkNewTagName.trim()) bulkCreateTagMutation.mutate({ name: bulkNewTagName.trim(), color: bulkNewTagColor }); }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <button
                        onClick={() => { if (bulkNewTagName.trim()) bulkCreateTagMutation.mutate({ name: bulkNewTagName.trim(), color: bulkNewTagColor }); }}
                        disabled={!bulkNewTagName.trim() || bulkCreateTagMutation.isPending}
                        className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity"
                      >
                        {bulkCreateTagMutation.isPending ? "…" : "Add"}
                      </button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {TAG_COLORS.map((c) => (
                        <button key={c} onClick={() => setBulkNewTagColor(c)} className={cn("w-5 h-5 rounded-full transition-all", bulkNewTagColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-card scale-110" : "")} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Add tags */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Add Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setBulkAddTags((prev) => prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                        className="px-3 py-1 rounded-full text-sm transition-colors border"
                        style={bulkAddTags.includes(tag.id)
                          ? { backgroundColor: tag.color ?? "#6366f1", color: "#fff", borderColor: tag.color ?? "#6366f1" }
                          : { backgroundColor: (tag.color ?? "#6366f1") + "22", color: tag.color ?? "#6366f1", borderColor: (tag.color ?? "#6366f1") + "44" }}
                      >{tag.name}</button>
                    ))}
                    {filteredTags.length === 0 && <p className="text-sm text-muted-foreground">{bulkTagSearch ? `No tags match "${bulkTagSearch}"` : "No tags yet. Use the New Tag button above."}</p>}
                  </div>
                </div>

                {/* Remove tags */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Remove Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setBulkRemoveTags((prev) => prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                        className="px-3 py-1 rounded-full text-sm transition-colors border"
                        style={bulkRemoveTags.includes(tag.id)
                          ? { backgroundColor: "#ef444433", color: "#ef4444", borderColor: "#ef444466" }
                          : { backgroundColor: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }}
                      >{tag.name}</button>
                    ))}
                    {filteredTags.length === 0 && <p className="text-sm text-muted-foreground">{bulkTagSearch ? `No tags match "${bulkTagSearch}"` : "No tags available."}</p>}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/50 flex gap-3 justify-end shrink-0">
                <button
                  onClick={() => setShowBulkTagDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                >Cancel</button>
                <button
                  disabled={(bulkAddTags.length === 0 && bulkRemoveTags.length === 0) || bulkTagMutation.isPending}
                  onClick={() => bulkTagMutation.mutate({ modelIds: Array.from(selectedModels), addTagIds: bulkAddTags, removeTagIds: bulkRemoveTags })}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkTagMutation.isPending ? "Applying…" : "Apply Tags"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                const firstViewable = !thumb
                  ? (model.modelFiles as any[] | null)
                      ?.filter((f: any) => (f.name?.toLowerCase().endsWith(".3mf") || f.name?.toLowerCase().endsWith(".stl")) && f.webContentLink)
                      ?.sort((a: any, b: any) => (a.name?.toLowerCase().endsWith(".3mf") ? 0 : 1) - (b.name?.toLowerCase().endsWith(".3mf") ? 0 : 1))
                      ?.[0] ?? null
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
                        ) : firstViewable ? (
                          <STLViewer url={firstViewable.webContentLink} fileType={firstViewable.name?.toLowerCase().endsWith(".3mf") ? "3mf" : "stl"} className="w-full h-full" />
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
              <p className="text-sm font-medium text-primary">Scanning library folder…</p>
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

      {/* First-run onboarding — not configured yet (no library paths) */}
      {isFirstScan && !isScanning && !isConfigured && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to My 3D Library!</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            To get started, add your 3D model library folders in Settings → Library Paths. The app will scan them and index all your models.
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Settings className="w-4 h-4" />
              Open Settings
            </button>
          )}
        </div>
      )}

      {/* Empty state — configured, auto-scan is firing */}
      {isFirstScan && !isScanning && isConfigured && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Starting your library scan…</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Scanning your library folder and indexing your 3D models. This may take a minute.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {modelsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <ModelCardSkeleton key={i} />)}
        </div>
      )}

      {/* Filtered results (search, category, tags, file type, or favorites) */}
      {!modelsLoading && isFiltered && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {favoritesOnly && !search && !selectedFileType
              ? `${models.length} favorite${models.length !== 1 ? "s" : ""}`
              : `${models.length} result${models.length !== 1 ? "s" : ""}`}
            {search && <span> for "<span className="text-foreground">{search}</span>"</span>}
            {selectedFileType && <span className="ml-1 font-mono uppercase text-primary">.{selectedFileType}</span>}
          </p>
          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {favoritesOnly ? (
                <>
                  <Heart className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No favorites yet. Open a model and tap the heart icon to save it here.</p>
                </>
              ) : (
                <>
                  <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No models match your filters.</p>
                </>
              )}
            </div>
          ) : (
            <VirtualModelGrid models={models} isReordering={false} onNavigate={navigate} selectMode={bulkMode} selectedModels={selectedModels} onToggleSelect={toggleModelSelection} />
          )}
        </div>
      )}

      {/* Grouped by category */}
      {!modelsLoading && grouped && <CategoryGallery groups={grouped} onNavigate={navigate} onViewAll={setSelectedCategory} isAdmin={isAdmin} selectMode={bulkMode} selectedModels={selectedModels} onToggleSelect={toggleModelSelection} />}

      {/* Hidden STLViewer for bulk thumbnail generation */}
      {bulkThumbState?.running && bulkThumbState.current < bulkThumbState.queue.length && (
        <div style={{ position: "fixed", left: -9999, top: -9999, width: 512, height: 512, pointerEvents: "none", opacity: 0 }}>
          <STLViewer
            ref={bulkViewerRef}
            url={bulkThumbState.queue[bulkThumbState.current]?.fileUrl}
            fileType={bulkThumbState.queue[bulkThumbState.current]?.fileType}
            className="w-full h-full"
            bgColor="#0d0d0d"
            onLoaded={() => {
              if (bulkThumbResolveRef.current) {
                bulkThumbResolveRef.current(true);
                bulkThumbResolveRef.current = null;
              }
            }}
          />
        </div>
      )}

      {/* Bulk thumbnail progress dialog */}
      {bulkThumbState && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {bulkThumbState.running ? "Generating Thumbnails…" : "Thumbnails Complete"}
              </span>
            </div>
            {!bulkThumbState.running && (
              <button onClick={() => setBulkThumbState(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            )}
          </div>
          <div className="text-xs text-muted-foreground mb-2 truncate">
            {bulkThumbState.running ? `Processing: ${bulkThumbState.currentName}` : `Done — ${bulkThumbState.done} saved, ${bulkThumbState.failed} skipped`}
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round(((bulkThumbState.done + bulkThumbState.failed) / bulkThumbState.total) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 text-right">
            {bulkThumbState.done + bulkThumbState.failed} / {bulkThumbState.total}
          </div>
        </div>
      )}
    </div>
  );
}
