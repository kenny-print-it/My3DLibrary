import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ModelDetail from "./pages/ModelDetail";
import Settings from "./pages/Settings";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import NavBar from "./components/NavBar";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "./lib/trpc";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Wraps a page component with:
 * 1. Auth check — shows Login splash if not signed in
 * 2. Access check — shows PendingApproval if signed in but not yet approved
 */
function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  // Check access status only when user is authenticated
  const { data: accessData, isLoading: accessLoading } = trpc.access.check.useQuery(undefined, {
    enabled: !!user,
    // Poll every 15 seconds so pending users see the page update once approved
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" ? 15_000 : false;
    },
  });

  if (loading || (user && accessLoading)) return <LoadingScreen />;
  if (!user) return <Login />;

  const status = accessData?.status;
  if (status === "pending") return <PendingApproval status="pending" />;
  if (status === "denied") return <PendingApproval status="denied" />;

  return <Component />;
}

/** Admin-only route: Settings page */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== "admin") navigate("/");
  }, [user, loading, navigate]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;
  if (user.role !== "admin") return null;
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
            {() => <AuthRoute component={Home} />}
          </Route>
          <Route path="/model/:id">
            {() => <AuthRoute component={ModelDetail} />}
          </Route>
          <Route path="/settings">
            {() => <AdminRoute component={Settings} />}
          </Route>
          <Route path="/resources">
            {() => <AuthRoute component={Resources} />}
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
