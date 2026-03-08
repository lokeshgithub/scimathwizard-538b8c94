import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share, Smartphone, CheckCircle, ArrowLeft, Zap, Wifi, WifiOff, Bell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const benefits = [
  { icon: Zap, label: 'Loads instantly', desc: 'No waiting for browser to open' },
  { icon: WifiOff, label: 'Works offline', desc: 'Practice anywhere, even without internet' },
  { icon: Star, label: 'Full-screen experience', desc: 'No browser bars — feels like a real app' },
  { icon: Bell, label: 'Home screen access', desc: 'One tap to start learning' },
];

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));

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
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full space-y-8"
      >
        {/* Hero */}
        <div className="text-center space-y-4">
          <motion.div
            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Smartphone className="w-12 h-12 text-primary-foreground" />
          </motion.div>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Install SciMath Wizard</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Get the app on your phone — no Play Store or App Store needed!
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="bg-card rounded-xl p-4 shadow-card border border-border"
            >
              <b.icon className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-sm text-foreground">{b.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Install Action */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-success/10 border border-success/30 rounded-2xl p-6 text-center space-y-2"
          >
            <CheckCircle className="w-14 h-14 text-success mx-auto" />
            <p className="font-bold text-lg text-foreground">App is installed! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Find <strong>SciMath Wizard</strong> on your home screen and start learning.
            </p>
          </motion.div>
        ) : deferredPrompt ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <Button size="lg" onClick={handleInstall} className="gap-2 w-full text-lg py-6">
              <Download className="w-6 h-6" />
              Install App Now
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Takes less than 5 seconds • No storage worries (under 2MB)
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {isIOS ? (
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Share className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">iPhone / iPad Instructions</p>
                    <p className="text-xs text-muted-foreground">Using Safari browser</p>
                  </div>
                </div>
                <ol className="space-y-4">
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</span>
                    <div>
                      <p className="font-medium text-foreground">Tap the Share button</p>
                      <p className="text-sm text-muted-foreground">Look for the <Share className="w-3.5 h-3.5 inline align-text-bottom" /> icon at the bottom of Safari</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</span>
                    <div>
                      <p className="font-medium text-foreground">Scroll down & tap "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground">It has a ➕ icon next to it</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</span>
                    <div>
                      <p className="font-medium text-foreground">Tap "Add" to confirm</p>
                      <p className="text-sm text-muted-foreground">That's it! The app icon will appear on your home screen</p>
                    </div>
                  </li>
                </ol>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ <strong>Important:</strong> This only works in <strong>Safari</strong>. If you're using Chrome or another browser on iPhone, open this page in Safari first.
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{isAndroid ? 'Android' : 'Desktop'} Instructions</p>
                    <p className="text-xs text-muted-foreground">Using Chrome or Edge browser</p>
                  </div>
                </div>
                <ol className="space-y-4">
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</span>
                    <div>
                      <p className="font-medium text-foreground">Tap the browser menu</p>
                      <p className="text-sm text-muted-foreground">Look for <strong>⋮</strong> (three dots) in the top-right corner</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</span>
                    <div>
                      <p className="font-medium text-foreground">Tap "Install App" or "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground">The wording varies by browser</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</span>
                    <div>
                      <p className="font-medium text-foreground">Confirm the installation</p>
                      <p className="text-sm text-muted-foreground">The app will appear on your home screen instantly</p>
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </motion.div>
        )}

        {/* Back link */}
        <div className="text-center pt-2">
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
