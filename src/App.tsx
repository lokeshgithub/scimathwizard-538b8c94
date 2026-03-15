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
import { AppModeProvider } from "./contexts/AppModeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";
import FeedbackWidget from "./components/FeedbackWidget";

// Only Index is eagerly loaded (main entry point)
import Index from "./pages/Index";

// All other pages lazy-loaded for smaller initial bundle
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const AdaptiveChallenge = lazy(() => import("./pages/AdaptiveChallenge"));
const AdaptiveHistory = lazy(() => import("./pages/AdaptiveHistory"));
const FocusedPractice = lazy(() => import("./pages/FocusedPractice"));
const OlympiadTest = lazy(() => import("./pages/OlympiadTest"));
const Report = lazy(() => import("./pages/Report"));
const Install = lazy(() => import("./pages/Install"));
const GuidedLearn = lazy(() => import("./pages/GuidedLearn"));
const TestFeedback = lazy(() => import("./pages/TestFeedback"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — questions don't change often
      gcTime: 30 * 60 * 1000, // 30 min cache
      retry: 1,
      refetchOnWindowFocus: false, // Avoid unnecessary refetches during quiz
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary section="App">
      <BrowserRouter>
        <AppModeProvider>
        <QuizModeProvider>
          <OfflineIndicator />
          <div className="pb-14 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
              <Route path="/adaptive" element={<Suspense fallback={<PageLoader />}><AdaptiveChallenge /></Suspense>} />
              <Route path="/adaptive/history" element={<Suspense fallback={<PageLoader />}><AdaptiveHistory /></Suspense>} />
              <Route path="/adaptive/focus" element={<Suspense fallback={<PageLoader />}><FocusedPractice /></Suspense>} />
              <Route path="/olympiad" element={<Suspense fallback={<PageLoader />}><OlympiadTest /></Suspense>} />
              <Route path="/report" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Report /></Suspense></ProtectedRoute>} />
              <Route path="/install" element={<Suspense fallback={<PageLoader />}><Install /></Suspense>} />
              <Route path="/learn/:topic" element={<Suspense fallback={<PageLoader />}><GuidedLearn /></Suspense>} />
              <Route path="/testing" element={<Suspense fallback={<PageLoader />}><TestFeedback /></Suspense>} />
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
            </Routes>
          </div>
          <MobileBottomNav />
        </QuizModeProvider>
        </AppModeProvider>
      </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
