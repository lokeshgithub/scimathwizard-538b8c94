import { HelpCircle, Trophy, Target, TrendingDown, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { getThresholdForLevel } from '@/utils/levelThresholds';

const levels = [
  { level: 1, label: 'Fundamentals', color: 'from-emerald-500 to-green-500' },
  { level: 2, label: 'Beginner', color: 'from-blue-400 to-cyan-400' },
  { level: 3, label: 'Intermediate', color: 'from-violet-400 to-purple-400' },
  { level: 4, label: 'Advanced', color: 'from-orange-400 to-amber-400' },
  { level: 5, label: 'Expert', color: 'from-rose-400 to-pink-400' },
  { level: 6, label: 'Grand Master', color: 'from-yellow-400 to-orange-400' },
];

export const LevelingHelpDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
          aria-label="How does leveling work?"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How leveling works</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            How Does Leveling Work?
          </DialogTitle>
          <DialogDescription>
            Each topic has 6 levels of increasing difficulty with sliding accuracy targets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Key concept */}
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-xl">
            <TrendingDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Sliding targets:</strong> Early levels demand perfect accuracy to build strong foundations.
              As questions get harder, the target drops — so you can still advance even if tougher problems trip you up.
            </p>
          </div>

          {/* Level breakdown */}
          <div className="space-y-2">
            {levels.map(({ level, label, color }) => {
              const threshold = getThresholdForLevel(level);
              const percent = Math.round(threshold * 100);
              return (
                <div key={level} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <span className="text-sm font-semibold text-primary">{percent}% to pass</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tips:</strong> Answer 10 questions per level.
              Use hints freely — they're free! If you don't pass, you can keep practicing
              without penalty.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
