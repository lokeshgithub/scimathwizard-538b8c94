import { supabase } from '@/integrations/supabase/client';
import type { SessionAnalysis, Subject } from '@/types/quiz';

export interface StoredReport {
  id: string;
  user_id: string;
  session_id: string | null; // UUID v4 for session identification
  subject: string;
  created_at: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  total_time_seconds: number;
  avg_time_per_question: number;
  stars_earned: number;
  max_streak: number;
  current_streak: number;
  topics_mastered: number;
  topic_breakdown: TopicBreakdownEntry[];
  strengths: string[];
  weaknesses: string[];
}

export interface TopicBreakdownEntry {
  topic: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeSeconds: number;
}

export interface ReportFilters {
  timeRange: 'last_session' | 'last_week' | 'last_3_weeks' | 'last_month' | 'all_time';
  subject: Subject | 'all';
  topic: string | 'all';
}

/**
 * Save a session report to the database
 */
export const saveSessionReport = async (
  sessionId: string, // UUID v4 for session identification
  analysis: SessionAnalysis,
  subject: Subject,
  sessionStats: { stars: number; streak: number; maxStreak: number; mastered: number }
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Don't save empty sessions
    if (analysis.totalQuestions === 0) return false;

    const topicBreakdown: TopicBreakdownEntry[] = analysis.topicAnalyses.map(t => ({
      topic: t.topic,
      questionsAttempted: t.questionsAttempted,
      correctAnswers: t.correctAnswers,
      accuracy: t.accuracy,
      averageTimeSeconds: t.averageTimeSeconds,
    }));

    const { error } = await supabase.from('session_reports').insert({
      user_id: user.id,
      session_id: sessionId, // Add session_id to database insert
      subject,
      total_questions: analysis.totalQuestions,
      correct_answers: analysis.correctAnswers,
      accuracy: analysis.overallAccuracy,
      total_time_seconds: analysis.totalTimeSeconds,
      avg_time_per_question: analysis.averageTimePerQuestion,
      stars_earned: sessionStats.stars,
      max_streak: sessionStats.maxStreak,
      current_streak: sessionStats.streak,
      topics_mastered: sessionStats.mastered,
      topic_breakdown: topicBreakdown as any,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
    });

    if (error) {
      console.error('Failed to save session report:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error saving session report:', e);
    return false;
  }
};

/**
 * Get UTC date N days ago (timezone-safe)
 */
const getUTCDateDaysAgo = (days: number): Date => {
  const now = new Date();
  const utcNow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0 // Start of day in UTC
  );
  return new Date(utcNow - days * 24 * 60 * 60 * 1000);
};

/**
 * Get number of days for a time range
 */
const getDaysForTimeRange = (timeRange: ReportFilters['timeRange']): number => {
  switch (timeRange) {
    case 'last_week': return 7;
    case 'last_3_weeks': return 21;
    case 'last_month': return 30;
    default: return 0;
  }
};

/**
 * Fetch reports with filters (optimized query order)
 */
export const fetchReports = async (
  filters: ReportFilters
): Promise<StoredReport[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('session_reports')
      .select('*')
      .eq('user_id', user.id);

    // 1. Subject filter FIRST (most selective)
    if (filters.subject !== 'all') {
      query = query.eq('subject', filters.subject);
    }

    // 2. Time range filter SECOND (timezone-safe)
    if (filters.timeRange !== 'all_time' && filters.timeRange !== 'last_session') {
      const since = getUTCDateDaysAgo(getDaysForTimeRange(filters.timeRange));
      query = query.gte('created_at', since.toISOString());
    }

    // 3. Order by date (deterministic "last session")
    query = query.order('created_at', { ascending: false });

    // 4. Limit LAST (after all other filters)
    if (filters.timeRange === 'last_session') {
      query = query.limit(1);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch reports:', error);
      return [];
    }

    return (data || []).map(row => ({
      ...row,
      session_id: row.session_id ?? null,
      topic_breakdown: (row.topic_breakdown || []) as unknown as TopicBreakdownEntry[],
      strengths: row.strengths || [],
      weaknesses: row.weaknesses || [],
    }));
  } catch (e) {
    console.error('Error fetching reports:', e);
    return [];
  }
};

/**
 * Validation helper to check if a report object is valid
 */
const isValidReport = (r: any): r is StoredReport => {
  return (
    r &&
    typeof r === 'object' &&
    typeof r.total_questions === 'number' &&
    r.total_questions >= 0 &&
    typeof r.correct_answers === 'number' &&
    r.correct_answers >= 0 &&
    Array.isArray(r.topic_breakdown) &&
    Array.isArray(r.strengths) &&
    Array.isArray(r.weaknesses)
  );
};

/**
 * Get empty aggregation result
 */
const getEmptyAggregation = () => ({
  totalQuestions: 0,
  totalCorrect: 0,
  overallAccuracy: 0,
  totalTimeSeconds: 0,
  avgTimePerQuestion: 0,
  totalStars: 0,
  bestStreak: 0,
  sessionsCount: 0,
  topicSummary: {},
  strengths: [],
  weaknesses: [],
});

/**
 * Aggregate multiple reports into a single analysis summary
 */
export const aggregateReports = (reports: StoredReport[]): {
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalTimeSeconds: number;
  avgTimePerQuestion: number;
  totalStars: number;
  bestStreak: number;
  sessionsCount: number;
  topicSummary: Record<string, { attempted: number; correct: number; accuracy: number; avgTime: number }>;
  strengths: string[];
  weaknesses: string[];
} => {
  // Validate input
  if (!reports || reports.length === 0) {
    return getEmptyAggregation();
  }

  // Filter out invalid reports
  const validReports = reports.filter(isValidReport);
  if (validReports.length === 0) {
    console.warn('[aggregateReports] No valid reports after validation');
    return getEmptyAggregation();
  }

  // Safe aggregation with defensive programming
  const totalQuestions = validReports.reduce((s, r) => s + (Number(r.total_questions) || 0), 0);
  const totalCorrect = validReports.reduce((s, r) => s + (Number(r.correct_answers) || 0), 0);
  const totalTimeSeconds = validReports.reduce((s, r) => s + (Number(r.total_time_seconds) || 0), 0);
  const totalStars = validReports.reduce((s, r) => s + (Number(r.stars_earned) || 0), 0);
  const bestStreak = Math.max(0, ...validReports.map(r => Number(r.max_streak) || 0));

  // Safe topic aggregation with validation
  const topicSummary: Record<string, { attempted: number; correct: number; totalTime: number }> = {};
  for (const report of validReports) {
    const breakdown = Array.isArray(report.topic_breakdown) ? report.topic_breakdown : [];
    for (const tb of breakdown) {
      if (!tb || typeof tb !== 'object' || !tb.topic) continue;

      const attempted = Number(tb.questionsAttempted) || 0;
      const correct = Number(tb.correctAnswers) || 0;
      const time = Number(tb.averageTimeSeconds) || 0;

      if (!topicSummary[tb.topic]) {
        topicSummary[tb.topic] = { attempted: 0, correct: 0, totalTime: 0 };
      }
      topicSummary[tb.topic].attempted += attempted;
      topicSummary[tb.topic].correct += correct;
      topicSummary[tb.topic].totalTime += time * attempted;
    }
  }

  // Calculate final metrics with safe math (clamp values, prevent NaN)
  const topicResult: Record<string, { attempted: number; correct: number; accuracy: number; avgTime: number }> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const [topic, data] of Object.entries(topicSummary)) {
    const accuracy = data.attempted > 0
      ? Math.min(1, Math.max(0, data.correct / data.attempted)) // Clamp [0, 1]
      : 0;
    const avgTime = data.attempted > 0 ? data.totalTime / data.attempted : 0;

    topicResult[topic] = {
      attempted: data.attempted,
      correct: data.correct,
      accuracy: isNaN(accuracy) ? 0 : accuracy,
      avgTime: isNaN(avgTime) ? 0 : avgTime
    };

    if (accuracy >= 0.8 && data.attempted >= 3) strengths.push(topic);
    if (accuracy < 0.6 && data.attempted >= 3) weaknesses.push(topic);
  }

  const overallAccuracy = totalQuestions > 0
    ? Math.min(1, Math.max(0, totalCorrect / totalQuestions))
    : 0;

  return {
    totalQuestions,
    totalCorrect,
    overallAccuracy: isNaN(overallAccuracy) ? 0 : overallAccuracy,
    totalTimeSeconds,
    avgTimePerQuestion: totalQuestions > 0 ? totalTimeSeconds / totalQuestions : 0,
    totalStars,
    bestStreak,
    sessionsCount: validReports.length,
    topicSummary: topicResult,
    strengths,
    weaknesses,
  };
};
