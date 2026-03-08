import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-banner-dismissed';

export const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Re-show after 7 days
    }
    setDismissed(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (isInstalled || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-xl p-3 sm:p-4 mb-4"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Install SciMath Wizard</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get the app on your phone — works offline, loads instantly!
            </p>
          </div>

          {deferredPrompt ? (
            <Button size="sm" onClick={handleInstall} className="gap-1.5 shrink-0">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Install</span>
            </Button>
          ) : (
            <Link to="/install">
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">How to Install</span>
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
