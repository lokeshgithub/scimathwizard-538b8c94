import { motion, AnimatePresence } from 'framer-motion';
import { themeLevels, getRandomCharacter, getRandomMessage } from '@/data/characters';
import { Trophy, RefreshCw, ArrowRight, Star, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LevelCompleteModalProps {
  isOpen: boolean;
  passed: boolean;
  level: number;
  stats: { correct: number; total: number };
  maxLevel: number;
  onAdvance: () => void;
  onRetry: () => void;
}

export const LevelCompleteModal = ({
  isOpen,
  passed,
  level,
  stats,
  maxLevel,
  onAdvance,
  onRetry,
}: LevelCompleteModalProps) => {
  const [character, setCharacter] = useState(getRandomCharacter(level));
  const [message, setMessage] = useState('');
  
  const accuracy = Math.round((stats.correct / stats.total) * 100);
  const currentTheme = themeLevels.find(t => t.level === level);
  const isTopicComplete = passed && level === maxLevel;

  useEffect(() => {
    if (isOpen) {
      const char = getRandomCharacter(level);
      setCharacter(char);
      setMessage(getRandomMessage(char, passed ? 'levelUp' : 'encouragement'));
    }
  }, [isOpen, passed, level]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
          >
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${passed ? 'from-success to-emerald-400' : 'from-primary to-secondary'} p-6 text-center`}>
              {passed && (
                <motion.div
                  className="absolute top-4 left-4"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </motion.div>
              )}
              {passed && (
                <motion.div
                  className="absolute top-4 right-4"
                  animate={{ rotate: [0, -360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </motion.div>
              )}
              
              <motion.div
                className="text-6xl mb-2"
                animate={passed ? { 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                } : { scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5 }}
              >
                {passed ? (isTopicComplete ? '👑' : '🎉') : '💪'}
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white">
                {passed 
                  ? (isTopicComplete ? 'Topic Mastered!' : `Level ${level} Complete!`)
                  : `Keep Practicing Level ${level}`
                }
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Stats */}
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {stats.correct}/{stats.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${passed ? 'text-success' : 'text-destructive'}`}>
                    {accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
              </div>

              {/* Character Message */}
              <motion.div
                className="bg-muted rounded-xl p-4 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <motion.span 
                    className="text-3xl"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {character.emoji}
                  </motion.span>
                  <span className="font-semibold text-foreground">{character.name}</span>
                </div>
                <p className="text-muted-foreground italic">"{message}"</p>
              </motion.div>

              {/* Next step message */}
              <p className="text-muted-foreground mb-6">
                {passed 
                  ? (isTopicComplete 
                      ? "Congratulations! You've mastered all 5 levels! 🌟" 
                      : `Ready for Level ${level + 1}?`)
                  : "You need 80% accuracy to advance. Let's try again!"
                }
              </p>

              {/* Action Button */}
              <motion.button
                onClick={passed ? onAdvance : onRetry}
                className={`
                  w-full p-4 rounded-xl font-semibold flex items-center justify-center gap-2
                  ${passed 
                    ? 'bg-gradient-magical text-white shadow-magical' 
                    : 'bg-primary text-primary-foreground'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {passed ? (
                  <>
                    {isTopicComplete ? 'Choose Another Topic' : 'Continue to Level ' + (level + 1)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </>
                )}
              </motion.button>

              {passed && !isTopicComplete && (
                <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  New magical friends await at Level {level + 1}!
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
