import { useState, useCallback, useEffect } from 'react';
import { DailyChallenge, DailyChallengeStats, getDailyChallengeBonus } from '@/types/dailyChallenge';
import { Question, QuestionBank } from '@/types/quiz';

const DAILY_CHALLENGE_KEY = 'magical-mastery-daily-challenge';

const getTodayString = () => new Date().toISOString().split('T')[0];

const initialStats: DailyChallengeStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompleted: 0,
  totalCorrect: 0,
  lastCompletedDate: null,
  bonusStarsEarned: 0,
};

interface StoredData {
  challenge: DailyChallenge | null;
  stats: DailyChallengeStats;
}

const loadFromStorage = (): StoredData => {
  try {
    const data = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load daily challenge:', e);
  }
  return { challenge: null, stats: initialStats };
};

const saveToStorage = (data: StoredData) => {
  try {
    localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save daily challenge:', e);
  }
};

// Generate a deterministic "random" number based on date
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Progress tracking for adaptive difficulty
interface TopicProgress {
  [level: number]: { mastered: boolean };
}
interface UserProgress {
  [topic: string]: TopicProgress;
}

const generateDailyChallenge = (
  banks: QuestionBank,
  date: string,
  userProgress?: UserProgress
): DailyChallenge | null => {
  const subjects = Object.keys(banks);
  if (subjects.length === 0) return null;

  const seed = seededRandom(date);

  // Pick a subject based on the date
  const subjectIndex = seed % subjects.length;
  const subject = subjects[subjectIndex];

  const topics = Object.keys(banks[subject] || {});
  if (topics.length === 0) return null;

  // Pick a topic based on the date
  const topicIndex = (seed >> 4) % topics.length;
  const topic = topics[topicIndex];

  const questions = banks[subject][topic] || [];
  if (questions.length === 0) return null;

  // ADAPTIVE DIFFICULTY: Pick level based on user's mastery in this topic
  // If no progress, default to level 2 (intermediate challenge)
  // If user mastered levels 1-3, pick level 4
  // This provides appropriate challenge for each user
  let targetLevel = 2; // Default for new users

  if (userProgress && userProgress[topic]) {
    const topicProg = userProgress[topic];
    // Find highest mastered level
    let highestMastered = 0;
    for (let lvl = 1; lvl <= 6; lvl++) {
      if (topicProg[lvl]?.mastered) {
        highestMastered = lvl;
      }
    }
    // Target one level above mastered (challenging but achievable)
    targetLevel = Math.min(highestMastered + 1, 5); // Cap at 5 for reasonable difficulty
    // For users with no mastery, target level 2
    if (highestMastered === 0) targetLevel = 2;
  }

  // Get questions at or near target level
  // First try exact level, then nearby levels
  let questionPool = questions.filter(q => q.level === targetLevel);
  if (questionPool.length === 0) {
    // Try one level below
    questionPool = questions.filter(q => q.level === targetLevel - 1);
  }
  if (questionPool.length === 0) {
    // Try one level above
    questionPool = questions.filter(q => q.level === targetLevel + 1);
  }
  if (questionPool.length === 0) {
    // Fallback to any question with level 2+ (avoid trivial level 1)
    questionPool = questions.filter(q => q.level >= 2);
  }
  if (questionPool.length === 0) {
    // Final fallback: any question
    questionPool = questions;
  }

  const questionIndex = (seed >> 8) % questionPool.length;
  const selectedQuestion = questionPool[questionIndex];

  return {
    id: `daily-${date}`,
    date,
    question: {
      id: selectedQuestion.id,
      subject,
      topic,
      level: selectedQuestion.level,
      question: selectedQuestion.question,
      options: selectedQuestion.options,
      correct: selectedQuestion.correct,
      explanation: selectedQuestion.explanation,
    },
    completed: false,
    correct: null,
    timeSpentSeconds: null,
    completedAt: null,
  };
};

export const useDailyChallenge = (banks: QuestionBank, userProgress?: UserProgress) => {
  const stored = loadFromStorage();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(stored.challenge);
  const [stats, setStats] = useState<DailyChallengeStats>(stored.stats);
  const [isLoading, setIsLoading] = useState(true);
  const [bonusStars, setBonusStars] = useState<number | null>(null);

  // Check and update streak
  useEffect(() => {
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    setStats(prev => {
      // If streak is broken (didn't complete yesterday)
      if (prev.lastCompletedDate && prev.lastCompletedDate !== today && prev.lastCompletedDate !== yesterdayString) {
        return { ...prev, currentStreak: 0 };
      }
      return prev;
    });
  }, []);

  // Generate or load today's challenge - now with adaptive difficulty based on user progress
  useEffect(() => {
    const today = getTodayString();

    if (!challenge || challenge.date !== today) {
      // Generate new challenge for today with user progress for adaptive difficulty
      const newChallenge = generateDailyChallenge(banks, today, userProgress);
      setChallenge(newChallenge);
    }

    setIsLoading(false);
  }, [banks, challenge, userProgress]);

  // Save when state changes
  useEffect(() => {
    saveToStorage({ challenge, stats });
  }, [challenge, stats]);

  const completeChallenge = useCallback((correct: boolean, timeSpentSeconds: number) => {
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    setChallenge(prev => {
      if (!prev || prev.completed) return prev;
      return {
        ...prev,
        completed: true,
        correct,
        timeSpentSeconds,
        completedAt: Date.now(),
      };
    });

    setStats(prev => {
      // Calculate new streak
      let newStreak = prev.currentStreak;
      if (prev.lastCompletedDate === yesterdayString) {
        newStreak = prev.currentStreak + 1;
      } else if (prev.lastCompletedDate !== today) {
        newStreak = 1;
      }

      const bonus = getDailyChallengeBonus(newStreak);
      setBonusStars(bonus);

      return {
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        totalCompleted: prev.totalCompleted + 1,
        totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
        lastCompletedDate: today,
        bonusStarsEarned: prev.bonusStarsEarned + bonus,
      };
    });

    return true;
  }, []);

  const clearBonusStars = useCallback(() => {
    setBonusStars(null);
  }, []);

  const isTodayCompleted = challenge?.date === getTodayString() && challenge?.completed;

  return {
    challenge,
    stats,
    isLoading,
    isTodayCompleted,
    bonusStars,
    completeChallenge,
    clearBonusStars,
  };
};
