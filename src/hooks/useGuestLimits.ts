import { useState, useEffect, useCallback } from 'react';

const GUEST_TOPIC_LIMIT = 2;
const STORAGE_KEY = 'guest-topics-used';

interface GuestLimits {
  topicsUsed: string[];
  canAccessTopic: (topicName: string) => boolean;
  recordTopicAccess: (topicName: string) => void;
  remainingTopics: number;
  isLimitReached: boolean;
  resetSession: () => void;
}

export const useGuestLimits = (isLoggedIn: boolean): GuestLimits => {
  const [topicsUsed, setTopicsUsed] = useState<string[]>([]);

  // Load from localStorage on mount (persists across sessions)
  useEffect(() => {
    if (!isLoggedIn) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTopicsUsed(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load guest limits:', e);
      }
    }
  }, [isLoggedIn]);

  // Save to localStorage when topics change
  useEffect(() => {
    if (!isLoggedIn && topicsUsed.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(topicsUsed));
      } catch (e) {
        console.error('Failed to save guest limits:', e);
      }
    }
  }, [topicsUsed, isLoggedIn]);

  const canAccessTopic = useCallback((topicName: string): boolean => {
    // Logged in users have unlimited access
    if (isLoggedIn) return true;
    
    // Guest can access topics they've already started
    if (topicsUsed.includes(topicName)) return true;
    
    // Guest can access new topics if under limit
    return topicsUsed.length < GUEST_TOPIC_LIMIT;
  }, [isLoggedIn, topicsUsed]);

  const recordTopicAccess = useCallback((topicName: string) => {
    if (isLoggedIn) return;
    
    setTopicsUsed(prev => {
      if (prev.includes(topicName)) return prev;
      return [...prev, topicName];
    });
  }, [isLoggedIn]);

  const resetSession = useCallback(() => {
    setTopicsUsed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear guest limits:', e);
    }
  }, []);

  const remainingTopics = isLoggedIn ? Infinity : Math.max(0, GUEST_TOPIC_LIMIT - topicsUsed.length);
  const isLimitReached = !isLoggedIn && topicsUsed.length >= GUEST_TOPIC_LIMIT;

  return {
    topicsUsed,
    canAccessTopic,
    recordTopicAccess,
    remainingTopics,
    isLimitReached,
    resetSession,
  };
};

export const GUEST_TOPIC_LIMIT_COUNT = GUEST_TOPIC_LIMIT;
