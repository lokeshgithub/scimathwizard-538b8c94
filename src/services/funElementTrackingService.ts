import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'quiz_seen_fun_elements';

// In-memory cache to avoid repeated DB/storage reads
let cachedSeenElements: Set<string> | null = null;
let currentUserId: string | null = null;

/**
 * Initialize the tracking service with user context
 * Call this when auth state changes
 */
export const initFunElementTracking = async (userId: string | null): Promise<void> => {
  currentUserId = userId;
  cachedSeenElements = null; // Reset cache on user change
  
  if (userId) {
    // Prefetch seen elements for logged-in user
    await getSeenElements();
  }
};

/**
 * Get all seen element IDs for current user/guest
 */
export const getSeenElements = async (): Promise<Set<string>> => {
  // Return cache if available
  if (cachedSeenElements !== null) {
    return cachedSeenElements;
  }

  if (currentUserId) {
    // Logged-in user: fetch from database
    try {
      const { data, error } = await supabase
        .from('seen_fun_elements')
        .select('element_id')
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error fetching seen elements:', error);
        cachedSeenElements = new Set();
      } else {
        cachedSeenElements = new Set(data?.map(row => row.element_id) || []);
      }
    } catch (e) {
      console.error('Error fetching seen elements:', e);
      cachedSeenElements = new Set();
    }
  } else {
    // Guest: fetch from localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      cachedSeenElements = stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      cachedSeenElements = new Set();
    }
  }

  return cachedSeenElements;
};

/**
 * Mark an element as seen (persists to DB for logged-in users, localStorage for guests)
 */
export const markElementSeen = async (elementId: string): Promise<void> => {
  // Update cache immediately
  if (!cachedSeenElements) {
    cachedSeenElements = new Set();
  }
  cachedSeenElements.add(elementId);

  if (currentUserId) {
    // Logged-in user: persist to database
    try {
      await supabase
        .from('seen_fun_elements')
        .upsert({ 
          user_id: currentUserId, 
          element_id: elementId 
        }, { 
          onConflict: 'user_id,element_id',
          ignoreDuplicates: true 
        });
    } catch (e) {
      console.error('Error saving seen element:', e);
    }
  } else {
    // Guest: persist to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...cachedSeenElements]));
    } catch {
      // Ignore storage errors
    }
  }
};

/**
 * Reset all seen elements (for when all elements have been shown)
 */
export const resetSeenElements = async (levelElementIds?: string[]): Promise<void> => {
  if (currentUserId) {
    // Logged-in user: clear from database
    try {
      let query = supabase
        .from('seen_fun_elements')
        .delete()
        .eq('user_id', currentUserId);

      if (levelElementIds && levelElementIds.length > 0) {
        // Only reset specific level elements
        query = query.in('element_id', levelElementIds);
      }

      await query;
    } catch (e) {
      console.error('Error resetting seen elements:', e);
    }
  } else {
    // Guest: clear from localStorage
    try {
      if (levelElementIds && levelElementIds.length > 0) {
        // Only reset specific level elements
        const remaining = [...(cachedSeenElements || [])].filter(
          id => !levelElementIds.includes(id)
        );
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Clear cache
  if (levelElementIds && levelElementIds.length > 0) {
    levelElementIds.forEach(id => cachedSeenElements?.delete(id));
  } else {
    cachedSeenElements = new Set();
  }
};

/**
 * Get count of remaining unseen elements for a level
 */
export const getUnseenCount = async (allElementIds: string[]): Promise<number> => {
  const seen = await getSeenElements();
  return allElementIds.filter(id => !seen.has(id)).length;
};
