import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Sparkles,
  ArrowLeft,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Play,
} from 'lucide-react';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useAuth } from '@/hooks/useAuth';
import { PathwayNav } from '@/components/quiz/PathwayNav';
import { Button } from '@/components/ui/button';

const Report = () => {
  const quiz = useQuizStore();
  const { user, profile } = useAuth();

  const analysis = useMemo(() => quiz.calculateSessionAnalysis(), [quiz]);

  const hasData = analysis.totalQuestions > 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="bg-gradient-magical text-white py-4 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
              </motion.div>
              <h1 className="text-lg sm:text-2xl font-bold">Performance Report</h1>
            </div>
            <PathwayNav />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {hasData ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <div className="text-3xl font-bold text-primary">
                  {analysis.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <div className="text-3xl font-bold text-emerald-500">
                  {Math.round(analysis.overallAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <div className="text-3xl font-bold text-blue-500">
                  {formatTime(analysis.averageTimePerQuestion)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {quiz.sessionStats.stars}
                </div>
                <div className="text-sm text-muted-foreground">Stars Earned</div>
              </div>
            </motion.div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.strengths.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Strengths
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.strengths.map((topic) => (
                      <li
                        key={topic}
                        className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200"
                      >
                        <Award className="w-4 h-4" />
                        <span>{formatName(topic)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {analysis.weaknesses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                      Areas to Improve
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((topic) => (
                      <li
                        key={topic}
                        className="flex items-center justify-between text-amber-800 dark:text-amber-200"
                      >
                        <span className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          {formatName(topic)}
                        </span>
                        <Link to="/">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Play className="w-3 h-3 mr-1" />
                            Practice
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Topic Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Topic Breakdown
              </h3>
              <div className="space-y-3">
                {analysis.topicAnalyses.map((topic) => (
                  <div key={topic.topic} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatName(topic.topic)}</span>
                      <span className="text-muted-foreground">
                        {topic.correctAnswers}/{topic.questionsAttempted} (
                        {Math.round(topic.accuracy * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${topic.accuracy * 100}%` }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className={`h-full rounded-full ${
                          topic.accuracy >= 0.8
                            ? 'bg-emerald-500'
                            : topic.accuracy >= 0.6
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Avg {formatTime(topic.averageTimeSeconds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Session Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <h3 className="font-semibold mb-3">Session Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Time:</span>
                  <span className="ml-2 font-medium">
                    {formatTime(analysis.totalTimeSeconds)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Streak:</span>
                  <span className="ml-2 font-medium">{quiz.sessionStats.streak}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Streak:</span>
                  <span className="ml-2 font-medium">{quiz.sessionStats.maxStreak}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Topics Mastered:</span>
                  <span className="ml-2 font-medium">{quiz.sessionStats.mastered}</span>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Practice
                </Button>
              </Link>
              <Button onClick={quiz.endSession}>View Full Analysis</Button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-violet-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Session Data Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start practicing to see your performance report. Answer questions in Practice,
              Adaptive, or Olympiad mode to track your progress.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/">
                <Button className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Practice
                </Button>
              </Link>
              <Link to="/adaptive">
                <Button variant="outline" className="gap-2">
                  <Target className="w-4 h-4" />
                  Try Adaptive
                </Button>
              </Link>
            </div>

            {/* User Stats (if logged in) */}
            {user && profile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-12 p-6 bg-card rounded-xl shadow-card max-w-md mx-auto"
              >
                <h3 className="font-semibold mb-4">Your All-Time Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-amber-500">
                      {profile.total_stars || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Stars</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {profile.questions_answered || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Questions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {profile.topics_mastered || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Topics Mastered</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Report;
