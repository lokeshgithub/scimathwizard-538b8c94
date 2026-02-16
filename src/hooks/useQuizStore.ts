import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  TopicAnalysis,
  UnlockedLevels
} from '@/types/quiz';
import { fetchAllQuestions, logAnswerToServer, loadQuestionsFromCache, fetchTopicMetadata, fetchQuestionsForTopics, buildEmptyBank, type TopicMetadata } from '@/services/questionService';
import { getMilestoneBonus } from '@/data/funElements';
import { updatePracticeSchedule } from '@/services/spacedRepetitionService';
import { getQuestionStars, getLevelCompletionStars } from '@/data/masteryRewards';

const STORAGE_KEY = 'magical-mastery-quiz';
const SESSION_KEY = 'magical-mastery-active-session'; // Separate key for active session
const ANSWERED_IDS_KEY = 'magical-mastery-answered-ids'; // Track answered questions in session
const SUBJECT_KEY = 'magical-mastery-subject'; // Remember user's last selected subject
const GRADE_KEY = 'magical-mastery-grade'; // Remember user's last selected grade

// Export helper to get saved subject preference (for use across all pathways)
export const getSavedSubject = (): Subject => {
  try {
    const saved = localStorage.getItem(SUBJECT_KEY);
    if (saved && ['math', 'physics', 'chemistry'].includes(saved)) {
      return saved as Subject;
    }
  } catch (e) {
    console.error('Failed to load subject preference:', e);
  }
  return 'math';
};

// Export helper to save subject preference (for use across all pathways)
export const saveSubjectPreference = (subject: Subject): void => {
  try {
    localStorage.setItem(SUBJECT_KEY, subject);
  } catch (e) {
    console.error('Failed to save subject preference:', e);
  }
};

const SCHEMA_VERSION = 4; // v4: Force star reset to match database (Feb 2026)
// Variable thresholds by level: harder levels require lower accuracy
const getThresholdForLevel = (level: number): number => {
  if (level <= 1) return 1.0;   // 100% (10/10) - fundamentals must be perfect
  if (level <= 3) return 0.9;   // 90% (9/10) - school & competitive basics
  if (level <= 5) return 0.8;   // 80% (8/10) - olympiad & elite prep
  return 0.7;                   // 70% (7/10) - national olympiad / grand master
};
const THRESHOLD = 0.9; // Legacy default, use getThresholdForLevel() instead
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
  unlockedLevels: UnlockedLevels; // Track which levels are unlocked per topic
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
  sessionId: uuidv4(),
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

      // Migrate from v2 to v3/v4: Reset stars due to sync bug fix
      // Stars will be re-synced from database when user logs in
      let sessionStats = parsed.sessionStats || initialSessionStats;
      if (storedVersion < 4) {
        sessionStats = {
          ...sessionStats,
          stars: 0, // Reset stars - will sync from database
        };
        console.log('[Migration v4] Reset localStorage stars to 0 - will sync from database');
      }

      // Progress stays the same - existing mastered levels remain mastered
      return {
        banks: parsed.banks || {},
        progress: parsed.progress || {},
        questionTracking,
        sessionStats,
        unlockedLevels: parsed.unlockedLevels || {},
      };
    }
  } catch (e) {
    console.error('Failed to load quiz state:', e);
  }
  return {};
};

const saveToStorage = (state: Partial<QuizState>) => {
  try {
    // Don't save banks to localStorage - they're cached separately in questionService
    // This significantly reduces storage size and prevents quota issues
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      // banks removed to save space - loaded from questionService cache instead
      progress: state.progress,
      questionTracking: state.questionTracking,
      sessionStats: state.sessionStats,
      unlockedLevels: state.unlockedLevels || {},
    }));
  } catch (e: any) {
    // Handle localStorage quota exceeded error
    if (e?.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded for quiz state - attempting cleanup');
      try {
        // Clear old caches to make room
        localStorage.removeItem('magical-mastery-questions-cache');
        // Try saving again with slimmer data
        const slimData = {
          schemaVersion: SCHEMA_VERSION,
          progress: state.progress,
          sessionStats: state.sessionStats,
          // Drop questionTracking if still too big - it can be rebuilt
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slimData));
        console.log('Saved slim quiz state after cleanup');
      } catch (retryError) {
        console.error('Failed to save quiz state even after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save quiz state:', e);
    }
  }
};

// Active session storage - saves sessions PER TOPIC (not just one global session)
// This allows users to switch between topics without losing progress
interface ActiveSession {
  subject: Subject;
  level: number;
  levelStats: { correct: number; total: number };
  timestamp: number;
}

interface AllSessions {
  [topicName: string]: ActiveSession;
}

const loadActiveSession = (topicName: string): ActiveSession | null => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      const allSessions = JSON.parse(data) as AllSessions;
      const session = allSessions[topicName];
      if (session) {
        // Session expires after 24 hours
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load active session:', e);
  }
  return null;
};

const saveActiveSession = (topicName: string, session: ActiveSession) => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    const allSessions: AllSessions = data ? JSON.parse(data) : {};
    allSessions[topicName] = {
      ...session,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(allSessions));
  } catch (e) {
    console.error('Failed to save active session:', e);
  }
};

const clearActiveSession = (topicName?: string) => {
  try {
    if (topicName) {
      // Clear just one topic's session
      const data = localStorage.getItem(SESSION_KEY);
      if (data) {
        const allSessions = JSON.parse(data) as AllSessions;
        delete allSessions[topicName];
        localStorage.setItem(SESSION_KEY, JSON.stringify(allSessions));
      }
    } else {
      // Clear all sessions
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
};

export const useQuizStore = () => {
  const stored = loadFromStorage();
  // Check if we have cached questions - questions are cached separately in questionService
  // (not in quiz storage) to save localStorage space
  const cachedBank = loadQuestionsFromCache();
  const hasInitialData = !!cachedBank && Object.keys(cachedBank).length > 0;

  const [banks, setBanks] = useState<QuestionBank>(cachedBank || {});
  const [topicMeta, setTopicMeta] = useState<TopicMetadata | null>(null);
  const [loadedTopicIds, setLoadedTopicIds] = useState<Set<string>>(new Set());
  // Load user's last selected subject from localStorage (default to 'math' for new users)
  const [subject, setSubjectState] = useState<Subject>(() => {
    try {
      const savedSubject = localStorage.getItem(SUBJECT_KEY);
      if (savedSubject && ['math', 'physics', 'chemistry'].includes(savedSubject)) {
        return savedSubject as Subject;
      }
    } catch (e) {
      console.error('Failed to load subject preference:', e);
    }
    return 'math';
  });
  // Grade selection (7-12)
  const [selectedGrade, setSelectedGradeState] = useState<number>(() => {
    try {
      const savedGrade = localStorage.getItem(GRADE_KEY);
      if (savedGrade) {
        const g = parseInt(savedGrade);
        if (g >= 7 && g <= 12) return g;
      }
    } catch (e) {
      console.error('Failed to load grade preference:', e);
    }
    return 7;
  });
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
  // Track questions answered in current session - don't repeat these
  // Load from sessionStorage to persist across page refreshes
  const [sessionAnsweredIds, setSessionAnsweredIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(ANSWERED_IDS_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load answered IDs:', e);
    }
    return new Set();
  });
  const [levelStats, setLevelStats] = useState({ correct: 0, total: 0 });
  const [prefetchedNextIndex, setPrefetchedNextIndex] = useState<number | null>(null);
  // Start with loading=false if we have cached data, true otherwise
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState<string | null>(null); // Network/loading error
  const [questionHistory, setQuestionHistory] = useState<number[]>([]); // Track question history for back navigation
  const [unlimitedPractice, setUnlimitedPractice] = useState(false); // Allow unlimited practice
  const [isReviewMode, setIsReviewMode] = useState(false); // Review mode: view solved questions without affecting progress
  // Track which levels are unlocked per topic (Level 1 always unlocked, higher levels need mastery OR unlock assessment)
  const [unlockedLevels, setUnlockedLevels] = useState<UnlockedLevels>(
    (stored as any).unlockedLevels || {}
  );

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

  // Get all levels available for a topic (derived from actual data, not hardcoded)
  const getTopicLevels = useCallback((topicName: string): number[] => {
    const questions = banks[subject]?.[topicName] || [];
    if (questions.length === 0) return []; // Empty if no questions - don't assume levels

    const levelsSet = new Set(questions.map(q => Math.min(q.level, MAX_SUPPORTED_LEVEL)));
    return Array.from(levelsSet).sort((a, b) => a - b);
  }, [banks, subject]);

  // Check if a level is unlocked for a topic
  // Level 1 is always unlocked, mastered levels are unlocked, and explicitly unlocked levels
  const isLevelUnlocked = useCallback((topicName: string, lvl: number): boolean => {
    // Level 1 is always unlocked
    if (lvl === 1) return true;

    // Check if previous level is mastered (natural progression)
    const topicProgress = progress[topicName];
    if (topicProgress) {
      // If level below is mastered, this level is unlocked
      if (topicProgress[lvl - 1]?.mastered) return true;
      // If this level itself is mastered, it's unlocked
      if (topicProgress[lvl]?.mastered) return true;
    }

    // Check if explicitly unlocked via assessment
    const explicitlyUnlocked = unlockedLevels[topicName] || [];
    return explicitlyUnlocked.includes(lvl);
  }, [progress, unlockedLevels]);

  // Unlock a level (and all levels below it) for a topic
  const unlockLevel = useCallback((topicName: string, lvl: number) => {
    setUnlockedLevels(prev => {
      const currentUnlocked = prev[topicName] || [];
      // Unlock all levels from 1 to lvl
      const newUnlocked = new Set(currentUnlocked);
      for (let i = 1; i <= lvl; i++) {
        newUnlocked.add(i);
      }
      return {
        ...prev,
        [topicName]: Array.from(newUnlocked).sort((a, b) => a - b),
      };
    });
  }, []);

  // Get questions for level unlock assessment (3 questions from target level)
  // Prioritizes target level; falls back to level below only if needed
  const getUnlockAssessmentQuestions = useCallback((topicName: string, targetLevel: number): Question[] => {
    const allQuestions = banks[subject]?.[topicName] || [];

    // First try to get questions from the target level
    const targetLevelQuestions = allQuestions.filter(q => q.level === targetLevel);

    // If we have enough at target level, use those
    if (targetLevelQuestions.length >= 3) {
      const shuffled = [...targetLevelQuestions].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3);
    }

    // Otherwise, supplement with level below
    const belowLevelQuestions = allQuestions.filter(q => q.level === targetLevel - 1);
    const combined = [...targetLevelQuestions, ...belowLevelQuestions];

    if (combined.length === 0) return [];

    const shuffled = [...combined].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [banks, subject]);

  // Current topic's max level
  const currentMaxLevel = useMemo(() => {
    if (!topic) return DEFAULT_MAX_LEVEL;
    return getTopicMaxLevel(topic);
  }, [topic, getTopicMaxLevel]);

  // Load questions from database on mount
  // Phase 1: Load metadata (subjects/topics) instantly, then lazy-load questions per topic
  const loadQuestions = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      // If we already have a full cached bank, use it (backward compat)
      if (hasInitialData) {
        // Still fetch metadata for lazy-loading future topics
        const meta = await fetchTopicMetadata();
        setTopicMeta(meta);
        setIsLoading(false);
        return;
      }

      // Step 1: Fast metadata load (subjects + topic names, no questions)
      const meta = await fetchTopicMetadata();
      setTopicMeta(meta);

      if (meta.topics.length > 0) {
        // Build skeleton bank with topic names but no questions, filtered by grade
        const skeleton = buildEmptyBank(meta, selectedGrade);
        setBanks(prev => {
          // Merge skeleton with any already-loaded data
          const merged = { ...skeleton };
          for (const subj of Object.keys(prev)) {
            if (!merged[subj]) merged[subj] = {};
            for (const t of Object.keys(prev[subj])) {
              if (prev[subj][t].length > 0) {
                merged[subj][t] = prev[subj][t];
              }
            }
          }
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to load questions from database:', error);
      if (showLoading) {
        setLoadError('Failed to load questions. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasInitialData, selectedGrade]);

  // Lazy-load questions for specific topics on demand
  const ensureTopicLoaded = useCallback(async (topicName: string, subjectKey?: Subject) => {
    const s = subjectKey || subject;
    const existing = banks[s]?.[topicName] || [];
    if (existing.length > 0) return; // Already loaded

    if (!topicMeta) return; // No metadata yet

    // Find the topic ID from metadata (matching grade)
    const topicInfo = topicMeta.topics.find(
      t => t.name === topicName && t.subjectName.toLowerCase() === s && t.grade === selectedGrade
    );
    if (!topicInfo || loadedTopicIds.has(topicInfo.id)) return;

    setLoadedTopicIds(prev => new Set([...prev, topicInfo.id]));

    try {
      const partial = await fetchQuestionsForTopics([topicInfo.id], topicMeta);
      setBanks(prev => {
        const updated = { ...prev };
        for (const subj of Object.keys(partial)) {
          if (!updated[subj]) updated[subj] = {};
          for (const t of Object.keys(partial[subj])) {
            if (partial[subj][t].length > 0) {
              updated[subj][t] = partial[subj][t];
            }
          }
        }
        return updated;
      });
    } catch (error) {
      console.error(`Failed to lazy-load topic ${topicName}:`, error);
    }
  }, [banks, subject, topicMeta, loadedTopicIds]);

  useEffect(() => {
    loadQuestions(!hasInitialData);
  }, [loadQuestions, hasInitialData]);

  // Auto-load questions when topic is selected
  useEffect(() => {
    if (topic) {
      ensureTopicLoaded(topic);
    }
  }, [topic, ensureTopicLoaded]);

  // Save to storage when relevant state changes - DEBOUNCED to prevent UI blocking
  // localStorage writes are synchronous and can freeze the UI if called too frequently
  // NOTE: banks are NOT saved here - they're cached separately in questionService
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage({ progress, questionTracking, sessionStats, unlockedLevels });
    }, 500); // Debounce 500ms - frequent saves are batched

    return () => clearTimeout(timeoutId);
  }, [progress, questionTracking, sessionStats, unlockedLevels]);

  // Save active session when topic/level/levelStats change (for resume on refresh)
  // Sessions are saved PER TOPIC so switching topics doesn't lose progress
  // DEBOUNCED to prevent blocking during rapid answer submissions
  useEffect(() => {
    if (topic && levelStats.total > 0) {
      const timeoutId = setTimeout(() => {
        saveActiveSession(topic, {
          subject,
          level,
          levelStats,
          timestamp: Date.now(),
        });
      }, 300); // Debounce 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [topic, subject, level, levelStats]);

  // Save answered question IDs to sessionStorage (persists across page refresh)
  // DEBOUNCED to prevent blocking - sessionStorage is synchronous
  useEffect(() => {
    if (sessionAnsweredIds.size > 0) {
      const timeoutId = setTimeout(() => {
        try {
          sessionStorage.setItem(ANSWERED_IDS_KEY, JSON.stringify([...sessionAnsweredIds]));
        } catch (e) {
          console.error('Failed to save answered IDs:', e);
        }
      }, 200); // Debounce 200ms

      return () => clearTimeout(timeoutId);
    }
  }, [sessionAnsweredIds]);

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

    // Filter out:
    // 1. Questions answered in current session (no repeats within a session)
    // 2. Questions answered correctly (EVER) - these don't repeat until progress reset
    // Students can review solved questions via Review Mode instead
    return levelQuestions.filter(q => {
      // Don't repeat questions already answered in this session
      if (sessionAnsweredIds.has(q.id)) return false;

      const status = questionTracking[q.id];
      if (!status) return true;
      // Exclude ANY correctly answered question - they can use Review Mode to see these
      return !status.answeredCorrectly;
    });
  }, [banks, subject, questionTracking, sessionAnsweredIds]);

  const selectTopic = useCallback((topicName: string, startUnlimited: boolean = false) => {
    setTopic(topicName);
    setMixedTopics(null); // Clear mixed mode
    setUnlimitedPractice(startUnlimited);
    setIsReviewMode(false); // Ensure not in review mode
    setQuestionHistory([]); // Reset question history
    setSessionAnsweredIds(new Set()); // Clear session tracking - new topic = fresh questions

    // CRITICAL: Get raw progress directly from localStorage to ensure we have latest data
    // This prevents race conditions where React state might be stale
    const rawProgress = loadFromStorage().progress || {};
    const savedTopicProgress = rawProgress[topicName];

    const prog = getTopicProgress(topicName);
    const maxLevel = getTopicMaxLevel(topicName);

    // DEBUG: Log the mastery status for each level to help diagnose level regression bugs
    console.log(`[selectTopic] Loading topic "${topicName}":`);
    console.log(`[selectTopic] Raw localStorage progress:`, savedTopicProgress);
    console.log(`[selectTopic] Computed progress:`, prog);
    for (let i = 1; i <= maxLevel; i++) {
      const savedMastered = savedTopicProgress?.[i]?.mastered;
      const computedMastered = prog[i]?.mastered;
      console.log(`[selectTopic] Level ${i}: savedMastered=${savedMastered}, computedMastered=${computedMastered}`);
    }

    // FIRST: Check if there's an active session for this specific topic - restore their level!
    // Sessions are stored PER TOPIC, so switching topics doesn't lose progress
    const activeSession = loadActiveSession(topicName);
    let currentLevel = 1;
    let restoredLevelStats = { correct: 0, total: 0 };
    let restoredFromSession = false;

    if (activeSession &&
        activeSession.subject === subject &&
        !prog[activeSession.level]?.mastered) {
      // Restore from saved active session - USE THE SESSION'S LEVEL
      currentLevel = activeSession.level;
      restoredLevelStats = activeSession.levelStats;
      restoredFromSession = true;
      console.log(`[selectTopic] Restored from active session for "${topicName}": level ${currentLevel}, stats:`, restoredLevelStats);
    } else {
      // No active session - find the appropriate level
      // Check explicitly unlocked levels first
      const explicitlyUnlocked = unlockedLevels[topicName] || [];
      const highestUnlocked = explicitlyUnlocked.length > 0 ? Math.max(...explicitlyUnlocked) : 0;

      // Find the first non-mastered level
      // IMPORTANT: Use savedTopicProgress if available for most accurate mastery check
      let firstNonMastered = 1;
      for (let i = 1; i <= maxLevel; i++) {
        // Check BOTH saved and computed progress to be safe
        const isMastered = savedTopicProgress?.[i]?.mastered || prog[i]?.mastered;
        if (!isMastered) {
          firstNonMastered = i;
          break;
        }
        if (i === maxLevel && isMastered) {
          firstNonMastered = maxLevel;
        }
      }

      // Use whichever is higher: first non-mastered OR highest explicitly unlocked
      // This handles the case where user unlocked level 4 but didn't master 2 & 3
      currentLevel = Math.max(firstNonMastered, highestUnlocked > 0 ? highestUnlocked : 1);

      // But cap at maxLevel
      currentLevel = Math.min(currentLevel, maxLevel);

      console.log(`[selectTopic] Calculated level: ${currentLevel} (firstNonMastered: ${firstNonMastered}, highestUnlocked: ${highestUnlocked})`);

      // Try to reconstruct progress from questionTracking
      const allForLevel = banks[subject]?.[topicName]?.filter(q => q.level === currentLevel) || [];
      let correctCount = 0;
      let totalCount = 0;

      for (const q of allForLevel) {
        const status = questionTracking[q.id];
        if (status && status.attemptCount > 0) {
          totalCount++;
          // Use answeredCorrectly (not masteredCleanly) for accurate progress display
          if (status.answeredCorrectly) {
            correctCount++;
          }
        }
      }

      // Only restore if there's meaningful progress (but not completed level)
      if (totalCount > 0 && totalCount < PER_LEVEL) {
        restoredLevelStats = { correct: correctCount, total: totalCount };
      }
    }

    setLevel(currentLevel);
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
  }, [getTopicProgress, getTopicMaxLevel, getAvailableQuestions, banks, subject, questionTracking, unlockedLevels]);

  // Start a mixed topics quiz
  const startMixedQuiz = useCallback(async (selectedTopics: string[]) => {
    // Ensure all selected topics have their questions loaded
    if (topicMeta) {
      const loadPromises = selectedTopics.map(t => {
        const topicInfo = topicMeta.topics.find(
          ti => ti.name === t && ti.subjectName.toLowerCase() === subject
        );
        if (topicInfo && !banks[subject]?.[t]?.length) {
          return fetchQuestionsForTopics([topicInfo.id], topicMeta).then(partial => {
            setBanks(prev => {
              const updated = { ...prev };
              for (const subj of Object.keys(partial)) {
                if (!updated[subj]) updated[subj] = {};
                for (const tn of Object.keys(partial[subj])) {
                  if (partial[subj][tn].length > 0) updated[subj][tn] = partial[subj][tn];
                }
              }
              return updated;
            });
          });
        }
        return Promise.resolve();
      });
      await Promise.all(loadPromises);
    }

    setTopic(null);
    setMixedTopics(selectedTopics);
    setLevel(1);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]); // Reset question history
    setUnlimitedPractice(false);
    setIsReviewMode(false); // Ensure not in review mode
    setSessionAnsweredIds(new Set()); // Clear session tracking for fresh quiz
    
    // Gather all questions from selected topics (re-read banks after loading)
    // Note: state update from setBanks above is async; read from latest
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
  }, [banks, subject, topicMeta]);

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

    // In REVIEW MODE, skip all tracking - just return the result
    // Students can practice without affecting their progress
    if (isReviewMode) {
      return { isCorrect, correctIndex, question: currentQ, timeSpent };
    }

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

    // Track this question as answered in current session (no repeats)
    setSessionAnsweredIds(prev => new Set(prev).add(currentQ.id));

    return { isCorrect, correctIndex, question: currentQ, timeSpent };
  }, [currentQuestions, questionIndex, markQuestionAnswered, questionStartTime, topic, isReviewMode]);

  // Record topic for spaced repetition (non-blocking)
  const recordTopicForSpacedRepetition = useCallback((topicName: string, accuracy: number) => {
    // Fire and forget - don't block quiz flow on SR update
    updatePracticeSchedule(topicName, subject, accuracy * 100).catch(err => {
      console.error('Failed to update spaced repetition schedule:', err);
    });
  }, [subject]);

  const checkMastery = useCallback((): 'passed' | 'failed' | 'continue' => {
    // In review mode, never trigger level completion - just continue
    if (isReviewMode) return 'continue';

    if (levelStats.total < PER_LEVEL) return 'continue';

    const accuracy = levelStats.correct / levelStats.total;

    // Always record topic for spaced repetition (both pass and fail)
    if (topic) {
      recordTopicForSpacedRepetition(topic, accuracy);
    }

    const threshold = getThresholdForLevel(level);
    if (accuracy >= threshold) {
      console.log(`[checkMastery] PASSED level ${level} for topic "${topic}" with accuracy ${(accuracy * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%)`);

      // Mark level as mastered
      setProgress(prev => {
        const topicProg = { ...getTopicProgress(topic!) };
        topicProg[level] = {
          correct: levelStats.correct,
          total: levelStats.total,
          mastered: true,
        };

        // SAFEGUARD: If we're mastering level N, ensure all levels below N are also marked as mastered
        // This prevents bugs where higher levels are mastered but lower levels aren't
        // (which would cause level regression when re-selecting the topic)
        for (let i = 1; i < level; i++) {
          if (!topicProg[i]) {
            topicProg[i] = { correct: 0, total: 0, mastered: true };
            console.log(`[checkMastery] Auto-marking level ${i} as mastered (safeguard for level ${level})`);
          } else if (!topicProg[i].mastered) {
            topicProg[i] = { ...topicProg[i], mastered: true };
            console.log(`[checkMastery] Auto-marking level ${i} as mastered (safeguard for level ${level})`);
          }
        }

        const newProgress = { ...prev, [topic!]: topicProg };

        // CRITICAL: Immediately persist to localStorage to prevent data loss on navigation
        // This is a safety net in case useEffect doesn't run before user leaves
        try {
          const currentData = localStorage.getItem(STORAGE_KEY);
          const parsed = currentData ? JSON.parse(currentData) : {};
          parsed.progress = newProgress;
          parsed.schemaVersion = SCHEMA_VERSION;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          console.log(`[checkMastery] Immediately persisted mastery for ${topic} level ${level}:`, topicProg[level]);
        } catch (e) {
          console.error('[checkMastery] Failed to persist progress immediately:', e);
        }

        return newProgress;
      });

      // Award level-based completion stars (higher levels = more stars)
      const completionStars = getLevelCompletionStars(level, accuracy);
      setSessionStats(prev => ({
        ...prev,
        mastered: prev.mastered + 1,
        stars: prev.stars + completionStars,
      }));

      // Clear active session for this topic - level completed
      if (topic) clearActiveSession(topic);

      return 'passed';
    }

    // Clear active session on fail too - will restart level
    if (topic) clearActiveSession(topic);

    return 'failed';
  }, [levelStats, level, topic, getTopicProgress, recordTopicForSpacedRepetition, isReviewMode]);

  const advanceLevel = useCallback(() => {
    if (level < currentMaxLevel) {
      const newLevel = level + 1;
      console.log(`[advanceLevel] Advancing from level ${level} to ${newLevel} for topic "${topic}"`);
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

      console.log(`[advanceLevel] Now at level ${newLevel} with ${shuffled.length} questions`);
    }
  }, [level, currentMaxLevel, topic, getAvailableQuestions, banks, subject]);

  // Continue practicing same level after mastery (user chose not to advance)
  const continuePracticing = useCallback(() => {
    if (!topic) return;
    // Reset level stats but keep on same level with all questions
    setLevelStats({ correct: 0, total: 0 });
    const allForLevel = banks[subject]?.[topic]?.filter(q => q.level === level) || [];
    const shuffled = [...allForLevel].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setQuestionHistory([]);
    setQuestionStartTime(Date.now());
    setUnlimitedPractice(true); // Switch to unlimited so mastery won't re-trigger immediately
  }, [level, topic, banks, subject]);

  // Switch to a different level manually (user picks from level selector)
  const switchLevel = useCallback((topicName: string, newLevel: number) => {
    setTopic(topicName);
    setLevel(newLevel);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]);
    setIsReviewMode(false);
    setUnlimitedPractice(false);
    setSessionAnsweredIds(new Set());

    const available = getAvailableQuestions(topicName, newLevel);
    const allForLevel = banks[subject]?.[topicName]?.filter(q => q.level === newLevel) || [];
    const questionsToUse = available.length > 0 ? available : allForLevel;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setQuestionStartTime(Date.now());
  }, [getAvailableQuestions, banks, subject]);

  const retryLevel = useCallback(() => {
    setLevelStats({ correct: 0, total: 0 });
    
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
  // DATABASE IS THE SOURCE OF TRUTH - always use profile stars
  const syncStarsFromProfile = useCallback((profileStars: number) => {
    setSessionStats(prev => {
      // Always sync to database value - database is source of truth
      // This prevents localStorage from having divergent values
      return {
        ...prev,
        stars: profileStars,
      };
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
    const questionIds = new Set(topicQuestions.map(q => q.id));
    setQuestionTracking(prev => {
      const updated = { ...prev };
      for (const id of questionIds) {
        delete updated[id];
      }
      return updated;
    });

    // Clear session answered IDs for this topic's questions
    setSessionAnsweredIds(prev => {
      const updated = new Set(prev);
      for (const id of questionIds) {
        updated.delete(id);
      }
      return updated;
    });

    // Clear unlocked levels for this topic (reset to default: only level 1 unlocked)
    setUnlockedLevels(prev => {
      const updated = { ...prev };
      delete updated[topicName];
      return updated;
    });

    // Clear active session for this topic
    clearActiveSession(topicName);
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
      sessionId: uuidv4(), // Generate fresh UUID for new session
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
    setIsReviewMode(false); // Not review mode

    // Load ALL questions for this level, not just 10
    const shuffled = [...levelQuestions].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]);
    setQuestionStartTime(Date.now());
  }, [banks, subject]);

  // Start Review Mode - load only SOLVED questions for review
  // Answers in review mode do NOT affect progress or tracking
  // Returns true if review started, false if no questions to review
  const startReviewMode = useCallback((topicName: string, reviewLevel?: number): boolean => {
    const topicQuestions = banks[subject]?.[topicName] || [];

    // Filter to only correctly answered questions
    let solvedQuestions = topicQuestions.filter(q => {
      const status = questionTracking[q.id];
      return status?.answeredCorrectly;
    });

    // If a specific level is requested, filter to that level
    if (reviewLevel !== undefined) {
      solvedQuestions = solvedQuestions.filter(q => q.level === reviewLevel);
    }

    // No solved questions to review
    if (solvedQuestions.length === 0) {
      console.log('[startReviewMode] No solved questions found for', topicName, 'level:', reviewLevel);
      return false;
    }

    setTopic(topicName);
    setLevel(reviewLevel || 1);
    setMixedTopics(null);
    setUnlimitedPractice(false);
    setIsReviewMode(true); // Enable review mode
    setSessionAnsweredIds(new Set()); // Clear session tracking for review

    // Load solved questions in order (not shuffled for review)
    setCurrentQuestions(solvedQuestions);
    setQuestionIndex(0);
    setLevelStats({ correct: 0, total: 0 });
    setQuestionHistory([]);
    setQuestionStartTime(Date.now());
    return true;
  }, [banks, subject, questionTracking]);

  // Get count of solved questions for a topic (or specific level)
  const getSolvedQuestionsCount = useCallback((topicName: string, lvl?: number): number => {
    const topicQuestions = banks[subject]?.[topicName] || [];
    let questions = lvl !== undefined
      ? topicQuestions.filter(q => q.level === lvl)
      : topicQuestions;

    return questions.filter(q => questionTracking[q.id]?.answeredCorrectly).length;
  }, [banks, subject, questionTracking]);

  // Get count of unsolved (new) questions for a topic/level
  const getUnsolvedQuestionsCount = useCallback((topicName: string, lvl?: number): number => {
    const topicQuestions = banks[subject]?.[topicName] || [];
    let questions = lvl !== undefined
      ? topicQuestions.filter(q => q.level === lvl)
      : topicQuestions;

    return questions.filter(q => !questionTracking[q.id]?.answeredCorrectly).length;
  }, [banks, subject, questionTracking]);

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
    setIsReviewMode(false);
    // Don't reset levelStats or progress - keep their work
    // Don't clear active session - they may want to resume later
  }, []);

  // Wrapper to save subject preference to localStorage
  const setSubject = useCallback((newSubject: Subject) => {
    setSubjectState(newSubject);
    try {
      localStorage.setItem(SUBJECT_KEY, newSubject);
    } catch (e) {
      console.error('Failed to save subject preference:', e);
    }
  }, []);

  // Wrapper to save grade preference and rebuild bank
  const setSelectedGrade = useCallback((newGrade: number) => {
    setSelectedGradeState(newGrade);
    try {
      localStorage.setItem(GRADE_KEY, String(newGrade));
    } catch (e) {
      console.error('Failed to save grade preference:', e);
    }
    // Rebuild bank skeleton filtered by new grade
    if (topicMeta) {
      const skeleton = buildEmptyBank(topicMeta, newGrade);
      setBanks(skeleton);
      // Reset loaded topics so they get re-fetched for new grade
      setLoadedTopicIds(new Set());
    }
    // Reset topic state
    setTopic(null);
    setMixedTopics(null);
    setCurrentQuestions([]);
    setQuestionIndex(0);
    setQuestionHistory([]);
    setUnlimitedPractice(false);
    setIsReviewMode(false);
    setLevel(1);
    setLevelStats({ correct: 0, total: 0 });
    setSessionAnsweredIds(new Set());
  }, [topicMeta]);

  // Change subject and reset topic state
  const changeSubject = useCallback((newSubject: Subject) => {
    if (newSubject !== subject) {
      setSubject(newSubject);
      // Reset topic state when switching subjects
      setTopic(null);
      setMixedTopics(null);
      setCurrentQuestions([]);
      setQuestionIndex(0);
      setQuestionHistory([]);
      setUnlimitedPractice(false);
      setIsReviewMode(false);
      setLevel(1);
      setLevelStats({ correct: 0, total: 0 });
      setSessionAnsweredIds(new Set()); // Clear session tracking
    }
  }, [subject, setSubject]);

  return {
    // State
    banks,
    subject,
    selectedGrade,
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
    retryLoadQuestions: () => loadQuestions(true),
    sessionPerformance,
    showSessionSummary,
    questionHistory,
    canGoBack,
    unlimitedPractice,
    isReviewMode,
    totalQuestionsForLevel: currentQuestions.length,
    
    // Dynamic level info
    getTopicMaxLevel,
    getTopicLevels,
    currentMaxLevel,

    // Level locking
    isLevelUnlocked,
    unlockLevel,
    getUnlockAssessmentQuestions,
    
    // Constants
    MAX_LEVEL: currentMaxLevel, // Dynamic based on topic
    PER_LEVEL,
    THRESHOLD: getThresholdForLevel(level), // Dynamic threshold based on current level
    getThresholdForLevel,
    
    // Actions
    setSubject: changeSubject, // Use changeSubject to properly reset state
    setSelectedGrade,
    selectTopic,
    startMixedQuiz,
    answerQuestion,
    checkMastery,
    advanceLevel,
    retryLevel,
    continuePracticing,
    switchLevel,
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
    startReviewMode,
    getSolvedQuestionsCount,
    getUnsolvedQuestionsCount,
    getQuestionsCountForLevel,
    exitToTopics,
    ensureTopicLoaded,
    refreshQuestions: async () => {
      // Refresh in background without showing loading spinner
      try {
        const dbQuestions = await fetchAllQuestions();
        if (Object.keys(dbQuestions).length > 0) {
          setBanks(dbQuestions);
        }
      } catch (error) {
        console.error('Failed to refresh questions:', error);
      }
    },
  };
};
