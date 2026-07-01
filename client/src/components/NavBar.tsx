import { Link, useLocation } from "wouter";
import { Settings, RefreshCw, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NavBar() {
  const [location] = useLocation();
  const [scanning, setScanning] = useState(false);
  const utils = trpc.useUtils();

  const { data: scanStatus } = trpc.scan.status.useQuery(undefined, {
    refetchInterval: scanning ? 2000 : 30000,
  });

  const startScan = trpc.scan.start.useMutation({
    onMutate: () => setScanning(true),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Scanning your library…", {
          description: "New models will appear as the scan progresses.",
        });
        const poll = setInterval(async () => {
          const status = await utils.scan.status.fetch();
          if (!status.inProgress) {
            clearInterval(poll);
            setScanning(false);
            utils.models.list.invalidate();
            utils.categories.list.invalidate();
            const log = status.lastScan;
            if (log?.status === "completed") {
              toast.success("Scan complete!", {
                description: `Found ${log.modelsFound} models in ${log.categoriesFound} collections.`,
              });
            } else if (log?.status === "failed") {
              toast.error("Scan failed", { description: log.errorMessage || "Unknown error" });
            }
          }
        }, 2000);
      } else {
        setScanning(false);
        toast.info(data.message);
      }
    },
    onError: () => {
      setScanning(false);
      toast.error("Failed to start scan");
    },
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container flex h-14 items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/m3dl-icon.png" alt="My3DLibrary" className="h-8 w-8 object-contain" />
          <span className="font-semibold text-sm tracking-wide text-foreground">
            My3DLibrary
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-2">
          <Link
            href="/"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location === "/"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            Library
          </Link>
          <Link
            href="/resources"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location === "/resources"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            Resources
          </Link>
          <Link
            href="/about"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location === "/about"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            About
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Last synced indicator */}
        {scanStatus?.lastScan?.completedAt && !scanning && (
          <div
            className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/60"
            title={`Last synced: ${new Date(scanStatus.lastScan.completedAt).toLocaleString()}`}
          >
            <Clock className="w-3 h-3" />
            <span>Synced {timeAgo(scanStatus.lastScan.completedAt)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Scan button */}
          <button
            onClick={() => startScan.mutate()}
            disabled={scanning}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              scanning && "opacity-60 cursor-not-allowed"
            )}
            title="Re-scan library folder"
          >
            <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
            <span className="hidden sm:inline">{scanning ? "Scanning…" : "Scan"}</span>
          </button>

          {/* Settings link */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location === "/settings"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
