import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ModelDetail from "./pages/ModelDetail";
import Settings from "./pages/Settings";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Login from "./pages/Login";
import NavBar from "./components/NavBar";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2, BrainCircuit, X, FolderOpen, RefreshCw } from "lucide-react";
import { useState } from "react";
import { trpc } from "./lib/trpc";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * In portable mode there are no user accounts — the app auto-logs in via
 * /api/auth/guest-login when the user clicks "Enter Library".
 * If the session cookie is already set (returning visit), the user is taken
 * straight to the library without seeing the splash page.
 */
function AuthGate({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;
  return <Component />;
}

function Router() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isLoggedIn && <NavBar />}
      <main className="flex-1">
        <Switch>
          <Route path="/">
            {() => <AuthGate component={Home} />}
          </Route>
          <Route path="/model/:id">
            {() => <AuthGate component={ModelDetail} />}
          </Route>
          <Route path="/settings">
            {() => <AuthGate component={Settings} />}
          </Route>
          <Route path="/resources">
            {() => <AuthGate component={Resources} />}
          </Route>
          <Route path="/about" component={About} />
          <Route path="/login" component={Login} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

/**
 * Checks Ollama model availability once on startup.
 * Shows a dismissible warning banner (bottom-right corner) if the AI model
 * hasn't been downloaded yet, or if Ollama isn't configured at all.
 * Disappears silently if everything is ready.
 */
function AIStartupCheck() {
  const [dismissed, setDismissed] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [checking, setChecking] = useState(false);
  const utils = trpc.useUtils();

  const { data: status, isLoading } = trpc.settings.llmStatus.useQuery(undefined, {
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Don't show anything while loading, already dismissed, or AI is fully ready
  if (isLoading || dismissed || status?.modelAvailable) return null;

  const notConfigured = !status?.configured;
  const modelName = status?.modelName || "llava";

  const handleRunSetup = async () => {
    setLaunching(true);
    try {
      await fetch("/api/run-ai-setup", { method: "POST" });
    } catch {
      // ignore — the window will open regardless
    } finally {
      setLaunching(false);
    }
  };

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      await utils.settings.llmStatus.invalidate();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full rounded-xl shadow-2xl overflow-hidden"
      style={{ border: "1px solid rgba(245,158,11,0.35)", background: "#18181b" }}
    >
      {/* Amber top accent bar */}
      <div className="h-0.5 w-full bg-amber-500/70" />
      <div className="p-4 flex items-start gap-3">
        <BrainCircuit className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-300 text-sm mb-1">
            {notConfigured ? "AI not configured" : `AI model '${modelName}' not found`}
          </p>
          {notConfigured ? (
            <p className="text-zinc-400 text-sm leading-snug">
              AI features (auto-tagging, smart thumbnail selection) are disabled.
              Go to{" "}
              <a href="/settings" className="text-amber-400 underline hover:text-amber-300">
                Settings
              </a>{" "}
              to configure your LLM provider.
            </p>
          ) : (
            <>
              <p className="text-zinc-400 text-sm leading-snug">
                The AI model hasn't been downloaded yet. Click below to run the
                setup (~4.7 GB download). AI features are disabled until complete.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={handleRunSetup}
                  disabled={launching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-60"
                >
                  {launching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FolderOpen className="w-3 h-3" />
                  )}
                  Run Download-AI-Model.bat
                </button>
                <button
                  onClick={handleCheckAgain}
                  disabled={checking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-60"
                >
                  {checking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Check Again
                </button>
              </div>
            </>
          )}
          <p className="text-zinc-500 mt-2 text-xs">
            You can use the library normally — AI is optional.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-0.5 p-0.5 rounded"
          aria-label="Dismiss AI warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <AIStartupCheck />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
