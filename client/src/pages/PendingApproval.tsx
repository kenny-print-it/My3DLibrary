import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingApprovalProps {
  status: "pending" | "denied";
}

export default function PendingApproval({ status }: PendingApprovalProps) {
  const { user } = useAuth();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const isDenied = status === "denied";

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] ${isDenied ? "bg-red-500/5" : "bg-amber-500/5"}`} />
        <div className={`absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full blur-[100px] ${isDenied ? "bg-red-500/4" : "bg-amber-500/4"}`} />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-md w-full mx-4 text-center">

        {/* Logo */}
        <div className="relative">
          <div className={`absolute inset-0 rounded-full blur-2xl scale-110 ${isDenied ? "bg-red-500/20" : "bg-amber-500/20"}`} />
          <img
            src="/manus-storage/kenny_logo_7f01af60.png"
            alt="Kenny Print It?"
            className="relative w-24 h-24 rounded-full object-cover ring-2 ring-border/50 shadow-2xl"
          />
        </div>

        {/* Status icon */}
        <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${isDenied ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
          {isDenied
            ? <ShieldCheck className="w-8 h-8 text-red-400" />
            : <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
          }
        </div>

        {/* Message */}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isDenied ? "Access Not Granted" : "Awaiting Approval"}
          </h1>

          {isDenied ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your request to access <span className="text-foreground font-medium">Kenny Print It?</span> was not approved. If you believe this is a mistake, please reach out to Kenny directly.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hi <span className="text-foreground font-medium">{user?.name ?? "there"}</span>! Your sign-in request has been received. Kenny will review and approve your access shortly.
              </p>
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400/90">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>This page will automatically refresh once you're approved.</span>
              </div>
            </>
          )}
        </div>

        {/* Sign out */}
        <Button
          variant="outline"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>

        <p className="text-xs text-muted-foreground/40">
          Signed in as {user?.email ?? user?.name ?? "unknown"}
        </p>
      </div>

      {/* Bottom wordmark */}
      <div className="absolute bottom-6 text-xs text-muted-foreground/30 tracking-widest uppercase">
        Kenny Print It? · 3D Printing &amp; Designs
      </div>
    </div>
  );
}
