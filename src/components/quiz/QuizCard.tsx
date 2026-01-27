import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '@/types/quiz';
import { Character, themeLevels, getRandomCharacter, getRandomMessage } from '@/data/characters';
import { getRandomFunElement, getMilestoneAnimation, FunElement } from '@/data/funElements';
import { FunElementCard } from './FunElementCard';
import { MilestoneAnimation } from './MilestoneAnimation';
import { ArrowRight, ArrowLeft, Lightbulb, BookOpen, Sparkles, CheckCircle, XCircle, Brain, Footprints, ShieldCheck, AlertTriangle, Key, Clock } from 'lucide-react';

import { SessionStats } from '@/types/quiz';

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
  const [character, setCharacter] = useState<Character | null>(null);
  const [message, setMessage] = useState('');
  const [funElement, setFunElement] = useState<FunElement | null>(null);
  const [milestone, setMilestone] = useState<{ emoji: string; message: string; animation: string } | null>(null);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [correctIndex, setCorrectIndex] = useState<number>(-1);
  
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
    setCharacter(null);
    setMessage('');
    setFunElement(null);
    setMilestone(null);
    setIsValidating(false);
    setCorrectIndex(-1);
  }, [question.id]);

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

    // Pre-load character for instant display after validation
    const char = getRandomCharacter(level);
    const fun = getRandomFunElement(level);

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

      // Show pre-loaded character and fun element
      setCharacter(char);
      setMessage(getRandomMessage(char, result.isCorrect ? 'correct' : 'incorrect'));
      setFunElement(fun);

      // Track consecutive correct answers for milestones
      if (result.isCorrect) {
        const newConsecutive = consecutiveCorrect + 1;
        setConsecutiveCorrect(newConsecutive);
        const newTotalCorrect = sessionStats.totalCorrect + 1;
        const milestoneAnim = getMilestoneAnimation(newConsecutive, newTotalCorrect);
        if (milestoneAnim) {
          setMilestone(milestoneAnim);
        }
      } else {
        setConsecutiveCorrect(0);
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      setIsValidating(false);
      setSelectedAnswer(null); // Reset on error
    }
  }, [isAnswered, isValidating, onAnswer, level, consecutiveCorrect, sessionStats.totalCorrect, onPrefetchNext]);

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

  const formatExplanation = (explanation: string) => {
    // Parse sections marked with 【TITLE】
    const regex = /【([^】]+)】\s*([\s\S]*?)(?=【|$)/g;
    const formatted: { title: string; content: string }[] = [];
    let match;
    
    while ((match = regex.exec(explanation)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
        <motion.p 
          className="text-lg font-medium text-foreground mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {question.question}
        </motion.p>

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
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isValidating && isSelected ? [1, 1.01, 1] : 1
                }}
                transition={{ 
                  delay: 0.1 * index,
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
                <span className="flex-1 text-foreground">{option}</span>
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

        {/* Character Feedback */}
        <AnimatePresence>
          {isAnswered && character && (
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
                  {character.emoji}
                </motion.span>
                <div>
                  <p className="font-semibold text-foreground mb-1">{character.name} says:</p>
                  <p className="text-muted-foreground italic">"{message}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fun Element Surprise */}
        <AnimatePresence>
          {isAnswered && funElement && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <FunElementCard element={funElement} />
            </motion.div>
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

              <div className="space-y-5">
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
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
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

      {/* Milestone Celebration Animation */}
      <MilestoneAnimation 
        milestone={milestone} 
        onComplete={() => setMilestone(null)} 
      />
    </motion.div>
  );
};
