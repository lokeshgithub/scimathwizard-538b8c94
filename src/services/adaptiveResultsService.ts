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

// User rank info type
export interface UserRankInfo {
  rank: number;
  totalParticipants: number;
  skill_score: number;
  skill_tier: string;
  highest_level: number;
  accuracy: number;
  challenges_completed: number;
}

// Get current user's rank on the leaderboard
export async function getUserRank(
  subject?: string
): Promise<{ data: UserRankInfo | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get user's best result
    let query = supabase
      .from('adaptive_challenge_results')
      .select('skill_score, skill_tier, highest_level_reached, correct_answers, total_questions')
      .eq('user_id', user.id)
      .order('skill_score', { ascending: false })
      .limit(1);
    
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data: userBest, error: userError } = await query.single();

    if (userError || !userBest) {
      return { data: null, error: null }; // User hasn't participated
    }

    // Count total unique users with results
    const { count: totalParticipants, error: countError } = await supabase
      .from('adaptive_challenge_results')
      .select('user_id', { count: 'exact', head: true })
      .not('user_id', 'is', null);

    if (countError) {
      return { data: null, error: countError.message };
    }

    // Count users with better scores (using the best score per user approach via RPC)
    // Since we can't use RPC directly, we'll get the leaderboard and find user's position
    const { data: leaderboard, error: lbError } = await supabase.rpc('get_adaptive_leaderboard', {
      p_subject: subject || null,
      p_limit: 1000, // Get more to find user's position
    });

    if (lbError) {
      return { data: null, error: lbError.message };
    }

    // Get user's profile to match by display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    // Find user in leaderboard
    const userEntry = leaderboard?.find(
      (entry: LeaderboardEntry) => profile && entry.display_name === profile.display_name
    );

    if (!userEntry) {
      // User not in top 1000, estimate rank
      const { count: betterScores } = await supabase
        .from('adaptive_challenge_results')
        .select('*', { count: 'exact', head: true })
        .gt('skill_score', userBest.skill_score)
        .not('user_id', 'is', null);

      return {
        data: {
          rank: (betterScores || 0) + 1,
          totalParticipants: totalParticipants || 0,
          skill_score: userBest.skill_score,
          skill_tier: userBest.skill_tier,
          highest_level: userBest.highest_level_reached,
          accuracy: userBest.total_questions > 0 
            ? Math.round((userBest.correct_answers / userBest.total_questions) * 100)
            : 0,
          challenges_completed: 1, // Approximate
        },
        error: null,
      };
    }

    return {
      data: {
        rank: userEntry.rank,
        totalParticipants: totalParticipants || leaderboard?.length || 0,
        skill_score: userEntry.skill_score,
        skill_tier: userEntry.skill_tier,
        highest_level: userEntry.highest_level,
        accuracy: userEntry.accuracy,
        challenges_completed: userEntry.challenges_completed,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching user rank:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}
