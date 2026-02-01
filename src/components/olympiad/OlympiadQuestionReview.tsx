import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, ChevronUp, Brain, Lightbulb, Footprints,
  ShieldCheck, AlertTriangle, Key, Sparkles, CheckCircle, XCircle,
  RotateCcw, Eye, EyeOff, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OlympiadQuestionResult } from '@/hooks/useOlympiadTest';

interface OlympiadQuestionReviewProps {
  questionResults: OlympiadQuestionResult[];
  onClose: () => void;
  onRetryQuestion?: (questionIndex: number) => void;
}

// Section icons for structured explanations
const sectionIcons: Record<string, React.ReactNode> = {
  'UNDERSTANDING': <Brain className="w-4 h-4" />,
  'WHY THIS WORKS': <Lightbulb className="w-4 h-4" />,
  'STRATEGY': <Lightbulb className="w-4 h-4" />,
  'STEP-BY-STEP': <Footprints className="w-4 h-4" />,
  'VERIFICATION': <ShieldCheck className="w-4 h-4" />,
  'COMMON ERRORS': <AlertTriangle className="w-4 h-4" />,
  'KEY CONCEPT': <Key className="w-4 h-4" />,
};

// Section colors for structured explanations
const sectionColors: Record<string, string> = {
  'UNDERSTANDING': 'text-blue-600',
  'WHY THIS WORKS': 'text-amber-600',
  'STRATEGY': 'text-amber-600',
  'STEP-BY-STEP': 'text-emerald-600',
  'VERIFICATION': 'text-green-600',
  'COMMON ERRORS': 'text-red-500',
  'KEY CONCEPT': 'text-purple-600',
};

const difficultyColors = {
  easy: 'text-success bg-success/10',
  medium: 'text-warning bg-warning/10',
  hard: 'text-destructive bg-destructive/10',
};

// Parse structured explanations
const formatExplanation = (explanation: string) => {
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

  if (formatted.length === 0 && explanation.trim()) {
    formatted.push({ title: 'Explanation', content: explanation.trim() });
  }

  return formatted;
};

// Parse hints (separated by |)
const parseHints = (hintString: string | undefined): string[] => {
  if (!hintString || !hintString.trim()) return [];
  return hintString.split('|').map(h => h.trim()).filter(h => h.length > 0);
};

export function OlympiadQuestionReview({
  questionResults,
  onClose,
  onRetryQuestion
}: OlympiadQuestionReviewProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showHints, setShowHints] = useState<Set<number>>(new Set());
  const [retryMode, setRetryMode] = useState<number | null>(null);
  const [retryAnswer, setRetryAnswer] = useState<number | null>(null);
  const [showRetryResult, setShowRetryResult] = useState(false);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleHints = (index: number) => {
    setShowHints(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRetryQuestion = (index: number) => {
    setRetryMode(index);
    setRetryAnswer(null);
    setShowRetryResult(false);
  };

  const handleRetryAnswer = (answerIndex: number) => {
    setRetryAnswer(answerIndex);
    setShowRetryResult(true);
  };

  const exitRetryMode = () => {
    setRetryMode(null);
    setRetryAnswer(null);
    setShowRetryResult(false);
  };

  const correctCount = questionResults.filter(r => r.isCorrect).length;
  const incorrectCount = questionResults.length - correctCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Question Paper Review</h2>
            <p className="text-white/80 text-sm mt-1">
              <span className="text-green-300">{correctCount} correct</span>
              {' • '}
              <span className="text-red-300">{incorrectCount} incorrect</span>
              {' • '}
              {questionResults.length} total
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {questionResults.map((result, index) => {
            const isExpanded = expandedQuestions.has(index);
            const hintsVisible = showHints.has(index);
            const isRetrying = retryMode === index;
            const hints = parseHints(result.question.hint);
            const hasHints = hints.length > 0;
            const hasExplanation = result.question.explanation && result.question.explanation.trim().length > 0;
            const explanationSections = hasExplanation ? formatExplanation(result.question.explanation) : [];

            return (
              <div
                key={index}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  result.isCorrect
                    ? 'border-success/50 bg-success/5'
                    : 'border-destructive/50 bg-destructive/5'
                }`}
              >
                {/* Question Header - Always Visible */}
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-black/5 transition-colors"
                >
                  {/* Question Number Badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                    result.isCorrect ? 'bg-success' : 'bg-destructive'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium mb-2 line-clamp-2">
                      {result.question.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${difficultyColors[result.difficulty]}`}>
                        {result.difficulty}
                      </span>
                      {result.isCorrect ? (
                        <span className="text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Correct
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {/* Options Display / Retry Mode */}
                        {isRetrying ? (
                          /* Retry Mode */
                          <div className="bg-background rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <RotateCcw className="w-4 h-4 text-primary" />
                              Try Again
                            </h4>
                            <div className="space-y-2">
                              {result.question.options.map((option, optIdx) => {
                                const isSelected = retryAnswer === optIdx;
                                const isCorrectOption = optIdx === result.correctAnswer;
                                const showResult = showRetryResult;

                                let optionClass = 'border-border hover:border-primary/50 hover:bg-primary/5';
                                if (showResult) {
                                  if (isCorrectOption) {
                                    optionClass = 'border-success bg-success/10';
                                  } else if (isSelected && !isCorrectOption) {
                                    optionClass = 'border-destructive bg-destructive/10';
                                  }
                                } else if (isSelected) {
                                  optionClass = 'border-primary bg-primary/10';
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => !showResult && handleRetryAnswer(optIdx)}
                                    disabled={showResult}
                                    className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${optionClass}`}
                                  >
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                      showResult && isCorrectOption
                                        ? 'bg-success text-white'
                                        : showResult && isSelected && !isCorrectOption
                                        ? 'bg-destructive text-white'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="text-sm">{option}</span>
                                    {showResult && isCorrectOption && (
                                      <CheckCircle className="w-4 h-4 text-success ml-auto" />
                                    )}
                                    {showResult && isSelected && !isCorrectOption && (
                                      <XCircle className="w-4 h-4 text-destructive ml-auto" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {showRetryResult && (
                              <div className={`mt-3 p-3 rounded-lg ${
                                retryAnswer === result.correctAnswer
                                  ? 'bg-success/10 text-success'
                                  : 'bg-destructive/10 text-destructive'
                              }`}>
                                {retryAnswer === result.correctAnswer
                                  ? 'Correct! Great job!'
                                  : `Incorrect. The correct answer is ${String.fromCharCode(65 + result.correctAnswer)}.`}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exitRetryMode}
                              className="mt-3"
                            >
                              Back to Review
                            </Button>
                          </div>
                        ) : (
                          /* Normal Options Display */
                          <div className="bg-background rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-3">Options</h4>
                            <div className="space-y-2">
                              {result.question.options.map((option, optIdx) => {
                                const isUserAnswer = optIdx === result.selectedAnswer;
                                const isCorrectOption = optIdx === result.correctAnswer;

                                let optionClass = 'border-border';
                                if (isCorrectOption) {
                                  optionClass = 'border-success bg-success/10';
                                } else if (isUserAnswer && !result.isCorrect) {
                                  optionClass = 'border-destructive bg-destructive/10';
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-lg border-2 flex items-center gap-3 ${optionClass}`}
                                  >
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                      isCorrectOption
                                        ? 'bg-success text-white'
                                        : isUserAnswer && !result.isCorrect
                                        ? 'bg-destructive text-white'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="text-sm flex-1">{option}</span>
                                    {isCorrectOption && (
                                      <span className="text-xs text-success font-medium">Correct Answer</span>
                                    )}
                                    {isUserAnswer && !result.isCorrect && (
                                      <span className="text-xs text-destructive font-medium">Your Answer</span>
                                    )}
                                    {isUserAnswer && result.isCorrect && (
                                      <span className="text-xs text-success font-medium">Your Answer</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {!isRetrying && (
                          <div className="flex flex-wrap gap-2">
                            {hasHints && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleHints(index)}
                                className="gap-2"
                              >
                                <HelpCircle className="w-4 h-4" />
                                {hintsVisible ? 'Hide Hints' : `Show Hints (${hints.length})`}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryQuestion(index)}
                              className="gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Try Again
                            </Button>
                          </div>
                        )}

                        {/* Hints Section */}
                        <AnimatePresence>
                          {hintsVisible && hasHints && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" />
                                  Hints
                                </h4>
                                <div className="space-y-2">
                                  {hints.map((hint, hIdx) => (
                                    <div key={hIdx} className="flex gap-2 text-sm">
                                      <span className="text-amber-600 dark:text-amber-500 font-medium shrink-0">
                                        {hIdx + 1}.
                                      </span>
                                      <span className="text-amber-800 dark:text-amber-300">{hint}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Explanation Section */}
                        {hasExplanation && (
                          <div className="bg-background rounded-lg p-4 border">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                              <Eye className="w-4 h-4 text-primary" />
                              Detailed Solution
                            </h4>
                            <div className="space-y-4">
                              {explanationSections.map((section, sIdx) => (
                                <div key={sIdx}>
                                  <h5 className={`font-semibold mb-2 flex items-center gap-2 text-sm ${sectionColors[section.title] || 'text-primary'}`}>
                                    {sectionIcons[section.title] || <Sparkles className="w-4 h-4" />}
                                    {section.title}
                                  </h5>
                                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm pl-6">
                                    {section.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Concepts/Tags */}
                        {result.question.concepts && result.question.concepts.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.question.concepts.slice(0, 5).map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                              >
                                {concept.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <Button onClick={onClose}>
            Close Review
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
