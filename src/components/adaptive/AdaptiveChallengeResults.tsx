import { motion } from 'framer-motion';
import { Trophy, Target, Clock, Zap, TrendingUp, Award, ChevronRight, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdaptiveState } from '@/types/adaptiveChallenge';
import { SKILL_TIERS } from '@/types/adaptiveChallenge';

interface AdaptiveChallengeResultsProps {
  state: AdaptiveState;
  maxLevel: number;
  onRetry: () => void;
  onHome: () => void;
}

export const AdaptiveChallengeResults = ({
  state,
  maxLevel,
  onRetry,
  onHome,
}: AdaptiveChallengeResultsProps) => {
  const tier = state.skillTier || SKILL_TIERS[0];
  const accuracy = state.totalQuestions > 0 
    ? Math.round((state.totalCorrect / state.totalQuestions) * 100) 
    : 0;
  const avgTime = state.questionHistory.length > 0
    ? Math.round(state.questionHistory.reduce((sum, r) => sum + r.timeSpent, 0) / state.questionHistory.length)
    : 0;
  const duration = state.endTime 
    ? Math.round((state.endTime - state.startTime) / 1000 / 60) 
    : 0;

  // Find next tier for encouragement
  const nextTierIndex = SKILL_TIERS.findIndex(t => t.id === tier.id) + 1;
  const nextTier = nextTierIndex < SKILL_TIERS.length ? SKILL_TIERS[nextTierIndex] : null;
  const pointsToNextTier = nextTier ? nextTier.minScore - state.finalScore : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-card rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
      >
        {/* Header with animated gradient */}
        <div className={`bg-gradient-to-r ${tier.colorClass} p-8 text-center relative overflow-hidden`}>
          {/* Animated sparkles */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </motion.div>

          <motion.div
            className="text-7xl mb-4 relative z-10"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {tier.emoji}
          </motion.div>
          
          <motion.h1 
            className="text-3xl font-bold text-white mb-2 relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {tier.title}
          </motion.h1>
          
          <motion.p
            className="text-white/90 text-lg relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {tier.description}
          </motion.p>

          {/* Score badge */}
          <motion.div
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-white font-bold text-lg">{state.finalScore}</span>
            <span className="text-white/80 text-sm"> / 100</span>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Capabilities */}
          <motion.div
            className="bg-muted rounded-xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              What This Means
            </h3>
            <ul className="space-y-2">
              {tier.capabilities.map((capability, index) => (
                <motion.li
                  key={index}
                  className="flex items-start gap-2 text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{capability}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="bg-muted rounded-xl p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <div className="text-2xl font-bold text-foreground">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-foreground">L{state.highestLevelReached}</div>
              <div className="text-xs text-muted-foreground">Highest Level</div>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold text-foreground">{avgTime}s</div>
              <div className="text-xs text-muted-foreground">Avg. Time</div>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-foreground">{duration}m</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </motion.div>

          {/* Questions breakdown */}
          <motion.div
            className="flex items-center justify-center gap-4 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-success"></span>
              <span className="text-muted-foreground">{state.totalCorrect} correct</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-destructive"></span>
              <span className="text-muted-foreground">{state.totalQuestions - state.totalCorrect} wrong</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-muted-foreground">{state.totalQuestions} total</span>
            </div>
          </motion.div>

          {/* Encouragement */}
          <motion.div
            className={`bg-gradient-to-r ${tier.colorClass} bg-opacity-10 rounded-xl p-4 text-center`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-foreground italic">"{tier.encouragement}"</p>
          </motion.div>

          {/* Next tier teaser */}
          {nextTier && (
            <motion.div
              className="text-center text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <span>Just </span>
              <span className="font-semibold text-primary">{pointsToNextTier} more points</span>
              <span> to reach </span>
              <span className="font-semibold">{nextTier.emoji} {nextTier.title}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={onRetry}
              className={`flex-1 bg-gradient-to-r ${tier.colorClass} text-white hover:opacity-90`}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={onHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
