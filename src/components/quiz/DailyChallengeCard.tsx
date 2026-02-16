import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyChallenge, DailyChallengeStats, getDailyChallengeBonus } from '@/types/dailyChallenge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Flame, Trophy, Clock, CheckCircle, XCircle, Star, X, Loader2 } from 'lucide-react';
import { validateAnswer, getShuffleMap } from '@/services/questionService';

interface DailyChallengeCardProps {
  challenge: DailyChallenge | null;
  stats: DailyChallengeStats;
  isLoading: boolean;
  isTodayCompleted: boolean;
  bonusStars: number | null;
  onComplete: (correct: boolean, timeSpent: number) => void;
  onClearBonus: () => void;
  onAddStars: (stars: number) => void;
}

const formatName = (name: string) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const DailyChallengeCard = ({
  challenge,
  stats,
  isLoading,
  isTodayCompleted,
  bonusStars,
  onComplete,
  onClearBonus,
  onAddStars,
}: DailyChallengeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(-1);
  const [isValidating, setIsValidating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Start timer when modal opens
  useEffect(() => {
    if (isOpen && !isTodayCompleted && !isAnswered) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isTodayCompleted, isAnswered]);

  // Handle bonus stars animation
  useEffect(() => {
    if (bonusStars !== null) {
      onAddStars(bonusStars);
      const timer = setTimeout(onClearBonus, 3000);
      return () => clearTimeout(timer);
    }
  }, [bonusStars, onAddStars, onClearBonus]);

  const handleAnswer = async (index: number) => {
    if (isAnswered || isValidating || !challenge) return;
    
    setSelectedAnswer(index);
    setIsValidating(true);

    // SERVER-SIDE VALIDATION via edge function
    try {
      const shuffleMap = getShuffleMap(challenge.question.id);
      const originalSelectedIndex = shuffleMap
        ? shuffleMap[index]
        : index;
      const serverResult = await validateAnswer(challenge.question.id, originalSelectedIndex);
      
      const answerCorrectIndex = shuffleMap
        ? shuffleMap.findIndex(origIdx => origIdx === serverResult.correctIndex)
        : serverResult.correctIndex;
      const answerIsCorrect = serverResult.isCorrect;

      setIsCorrect(answerIsCorrect);
      setCorrectIndex(answerCorrectIndex);
      setIsAnswered(true);
      setIsValidating(false);
    
      if (timerRef.current) clearInterval(timerRef.current);
      const timeSpent = (Date.now() - startTimeRef.current) / 1000;
    
      onComplete(answerIsCorrect, timeSpent);
    } catch (err) {
      console.error('Failed to validate answer:', err);
      setIsValidating(false);
    }
  };
  const nextStreakBonus = getDailyChallengeBonus(stats.currentStreak + 1);

  if (isLoading || !challenge) return null;

  return (
    <>
      {/* Compact Floating Badge - minimal on mobile */}
      <motion.div
        className="fixed bottom-24 right-4 z-30"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        <button 
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg backdrop-blur-sm cursor-pointer border transition-colors ${
            isTodayCompleted 
              ? 'border-success/50 bg-success/10 hover:bg-success/20' 
              : 'border-primary/50 bg-primary/10 hover:bg-primary/20'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {isTodayCompleted ? (
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
          ) : (
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          )}
          <span className="text-xs font-semibold whitespace-nowrap">
            {isTodayCompleted ? 'Done' : 'Daily'}
          </span>
          {stats.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
              <Flame className="w-3 h-3" />
              {stats.currentStreak}
            </span>
          )}
          {!isTodayCompleted && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Daily Challenge</h2>
                    <p className="text-white/80 text-sm">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Streak Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/20 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4" />
                      <span className="font-bold">{stats.currentStreak}</span>
                    </div>
                    <p className="text-xs text-white/70">Current</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" />
                      <span className="font-bold">{stats.longestStreak}</span>
                    </div>
                    <p className="text-xs text-white/70">Best</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4" />
                      <span className="font-bold">{stats.bonusStarsEarned}</span>
                    </div>
                    <p className="text-xs text-white/70">Bonus ⭐</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isTodayCompleted ? (
                  // Completed State
                  <div className="text-center py-8">
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      {challenge.correct ? '🎉' : '📚'}
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">
                      {challenge.correct ? 'Challenge Complete!' : 'Nice Try!'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Come back tomorrow for a new challenge!
                    </p>
                    
                    <div className="bg-muted rounded-xl p-4 text-left">
                      <p className="text-sm font-medium mb-2">Today's Question:</p>
                      <p className="text-sm text-muted-foreground">{challenge.question.question}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Topic: {formatName(challenge.question.topic)} • Level {challenge.question.level}
                      </p>
                    </div>

                    {stats.currentStreak >= 3 && (
                      <div className="mt-4 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl p-4">
                        <p className="text-sm font-medium flex items-center justify-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          {stats.currentStreak} Day Streak! Keep it going! 🔥
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Question State
                  <>
                    {/* Timer */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">
                        {formatName(challenge.question.topic)} • Level {challenge.question.level}
                      </span>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        {elapsedTime}s
                      </div>
                    </div>

                    {/* Question */}
                    <div className="bg-muted rounded-xl p-4 mb-6">
                      <p className="font-medium">{challenge.question.question}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      {challenge.question.options.map((option, index) => {
                        let buttonClass = 'w-full p-4 text-left rounded-xl border-2 transition-all ';
                        
                        if (isAnswered) {
                          if (index === correctIndex) {
                            buttonClass += 'border-success bg-success/10 text-success';
                          } else if (index === selectedAnswer && !isCorrect) {
                            buttonClass += 'border-destructive bg-destructive/10 text-destructive';
                          } else {
                            buttonClass += 'border-border bg-muted/50 text-muted-foreground';
                          }
                        } else if (selectedAnswer === index) {
                          buttonClass += 'border-primary bg-primary/10';
                        } else {
                          buttonClass += 'border-border hover:border-primary/50 hover:bg-primary/5';
                        }

                        return (
                          <motion.button
                            key={index}
                            className={buttonClass}
                            onClick={() => handleAnswer(index)}
                            disabled={isAnswered || isValidating}
                            whileHover={!isAnswered ? { scale: 1.01 } : {}}
                            whileTap={!isAnswered ? { scale: 0.99 } : {}}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="flex-1">{option}</span>
                              {isAnswered && index === correctIndex && (
                                <CheckCircle className="w-5 h-5 text-success" />
                              )}
                              {isAnswered && index === selectedAnswer && !isCorrect && (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {isValidating && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking answer...
                      </div>
                    )}

                    {/* Explanation after answering */}
                    {isAnswered && challenge.question.explanation && (
                      <motion.div
                        className="mt-6 bg-primary/5 border border-primary/20 rounded-xl p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="text-sm font-medium mb-2">💡 Explanation</p>
                        <p className="text-sm text-muted-foreground">{challenge.question.explanation}</p>
                      </motion.div>
                    )}

                    {/* Streak bonus info */}
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                      <p>Complete to earn <span className="font-bold text-primary">+{nextStreakBonus} ⭐</span> bonus stars!</p>
                    </div>
                  </>
                )}

                <Button onClick={() => setIsOpen(false)} className="w-full mt-6">
                  {isTodayCompleted ? 'Close' : 'Cancel'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bonus Stars Animation - DISABLED for snappier flow */}
      {/* Stars are still awarded, just no pop-up */}
    </>
  );
};
