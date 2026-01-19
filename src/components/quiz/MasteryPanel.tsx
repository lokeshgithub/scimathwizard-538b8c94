import { motion } from 'framer-motion';
import { TopicProgress } from '@/types/quiz';
import { themeLevels } from '@/data/characters';
import { Lock, CheckCircle, Circle, Sparkles } from 'lucide-react';

interface MasteryPanelProps {
  topicName: string;
  currentLevel: number;
  progress: TopicProgress;
  levelStats: { correct: number; total: number };
  perLevel: number;
}

const formatName = (name: string) => {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

export const MasteryPanel = ({ 
  topicName, 
  currentLevel, 
  progress, 
  levelStats,
  perLevel 
}: MasteryPanelProps) => {
  const accuracy = levelStats.total > 0 
    ? Math.round((levelStats.correct / levelStats.total) * 100) 
    : 0;
  const remaining = Math.max(0, perLevel - levelStats.total);
  const currentTheme = themeLevels.find(t => t.level === currentLevel);

  return (
    <motion.div 
      className="bg-card rounded-xl p-6 shadow-card mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.div 
          className="text-3xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨
        </motion.div>
        <div>
          <h3 className="font-bold text-lg text-foreground">
            {formatName(topicName)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentTheme?.theme || 'Adventure Zone'}
          </p>
        </div>
      </div>

      {/* Level Badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[1, 2, 3, 4, 5].map(level => {
          const levelData = progress[level];
          const isMastered = levelData?.mastered;
          const isCurrent = level === currentLevel;
          const isLocked = level > currentLevel && !progress[level - 1]?.mastered;
          const theme = themeLevels.find(t => t.level === level);

          return (
            <motion.div
              key={level}
              className={`
                relative px-4 py-3 rounded-xl text-center min-w-[70px]
                ${isMastered 
                  ? `bg-gradient-to-br ${theme?.bgClass} text-white` 
                  : isLocked 
                    ? 'bg-muted text-muted-foreground' 
                    : isCurrent 
                      ? `bg-gradient-to-br ${theme?.bgClass} text-white ring-4 ring-accent ring-offset-2` 
                      : 'bg-muted text-muted-foreground'
                }
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: level * 0.1 }}
              whileHover={!isLocked ? { scale: 1.05 } : undefined}
            >
              {isCurrent && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5 text-accent" />
                </motion.div>
              )}
              <div className="text-xl font-bold">{level}</div>
              <div className="text-xs opacity-90">
                {isMastered ? (
                  <CheckCircle className="w-4 h-4 mx-auto" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4 mx-auto" />
                ) : isCurrent ? (
                  <Circle className="w-4 h-4 mx-auto fill-current" />
                ) : (
                  <Circle className="w-4 h-4 mx-auto" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-magical"
            initial={{ width: 0 }}
            animate={{ width: `${(levelStats.total / perLevel) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Level {currentLevel}: {remaining > 0 ? `${remaining} more questions` : 'Evaluating...'}
            {' '}(need 80%)
          </span>
          <span className="font-semibold text-foreground">
            {levelStats.correct}/{levelStats.total} ({accuracy}%)
          </span>
        </div>
      </div>
    </motion.div>
  );
};
