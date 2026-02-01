import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, CheckCircle, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question } from '@/types/quiz';

interface LevelUnlockModalProps {
  isOpen: boolean;
  topic: string;
  targetLevel: number;
  questions: Question[]; // 3 questions for the assessment
  onClose: () => void;
  onUnlock: (level: number) => void; // Called when level is unlocked
}

export function LevelUnlockModal({
  isOpen,
  topic,
  targetLevel,
  questions,
  onClose,
  onUnlock,
}: LevelUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [passed, setPassed] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCorrectCount(0);
      setIsComplete(false);
      setPassed(false);
    }
  }, [isOpen]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const requiredCorrect = totalQuestions; // Must get all 3 correct

  const handleAnswer = useCallback((index: number) => {
    if (isAnswered) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuestion.correct;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  }, [isAnswered, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      // Assessment complete
      const finalCorrect = correctCount + (selectedAnswer === currentQuestion.correct ? 0 : 0);
      // Note: correctCount already updated in handleAnswer
      const didPass = correctCount === requiredCorrect ||
        (correctCount === requiredCorrect - 1 && selectedAnswer === currentQuestion.correct);

      // Recalculate to be sure
      let total = 0;
      for (let i = 0; i < currentIndex; i++) {
        // Previous answers already counted in correctCount
      }
      // Final answer
      const lastCorrect = selectedAnswer === currentQuestion.correct;
      const actualCorrect = correctCount;

      setPassed(actualCorrect === totalQuestions);
      setIsComplete(true);

      if (actualCorrect === totalQuestions) {
        onUnlock(targetLevel);
      }
    }
  }, [currentIndex, totalQuestions, correctCount, selectedAnswer, currentQuestion, requiredCorrect, targetLevel, onUnlock]);

  if (!isOpen || !currentQuestion) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isComplete ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <span className="font-semibold">Unlock Level {targetLevel}</span>
                  </div>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {currentIndex + 1} / {totalQuestions}
                  </span>
                </div>
                <p className="text-white/80 text-sm mt-1">
                  Answer all {totalQuestions} correctly to unlock
                </p>
                {/* Progress dots */}
                <div className="flex gap-2 mt-3">
                  {Array.from({ length: totalQuestions }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < currentIndex
                          ? 'bg-white'
                          : i === currentIndex
                          ? 'bg-white/60'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Question */}
              <div className="p-5">
                <p className="text-foreground font-medium mb-4 leading-relaxed">
                  {currentQuestion.question}
                </p>

                {/* Options */}
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectAnswer = currentQuestion.correct === index;
                    const showCorrect = isAnswered && isCorrectAnswer;
                    const showWrong = isAnswered && isSelected && !isCorrectAnswer;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        disabled={isAnswered}
                        className={`
                          w-full p-3 rounded-xl text-left transition-all
                          flex items-center gap-3 text-sm
                          ${!isAnswered ? 'hover:bg-muted cursor-pointer' : 'cursor-default'}
                          ${showCorrect ? 'bg-success/20 ring-2 ring-success' : ''}
                          ${showWrong ? 'bg-destructive/20 ring-2 ring-destructive' : ''}
                          ${!isAnswered && isSelected ? 'bg-primary/20 ring-2 ring-primary' : ''}
                          ${isAnswered && !showCorrect && !showWrong ? 'opacity-50' : ''}
                          bg-muted/50
                        `}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      >
                        <span className={`
                          w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs
                          ${showCorrect ? 'bg-success text-white' : ''}
                          ${showWrong ? 'bg-destructive text-white' : ''}
                          ${!isAnswered ? 'bg-muted-foreground/20 text-muted-foreground' : ''}
                          ${isAnswered && !showCorrect && !showWrong ? 'bg-muted-foreground/20 text-muted-foreground' : ''}
                        `}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1 text-foreground">{option}</span>
                        {showCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                        {showWrong && <XCircle className="w-5 h-5 text-destructive" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Next button */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <Button
                      onClick={handleNext}
                      className="w-full"
                    >
                      {currentIndex < totalQuestions - 1 ? 'Next Question' : 'See Results'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            /* Results */
            <div className="p-6 text-center">
              {passed ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Unlock className="w-10 h-10 text-success" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Level {targetLevel} Unlocked!
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Great job! You got {correctCount}/{totalQuestions} correct.
                    You can now practice Level {targetLevel} in {topic}.
                  </p>
                  <Button onClick={onClose} className="w-full">
                    Start Practicing
                  </Button>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Keep Practicing!
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    You got {correctCount}/{totalQuestions} correct at Level {targetLevel}.
                  </p>
                  <p className="text-sm text-foreground mb-4 bg-muted p-3 rounded-lg">
                    {targetLevel > 1 ? (
                      <>
                        <strong>Suggestion:</strong> Start with Level {targetLevel - 1} to build a strong foundation, then come back to unlock Level {targetLevel}.
                      </>
                    ) : (
                      <>
                        <strong>Keep going!</strong> Practice more Level 1 questions to build confidence.
                      </>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      {targetLevel > 1 ? `Practice L${targetLevel - 1}` : 'Back to Topics'}
                    </Button>
                    <Button
                      onClick={() => {
                        // Reset and try again
                        setCurrentIndex(0);
                        setSelectedAnswer(null);
                        setIsAnswered(false);
                        setCorrectCount(0);
                        setIsComplete(false);
                        setPassed(false);
                      }}
                      className="flex-1"
                    >
                      Try Again
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
