import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Target, Clock, BarChart3, 
  TrendingUp, Award, ArrowRight, Home,
  CheckCircle, XCircle, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OlympiadQuestionResult } from '@/hooks/useOlympiadTest';

interface OlympiadResultsProps {
  results: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTimeSeconds: number;
    avgTimePerQuestion: number;
    byDifficulty: {
      easy: { correct: number; total: number };
      medium: { correct: number; total: number };
      hard: { correct: number; total: number };
    };
    byTopic: Record<string, { correct: number; total: number }>;
    rank: string;
    medal: string;
    medalEmoji: string;
    examType: string;
  };
  questionResults?: OlympiadQuestionResult[];
  strictMode?: boolean;
  onRetry: () => void;
  onHome: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const getExamTypeLabel = (type: string) => {
  switch (type) {
    case 'foundation': return 'Foundation Olympiad';
    case 'regional': return 'Regional Olympiad';
    case 'national': return 'National Olympiad';
    default: return 'Olympiad Test';
  }
};

export function OlympiadResults({ results, questionResults, strictMode, onRetry, onHome }: OlympiadResultsProps) {
  const [showReview, setShowReview] = useState(false);
  
  const difficultyColors = {
    easy: 'text-success bg-success/10',
    medium: 'text-warning bg-warning/10',
    hard: 'text-destructive bg-destructive/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Medal Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-6xl mb-4"
        >
          {results.medalEmoji}
        </motion.div>
        <h2 className="text-2xl font-bold mb-1">{results.rank}</h2>
        <p className="text-white/80 text-sm">{getExamTypeLabel(results.examType)}</p>
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{results.correctAnswers}/{results.totalQuestions}</div>
            <div className="text-xs text-white/70">Correct</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{results.accuracy}%</div>
            <div className="text-xs text-white/70">Accuracy</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{formatTime(results.totalTimeSeconds)}</div>
            <div className="text-xs text-white/70">Time</div>
          </div>
        </div>
      </div>

      {/* Performance by Difficulty */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Performance by Difficulty
        </h3>
        <div className="space-y-3">
          {(['easy', 'medium', 'hard'] as const).map(difficulty => {
            const data = results.byDifficulty[difficulty];
            const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            
            return (
              <div key={difficulty} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded capitalize font-medium ${difficultyColors[difficulty]}`}>
                    {difficulty}
                  </span>
                  <span className="text-muted-foreground">
                    {data.correct}/{data.total} ({Math.round(percentage)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className={`h-full rounded-full ${
                      difficulty === 'easy' ? 'bg-success' :
                      difficulty === 'medium' ? 'bg-warning' : 'bg-destructive'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance by Topic */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Performance by Topic
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(results.byTopic)
            .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
            .map(([topic, data]) => {
              const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
              const isGood = percentage >= 70;
              
              return (
                <div key={topic} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground capitalize">
                    {topic.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isGood ? 'text-success' : 'text-muted-foreground'}`}>
                      {data.correct}/{data.total}
                    </span>
                    {isGood ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Time Analysis */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Time Analysis
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xl font-bold text-foreground">{formatTime(results.totalTimeSeconds)}</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xl font-bold text-foreground">{results.avgTimePerQuestion}s</div>
            <div className="text-xs text-muted-foreground">Avg per Question</div>
          </div>
        </div>
      </div>

      {/* Question Review (especially useful for strict mode) */}
      {questionResults && questionResults.length > 0 && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Review Your Answers
              {strictMode && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Strict Mode
                </span>
              )}
            </h3>
            {showReview ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          <AnimatePresence>
            {showReview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-3 max-h-96 overflow-y-auto">
                  {questionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.isCorrect 
                          ? 'border-success/30 bg-success/5' 
                          : 'border-destructive/30 bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          result.isCorrect 
                            ? 'bg-success text-white' 
                            : 'bg-destructive text-white'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground mb-2 line-clamp-2">
                            {result.question.question}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded ${difficultyColors[result.difficulty]}`}>
                              {result.difficulty}
                            </span>
                            <span className="text-muted-foreground">
                              Your answer: <strong>{String.fromCharCode(65 + result.selectedAnswer)}</strong>
                            </span>
                            {!result.isCorrect && (
                              <span className="text-success">
                                Correct: <strong>{String.fromCharCode(65 + result.correctAnswer)}</strong>
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {result.timeSpent.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                        {result.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onHome}>
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </motion.div>
  );
}
