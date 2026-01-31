import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, ArrowRight, Sparkles, Brain } from 'lucide-react';
import type { Question, SessionStats } from '@/types/quiz';
import { themeLevels } from '@/data/characters';
import { FunElementCard } from '@/components/quiz/FunElementCard';
import { SimpleFeedback } from '@/components/quiz/SimpleFeedback';
import { getFeedback, FeedbackResult } from '@/services/feedbackService';

interface AdaptiveQuizCardProps {
  question: Question;
  currentLevel: number;
  progress: number; // 0-100 progress through challenge
  questionsAnswered: number;
  maxQuestions: number;
  onAnswer: (selectedIndex: number) => Promise<{ isCorrect: boolean; correctIndex: number }>;
  onNext: () => void;
}

export const AdaptiveQuizCard = ({
  question,
  currentLevel,
  progress,
  questionsAnswered,
  maxQuestions,
  onAnswer,
  onNext,
}: AdaptiveQuizCardProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number>(-1);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timer, setTimer] = useState(0);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [recentWrongCount, setRecentWrongCount] = useState(0);
  const timerRef = useRef<number>();

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCorrectIndex(-1);
    setIsAnswered(false);
    setTimer(0);
    setFeedbackResult(null);
  }, [question.id, currentLevel]);

  // Timer
  useEffect(() => {
    if (!isAnswered) {
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isAnswered]);

  const handleAnswer = async (index: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(index);
    clearInterval(timerRef.current);
    
    const result = await onAnswer(index);
    setIsCorrect(result.isCorrect);
    setCorrectIndex(result.correctIndex);
    setIsAnswered(true);
    
    // Track streaks and struggling
    let newConsecutive = consecutiveCorrect;
    let newRecentWrong = recentWrongCount;
    
    if (result.isCorrect) {
      newConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutive);
      if (recentWrongCount > 0) {
        newRecentWrong = Math.max(0, recentWrongCount - 1);
        setRecentWrongCount(newRecentWrong);
      }
    } else {
      setConsecutiveCorrect(0);
      newConsecutive = 0;
      newRecentWrong = Math.min(5, recentWrongCount + 1);
      setRecentWrongCount(newRecentWrong);
    }
    
    // Get smart feedback
    const feedback = getFeedback({
      isCorrect: result.isCorrect,
      level: currentLevel,
      streak: newConsecutive,
      totalAnswered: questionsAnswered,
      recentWrongCount: newRecentWrong,
    });
    setFeedbackResult(feedback);
  };

  const handleNext = () => {
    setFeedbackResult(null);
    onNext();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTheme = themeLevels.find(t => t.level === currentLevel) || themeLevels[0];

  return (
    <motion.div
      className="bg-card rounded-2xl shadow-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentTheme.bgClass} p-4`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <span className="font-medium">Adaptive Challenge</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{formatTime(timer)}</span>
            </div>
            <span className="text-sm">
              {questionsAnswered + 1} / {maxQuestions}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
          {question.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = correctIndex === index;
            const showCorrect = isAnswered && isCorrectAnswer;
            const showWrong = isAnswered && isSelected && !isCorrect;

            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={isAnswered}
                className={`
                  w-full p-4 rounded-xl text-left transition-all
                  flex items-center gap-3
                  ${!isAnswered ? 'hover:bg-muted hover:scale-[1.01] cursor-pointer' : 'cursor-default'}
                  ${showCorrect ? 'bg-success/20 ring-2 ring-success' : ''}
                  ${showWrong ? 'bg-destructive/20 ring-2 ring-destructive' : ''}
                  ${!isAnswered && isSelected ? 'bg-primary/20 ring-2 ring-primary' : ''}
                  ${isAnswered && !showCorrect && !showWrong ? 'opacity-50' : ''}
                  bg-muted/50
                `}
                whileHover={!isAnswered ? { scale: 1.01 } : {}}
                whileTap={!isAnswered ? { scale: 0.99 } : {}}
              >
                <span className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-semibold
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

        {/* Post-answer feedback */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Feedback - shows ONE of: simple, character, or fun element */}
              {feedbackResult && (
                <>
                  {/* Simple feedback */}
                  {feedbackResult.type === 'simple' && feedbackResult.simpleMessage && (
                    <SimpleFeedback message={feedbackResult.simpleMessage} isCorrect={isCorrect === true} />
                  )}
                  
                  {/* Character feedback */}
                  {feedbackResult.type === 'character' && feedbackResult.character && (
                    <div className="bg-muted rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <motion.span
                          className="text-3xl"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {feedbackResult.character.emoji}
                        </motion.span>
                        <span className="font-semibold text-foreground">{feedbackResult.character.name}</span>
                        {isCorrect ? (
                          <span className="text-success text-sm font-medium">✓ Correct!</span>
                        ) : (
                          <span className="text-destructive text-sm font-medium">✗ Not quite</span>
                        )}
                      </div>
                      <p className="text-muted-foreground italic">"{feedbackResult.message}"</p>
                    </div>
                  )}
                  
                  {/* Fun element */}
                  {feedbackResult.type === 'fun_element' && feedbackResult.funElement && (
                    <FunElementCard element={feedbackResult.funElement} />
                  )}
                </>
              )}

              {/* Time feedback */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  You answered in {timer} second{timer !== 1 ? 's' : ''}
                </span>
                {timer < 10 && isCorrect && (
                  <span className="text-success flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Quick thinking!
                  </span>
                )}
              </div>

              {/* Next button */}
              <motion.button
                onClick={handleNext}
                className="w-full p-4 bg-gradient-magical text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-magical"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
