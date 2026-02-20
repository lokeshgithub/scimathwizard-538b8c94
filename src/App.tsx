import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MobileBottomNav } from "./components/MobileBottomNav";
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
      <BrowserRouter>
        <div className="pb-14 md:pb-0">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
            <Route path="/adaptive" element={<Suspense fallback={<PageLoader />}><AdaptiveChallenge /></Suspense>} />
            <Route path="/adaptive/history" element={<Suspense fallback={<PageLoader />}><AdaptiveHistory /></Suspense>} />
            <Route path="/adaptive/focus" element={<Suspense fallback={<PageLoader />}><FocusedPractice /></Suspense>} />
            <Route path="/olympiad" element={<Suspense fallback={<PageLoader />}><OlympiadTest /></Suspense>} />
            <Route path="/report" element={<Suspense fallback={<PageLoader />}><Report /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
