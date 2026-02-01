import { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  QuestionBank, 
  Progress, 
  QuestionTracking, 
  SessionStats, 
  Question, 
  Subject,
  QuestionTiming,
  SessionPerformance,
  SessionAnalysis,
  TopicAnalysis
} from '@/types/quiz';
import { fetchAllQuestions, logAnswerToServer } from '@/services/questionService';
import { getMilestoneBonus } from '@/data/funElements';
import { updatePracticeSchedule } from '@/services/spacedRepetitionService';
import { getQuestionStars, getLevelCompletionStars } from '@/data/masteryRewards';

const STORAGE_KEY = 'magical-mastery-quiz';
const SESSION_KEY = 'magical-mastery-active-session'; // Separate key for active session
const SCHEMA_VERSION = 2; // Increment when storage format changes
const THRESHOLD = 0.8; // 80% is pedagogically sound (8/10 needed)
const PER_LEVEL = 10; // 10 questions per level for statistical validity
const DEFAULT_MAX_LEVEL = 5; // Fallback, actual max detected from data
const MIN_LEVEL = 1;
const MAX_SUPPORTED_LEVEL = 7; // Maximum levels we support

// Star rewards use conservative level-based system from masteryRewards.ts
// getQuestionStars(isCorrect, streak, level) = level + small streak bonus
// - Level 1-7: 1-7 stars (linear, NOT multiplicative)
// - Streak bonus: +1 at 5+, +2 at 10+ (small, capped)
// Earning rate: ~100-200 stars per hour of practice

// Milestone definitions
const STREAK_MILESTONES = [5, 7, 10, 15, 20];
const TOTAL_MILESTONES = [10, 25, 50, 75, 100, 150, 200];

interface QuizState {
  banks: QuestionBank;
  subject: Subject;
  topic: string | null;
  mixedTopics: string[] | null; // For mixed mode
  level: number;
  progress: Progress;
  questionTracking: QuestionTracking;
  sessionStats: SessionStats;
  currentQuestions: Question[];
  questionIndex: number;
  levelStats: { correct: number; total: number };
  questionHistory: number[]; // Track visited question indices for back navigation
  unlimitedPractice: boolean; // Allow unlimited practice mode
}

const initialSessionStats: SessionStats = {
  solved: 0,
  correct: 0,
  streak: 0,
  mastered: 0,
  stars: 0,
  totalCorrect: 0,
  maxStreak: 0,
};

const initialSessionPerformance: SessionPerformance = {
  questionTimings: [],
  startTime: Date.now(),
};

const loadFromStorage = (): Partial<QuizState> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const storedVersion = parsed.schemaVersion || 1;

      // Migrate question tracking from v1 to v2 (add masteredCleanly, attemptCount)
      let questionTracking = parsed.questionTracking || {};
      if (storedVersion < 2) {
        const migratedTracking: QuestionTracking = {};
        for (const [qId, status] of Object.entries(questionTracking)) {
          const oldStatus = status as { answeredCorrectly?: boolean; solutionViewed?: boolean };
          migratedTracking[qId] = {
            answeredCorrectly: oldStatus.answeredCorrectly || false,
            solutionViewed: oldStatus.solutionViewed || false,
            // If they answered correctly and didn't view solution, consider it clean
            masteredCleanly: (oldStatus.answeredCorrectly && !oldStatus.solutionViewed) || false,
            attemptCount: oldStatus.answeredCorrectly ? 1 : 0,
          };
        }
        questionTracking = migratedTracking;
      }

      // Progress stays the same - existing mastered levels remain mastered
      return {
        banks: parsed.banks || {},
        progress: parsed.progress || {},
        questionTracking,
        sessionStats: parsed.sessionStats || initialSessionStats,
      };
    }
  } catch (e) {
    console.error('Failed to load quiz state:', e);
  }
  return {};
};

const saveToStorage = (state: Partial<QuizState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      banks: state.banks,
      progress: state.progress,
      questionTracking: state.questionTracking,
      sessionStats: state.sessionStats,
    }));
  } catch (e) {
    console.error('Failed to save quiz state:', e);
  }
};

// Active session storage - saves current topic/level progress separately
interface ActiveSession {
  topic: string | null;
  subject: Subject;
  level: number;
  levelStats: { correct: number; total: number };
  timestamp: number;
}

const loadActiveSession = (): ActiveSession | null => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      const session = JSON.parse(data) as ActiveSession;
      // Session expires after 24 hours
      if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
        return session;
      }
    }
  } catch (e) {
    console.error('Failed to load active session:', e);
  }
  return null;
};

const saveActiveSession = (session: ActiveSession) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...session,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to save active session:', e);
  }
};

const clearActiveSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
};

export const useQuizStore = () => {
  const stored = loadFromStorage();
  
  const [banks, setBanks] = useState<QuestionBank>(stored.banks || {});
  const [subject, setSubject] = useState<Subject>('math');
  const [topic, setTopic] = useState<string | null>(null);
  const [mixedTopics, setMixedTopics] = useState<string[] | null>(null);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState<Progress>(stored.progress || {});
  const [questionTracking, setQuestionTracking] = useState<QuestionTracking>(
    stored.questionTracking || {}
  );
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    stored.sessionStats || initialSessionStats
  );
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [levelStats, setLevelStats] = useState({ correct: 0, total: 0 });
  const [prefetchedNextIndex, setPrefetchedNextIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // Network/loading error
  const [questionHistory, setQuestionHistory] = useState<number[]>([]); // Track question history for back navigation
  const [unlimitedPractice, setUnlimitedPractice] = useState(false); // Allow unlimited practice

  // Timer tracking
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [sessionPerformance, setSessionPerformance] = useState<SessionPerformance>(initialSessionPerformance);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Get max level for a specific topic (dynamic based on data)
  const getTopicMaxLevel = useCallback((topicName: string): number => {
    const questions = banks[subject]?.[topicName] || [];
    if (questions.length === 0) return DEFAULT_MAX_LEVEL;
    
    const levels = questions.map(q => q.level);
    const maxLevel = Math.max(...levels);
    return Math.min(Math.max(maxLevel, MIN_LEVEL), MAX_SUPPORTED_LEVEL);
  }, [banks, subject]);

  // Get all levels available for a topic
  const getTopicLevels = useCallback((topicName: string): number[] => {
    const questions = banks[subject]?.[topicName] || [];
    if (questions.length === 0) return [1, 2, 3, 4, 5];
    
    const levelsSet = new Set(questions.map(q => q.level));
    return Array.from(levelsSet).sort((a, b) => a - b);
  }, [banks, subject]);

  // Current topic's max level
  const currentMaxLevel = useMemo(() => {
    if (!topic) return DEFAULT_MAX_LEVEL;
    return getTopicMaxLevel(topic);
  }, [topic, getTopicMaxLevel]);

  // Load questions from database on mount
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dbQuestions = await fetchAllQuestions();
      if (Object.keys(dbQuestions).length > 0) {
        setBanks(dbQuestions);
      }
    } catch (error) {
      console.error('Failed to load questions from database:', error);
      setLoadError('Failed to load questions. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Save to storage when relevant state changes
  useEffect(() => {
    saveToStorage({ banks, progress, questionTracking, sessionStats });
  }, [banks, progress, questionTracking, sessionStats]);

  // Save active session when topic/level/levelStats change (for resume on refresh)
  useEffect(() => {
    if (topic && levelStats.total > 0) {
      saveActiveSession({
        topic,
        subject,
        level,
        levelStats,
        timestamp: Date.now(),
      });
    }
  }, [topic, subject, level, levelStats]);

  // Reset timer when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [questionIndex, currentQuestions]);

  const parseCSV = useCallback((text: string): Question[] => {
    const questions: Question[] = [];
    
    // Parse CSV handling multi-line quoted fields
    const parseCSVContent = (content: string): string[][] => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          if (char === '\r') i++; // Skip \n after \r
        } else if (char !== '\r') {
          currentField += char;
        }
      }
      
      // Don't forget the last field/row
      if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
      }
      
      return rows;
    };

    const rows = parseCSVContent(text);
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      if (values.length >= 9) {
        questions.push({
          id: values[0],
          level: parseInt(values[1]) || 1,
          question: values[2],
          options: [values[3], values[4], values[5], values[6]],
          correct: values[7].toUpperCase().charCodeAt(0) - 65,
          explanation: values[8],
          concepts: values[9] ? values[9].split(';').map(c => c.trim()) : [],
        });
      }
    }

    return questions;
  }, []);

  const uploadQuestionBank = useCallback((fileName: string, content: string) => {
    const questions = parseCSV(content);
    const name = fileName.replace('.csv', '');
    
    let detectedSubject: Subject = 'math';
    if (/physics|heat|motion|light|electric/i.test(name)) {
      detectedSubject = 'physics';
    } else if (/chemistry|acid|chemical|fibre/i.test(name)) {
      detectedSubject = 'chemistry';
    }

    setBanks(prev => {
      const updated = { ...prev };
      if (!updated[detectedSubject]) {
        updated[detectedSubject] = {};
      }
      updated[detectedSubject][name] = questions;
      return updated;
    });
  }, [parseCSV]);

  const getTopicProgress = useCallback((topicName: string) => {
    const maxLevel = getTopicMaxLevel(topicName);
    
    if (!progress[topicName]) {
      const newProgress: any = {};
      for (let i = 1; i <= maxLevel; i++) {
        newProgress[i] = { correct: 0, total: 0, mastered: false };
      }
      return newProgress;
    }
    
    // Ensure all levels are present
    const existingProgress = { ...progress[topicName] };
    for (let i = 1; i <= maxLevel; i++) {
      if (!existingProgress[i]) {
        existingProgress[i] = { correct: 0, total: 0, mastered: false };
      }
    }
    
    return existingProgress;
  }, [progress, getTopicMaxLevel]);

  const getAvailableQuestions = useCallback((topicName: string, lvl: number): Question[] => {
    const allQuestions = banks[subject]?.[topicName] || [];
    const levelQuestions = allQuestions.filter(q => q.level === lvl);

    // Filter out questions that were mastered cleanly (correct WITHOUT viewing solution)
    // Questions where solution was viewed should reappear for true mastery
    return levelQuestions.filter(q => {
      const status = questionTracking[q.id];
      if (!status) return true;
      // Only exclude if masteredCleanly - viewing solution doesn't count as mastery
      return !status.masteredCleanly;
    });
  }, [banks, subject, questionTracking]);

  const selectTopic = useCallback((topicName: string, startUnlimited: boolean = false) => {
    setTopic(topicName);
    setMixedTopics(null); // Clear mixed mode
    setUnlimitedPractice(startUnlimited);
    setQuestionHistory([]); // Reset question history
    const prog = getTopicProgress(topicName);
    const maxLevel = getTopicMaxLevel(topicName);

    // Find the current level (first non-mastered level)
    let currentLevel = 1;
    for (let i = 1; i <= maxLevel; i++) {
      if (!prog[i]?.mastered) {
        currentLevel = i;
        break;
      }
      if (i === maxLevel && prog[i]?.mastered) {
        currentLevel = maxLevel;
      }
    }

    setLevel(currentLevel);

    // Try to restore in-progress level stats from active session
    const activeSession = loadActiveSession();
    let restoredLevelStats = { correct: 0, total: 0 };

    if (activeSession &&
        activeSession.topic === topicName &&
        activeSession.subject === subject &&
        activeSession.level === currentLevel &&
        !prog[currentLevel]?.mastered) {
      // Restore from saved active session
      restoredLevelStats = activeSession.levelStats;
    } else {
      // Reconstruct from questionTracking as fallback
      // Count questions already answered correctly for this topic/level
      const allForLevel = banks[subject]?.[topicName]?.filter(q => q.level === currentLevel) || [];
      let correctCount = 0;
      let totalCount = 0;

      for (const q of allForLevel) {
        const status = questionTracking[q.id];
        if (status && status.attemptCount > 0) {
          totalCount++;
          if (status.masteredCleanly) {
            correctCount++;
          }
        }
      }

      // Only restore if there's meaningful progress (but not completed level)
      if (totalCount > 0 && totalCount < PER_LEVEL) {
        restoredLevelStats = { correct: correctCount, total: totalCount };
      }
    }

    setLevelStats(restoredLevelStats);

    // Get available questions for this level
    const available = getAvailableQuestions(topicName, currentLevel);
    const allForLevel = banks[subject]?.[topicName]?.filter(q => q.level === currentLevel) || [];

    // If unlimited practice mode or no new questions available, use all questions
    const questionsToUse = (startUnlimited || available.length === 0) ? allForLevel : available;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);

    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setQuestionStartTime(Date.now());
  }, [getTopicProgress, getTopicMaxLevel, getAvailableQuestions, banks, subject, questionTracking]);

  // Start a mixed topics quiz
  const startMixedQuiz = useCallback((selectedTopics: string[]) => {
    setTopic(null);
    setMixedTopics(selectedTopics);
    setLevel(1);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]); // Reset question history
    setUnlimitedPractice(false);
    
    // Gather all questions from selected topics
    const allQuestions: Question[] = [];
    for (const topicName of selectedTopics) {
      const topicQuestions = banks[subject]?.[topicName] || [];
      allQuestions.push(...topicQuestions);
    }
    
    // Shuffle all questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setQuestionStartTime(Date.now());
  }, [banks, subject]);

  const markQuestionAnswered = useCallback((questionId: string, correct: boolean) => {
    setQuestionTracking(prev => {
      const existing = prev[questionId];
      const previouslyViewed = existing?.solutionViewed || false;
      const previousAttempts = existing?.attemptCount || 0;

      // Clean mastery = correct answer WITHOUT having viewed the solution
      const masteredCleanly = correct && !previouslyViewed;

      return {
        ...prev,
        [questionId]: {
          answeredCorrectly: correct || existing?.answeredCorrectly || false,
          solutionViewed: previouslyViewed,
          masteredCleanly: masteredCleanly || existing?.masteredCleanly || false,
          attemptCount: previousAttempts + 1,
        },
      };
    });
  }, []);

  const markSolutionViewed = useCallback((questionId: string) => {
    setQuestionTracking(prev => {
      const existing = prev[questionId];
      return {
        ...prev,
        [questionId]: {
          answeredCorrectly: existing?.answeredCorrectly || false,
          solutionViewed: true,
          masteredCleanly: existing?.masteredCleanly || false,
          attemptCount: existing?.attemptCount || 0,
        },
      };
    });
  }, []);

  const answerQuestion = useCallback(async (selectedIndex: number): Promise<{ isCorrect: boolean; correctIndex: number; question: Question | null; timeSpent: number }> => {
    const currentQ = currentQuestions[questionIndex];
    if (!currentQ) return { isCorrect: false, correctIndex: -1, question: null, timeSpent: 0 };

    // Calculate time spent on this question
    const timeSpent = (Date.now() - questionStartTime) / 1000;

    // INSTANT LOCAL VALIDATION - no network call needed!
    // The correct answer is already loaded in memory from fetchAllQuestions
    const isCorrect = selectedIndex === currentQ.correct;
    const correctIndex = currentQ.correct;

    // Log to server in background (non-blocking, fire-and-forget)
    const originalSelectedIndex = currentQ.shuffleMap ? currentQ.shuffleMap[selectedIndex] : selectedIndex;
    logAnswerToServer(currentQ.id, originalSelectedIndex, isCorrect);

    // Record timing for this question
    const timing: QuestionTiming = {
      questionId: currentQ.id,
      topic: topic || 'mixed',
      level: currentQ.level,
      timeSpentSeconds: timeSpent,
      wasCorrect: isCorrect,
      concepts: currentQ.concepts,
    };

    setSessionPerformance(prev => ({
      ...prev,
      questionTimings: [...prev.questionTimings, timing],
    }));
    
    // Update level stats
    setLevelStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Update session stats with level-based star rewards
    setSessionStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newTotalCorrect = prev.totalCorrect + (isCorrect ? 1 : 0);
      // Use new level-aware star calculation (streak capped at 3x)
      const starsEarned = getQuestionStars(isCorrect, newStreak, currentQ.level);
      const milestoneBonus = isCorrect ? getMilestoneBonus(newStreak, newTotalCorrect) : 0;

      return {
        solved: prev.solved + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        streak: newStreak,
        mastered: prev.mastered,
        stars: prev.stars + starsEarned + milestoneBonus,
        totalCorrect: newTotalCorrect,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      };
    });

    // Mark question as answered
    markQuestionAnswered(currentQ.id, isCorrect);

    return { isCorrect, correctIndex, question: currentQ, timeSpent };
  }, [currentQuestions, questionIndex, markQuestionAnswered, questionStartTime, topic]);

  // Record topic for spaced repetition (non-blocking)
  const recordTopicForSpacedRepetition = useCallback((topicName: string, accuracy: number) => {
    // Fire and forget - don't block quiz flow on SR update
    updatePracticeSchedule(topicName, subject, accuracy * 100).catch(err => {
      console.error('Failed to update spaced repetition schedule:', err);
    });
  }, [subject]);

  const checkMastery = useCallback((): 'passed' | 'failed' | 'continue' => {
    if (levelStats.total < PER_LEVEL) return 'continue';

    const accuracy = levelStats.correct / levelStats.total;

    // Always record topic for spaced repetition (both pass and fail)
    if (topic) {
      recordTopicForSpacedRepetition(topic, accuracy);
    }

    if (accuracy >= THRESHOLD) {
      // Mark level as mastered
      setProgress(prev => {
        const topicProg = { ...getTopicProgress(topic!) };
        topicProg[level] = {
          correct: levelStats.correct,
          total: levelStats.total,
          mastered: true,
        };
        return { ...prev, [topic!]: topicProg };
      });

      // Award level-based completion stars (higher levels = more stars)
      const completionStars = getLevelCompletionStars(level, accuracy);
      setSessionStats(prev => ({
        ...prev,
        mastered: prev.mastered + 1,
        stars: prev.stars + completionStars,
      }));

      // Clear active session - level completed
      clearActiveSession();

      return 'passed';
    }

    // Clear active session on fail too - will restart level
    clearActiveSession();

    return 'failed';
  }, [levelStats, level, topic, getTopicProgress, recordTopicForSpacedRepetition]);

  const advanceLevel = useCallback(() => {
    if (level < currentMaxLevel) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setLevelStats({ correct: 0, total: 0 });
      
      // Get questions for new level
      const available = getAvailableQuestions(topic!, newLevel);
      const allForLevel = banks[subject]?.[topic!]?.filter(q => q.level === newLevel) || [];
      const questionsToUse = available.length > 0 ? available : allForLevel;
      const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
      
      setCurrentQuestions(shuffled);
      setQuestionIndex(0);
      setQuestionStartTime(Date.now());
    }
  }, [level, currentMaxLevel, topic, getAvailableQuestions, banks, subject]);

  const retryLevel = useCallback(() => {
    setLevelStats({ correct: 0, total: 0 });
    
    // Get questions for current level
    const available = getAvailableQuestions(topic!, level);
    const allForLevel = banks[subject]?.[topic!]?.filter(q => q.level === level) || [];
    const questionsToUse = available.length > 0 ? available : allForLevel;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setQuestionStartTime(Date.now());
  }, [level, topic, getAvailableQuestions, banks, subject]);

  // Prefetch next question index (call this when showing explanation)
  const prefetchNextQuestion = useCallback(() => {
    if (questionIndex + 1 >= currentQuestions.length) {
      // Will need to reshuffle - prepare the first index of reshuffled array
      setPrefetchedNextIndex(0);
    } else {
      setPrefetchedNextIndex(questionIndex + 1);
    }
  }, [questionIndex, currentQuestions.length]);

  const nextQuestion = useCallback(() => {
    // Add current question to history before moving
    setQuestionHistory(prev => [...prev, questionIndex]);
    
    if (questionIndex + 1 >= currentQuestions.length) {
      // Reshuffle and start over
      const shuffled = [...currentQuestions].sort(() => Math.random() - 0.5);
      setCurrentQuestions(shuffled);
      setQuestionIndex(0);
    } else {
      setQuestionIndex(prev => prev + 1);
    }
    setPrefetchedNextIndex(null);
    setQuestionStartTime(Date.now());
  }, [questionIndex, currentQuestions]);

  // Navigate to previous question (for review)
  const previousQuestion = useCallback(() => {
    if (questionHistory.length > 0) {
      const prevIndex = questionHistory[questionHistory.length - 1];
      setQuestionHistory(prev => prev.slice(0, -1));
      setQuestionIndex(prevIndex);
      setQuestionStartTime(Date.now());
    }
  }, [questionHistory]);

  // Deduct stars for using hints
  const deductStars = useCallback((cost: number) => {
    setSessionStats(prev => ({
      ...prev,
      stars: Math.max(0, prev.stars - cost),
    }));
  }, []);

  // Sync stars from database profile (call when user logs in)
  // This ensures stars are consistent across devices
  const syncStarsFromProfile = useCallback((profileStars: number) => {
    setSessionStats(prev => {
      // Only update if profile has more stars (user earned on another device)
      // or if local stars is 0 (fresh device)
      if (profileStars > prev.stars || prev.stars === 0) {
        return {
          ...prev,
          stars: profileStars,
        };
      }
      return prev;
    });
  }, []);

  // Check if we can go back
  const canGoBack = questionHistory.length > 0;

  const getCurrentQuestion = useCallback(() => {
    return currentQuestions[questionIndex] || null;
  }, [currentQuestions, questionIndex]);

  // Calculate session analysis for summary
  const calculateSessionAnalysis = useCallback((): SessionAnalysis => {
    const timings = sessionPerformance.questionTimings;
    
    if (timings.length === 0) {
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        overallAccuracy: 0,
        totalTimeSeconds: 0,
        averageTimePerQuestion: 0,
        topicAnalyses: [],
        strengths: [],
        weaknesses: [],
        slowTopics: [],
        fastTopics: [],
      };
    }

    const totalQuestions = timings.length;
    const correctAnswers = timings.filter(t => t.wasCorrect).length;
    const overallAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const totalTimeSeconds = timings.reduce((sum, t) => sum + t.timeSpentSeconds, 0);
    const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSeconds / totalQuestions : 0;

    // Group by topic
    const topicGroups: Record<string, QuestionTiming[]> = {};
    for (const timing of timings) {
      if (!topicGroups[timing.topic]) {
        topicGroups[timing.topic] = [];
      }
      topicGroups[timing.topic].push(timing);
    }

    const topicAnalyses: TopicAnalysis[] = Object.entries(topicGroups).map(([topicName, topicTimings]) => {
      const questionsAttempted = topicTimings.length;
      const correctCount = topicTimings.filter(t => t.wasCorrect).length;
      const accuracy = questionsAttempted > 0 ? correctCount / questionsAttempted : 0;
      const avgTime = questionsAttempted > 0 
        ? topicTimings.reduce((sum, t) => sum + t.timeSpentSeconds, 0) / questionsAttempted 
        : 0;

      return {
        topic: topicName,
        questionsAttempted,
        correctAnswers: correctCount,
        accuracy,
        averageTimeSeconds: avgTime,
        isStrength: accuracy >= 0.8 && questionsAttempted >= 3,
        isWeakness: accuracy < 0.6 && questionsAttempted >= 3,
      };
    });

    const strengths = topicAnalyses.filter(t => t.isStrength).map(t => t.topic);
    const weaknesses = topicAnalyses.filter(t => t.isWeakness).map(t => t.topic);

    // Find slow and fast topics (compared to average)
    const avgTimeOverall = averageTimePerQuestion;
    const slowTopics = topicAnalyses
      .filter(t => t.averageTimeSeconds > avgTimeOverall * 1.3 && t.questionsAttempted >= 2)
      .map(t => t.topic);
    const fastTopics = topicAnalyses
      .filter(t => t.averageTimeSeconds < avgTimeOverall * 0.7 && t.questionsAttempted >= 2)
      .map(t => t.topic);

    return {
      totalQuestions,
      correctAnswers,
      overallAccuracy,
      totalTimeSeconds,
      averageTimePerQuestion,
      topicAnalyses,
      strengths,
      weaknesses,
      slowTopics,
      fastTopics,
    };
  }, [sessionPerformance]);

  // Reset progress for a specific topic
  const resetTopicProgress = useCallback((topicName: string) => {
    setProgress(prev => {
      const updated = { ...prev };
      delete updated[topicName];
      return updated;
    });

    // Also clear question tracking for this topic's questions
    const topicQuestions = banks[subject]?.[topicName] || [];
    const questionIds = topicQuestions.map(q => q.id);
    setQuestionTracking(prev => {
      const updated = { ...prev };
      for (const id of questionIds) {
        delete updated[id];
      }
      return updated;
    });

    // Clear active session if it was for this topic
    clearActiveSession();
  }, [banks, subject]);

  // Reset all progress (full reset)
  const resetAllProgress = useCallback(() => {
    setProgress({});
    setQuestionTracking({});
    setSessionStats(initialSessionStats);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    clearActiveSession();
  }, []);

  // End session and show summary
  const endSession = useCallback(() => {
    setSessionPerformance(prev => ({
      ...prev,
      endTime: Date.now(),
    }));
    setShowSessionSummary(true);
  }, []);

  // Reset session for new practice
  const resetSession = useCallback(() => {
    setSessionPerformance({
      questionTimings: [],
      startTime: Date.now(),
    });
    setShowSessionSummary(false);
  }, []);

  // Start unlimited practice for a specific topic and level
  // This loads ALL questions for that level (not just 10)
  const startUnlimitedPractice = useCallback((topicName: string, practiceLevel: number) => {
    const topicQuestions = banks[subject]?.[topicName] || [];
    const levelQuestions = topicQuestions.filter(q => q.level === practiceLevel);

    if (levelQuestions.length === 0) return;

    setTopic(topicName);
    setLevel(practiceLevel);
    setMixedTopics(null);
    setUnlimitedPractice(true); // Enable unlimited mode

    // Load ALL questions for this level, not just 10
    const shuffled = [...levelQuestions].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]);
    setQuestionStartTime(Date.now());
  }, [banks, subject]);

  // Get all questions count for a topic/level (for UI display)
  const getQuestionsCountForLevel = useCallback((topicName: string, levelNum: number): number => {
    const topicQuestions = banks[subject]?.[topicName] || [];
    return topicQuestions.filter(q => q.level === levelNum).length;
  }, [banks, subject]);

  // Exit current quiz and go back to topic selection
  const exitToTopics = useCallback(() => {
    setTopic(null);
    setMixedTopics(null);
    setCurrentQuestions([]);
    setQuestionIndex(0);
    setQuestionHistory([]);
    setUnlimitedPractice(false);
    // Don't reset levelStats or progress - keep their work
    // Don't clear active session - they may want to resume later
  }, []);

  return {
    // State
    banks,
    subject,
    topic,
    mixedTopics,
    level,
    progress,
    sessionStats,
    levelStats,
    currentQuestion: getCurrentQuestion(),
    peekNextQuestion: prefetchedNextIndex !== null 
      ? currentQuestions[prefetchedNextIndex] 
      : currentQuestions[questionIndex + 1] || null,
    isLoading,
    loadError,
    retryLoadQuestions: loadQuestions,
    sessionPerformance,
    showSessionSummary,
    questionHistory,
    canGoBack,
    unlimitedPractice,
    totalQuestionsForLevel: currentQuestions.length,
    
    // Dynamic level info
    getTopicMaxLevel,
    getTopicLevels,
    currentMaxLevel,
    
    // Constants
    MAX_LEVEL: currentMaxLevel, // Dynamic based on topic
    PER_LEVEL,
    THRESHOLD,
    
    // Actions
    setSubject,
    selectTopic,
    startMixedQuiz,
    answerQuestion,
    checkMastery,
    advanceLevel,
    retryLevel,
    nextQuestion,
    previousQuestion,
    prefetchNextQuestion,
    markSolutionViewed,
    getTopicProgress,
    calculateSessionAnalysis,
    endSession,
    setShowSessionSummary,
    resetSession,
    resetTopicProgress,
    resetAllProgress,
    deductStars,
    syncStarsFromProfile,
    startUnlimitedPractice,
    getQuestionsCountForLevel,
    exitToTopics,
    refreshQuestions: async () => {
      setIsLoading(true);
      try {
        const dbQuestions = await fetchAllQuestions();
        if (Object.keys(dbQuestions).length > 0) {
          setBanks(dbQuestions);
        }
      } catch (error) {
        console.error('Failed to refresh questions:', error);
      } finally {
        setIsLoading(false);
      }
    },
  };
};
