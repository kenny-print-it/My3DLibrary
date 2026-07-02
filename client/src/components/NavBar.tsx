import { Link, useLocation } from "wouter";
import { Settings, RefreshCw, Clock, LogIn, LogOut, User, Menu, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const { data: scanStatus } = trpc.scan.status.useQuery(undefined, {
    refetchInterval: scanning ? 2000 : 30000,
  });

  const startScan = trpc.scan.start.useMutation({
    onMutate: () => setScanning(true),
    onSuccess: (data) => {
      if (data.success) {
        setMenuOpen(false);
        toast.success("Scanning your Google Drive…", {
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

  const navLinkClass = (href: string) =>
    cn(
      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
      location === href
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    );

  const mobileNavLinkClass = (href: string) =>
    cn(
      "flex items-center px-4 py-3 text-sm font-medium transition-colors border-b border-border/30",
      location === href
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/manus-storage/kenny_logo_7f01af60.png"
            alt="Kenny Print It?"
            className="w-9 h-9 rounded-full object-cover"
          />
          <span className="font-semibold text-sm tracking-wide text-foreground">
            Kenny Print It?
          </span>
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/" className={navLinkClass("/")}>Library</Link>
          <Link href="/resources" className={navLinkClass("/resources")}>Resources</Link>
          <Link href="/about" className={navLinkClass("/about")}>About</Link>
        </nav>

        <div className="flex-1" />

        {/* Last synced indicator — desktop only */}
        {isAuthenticated && scanStatus?.lastScan?.completedAt && !scanning && (
          <div
            className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/60"
            title={`Last synced: ${new Date(scanStatus.lastScan.completedAt).toLocaleString()}`}
          >
            <Clock className="w-3 h-3" />
            <span>Synced {timeAgo(scanStatus.lastScan.completedAt)}</span>
          </div>
        )}

        {/* Desktop actions — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          {/* Sync button — admin only */}
          {isAdmin && (
            <button
              onClick={() => startScan.mutate({ incremental: true })}
              disabled={scanning}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                scanning && "opacity-60 cursor-not-allowed"
              )}
              title="Quick Sync — only checks for new or changed folders"
            >
              <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
              <span>{scanning ? "Syncing…" : "Sync"}</span>
            </button>
          )}

          {/* Settings link — admin only */}
          {isAdmin && (
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
              <span>Settings</span>
            </Link>
          )}

          {/* User section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{user?.name ?? "Viewer"}</span>
                {isAdmin && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    Owner
                  </span>
                )}
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </a>
          )}
        </div>

        {/* Mobile: Sign in button (if not authenticated) + hamburger menu */}
        <div className="flex md:hidden items-center gap-2" ref={menuRef}>
          {!isAuthenticated && (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </a>
          )}

          {/* Hamburger toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile dropdown panel */}
          {menuOpen && (
            <div className="absolute top-14 left-0 right-0 bg-background border-b border-border shadow-lg z-50">
              {/* Nav links */}
              <Link href="/" className={mobileNavLinkClass("/")}>Library</Link>
              <Link href="/resources" className={mobileNavLinkClass("/resources")}>Resources</Link>
              <Link href="/about" className={mobileNavLinkClass("/about")}>About</Link>

              {/* Admin section */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => startScan.mutate({ incremental: true })}
                    disabled={scanning}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors border-b border-border/30",
                      "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                      scanning && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
                    <span>{scanning ? "Syncing…" : "Quick Sync"}</span>
                    {scanStatus?.lastScan?.completedAt && !scanning && (
                      <span className="ml-auto text-xs text-muted-foreground/60">
                        {timeAgo(scanStatus.lastScan.completedAt)}
                      </span>
                    )}
                  </button>
                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-border/30",
                      location === "/settings"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </>
              )}

              {/* User section */}
              {isAuthenticated && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="truncate max-w-[160px]">{user?.name ?? "Viewer"}</span>
                    {isAdmin && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        Owner
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
