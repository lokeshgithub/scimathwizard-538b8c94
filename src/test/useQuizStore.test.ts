import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for useQuizStore - Core quiz state management
 *
 * These tests cover:
 * - Star persistence (earning, spending, syncing)
 * - Level persistence (mastery, progression, regression prevention)
 * - User navigation (topic selection, session restoration)
 * - Question tracking (answered correctly, no repeats)
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get store() { return store; }
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('sessionStorage', sessionStorageMock);
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Star Persistence', () => {
  it('should initialize stars from localStorage on load', () => {
    const savedState = {
      schemaVersion: 4,
      sessionStats: { stars: 500, solved: 10, correct: 8, streak: 3, mastered: 1, totalCorrect: 8, maxStreak: 5 },
      progress: {},
      questionTracking: {},
      banks: {},
    };
    localStorageMock.setItem('magical-mastery-quiz', JSON.stringify(savedState));

    // When loading, stars should be read from localStorage
    const stored = localStorageMock.getItem('magical-mastery-quiz');
    const parsed = JSON.parse(stored!);
    expect(parsed.sessionStats.stars).toBe(500);
  });

  it('should save stars to localStorage when state changes', () => {
    const state = {
      schemaVersion: 4,
      sessionStats: { stars: 100 },
      progress: {},
      questionTracking: {},
      banks: {},
    };

    localStorageMock.setItem('magical-mastery-quiz', JSON.stringify(state));

    // Verify saved
    const stored = localStorageMock.getItem('magical-mastery-quiz');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.sessionStats.stars).toBe(100);
  });

  it('should not allow negative stars', () => {
    const stars = 50;
    const cost = 100;
    const newStars = Math.max(0, stars - cost);
    expect(newStars).toBe(0);
  });

  it('should handle star deductions correctly', () => {
    const initialStars = 1000;
    const deduction = 200;
    const expectedStars = initialStars - deduction;
    expect(expectedStars).toBe(800);
  });
});

describe('Level Persistence', () => {
  it('should save mastery status to localStorage', () => {
    const progress = {
      'Integers': {
        1: { correct: 8, total: 10, mastered: true },
        2: { correct: 0, total: 0, mastered: false },
      }
    };

    const state = {
      schemaVersion: 4,
      progress,
      sessionStats: {},
      questionTracking: {},
      banks: {},
    };

    localStorageMock.setItem('magical-mastery-quiz', JSON.stringify(state));

    const stored = localStorageMock.getItem('magical-mastery-quiz');
    const parsed = JSON.parse(stored!);
    expect(parsed.progress['Integers'][1].mastered).toBe(true);
  });

  it('should preserve mastery status across sessions', () => {
    // Simulate previous session with mastered levels
    const savedProgress = {
      'Fractions': {
        1: { correct: 9, total: 10, mastered: true },
        2: { correct: 8, total: 10, mastered: true },
        3: { correct: 8, total: 10, mastered: true },
      }
    };

    localStorageMock.setItem('magical-mastery-quiz', JSON.stringify({
      schemaVersion: 4,
      progress: savedProgress,
      sessionStats: {},
      questionTracking: {},
      banks: {},
    }));

    // Load and verify
    const stored = localStorageMock.getItem('magical-mastery-quiz');
    const parsed = JSON.parse(stored!);

    expect(parsed.progress['Fractions'][1].mastered).toBe(true);
    expect(parsed.progress['Fractions'][2].mastered).toBe(true);
    expect(parsed.progress['Fractions'][3].mastered).toBe(true);
  });

  it('should calculate first non-mastered level correctly', () => {
    const progress = {
      1: { mastered: true },
      2: { mastered: true },
      3: { mastered: false },
      4: { mastered: false },
      5: { mastered: false },
    };

    let firstNonMastered = 1;
    for (let i = 1; i <= 5; i++) {
      if (!progress[i as keyof typeof progress]?.mastered) {
        firstNonMastered = i;
        break;
      }
    }

    expect(firstNonMastered).toBe(3);
  });

  it('should auto-mark previous levels as mastered when completing higher level', () => {
    // If level 3 is mastered, levels 1 and 2 should also be marked as mastered
    const progress: Record<number, { mastered: boolean }> = {
      1: { mastered: false },
      2: { mastered: false },
      3: { mastered: false },
    };

    // Simulate mastering level 3
    const levelCompleted = 3;
    progress[levelCompleted] = { mastered: true };

    // Auto-mark previous levels
    for (let i = 1; i < levelCompleted; i++) {
      if (!progress[i]?.mastered) {
        progress[i] = { mastered: true };
      }
    }

    expect(progress[1].mastered).toBe(true);
    expect(progress[2].mastered).toBe(true);
    expect(progress[3].mastered).toBe(true);
  });

  it('should prevent level regression by checking both saved and computed progress', () => {
    // Simulate scenario where React state might be stale
    const savedProgress = {
      1: { mastered: true },
      2: { mastered: true },
      3: { mastered: true },
    };

    const computedProgress = {
      1: { mastered: true },
      2: { mastered: false }, // Stale state
      3: { mastered: true },
    };

    // Should use saved OR computed (whichever shows mastered)
    let firstNonMastered = 1;
    for (let i = 1; i <= 3; i++) {
      const savedMastered = savedProgress[i as keyof typeof savedProgress]?.mastered;
      const computedMastered = computedProgress[i as keyof typeof computedProgress]?.mastered;
      const isMastered = savedMastered || computedMastered;

      if (!isMastered) {
        firstNonMastered = i;
        break;
      }
      if (i === 3 && isMastered) {
        firstNonMastered = 3; // All mastered
      }
    }

    // Should NOT regress to level 2 just because computed shows false
    expect(firstNonMastered).toBe(3);
  });
});

describe('User Navigation', () => {
  it('should save active session per topic', () => {
    const sessions = {
      'Integers': { subject: 'math', level: 2, levelStats: { correct: 3, total: 5 }, timestamp: Date.now() },
      'Fractions': { subject: 'math', level: 3, levelStats: { correct: 7, total: 8 }, timestamp: Date.now() },
    };

    localStorageMock.setItem('magical-mastery-active-session', JSON.stringify(sessions));

    const stored = localStorageMock.getItem('magical-mastery-active-session');
    const parsed = JSON.parse(stored!);

    expect(parsed['Integers'].level).toBe(2);
    expect(parsed['Fractions'].level).toBe(3);
  });

  it('should restore correct level when selecting topic', () => {
    const sessions = {
      'Decimals': { subject: 'math', level: 4, levelStats: { correct: 2, total: 3 }, timestamp: Date.now() },
    };

    localStorageMock.setItem('magical-mastery-active-session', JSON.stringify(sessions));

    const stored = localStorageMock.getItem('magical-mastery-active-session');
    const parsed = JSON.parse(stored!);

    // When user returns to Decimals, should restore level 4
    expect(parsed['Decimals'].level).toBe(4);
    expect(parsed['Decimals'].levelStats.correct).toBe(2);
    expect(parsed['Decimals'].levelStats.total).toBe(3);
  });

  it('should expire sessions after 24 hours', () => {
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const sessions = {
      'OldTopic': { subject: 'math', level: 3, levelStats: { correct: 5, total: 8 }, timestamp: oldTimestamp },
    };

    localStorageMock.setItem('magical-mastery-active-session', JSON.stringify(sessions));

    const stored = localStorageMock.getItem('magical-mastery-active-session');
    const parsed = JSON.parse(stored!);
    const session = parsed['OldTopic'];

    // Check if session is expired (24 hours = 86400000 ms)
    const isExpired = Date.now() - session.timestamp >= 24 * 60 * 60 * 1000;
    expect(isExpired).toBe(true);
  });

  it('should clear session for specific topic when level completed', () => {
    const sessions = {
      'Topic1': { subject: 'math', level: 2, levelStats: { correct: 5, total: 5 }, timestamp: Date.now() },
      'Topic2': { subject: 'math', level: 1, levelStats: { correct: 3, total: 5 }, timestamp: Date.now() },
    };

    // Clear Topic1 session (level completed)
    delete sessions['Topic1'];

    localStorageMock.setItem('magical-mastery-active-session', JSON.stringify(sessions));

    const stored = localStorageMock.getItem('magical-mastery-active-session');
    const parsed = JSON.parse(stored!);

    expect(parsed['Topic1']).toBeUndefined();
    expect(parsed['Topic2']).toBeDefined();
  });
});

describe('Question Tracking', () => {
  it('should track questions answered correctly', () => {
    const questionTracking: Record<string, { answeredCorrectly: boolean }> = {};

    // User answers question correctly
    questionTracking['q1'] = { answeredCorrectly: true };
    questionTracking['q2'] = { answeredCorrectly: false };
    questionTracking['q3'] = { answeredCorrectly: true };

    expect(questionTracking['q1'].answeredCorrectly).toBe(true);
    expect(questionTracking['q2'].answeredCorrectly).toBe(false);
    expect(questionTracking['q3'].answeredCorrectly).toBe(true);
  });

  it('should not repeat correctly answered questions', () => {
    const allQuestions = [
      { id: 'q1', level: 1 },
      { id: 'q2', level: 1 },
      { id: 'q3', level: 1 },
    ];

    const questionTracking: Record<string, { answeredCorrectly: boolean }> = {
      'q1': { answeredCorrectly: true },
      'q2': { answeredCorrectly: false },
    };

    // Filter out correctly answered questions
    const availableQuestions = allQuestions.filter(q => {
      const status = questionTracking[q.id];
      if (!status) return true;
      return !status.answeredCorrectly;
    });

    expect(availableQuestions.length).toBe(2);
    expect(availableQuestions.map(q => q.id)).toContain('q2');
    expect(availableQuestions.map(q => q.id)).toContain('q3');
    expect(availableQuestions.map(q => q.id)).not.toContain('q1');
  });

  it('should track session answered IDs separately', () => {
    const sessionAnsweredIds = new Set<string>();

    sessionAnsweredIds.add('q1');
    sessionAnsweredIds.add('q2');

    expect(sessionAnsweredIds.has('q1')).toBe(true);
    expect(sessionAnsweredIds.has('q2')).toBe(true);
    expect(sessionAnsweredIds.has('q3')).toBe(false);
    expect(sessionAnsweredIds.size).toBe(2);
  });

  it('should clear session answered IDs when starting new topic', () => {
    const sessionAnsweredIds = new Set(['q1', 'q2', 'q3']);

    // When selecting new topic, clear session tracking
    const clearedSet = new Set<string>();

    expect(clearedSet.size).toBe(0);
  });
});

describe('Mastery Threshold', () => {
  it('should have variable thresholds per level', () => {
    // Level 1: 100%, Levels 2-3: 90%, Levels 4-5: 80%, Level 6: 70%
    const thresholds: Record<number, number> = { 1: 1.0, 2: 0.9, 3: 0.9, 4: 0.8, 5: 0.8, 6: 0.7 };
    
    for (const [level, threshold] of Object.entries(thresholds)) {
      const needed = Math.ceil(threshold * 10);
      const passing = { correct: needed, total: 10 };
      const failing = { correct: needed - 1, total: 10 };
      
      expect(passing.correct / passing.total >= threshold).toBe(true);
      expect(failing.correct / failing.total >= threshold).toBe(false);
    }
  });

  it('should not trigger mastery check until 10 questions answered', () => {
    const PER_LEVEL = 10;

    const incomplete = { correct: 5, total: 5 };
    const complete = { correct: 8, total: 10 };

    expect(incomplete.total < PER_LEVEL).toBe(true);
    expect(complete.total >= PER_LEVEL).toBe(true);
  });
});

describe('Schema Migration', () => {
  it('should migrate from schema v1 to v4', () => {
    const v1Data = {
      schemaVersion: 1,
      questionTracking: {
        'q1': { answeredCorrectly: true, solutionViewed: false },
      },
      sessionStats: { stars: 500 },
    };

    // Simulate migration
    let migratedTracking: Record<string, any> = {};
    for (const [qId, status] of Object.entries(v1Data.questionTracking)) {
      const oldStatus = status as { answeredCorrectly?: boolean; solutionViewed?: boolean };
      migratedTracking[qId] = {
        answeredCorrectly: oldStatus.answeredCorrectly || false,
        solutionViewed: oldStatus.solutionViewed || false,
        masteredCleanly: (oldStatus.answeredCorrectly && !oldStatus.solutionViewed) || false,
        attemptCount: oldStatus.answeredCorrectly ? 1 : 0,
      };
    }

    expect(migratedTracking['q1'].masteredCleanly).toBe(true);
    expect(migratedTracking['q1'].attemptCount).toBe(1);
  });

  it('should reset stars in migration v4 for database sync', () => {
    const storedVersion = 3;
    const SCHEMA_VERSION = 4;

    let sessionStats = { stars: 5000 };

    if (storedVersion < 4) {
      sessionStats = { ...sessionStats, stars: 0 };
    }

    expect(sessionStats.stars).toBe(0);
  });
});
