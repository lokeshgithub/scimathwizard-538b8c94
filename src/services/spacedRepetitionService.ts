import { supabase } from '@/integrations/supabase/client';
import type { Subject } from '@/types/quiz';

export interface PracticeSchedule {
  id: string;
  user_id: string;
  topic_name: string;
  subject: Subject;
  next_practice_date: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  last_practiced: string | null;
  last_performance: number | null;
  created_at: string;
  updated_at: string;
}

export interface DueTopic {
  topic_name: string;
  subject: Subject;
  due_date: string;
  interval_days: number;
  review_count: number;
  is_overdue: boolean;
  days_overdue: number;
  urgency: 'high' | 'medium' | 'low';
}

// SM-2 Algorithm constants
const MIN_EASE_FACTOR = 1.3;
const INITIAL_INTERVAL = 1; // 1 day
const SECOND_INTERVAL = 6; // 6 days

/**
 * Calculate next review date using SM-2 algorithm
 * @param quality - Rating from 0-5 (0=complete blackout, 5=perfect)
 * @param previousInterval - Previous interval in days
 * @param previousEaseFactor - Previous ease factor
 * @param reviewCount - Number of successful reviews
 */
export function calculateNextReview(
  quality: number,
  previousInterval: number,
  previousEaseFactor: number,
  reviewCount: number
): { intervalDays: number; easeFactor: number; reviewCount: number } {
  // Ensure quality is within bounds
  const q = Math.max(0, Math.min(5, quality));
  
  // Calculate new ease factor
  let newEaseFactor = previousEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);
  
  let newInterval: number;
  let newReviewCount = reviewCount;
  
  if (q < 3) {
    // Failed review - reset to beginning
    newInterval = INITIAL_INTERVAL;
    newReviewCount = 0;
  } else {
    // Successful review
    newReviewCount = reviewCount + 1;
    
    if (newReviewCount === 1) {
      newInterval = INITIAL_INTERVAL;
    } else if (newReviewCount === 2) {
      newInterval = SECOND_INTERVAL;
    } else {
      newInterval = Math.round(previousInterval * newEaseFactor);
    }
  }
  
  return {
    intervalDays: newInterval,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    reviewCount: newReviewCount,
  };
}

/**
 * Convert accuracy percentage to SM-2 quality rating (0-5)
 */
export function accuracyToQuality(accuracy: number): number {
  if (accuracy >= 90) return 5;
  if (accuracy >= 80) return 4;
  if (accuracy >= 70) return 3;
  if (accuracy >= 50) return 2;
  if (accuracy >= 30) return 1;
  return 0;
}

/**
 * Get topics due for practice
 */
export async function getDueTopics(
  subject?: Subject
): Promise<{ data: DueTopic[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    let query = supabase
      .from('practice_schedules')
      .select('*')
      .eq('user_id', user.id)
      .lte('next_practice_date', new Date().toISOString())
      .order('next_practice_date', { ascending: true });
    
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching due topics:', error);
      return { data: null, error: error.message };
    }

    const now = new Date();
    const dueTopics: DueTopic[] = (data || []).map((schedule: any) => {
      const dueDate = new Date(schedule.next_practice_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: 'high' | 'medium' | 'low' = 'low';
      if (daysOverdue >= 7) urgency = 'high';
      else if (daysOverdue >= 3) urgency = 'medium';
      
      return {
        topic_name: schedule.topic_name,
        subject: schedule.subject as Subject,
        due_date: schedule.next_practice_date,
        interval_days: schedule.interval_days,
        review_count: schedule.review_count,
        is_overdue: daysOverdue > 0,
        days_overdue: Math.max(0, daysOverdue),
        urgency,
      };
    });

    return { data: dueTopics, error: null };
  } catch (err) {
    console.error('Error fetching due topics:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all practice schedules for the user
 */
export async function getAllSchedules(
  subject?: Subject
): Promise<{ data: PracticeSchedule[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    let query = supabase
      .from('practice_schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('next_practice_date', { ascending: true });
    
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PracticeSchedule[], error: null };
  } catch (err) {
    console.error('Error fetching schedules:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Update or create a practice schedule after a practice session
 */
export async function updatePracticeSchedule(
  topicName: string,
  subject: Subject,
  accuracy: number
): Promise<{ success: boolean; error?: string; nextDate?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const quality = accuracyToQuality(accuracy);
    
    // Check if schedule exists
    const { data: existing } = await supabase
      .from('practice_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_name', topicName)
      .eq('subject', subject)
      .single();

    const now = new Date();
    
    if (existing) {
      // Update existing schedule
      const { intervalDays, easeFactor, reviewCount } = calculateNextReview(
        quality,
        existing.interval_days,
        Number(existing.ease_factor),
        existing.review_count
      );
      
      const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('practice_schedules')
        .update({
          next_practice_date: nextDate.toISOString(),
          interval_days: intervalDays,
          ease_factor: easeFactor,
          review_count: reviewCount,
          last_practiced: now.toISOString(),
          last_performance: quality,
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating schedule:', error);
        return { success: false, error: error.message };
      }

      return { success: true, nextDate: nextDate.toISOString() };
    } else {
      // Create new schedule
      const { intervalDays, easeFactor, reviewCount } = calculateNextReview(
        quality,
        INITIAL_INTERVAL,
        2.5,
        0
      );
      
      const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('practice_schedules')
        .insert({
          user_id: user.id,
          topic_name: topicName,
          subject: subject,
          next_practice_date: nextDate.toISOString(),
          interval_days: intervalDays,
          ease_factor: easeFactor,
          review_count: reviewCount,
          last_practiced: now.toISOString(),
          last_performance: quality,
        });

      if (error) {
        console.error('Error creating schedule:', error);
        return { success: false, error: error.message };
      }

      return { success: true, nextDate: nextDate.toISOString() };
    }
  } catch (err) {
    console.error('Error updating practice schedule:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Initialize schedules from weak topics (for new users or reset)
 */
export async function initializeFromWeakTopics(
  weakTopics: Array<{ topicName: string; subject: Subject; accuracy: number }>
): Promise<{ success: boolean; error?: string; count: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated', count: 0 };
    }

    let count = 0;
    
    for (const topic of weakTopics) {
      const result = await updatePracticeSchedule(topic.topicName, topic.subject, topic.accuracy);
      if (result.success) count++;
    }

    return { success: true, count };
  } catch (err) {
    console.error('Error initializing schedules:', err);
    return { success: false, error: 'An unexpected error occurred', count: 0 };
  }
}

/**
 * Get count of topics due for practice
 */
export async function getDueTopicsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return 0;

    const { count, error } = await supabase
      .from('practice_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_practice_date', new Date().toISOString());

    if (error) {
      console.error('Error fetching due count:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
