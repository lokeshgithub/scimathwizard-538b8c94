import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronUp, ArrowRight, Lightbulb, BookOpen, Brain, Footprints, ShieldCheck, AlertTriangle, Key, Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';
import { FeedbackResult } from '@/services/feedbackService';
import { Question } from '@/types/quiz';
import { FunElementCard } from './FunElementCard';

interface AnswerFeedbackSheetProps {
  isVisible: boolean;
  isCorrect: boolean;
  correctIndex: number;
  question: Question;
  feedbackResult: FeedbackResult | null;
  elapsedTime: number;
  onNext: () => void;
  onSolutionViewed: (questionId: string) => void;
}

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

const formatStepContent = (content: string): string => {
  let formatted = content.replace(/\n{2,}/g, '\n');
  const hasProperBreaks = /\n\s*\d+[.)]\s/.test(formatted);
  if (hasProperBreaks) return formatted.trim();
  formatted = formatted
    .replace(/(?<!^)(\s)(\d+)\.\s+/g, '\n$2. ')
    .replace(/(?<!^)(\s)(\d+)\)\s+/g, '\n$2) ')
    .replace(/(?<!^)(\s)\((\d+)\)\s+/g, '\n($2) ')
    .replace(/^\n/, '')
    .trim();
  return formatted;
};

const formatExplanation = (explanation: string) => {
  const regex = /【([^】]+)】\s*([\s\S]*?)(?=【|$)/g;
  const formatted: { title: string; content: string }[] = [];
  let match;
  while ((match = regex.exec(explanation)) !== null) {
    const title = match[1].trim();
    let content = match[2].trim();
    if (title === 'STEP-BY-STEP') content = formatStepContent(content);
    if (content) formatted.push({ title, content });
  }
  if (formatted.length === 0 && explanation.trim()) {
    formatted.push({ title: 'Explanation', content: explanation.trim() });
  }
  return formatted;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
};

export const AnswerFeedbackSheet = ({
  isVisible,
  isCorrect,
  correctIndex,
  question,
  feedbackResult,
  elapsedTime,
  onNext,
  onSolutionViewed,
}: AnswerFeedbackSheetProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    if (!expanded) {
      setExpanded(true);
      onSolutionViewed(question.id);
    }
  }, [expanded, onSolutionViewed, question.id]);

  const handleNext = useCallback(() => {
    setExpanded(false);
    onNext();
  }, [onNext]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleNext}
          />
          
          {/* Bottom sheet */}
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl border-t-4 ${
              isCorrect 
                ? 'border-success bg-success/5 dark:bg-success/10' 
                : 'border-destructive bg-destructive/5 dark:bg-destructive/10'
            }`}
            style={{ backgroundColor: 'hsl(var(--card))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <div className="max-w-4xl mx-auto">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Compact feedback header */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                  >
                    {isCorrect ? (
                      <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                        <XCircle className="w-7 h-7 text-white" />
                      </div>
                    )}
                  </motion.div>
                  
                  <div className="flex-1">
                    <motion.h3
                      className={`text-xl font-bold ${isCorrect ? 'text-success' : 'text-destructive'}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {isCorrect ? 'Correct!' : 'Not quite'}
                    </motion.h3>
                    <motion.div 
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span>{formatTime(elapsedTime)}</span>
                      {isCorrect && elapsedTime < 15 && <span className="text-success">⚡ Quick!</span>}
                    </motion.div>
                  </div>
                </div>

                {/* Show correct answer if wrong */}
                {!isCorrect && correctIndex >= 0 && (
                  <motion.div
                    className="p-3 bg-success/10 rounded-xl mb-3 border border-success/20"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <p className="text-sm font-semibold text-success">
                      ✓ {String.fromCharCode(65 + correctIndex)}. {question.options[correctIndex]}
                    </p>
                  </motion.div>
                )}

                {/* Character / Fun feedback */}
                {feedbackResult?.type === 'character' && feedbackResult.character && (
                  <motion.div
                    className="flex items-center gap-2 mb-3 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-2xl">{feedbackResult.character.emoji}</span>
                    <span className="text-muted-foreground italic">"{feedbackResult.message}"</span>
                  </motion.div>
                )}
                {feedbackResult?.type === 'fun_element' && feedbackResult.funElement && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-3"
                  >
                    <FunElementCard element={feedbackResult.funElement} />
                  </motion.div>
                )}

                {/* Expandable explanation */}
                {!expanded && (
                  <motion.button
                    onClick={handleExpand}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-semibold transition-colors mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChevronUp className="w-4 h-4" />
                    Show Explanation
                  </motion.button>
                )}

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-3"
                    >
                      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 pb-1">
                        {formatExplanation(question.explanation).map((section, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className="bg-muted/50 rounded-lg p-3 border border-border/50"
                          >
                            <h5 className={`font-semibold mb-1.5 flex items-center gap-1.5 text-sm ${sectionColors[section.title] || 'text-primary'}`}>
                              {sectionIcons[section.title] || <Sparkles className="w-3.5 h-3.5" />}
                              {section.title}
                            </h5>
                            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {section.content}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      {question.concepts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex flex-wrap gap-1.5">
                            {question.concepts.map((concept, i) => (
                              <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Next button — always visible and prominent */}
                <motion.button
                  onClick={handleNext}
                  className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-opacity ${
                    isCorrect 
                      ? 'bg-success text-white hover:opacity-90' 
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
