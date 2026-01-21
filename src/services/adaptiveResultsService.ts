import { supabase } from '@/integrations/supabase/client';
import type { AdaptiveState, TopicPerformance } from '@/types/adaptiveChallenge';
import { analyzeTopicPerformance } from '@/types/adaptiveChallenge';

interface SaveResultParams {
  state: AdaptiveState;
  maxLevel: number;
  sessionId?: string;
}

export async function saveAdaptiveChallengeResult({
  state,
  maxLevel,
  sessionId,
}: SaveResultParams): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate stats
    const duration = state.endTime ? Math.round((state.endTime - state.startTime) / 1000) : 0;
    const avgTime = state.questionHistory.length > 0
      ? state.questionHistory.reduce((sum, r) => sum + r.timeSpent, 0) / state.questionHistory.length
      : 0;
    
    // Get topic performance
    const topicPerformances = analyzeTopicPerformance(state.questionHistory);
    
    // Prepare question results (simplified for storage)
    const questionResults = state.questionHistory.map(q => ({
      questionId: q.question.id,
      topicName: q.topicName,
      level: q.levelAtTime,
      isCorrect: q.isCorrect,
      timeSpent: Math.round(q.timeSpent * 100) / 100,
    }));
    
    // Prepare topic performance for storage
    const topicPerformanceData = topicPerformances.map((tp: TopicPerformance) => ({
      topicName: tp.topicName,
      questionsAttempted: tp.questionsAttempted,
      correctAnswers: tp.correctAnswers,
      accuracy: tp.accuracy,
      averageTime: tp.averageTime,
      highestLevel: tp.highestLevel,
      lowestLevel: tp.lowestLevel,
      isStrength: tp.isStrength,
      isWeakness: tp.isWeakness,
    }));

    const { data, error } = await supabase
      .from('adaptive_challenge_results')
      .insert({
        user_id: user?.id || null,
        session_id: sessionId || null,
        subject: state.subject,
        topics: state.selectedTopics.length > 0 ? state.selectedTopics : ['All Topics'],
        total_questions: state.totalQuestions,
        correct_answers: state.totalCorrect,
        skill_score: state.finalScore,
        skill_tier: state.skillTier?.id || 'unknown',
        highest_level_reached: state.highestLevelReached,
        average_time_per_question: Math.round(avgTime * 100) / 100,
        duration_seconds: duration,
        topic_performance: topicPerformanceData,
        question_results: questionResults,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving adaptive challenge result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Unexpected error saving adaptive challenge result:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get user's adaptive challenge history
export async function getUserAdaptiveResults(limit = 10): Promise<{
  data: any[] | null;
  error: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('adaptive_challenge_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching adaptive results:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

// Calculate percentile based on all results (for future use when we have enough data)
export async function calculatePercentile(
  subject: string,
  skillScore: number
): Promise<{ percentile: number | null; totalResults: number }> {
  try {
    // Count total results for this subject
    const { count: totalResults } = await supabase
      .from('adaptive_challenge_results')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject);

    if (!totalResults || totalResults < 50) {
      // Not enough data for meaningful percentile
      return { percentile: null, totalResults: totalResults || 0 };
    }

    // Count results with lower scores
    const { count: lowerScores } = await supabase
      .from('adaptive_challenge_results')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject)
      .lt('skill_score', skillScore);

    const percentile = Math.round(((lowerScores || 0) / totalResults) * 100);
    
    return { percentile, totalResults };
  } catch (err) {
    console.error('Error calculating percentile:', err);
    return { percentile: null, totalResults: 0 };
  }
}

// Leaderboard entry type
export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  avatar_url: string | null;
  skill_score: number;
  skill_tier: string;
  highest_level: number;
  accuracy: number;
  challenges_completed: number;
  best_result_date: string;
}

// Get leaderboard data
export async function getAdaptiveLeaderboard(
  subject?: string,
  limit: number = 50
): Promise<{ data: LeaderboardEntry[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('get_adaptive_leaderboard', {
      p_subject: subject || null,
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LeaderboardEntry[], error: null };
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}
