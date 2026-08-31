import React from "react";
import { cn } from "@/lib/utils";

export function CategoryCoverSurface({
  imageUrl,
  children,
  className,
}: {
  imageUrl?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-testid="collection-cover-banner" className={cn("relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-secondary via-card to-secondary", className)}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      ) : (
        <div data-testid="collection-cover-fallback" className="absolute inset-0 bg-[radial-gradient(circle_at_85%_25%,hsl(var(--primary)/0.16),transparent_40%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/35" />
      <div className="relative">{children}</div>
    </div>
  );
}
