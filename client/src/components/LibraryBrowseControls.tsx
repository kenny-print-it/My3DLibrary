import React from "react";
import { ArrowUpDown, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompactListSortDirection, CompactListSortField } from "@/lib/compactListSorting";

type CompactListSortControlsProps = {
  field: CompactListSortField;
  direction: CompactListSortDirection;
  onHeaderSort: (field: CompactListSortField) => void;
  onMobileSort: (selection: string) => void;
};

export function CompactListSortControls({ field, direction, onHeaderSort, onMobileSort }: CompactListSortControlsProps) {
  const headerClass = (headerField: CompactListSortField, align = "") => cn(
    "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
    align,
    field === headerField ? "text-primary" : "text-muted-foreground",
  );
  const arrowClass = (headerField: CompactListSortField) => cn("w-3 h-3", field === headerField && direction === "desc" && "rotate-180");

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/50 bg-secondary/50 px-3 py-2 sm:hidden">
        <label htmlFor="compact-list-sort" className="text-xs font-medium text-muted-foreground">Sort by</label>
        <select
          id="compact-list-sort"
          value={`${field}:${direction}`}
          onChange={(event) => onMobileSort(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/70"
        >
          <option value="name:asc">Model Name (A–Z)</option>
          <option value="name:desc">Model Name (Z–A)</option>
          <option value="collection:asc">Collection (A–Z)</option>
          <option value="collection:desc">Collection (Z–A)</option>
          <option value="tags:asc">Tags (A–Z)</option>
          <option value="tags:desc">Tags (Z–A)</option>
          <option value="files:asc">Files (fewest first)</option>
          <option value="files:desc">Files (most first)</option>
        </select>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_7rem] items-center gap-4 border-b border-border/50 bg-secondary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
        <button onClick={() => onHeaderSort("name")} className={headerClass("name")} aria-label="Sort by model name">Model <ArrowUpDown className={arrowClass("name")} /></button>
        <button onClick={() => onHeaderSort("collection")} className={headerClass("collection")} aria-label="Sort by collection">Collection <ArrowUpDown className={arrowClass("collection")} /></button>
        <button onClick={() => onHeaderSort("tags")} className={headerClass("tags")} aria-label="Sort by tags">Tags <ArrowUpDown className={arrowClass("tags")} /></button>
        <button onClick={() => onHeaderSort("files")} className={headerClass("files", "justify-self-end")} aria-label="Sort by file count">Files <ArrowUpDown className={arrowClass("files")} /></button>
      </div>
    </>
  );
}

export function RecentlyAddedCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left group"
      aria-expanded={!collapsed}
      aria-controls="recently-added-carousel"
    >
      <Clock className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recently Added</h2>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">{collapsed ? "Show" : "Hide"}<ChevronRight className={cn("w-3.5 h-3.5 transition-transform", collapsed ? "rotate-0" : "rotate-90")} /></span>
    </button>
  );
}
