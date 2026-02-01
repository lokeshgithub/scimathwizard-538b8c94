import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '@/types/quiz';
import { Character, themeLevels } from '@/data/characters';
import { FunElement } from '@/data/funElements';
import { FunElementCard } from './FunElementCard';
import { SimpleFeedback } from './SimpleFeedback';
import { getFeedback, FeedbackResult } from '@/services/feedbackService';
import { ArrowRight, ArrowLeft, Lightbulb, BookOpen, Sparkles, CheckCircle, XCircle, Brain, Footprints, ShieldCheck, AlertTriangle, Key, Clock, HelpCircle } from 'lucide-react';

import { SessionStats } from '@/types/quiz';

// Hints only available for levels 4+ (easier levels should be manageable without hints)
const MIN_LEVEL_FOR_HINTS = 4;

interface QuizCardProps {
  question: Question;
  level: number;
  levelStats: { correct: number; total: number };
  sessionStats: SessionStats;
  onAnswer: (selectedIndex: number) => Promise<{ isCorrect: boolean; correctIndex: number; question: Question | null; timeSpent?: number }>;
  onNext: () => void;
  onPrevious?: () => void;
  canGoBack?: boolean;
  onSolutionViewed: (questionId: string) => void;
  onPrefetchNext?: () => void;
}

export const QuizCard = ({ 
  question, 
  level, 
  levelStats, 
  sessionStats,
  onAnswer, 
  onNext,
  onPrevious,
  canGoBack = false,
  onSolutionViewed,
  onPrefetchNext
}: QuizCardProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [recentWrongCount, setRecentWrongCount] = useState(0); // Track recent wrong answers for struggling detection
  const [isValidating, setIsValidating] = useState(false);
  const [correctIndex, setCorrectIndex] = useState<number>(-1);
  
  // Hint state - tracks how many hints have been revealed
  const [hintsUsed, setHintsUsed] = useState(0);

  // Error state for answer validation
  const [answerError, setAnswerError] = useState<string | null>(null);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentTheme = themeLevels.find(t => t.level === level) || themeLevels[Math.min(level - 1, themeLevels.length - 1)] || themeLevels[0];

  // Start timer when question loads
  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [question.id]);

  // Stop timer when answered
  useEffect(() => {
    if (isAnswered && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isAnswered]);

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setShowExplanation(false);
    setFeedbackResult(null);
    setIsValidating(false);
    setCorrectIndex(-1);
    // Reset hint state for new question
    setHintsUsed(0);
    // Reset error state
    setAnswerError(null);
  }, [question.id]);

  // Parse hints from the question - split by "|" or "Hint N:" patterns
  // Strips "Hint N:" prefixes for clean display
  const parsedHints = useMemo(() => {
    if (!question.hint) return [];
    const hint = question.hint.trim();
    if (!hint) return [];

    // Helper to strip "Hint N:" prefix from a string
    const stripHintPrefix = (h: string): string => {
      return h.replace(/^Hint\s*\d+\s*:\s*/i, '').trim();
    };

    // Split by "|" separator
    if (hint.includes('|')) {
      return hint.split('|')
        .map(h => stripHintPrefix(h.trim()))
        .filter(h => h.length > 0);
    }

    // Split by "Hint N:" pattern
    const hintPattern = /Hint\s*\d+\s*:/gi;
    if (hintPattern.test(hint)) {
      // Reset regex lastIndex
      hintPattern.lastIndex = 0;
      const parts = hint.split(/Hint\s*\d+\s*:/i).filter(h => h.trim().length > 0);
      return parts.map(h => h.trim());
    }

    // Single hint - also strip any prefix
    return [stripHintPrefix(hint)];
  }, [question.hint]);

  // Check if hints are available for this question
  // - Must be level 4+
  // - Question must have at least one hint
  const hasHintsAvailable = level >= MIN_LEVEL_FOR_HINTS && parsedHints.length > 0;
  const hasMoreHints = hintsUsed < parsedHints.length;

  // Handle revealing the next hint
  const handleUseHint = useCallback(() => {
    if (isAnswered || !hasHintsAvailable || !hasMoreHints) return;
    setHintsUsed(prev => prev + 1);
  }, [isAnswered, hasHintsAvailable, hasMoreHints]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const handleAnswer = useCallback(async (index: number) => {
    if (isAnswered || isValidating) return;

    // Immediate optimistic feedback - show selection instantly
    setSelectedAnswer(index);
    setIsValidating(true);

    try {
      const result = await onAnswer(index);
      
      // Update state immediately after validation returns
      setIsAnswered(true);
      setIsCorrect(result.isCorrect);
      setCorrectIndex(result.correctIndex);
      setIsValidating(false);

      // Prefetch next question immediately after answer is validated
      // This happens while user sees feedback, before they click explanation
      onPrefetchNext?.();

      // Track streaks and struggling
      let newConsecutive = consecutiveCorrect;
      let newRecentWrong = recentWrongCount;
      
      if (result.isCorrect) {
        newConsecutive = consecutiveCorrect + 1;
        setConsecutiveCorrect(newConsecutive);
        // Decay recent wrong count on correct answers
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

      // Get smart feedback using the feedback service
      const feedback = getFeedback({
        isCorrect: result.isCorrect,
        level,
        streak: newConsecutive,
        totalAnswered: sessionStats.solved, // Use solved as total answered
        recentWrongCount: newRecentWrong,
      });
      setFeedbackResult(feedback);

      // Pop-up milestone animations removed for snappier flow
      // Level completion modal still shows via handleNext -> checkMastery
    } catch (error) {
      console.error('Error validating answer:', error);
      setIsValidating(false);
      setSelectedAnswer(null); // Reset on error
      setAnswerError('Failed to validate answer. Please try again.');
    }
  }, [isAnswered, isValidating, onAnswer, level, consecutiveCorrect, recentWrongCount, sessionStats.totalCorrect, sessionStats.solved, onPrefetchNext]);

  const handleShowExplanation = useCallback(() => {
    setShowExplanation(true);
    onSolutionViewed(question.id);
    // Prefetch next question while user reads explanation
    onPrefetchNext?.();
  }, [onSolutionViewed, question.id, onPrefetchNext]);

  const handleNext = useCallback(() => {
    onNext();
  }, [onNext]);

  const sectionIcons: Record<string, React.ReactNode> = {
    'UNDERSTANDING': <Brain className="w-4 h-4" />,
    'WHY THIS WORKS': <Lightbulb className="w-4 h-4" />,
    'STEP-BY-STEP': <Footprints className="w-4 h-4" />,
    'VERIFICATION': <ShieldCheck className="w-4 h-4" />,
    'COMMON ERRORS': <AlertTriangle className="w-4 h-4" />,
    'KEY CONCEPT': <Key className="w-4 h-4" />,
  };

  const sectionColors: Record<string, string> = {
    'UNDERSTANDING': 'text-blue-600',
    'WHY THIS WORKS': 'text-amber-600',
    'STEP-BY-STEP': 'text-emerald-600',
    'VERIFICATION': 'text-green-600',
    'COMMON ERRORS': 'text-red-500',
    'KEY CONCEPT': 'text-purple-600',
  };

  // Format content that has numbered steps (e.g., "1. Step one. 2. Step two.")
  // Returns content with proper line breaks between steps
  // Handles multiple formats: "1. ", "1) ", "(1) ", and bullet points
  const formatStepContent = (content: string): string => {
    // First, normalize existing newlines (remove duplicates)
    let formatted = content.replace(/\n{2,}/g, '\n');

    // Check if content already has proper line breaks (has newlines before numbers)
    const hasProperBreaks = /\n\s*\d+[.)]\s/.test(formatted);
    if (hasProperBreaks) {
      return formatted.trim();
    }

    // Add line breaks before numbered patterns: "1. ", "2. ", etc.
    // But not at the very start
    formatted = formatted
      .replace(/(?<!^)(\s)(\d+)\.\s+/g, '\n$2. ') // "1. " format
      .replace(/(?<!^)(\s)(\d+)\)\s+/g, '\n$2) ') // "1) " format
      .replace(/(?<!^)(\s)\((\d+)\)\s+/g, '\n($2) ') // "(1) " format
      .replace(/^\n/, '') // Remove leading newline if added
      .trim();

    return formatted;
  };

  const formatExplanation = (explanation: string) => {
    // Parse sections marked with 【TITLE】
    const regex = /【([^】]+)】\s*([\s\S]*?)(?=【|$)/g;
    const formatted: { title: string; content: string }[] = [];
    let match;

    while ((match = regex.exec(explanation)) !== null) {
      const title = match[1].trim();
      let content = match[2].trim();

      // For STEP-BY-STEP sections, format the numbered steps
      if (title === 'STEP-BY-STEP') {
        content = formatStepContent(content);
      }

      if (content) {
        formatted.push({ title, content });
      }
    }

    // Fallback if no sections found
    if (formatted.length === 0 && explanation.trim()) {
      formatted.push({ title: 'Explanation', content: explanation.trim() });
    }

    return formatted;
  };

  return (
    <motion.div
      className="bg-card rounded-2xl shadow-card overflow-hidden"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentTheme?.bgClass || 'from-primary to-secondary'} p-4`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm">Question {levelStats.total + 1}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-semibold">
              Level {level}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <motion.div 
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                isAnswered 
                  ? 'bg-white/20 text-white' 
                  : elapsedTime > 60 
                    ? 'bg-amber-500/80 text-white animate-pulse' 
                    : 'bg-white/20 text-white'
              }`}
              animate={!isAnswered && elapsedTime > 30 ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(elapsedTime)}</span>
            </motion.div>
            <span className="text-white/80 text-sm">
              {levelStats.correct}/{levelStats.total} correct
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <p className="text-lg font-medium text-foreground mb-4 leading-relaxed">
          {question.question}
        </p>

        {/* Error Banner */}
        {answerError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2"
          >
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {answerError}
            <button
              onClick={() => setAnswerError(null)}
              className="ml-auto text-destructive/70 hover:text-destructive"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Progressive Hints - Only show for levels 4+ and if hints exist */}
        {!isAnswered && hasHintsAvailable && (
          <div className="mb-4 space-y-3">
            {/* Show revealed hints */}
            {hintsUsed > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-700 dark:text-amber-300 text-sm mb-2">
                      {hintsUsed === 1 ? 'Hint' : `Hints (${hintsUsed}/${parsedHints.length})`}
                    </p>
                    <ul className="space-y-2">
                      {parsedHints.slice(0, hintsUsed).map((hint, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="text-amber-800 dark:text-amber-200 text-sm"
                        >
                          {parsedHints.length > 1 && <span className="font-medium">#{idx + 1}: </span>}
                          {hint}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Button to get hint or get more hints */}
            {hasMoreHints && (
              <motion.button
                onClick={handleUseHint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <HelpCircle className="w-4 h-4" />
                {hintsUsed === 0 ? 'Need a hint?' : 'Need another hint?'}
              </motion.button>
            )}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === correctIndex;
            const showAsCorrect = isAnswered && isCorrectAnswer;
            const showAsIncorrect = isAnswered && isSelected && !isCorrectAnswer;

            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={isAnswered || isValidating}
                className={`
                  w-full p-4 rounded-xl text-left transition-colors duration-150 flex items-center gap-3
                  ${isValidating && isSelected
                    ? 'bg-primary/30 ring-2 ring-primary'
                    : !isAnswered
                      ? 'bg-muted hover:bg-primary/10 hover:ring-2 hover:ring-primary/30'
                      : showAsCorrect
                        ? 'bg-success/20 ring-2 ring-success'
                        : showAsIncorrect
                          ? 'bg-destructive/20 ring-2 ring-destructive'
                          : 'bg-muted opacity-60'
                  }
                `}
                initial={{ opacity: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isValidating && isSelected ? [1, 1.01, 1] : 1
                }}
                transition={{
                  duration: 0.1,
                  scale: { duration: 0.3, repeat: isValidating && isSelected ? Infinity : 0 }
                }}
                whileHover={!isAnswered && !isValidating ? { scale: 1.01 } : undefined}
                whileTap={!isAnswered && !isValidating ? { scale: 0.99 } : undefined}
              >
                <span className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${showAsCorrect 
                    ? 'bg-success text-white' 
                    : showAsIncorrect 
                      ? 'bg-destructive text-white' 
                      : 'bg-primary/10 text-primary'
                  }
                `}>
                  {showAsCorrect ? <CheckCircle className="w-5 h-5" /> :
                   showAsIncorrect ? <XCircle className="w-5 h-5" /> :
                   String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-foreground break-words">{option}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Time Feedback after answering */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 mb-4 text-sm ${
              elapsedTime < 15 ? 'text-success' : elapsedTime < 45 ? 'text-foreground' : 'text-amber-600'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              Time taken: {formatTime(elapsedTime)}
              {elapsedTime < 15 && ' ⚡ Quick!'}
              {elapsedTime > 60 && ' - Take your time to understand the concept!'}
            </span>
          </motion.div>
        )}

        {/* Feedback - shows ONE of: simple message, character message, or fun element */}
        <AnimatePresence>
          {isAnswered && feedbackResult && (
            <>
              {/* Simple feedback */}
              {feedbackResult.type === 'simple' && feedbackResult.simpleMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4"
                >
                  <SimpleFeedback message={feedbackResult.simpleMessage} isCorrect={isCorrect} />
                </motion.div>
              )}
              
              {/* Character feedback (only for exceptional performance) */}
              {feedbackResult.type === 'character' && feedbackResult.character && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`
                    p-4 rounded-xl mb-4
                    ${isCorrect ? 'bg-success/10 border border-success/30' : 'bg-destructive/10 border border-destructive/30'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <motion.span 
                      className="text-4xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      {feedbackResult.character.emoji}
                    </motion.span>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{feedbackResult.character.name} says:</p>
                      <p className="text-muted-foreground italic">"{feedbackResult.message}"</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Fun element (rare surprise) */}
              {feedbackResult.type === 'fun_element' && feedbackResult.funElement && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4"
                >
                  <FunElementCard element={feedbackResult.funElement} />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Show Answer Button */}
        <AnimatePresence>
          {isAnswered && !showExplanation && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={handleShowExplanation}
              className="w-full p-4 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary font-semibold flex items-center justify-center gap-2 mb-4 transition-colors"
            >
              <Lightbulb className="w-5 h-5" />
              Show Step-by-Step Explanation
            </motion.button>
          )}
        </AnimatePresence>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted rounded-xl p-5 mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-foreground">Step-by-Step Solution</h4>
              </div>
              
              {!isCorrect && correctIndex >= 0 && (
                <div className="mb-4 p-3 bg-success/10 rounded-lg">
                  <p className="text-sm text-success font-semibold">
                    ✓ Correct Answer: {String.fromCharCode(65 + correctIndex)}. {question.options[correctIndex]}
                  </p>
                </div>
              )}

              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                {formatExplanation(question.explanation).map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-background/50 rounded-lg p-4 border border-border/50"
                  >
                    <h5 className={`font-semibold mb-2 flex items-center gap-2 ${sectionColors[section.title] || 'text-primary'}`}>
                      {sectionIcons[section.title] || <Sparkles className="w-4 h-4" />}
                      {section.title}
                    </h5>
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm break-words">
                      {section.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              {question.concepts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Concepts covered:</p>
                  <div className="flex flex-wrap gap-2">
                    {question.concepts.map((concept, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {isAnswered && (
          <div className="flex gap-3">
            {/* Previous Question Button */}
            {canGoBack && onPrevious && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onPrevious}
                className="flex-1 p-4 bg-muted hover:bg-muted/80 rounded-xl text-foreground font-semibold flex items-center justify-center gap-2 transition-colors border border-border"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </motion.button>
            )}
            
            {/* Next Question Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="flex-1 p-4 bg-gradient-magical hover:opacity-90 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity shadow-magical"
            >
              Next Question
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Pop-up milestone animations removed for snappier flow */}
      {/* Level completion modal still shows via LevelCompleteModal in Index.tsx */}
    </motion.div>
  );
};
