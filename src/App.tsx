import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { QuizModeProvider } from "./contexts/QuizModeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Lazy-loaded heavy pages
const Admin = lazy(() => import("./pages/Admin"));
const AdaptiveChallenge = lazy(() => import("./pages/AdaptiveChallenge"));
const AdaptiveHistory = lazy(() => import("./pages/AdaptiveHistory"));
const FocusedPractice = lazy(() => import("./pages/FocusedPractice"));
const OlympiadTest = lazy(() => import("./pages/OlympiadTest"));
const Report = lazy(() => import("./pages/Report"));
const Install = lazy(() => import("./pages/Install"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary section="App">
      <BrowserRouter>
        <QuizModeProvider>
          <OfflineIndicator />
          <div className="pb-14 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><Suspense fallback={<PageLoader />}><Admin /></Suspense></AdminRoute>} />
              <Route path="/adaptive" element={<Suspense fallback={<PageLoader />}><AdaptiveChallenge /></Suspense>} />
              <Route path="/adaptive/history" element={<Suspense fallback={<PageLoader />}><AdaptiveHistory /></Suspense>} />
              <Route path="/adaptive/focus" element={<Suspense fallback={<PageLoader />}><FocusedPractice /></Suspense>} />
              <Route path="/olympiad" element={<Suspense fallback={<PageLoader />}><OlympiadTest /></Suspense>} />
              <Route path="/report" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Report /></Suspense></ProtectedRoute>} />
              <Route path="/install" element={<Suspense fallback={<PageLoader />}><Install /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <MobileBottomNav />
        </QuizModeProvider>
      </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
