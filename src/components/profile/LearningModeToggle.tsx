import { useAppMode, AppMode } from '@/contexts/AppModeContext';
import { Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const LearningModeToggle = () => {
  const { mode, setMode } = useAppMode();

  const handleToggle = (newMode: AppMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    toast.success(
      newMode === 'fun'
        ? '🎮 Fun Mode activated! Characters & rewards enabled.'
        : '📚 Focused Learner mode — distraction-free study!'
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">Learning Mode</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Choose how you want to learn
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleToggle('focused')}
          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm ${
            mode === 'focused'
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Focused Learner</span>
          <span className="text-[10px] text-muted-foreground font-normal">Clean & professional</span>
          {mode === 'focused' && (
            <motion.div
              layoutId="mode-indicator"
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
            >
              <span className="text-primary-foreground text-[8px]">✓</span>
            </motion.div>
          )}
        </button>
        <button
          onClick={() => handleToggle('fun')}
          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm ${
            mode === 'fun'
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Fun Mode</span>
          <span className="text-[10px] text-muted-foreground font-normal">Characters & rewards</span>
          {mode === 'fun' && (
            <motion.div
              layoutId="mode-indicator"
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
            >
              <span className="text-primary-foreground text-[8px]">✓</span>
            </motion.div>
          )}
        </button>
      </div>
    </div>
  );
};
