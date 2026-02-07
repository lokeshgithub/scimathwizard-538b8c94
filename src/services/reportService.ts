import { supabase } from '@/integrations/supabase/client';
import type { SessionAnalysis, Subject } from '@/types/quiz';

export interface StoredReport {
  id: string;
  user_id: string;
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
  questionLimit?: number; // e.g., "last 50 questions"
}

/**
 * Save a session report to the database
 */
export const saveSessionReport = async (
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
 * Fetch reports with filters
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Time range filter
    if (filters.timeRange !== 'all_time' && filters.timeRange !== 'last_session') {
      const now = new Date();
      let since: Date;
      switch (filters.timeRange) {
        case 'last_week':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_3_weeks':
          since = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(0);
      }
      query = query.gte('created_at', since.toISOString());
    }

    // Subject filter
    if (filters.subject !== 'all') {
      query = query.eq('subject', filters.subject);
    }

    // Limit for "last session" view
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
  if (reports.length === 0) {
    return {
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
    };
  }

  const totalQuestions = reports.reduce((s, r) => s + r.total_questions, 0);
  const totalCorrect = reports.reduce((s, r) => s + r.correct_answers, 0);
  const totalTimeSeconds = reports.reduce((s, r) => s + Number(r.total_time_seconds), 0);
  const totalStars = reports.reduce((s, r) => s + r.stars_earned, 0);
  const bestStreak = Math.max(...reports.map(r => r.max_streak));

  // Aggregate topic data
  const topicSummary: Record<string, { attempted: number; correct: number; totalTime: number }> = {};
  for (const report of reports) {
    for (const tb of report.topic_breakdown) {
      if (!topicSummary[tb.topic]) {
        topicSummary[tb.topic] = { attempted: 0, correct: 0, totalTime: 0 };
      }
      topicSummary[tb.topic].attempted += tb.questionsAttempted;
      topicSummary[tb.topic].correct += tb.correctAnswers;
      topicSummary[tb.topic].totalTime += tb.averageTimeSeconds * tb.questionsAttempted;
    }
  }

  const topicResult: Record<string, { attempted: number; correct: number; accuracy: number; avgTime: number }> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const [topic, data] of Object.entries(topicSummary)) {
    const accuracy = data.attempted > 0 ? data.correct / data.attempted : 0;
    const avgTime = data.attempted > 0 ? data.totalTime / data.attempted : 0;
    topicResult[topic] = { attempted: data.attempted, correct: data.correct, accuracy, avgTime };
    if (accuracy >= 0.8 && data.attempted >= 3) strengths.push(topic);
    if (accuracy < 0.6 && data.attempted >= 3) weaknesses.push(topic);
  }

  return {
    totalQuestions,
    totalCorrect,
    overallAccuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
    totalTimeSeconds,
    avgTimePerQuestion: totalQuestions > 0 ? totalTimeSeconds / totalQuestions : 0,
    totalStars,
    bestStreak,
    sessionsCount: reports.length,
    topicSummary: topicResult,
    strengths,
    weaknesses,
  };
};
