import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
          <Smartphone className="w-10 h-10 text-white" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Install SciMath Wizard</h1>
          <p className="text-muted-foreground mt-2">
            Add to your home screen for the best experience — works offline and loads instantly!
          </p>
        </div>

        {isInstalled ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="font-semibold text-foreground">App is installed!</p>
            <p className="text-sm text-muted-foreground">
              You can find SciMath Wizard on your home screen.
            </p>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" onClick={handleInstall} className="gap-2 w-full">
            <Download className="w-5 h-5" />
            Install App
          </Button>
        ) : isIOS ? (
          <div className="bg-card rounded-xl p-5 text-left space-y-3 shadow-card">
            <p className="font-semibold text-foreground">How to install on iPhone/iPad:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Tap the <Share className="w-4 h-4 inline" /> Share button in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-5 text-left space-y-3 shadow-card">
            <p className="font-semibold text-foreground">How to install:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open the browser menu (⋮ or ⋯)</li>
              <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
              <li>Confirm the installation</li>
            </ol>
          </div>
        )}

        <div className="pt-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Install;
