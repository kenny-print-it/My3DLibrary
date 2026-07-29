import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnter = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not connect — is the server running?");
        return;
      }
      await refetch();
      setLocation("/");
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Logo + branding */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl scale-110" />
          <img
            src="/my3dlibrary-logo.png"
            alt="My3DLibrary"
            className="relative h-32 w-32 rounded-2xl object-contain shadow-xl"
          />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My3DLibrary</h1>
          <p className="text-sm text-muted-foreground">Kenny Print It? — 3D Model Library</p>
          <p className="text-xs text-muted-foreground/50 tracking-wide">v{__APP_VERSION__}</p>
        </div>
      </div>

      {/* Enter button */}
      <button
        onClick={handleEnter}
        disabled={loading}
        className="group relative flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold bg-primary text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minWidth: 200 }}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            Enter Library
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {error && (
        <p className="mt-4 text-sm text-destructive text-center max-w-xs">{error}</p>
      )}

      <p className="mt-8 text-xs text-muted-foreground/50 text-center">
        Running locally on your PC · localhost:3000
      </p>
    </div>
  );
}
