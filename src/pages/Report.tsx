import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Calendar,
  Filter,
  ChevronDown,
  Loader2,
  History,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useAuth } from '@/hooks/useAuth';
import { PathwayNav } from '@/components/quiz/PathwayNav';
import { Button } from '@/components/ui/button';
import {
  fetchReports,
  aggregateReports,
  type StoredReport,
  type ReportFilters,
} from '@/services/reportService';
import type { Subject } from '@/types/quiz';
import { ReportFiltersBar } from '@/components/report/ReportFiltersBar';
import { ReportStats } from '@/components/report/ReportStats';
import { ReportTopicBreakdown } from '@/components/report/ReportTopicBreakdown';
import { ReportStrengthsWeaknesses } from '@/components/report/ReportStrengthsWeaknesses';
import { ReportHistoryList } from '@/components/report/ReportHistoryList';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Report = () => {
  const quiz = useQuizStore();
  const { user, profile } = useAuth();

  // Current session analysis (in-memory, for non-logged-in or live session)
  const liveAnalysis = useMemo(() => quiz.calculateSessionAnalysis(), [quiz]);

  // Report state
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    timeRange: 'last_session',
    subject: 'all',
    topic: 'all',
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const data = await fetchReports(filters);
      setReports(data);
      toast.success('Reports refreshed!');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, filters]);

  // Fetch reports from database when logged in
  useEffect(() => {
    if (!user) return;

    const loadReports = async () => {
      setIsLoading(true);
      const data = await fetchReports(filters);
      setReports(data);
      setIsLoading(false);
    };

    loadReports();
  }, [user, filters]);

  // Aggregate data for the current filter
  const aggregated = useMemo(() => aggregateReports(reports), [reports]);

  // Filter topic breakdown by selected topic
  const filteredTopicSummary = useMemo(() => {
    if (filters.topic === 'all') return aggregated.topicSummary;
    const result: typeof aggregated.topicSummary = {};
    if (aggregated.topicSummary[filters.topic]) {
      result[filters.topic] = aggregated.topicSummary[filters.topic];
    }
    return result;
  }, [aggregated.topicSummary, filters.topic]);

  // Get all unique topics from reports for filter dropdown
  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    for (const r of reports) {
      for (const tb of r.topic_breakdown) {
        topics.add(tb.topic);
      }
    }
    return Array.from(topics).sort();
  }, [reports]);

  // Use live session data if not logged in or if no stored reports
  const hasStoredData = reports.length > 0;
  const hasLiveData = liveAnalysis.totalQuestions > 0;
  const hasData = user ? (hasStoredData || hasLiveData) : hasLiveData;

  // For non-logged-in users, show live analysis
  const showLiveAnalysis = !user || (!hasStoredData && hasLiveData);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="min-h-screen bg-background" data-testid="report-page">
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
        <ErrorBoundary section="Report">
        {user && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              <ReportFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                availableTopics={availableTopics}
                showHistory={showHistory}
                onToggleHistory={() => setShowHistory(!showHistory)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading reports...</span>
          </div>
        ) : hasData ? (
          <div className="space-y-6">
            {/* Show history list if toggled */}
            <AnimatePresence>
              {showHistory && hasStoredData && (
                <ReportHistoryList
                  reports={reports}
                  formatTime={formatTime}
                  formatName={formatName}
                />
              )}
            </AnimatePresence>

            {/* Aggregated stats */}
            {showLiveAnalysis ? (
              /* Live session data for non-logged-in users */
              <>
                <ReportStats
                  totalQuestions={liveAnalysis.totalQuestions}
                  accuracy={liveAnalysis.overallAccuracy}
                  avgTime={liveAnalysis.averageTimePerQuestion}
                  stars={quiz.sessionStats.stars}
                  sessionsCount={1}
                  formatTime={formatTime}
                />

                <ReportStrengthsWeaknesses
                  strengths={liveAnalysis.strengths}
                  weaknesses={liveAnalysis.weaknesses}
                  formatName={formatName}
                />

                <ReportTopicBreakdown
                  topicSummary={Object.fromEntries(
                    liveAnalysis.topicAnalyses.map((t) => [
                      t.topic,
                      {
                        attempted: t.questionsAttempted,
                        correct: t.correctAnswers,
                        accuracy: t.accuracy,
                        avgTime: t.averageTimeSeconds,
                      },
                    ])
                  )}
                  formatTime={formatTime}
                  formatName={formatName}
                />

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
                        {formatTime(liveAnalysis.totalTimeSeconds)}
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
              </>
            ) : (
              /* Aggregated stored data */
              <>
                <ReportStats
                  totalQuestions={aggregated.totalQuestions}
                  accuracy={aggregated.overallAccuracy}
                  avgTime={aggregated.avgTimePerQuestion}
                  stars={aggregated.totalStars}
                  sessionsCount={aggregated.sessionsCount}
                  formatTime={formatTime}
                />

                <ReportStrengthsWeaknesses
                  strengths={aggregated.strengths}
                  weaknesses={aggregated.weaknesses}
                  formatName={formatName}
                />

                <ReportTopicBreakdown
                  topicSummary={filteredTopicSummary}
                  formatTime={formatTime}
                  formatName={formatName}
                />

                {/* Aggregated Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card rounded-xl p-4 shadow-card"
                >
                  <h3 className="font-semibold mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sessions:</span>
                      <span className="ml-2 font-medium">{aggregated.sessionsCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Time:</span>
                      <span className="ml-2 font-medium">
                        {formatTime(aggregated.totalTimeSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Best Streak:</span>
                      <span className="ml-2 font-medium">{aggregated.bestStreak}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Stars:</span>
                      <span className="ml-2 font-medium">{aggregated.totalStars} ⭐</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Practice
                </Button>
              </Link>
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
              {user
                ? 'Complete a practice session to see your performance report. Your progress will be automatically saved and analyzed here.'
                : 'Start practicing to see your performance report. Sign in to save your progress across devices and track long-term improvements.'
              }
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
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default Report;
