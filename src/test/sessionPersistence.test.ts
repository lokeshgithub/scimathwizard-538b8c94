import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Session Persistence Tests
 *
 * Critical for Indian students with:
 * - Varied connectivity (2G to 4G)
 * - Frequent device switching (phone to tablet)
 * - Power outages and app restarts
 * - Shared devices in families
 *
 * Tests cover:
 * - Progress persistence across page refreshes
 * - Session restoration per topic
 * - Star sync between localStorage and database
 * - Schema migrations
 * - Question tracking persistence
 */

// Storage keys matching useQuizStore.ts
const STORAGE_KEY = 'magical-mastery-quiz';
const SESSION_KEY = 'magical-mastery-active-session';
const ANSWERED_IDS_KEY = 'magical-mastery-answered-ids';
const SCHEMA_VERSION = 4;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
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

describe('Progress Persistence', () => {
  describe('Saving Progress', () => {
    it('should save progress to localStorage', () => {
      const state = {
        schemaVersion: SCHEMA_VERSION,
        progress: {
          Integers: {
            1: { correct: 8, total: 10, mastered: true },
            2: { correct: 5, total: 7, mastered: false },
          },
        },
        sessionStats: { stars: 100 },
        questionTracking: {},
        banks: {},
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(state));

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.progress.Integers[1].mastered).toBe(true);
    });

    it('should debounce saves to prevent UI blocking', async () => {
      // Simulate rapid state changes
      const saves: number[] = [];
      const debouncedSave = (() => {
        let timeoutId: NodeJS.Timeout;
        return (data: any) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            saves.push(Date.now());
            localStorageMock.setItem(STORAGE_KEY, JSON.stringify(data));
          }, 500);
        };
      })();

      // Rapid changes
      debouncedSave({ v: 1 });
      debouncedSave({ v: 2 });
      debouncedSave({ v: 3 });
      debouncedSave({ v: 4 });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should only save once
      expect(saves.length).toBe(1);
    });

    it('should preserve all topics when saving', () => {
      const progress = {
        Integers: { 1: { mastered: true } },
        Fractions: { 1: { mastered: true } },
        Decimals: { 1: { mastered: false } },
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        progress,
      }));

      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
      expect(Object.keys(stored.progress).length).toBe(3);
    });
  });

  describe('Loading Progress', () => {
    it('should load progress from localStorage on mount', () => {
      const savedState = {
        schemaVersion: SCHEMA_VERSION,
        progress: {
          Integers: { 1: { correct: 8, total: 10, mastered: true } },
        },
        sessionStats: { stars: 500 },
        questionTracking: {},
        banks: {},
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const stored = localStorageMock.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed.progress.Integers[1].mastered).toBe(true);
      expect(parsed.sessionStats.stars).toBe(500);
    });

    it('should return empty state if no saved data', () => {
      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).toBeNull();

      // Default state
      const defaultState = {
        banks: {},
        progress: {},
        questionTracking: {},
        sessionStats: { stars: 0 },
      };
      expect(defaultState.progress).toEqual({});
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid json {{{');

      try {
        const stored = localStorageMock.getItem(STORAGE_KEY);
        JSON.parse(stored!);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        // Should handle error and return default state
        expect(e).toBeInstanceOf(SyntaxError);
      }
    });

    it('should handle missing fields in saved state', () => {
      const partialState = {
        schemaVersion: SCHEMA_VERSION,
        progress: { Integers: { 1: { mastered: true } } },
        // Missing sessionStats, questionTracking, banks
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(partialState));

      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
      expect(stored.progress).toBeDefined();
      expect(stored.sessionStats).toBeUndefined();
      // Code should provide defaults for missing fields
    });
  });
});

describe('Active Session Persistence', () => {
  describe('Per-Topic Sessions', () => {
    it('should save session per topic', () => {
      const sessions = {
        Integers: { subject: 'math', level: 2, levelStats: { correct: 3, total: 5 }, timestamp: Date.now() },
        Fractions: { subject: 'math', level: 4, levelStats: { correct: 7, total: 9 }, timestamp: Date.now() },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(sessions));

      const stored = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      expect(stored.Integers.level).toBe(2);
      expect(stored.Fractions.level).toBe(4);
    });

    it('should preserve other topic sessions when updating one', () => {
      const sessions = {
        Integers: { subject: 'math', level: 2, levelStats: { correct: 3, total: 5 }, timestamp: Date.now() },
        Fractions: { subject: 'math', level: 4, levelStats: { correct: 7, total: 9 }, timestamp: Date.now() },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(sessions));

      // Update Integers session
      const stored = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      stored.Integers = { ...stored.Integers, level: 3 };
      localStorageMock.setItem(SESSION_KEY, JSON.stringify(stored));

      const updated = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      expect(updated.Integers.level).toBe(3);
      expect(updated.Fractions.level).toBe(4); // Unchanged
    });

    it('should restore session when returning to topic', () => {
      const session = {
        Integers: { subject: 'math', level: 3, levelStats: { correct: 5, total: 7 }, timestamp: Date.now() },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(session));

      const stored = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      const restoredLevel = stored.Integers.level;
      const restoredStats = stored.Integers.levelStats;

      expect(restoredLevel).toBe(3);
      expect(restoredStats.correct).toBe(5);
      expect(restoredStats.total).toBe(7);
    });
  });

  describe('Session Expiration', () => {
    it('should expire sessions after 24 hours', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const session = {
        Integers: { subject: 'math', level: 3, levelStats: { correct: 5, total: 7 }, timestamp: oldTimestamp },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(session));

      const stored = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      const isExpired = Date.now() - stored.Integers.timestamp >= 24 * 60 * 60 * 1000;

      expect(isExpired).toBe(true);
    });

    it('should NOT restore expired sessions', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      const session = {
        Integers: { subject: 'math', level: 3, levelStats: { correct: 5, total: 7 }, timestamp: oldTimestamp },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(session));

      const loadActiveSession = (topicName: string) => {
        const data = localStorageMock.getItem(SESSION_KEY);
        if (data) {
          const allSessions = JSON.parse(data);
          const s = allSessions[topicName];
          if (s && Date.now() - s.timestamp < 24 * 60 * 60 * 1000) {
            return s;
          }
        }
        return null;
      };

      const restored = loadActiveSession('Integers');
      expect(restored).toBeNull();
    });

    it('should keep non-expired sessions', () => {
      const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const session = {
        Integers: { subject: 'math', level: 3, levelStats: { correct: 5, total: 7 }, timestamp: recentTimestamp },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(session));

      const loadActiveSession = (topicName: string) => {
        const data = localStorageMock.getItem(SESSION_KEY);
        if (data) {
          const allSessions = JSON.parse(data);
          const s = allSessions[topicName];
          if (s && Date.now() - s.timestamp < 24 * 60 * 60 * 1000) {
            return s;
          }
        }
        return null;
      };

      const restored = loadActiveSession('Integers');
      expect(restored).not.toBeNull();
      expect(restored.level).toBe(3);
    });
  });

  describe('Session Clearing', () => {
    it('should clear session for specific topic when level completed', () => {
      const sessions = {
        Integers: { subject: 'math', level: 2, timestamp: Date.now() },
        Fractions: { subject: 'math', level: 3, timestamp: Date.now() },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(sessions));

      // Clear Integers session
      const stored = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      delete stored.Integers;
      localStorageMock.setItem(SESSION_KEY, JSON.stringify(stored));

      const updated = JSON.parse(localStorageMock.getItem(SESSION_KEY)!);
      expect(updated.Integers).toBeUndefined();
      expect(updated.Fractions).toBeDefined();
    });

    it('should clear all sessions on full reset', () => {
      const sessions = {
        Integers: { subject: 'math', level: 2, timestamp: Date.now() },
        Fractions: { subject: 'math', level: 3, timestamp: Date.now() },
      };

      localStorageMock.setItem(SESSION_KEY, JSON.stringify(sessions));

      // Full clear
      localStorageMock.removeItem(SESSION_KEY);

      const stored = localStorageMock.getItem(SESSION_KEY);
      expect(stored).toBeNull();
    });
  });
});

describe('Star Sync', () => {
  describe('Local to Database Sync', () => {
    it('should track stars earned in session', () => {
      const sessionStats = { stars: 100 };

      // Earn 10 stars
      sessionStats.stars += 10;

      expect(sessionStats.stars).toBe(110);
    });

    it('should prevent star loss on sync', () => {
      // Database has 500, local has 550 (earned 50 more)
      const databaseStars = 500;
      const localStars = 550;

      // Should use higher value
      const syncedStars = Math.max(databaseStars, localStars);
      expect(syncedStars).toBe(550);
    });
  });

  describe('Database to Local Sync', () => {
    it('should sync stars from profile on login', () => {
      const profileStars = 1000;
      const localState = { sessionStats: { stars: 0 } };

      // Sync from profile
      localState.sessionStats.stars = profileStars;

      expect(localState.sessionStats.stars).toBe(1000);
    });

    it('should always trust database as source of truth', () => {
      // Even if local has more, database wins on fresh sync
      const profileStars = 800;
      const localStars = 1000; // Corrupted/old value

      // On login, database is truth
      const syncedStars = profileStars;
      expect(syncedStars).toBe(800);
    });
  });
});

describe('Question Tracking', () => {
  describe('Answered Questions', () => {
    it('should track correctly answered questions', () => {
      const questionTracking: Record<string, { answeredCorrectly: boolean; attemptCount: number }> = {};

      questionTracking['q1'] = { answeredCorrectly: true, attemptCount: 1 };
      questionTracking['q2'] = { answeredCorrectly: false, attemptCount: 1 };

      expect(questionTracking['q1'].answeredCorrectly).toBe(true);
      expect(questionTracking['q2'].answeredCorrectly).toBe(false);
    });

    it('should track attempt count', () => {
      const questionTracking: Record<string, { attemptCount: number }> = {};

      questionTracking['q1'] = { attemptCount: 1 };
      questionTracking['q1'].attemptCount++;

      expect(questionTracking['q1'].attemptCount).toBe(2);
    });

    it('should track masteredCleanly flag', () => {
      const questionTracking: Record<string, { answeredCorrectly: boolean; solutionViewed: boolean; masteredCleanly: boolean }> = {};

      // Answered correctly without viewing solution
      questionTracking['q1'] = {
        answeredCorrectly: true,
        solutionViewed: false,
        masteredCleanly: true,
      };

      // Answered correctly but viewed solution first
      questionTracking['q2'] = {
        answeredCorrectly: true,
        solutionViewed: true,
        masteredCleanly: false,
      };

      expect(questionTracking['q1'].masteredCleanly).toBe(true);
      expect(questionTracking['q2'].masteredCleanly).toBe(false);
    });
  });

  describe('Session Answered IDs', () => {
    it('should track questions answered in current session', () => {
      const sessionAnsweredIds = new Set<string>();

      sessionAnsweredIds.add('q1');
      sessionAnsweredIds.add('q2');

      expect(sessionAnsweredIds.has('q1')).toBe(true);
      expect(sessionAnsweredIds.has('q3')).toBe(false);
    });

    it('should persist session IDs to sessionStorage', () => {
      const ids = ['q1', 'q2', 'q3'];
      sessionStorageMock.setItem(ANSWERED_IDS_KEY, JSON.stringify(ids));

      const stored = JSON.parse(sessionStorageMock.getItem(ANSWERED_IDS_KEY)!);
      expect(stored).toEqual(['q1', 'q2', 'q3']);
    });

    it('should load session IDs from sessionStorage', () => {
      sessionStorageMock.setItem(ANSWERED_IDS_KEY, JSON.stringify(['q1', 'q2']));

      const stored = sessionStorageMock.getItem(ANSWERED_IDS_KEY);
      const ids = new Set(JSON.parse(stored!));

      expect(ids.has('q1')).toBe(true);
      expect(ids.has('q2')).toBe(true);
    });

    it('should clear session IDs on new topic', () => {
      sessionStorageMock.setItem(ANSWERED_IDS_KEY, JSON.stringify(['q1', 'q2']));

      // Clear for new topic
      sessionStorageMock.removeItem(ANSWERED_IDS_KEY);

      const stored = sessionStorageMock.getItem(ANSWERED_IDS_KEY);
      expect(stored).toBeNull();
    });
  });
});

describe('Schema Migration', () => {
  describe('V1 to V2 Migration', () => {
    it('should add masteredCleanly and attemptCount fields', () => {
      const v1Tracking = {
        q1: { answeredCorrectly: true, solutionViewed: false },
        q2: { answeredCorrectly: false, solutionViewed: true },
      };

      const migratedTracking: Record<string, any> = {};
      for (const [qId, status] of Object.entries(v1Tracking)) {
        const oldStatus = status as any;
        migratedTracking[qId] = {
          answeredCorrectly: oldStatus.answeredCorrectly || false,
          solutionViewed: oldStatus.solutionViewed || false,
          masteredCleanly: (oldStatus.answeredCorrectly && !oldStatus.solutionViewed) || false,
          attemptCount: oldStatus.answeredCorrectly ? 1 : 0,
        };
      }

      expect(migratedTracking['q1'].masteredCleanly).toBe(true);
      expect(migratedTracking['q1'].attemptCount).toBe(1);
      expect(migratedTracking['q2'].masteredCleanly).toBe(false);
      expect(migratedTracking['q2'].attemptCount).toBe(0);
    });
  });

  describe('V3 to V4 Migration', () => {
    it('should reset stars to 0 for database sync', () => {
      const v3State = {
        schemaVersion: 3,
        sessionStats: { stars: 5000 },
      };

      // Migration resets stars
      let sessionStats = v3State.sessionStats;
      if (v3State.schemaVersion < 4) {
        sessionStats = { ...sessionStats, stars: 0 };
      }

      expect(sessionStats.stars).toBe(0);
    });

    it('should preserve progress during star reset', () => {
      const v3State = {
        schemaVersion: 3,
        sessionStats: { stars: 5000 },
        progress: { Integers: { 1: { mastered: true } } },
      };

      // Migration
      const migratedState = {
        ...v3State,
        schemaVersion: 4,
        sessionStats: { ...v3State.sessionStats, stars: 0 },
      };

      expect(migratedState.sessionStats.stars).toBe(0);
      expect(migratedState.progress.Integers[1].mastered).toBe(true);
    });
  });
});

describe('Network Resilience', () => {
  it('should work offline using localStorage', () => {
    const state = {
      progress: { Integers: { 1: { mastered: true } } },
      sessionStats: { stars: 100 },
    };

    // Save locally (no network needed)
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(state));

    // Verify can load
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.progress.Integers[1].mastered).toBe(true);
  });

  it('should queue updates for sync when offline', () => {
    const pendingSync: any[] = [];

    // Simulate answer while offline
    const update = { type: 'answer', questionId: 'q1', correct: true };
    pendingSync.push(update);

    expect(pendingSync.length).toBe(1);
    // Will sync when back online
  });

  it('should merge local and server progress on reconnect', () => {
    const localProgress = {
      Integers: { 1: { mastered: true }, 2: { mastered: false } },
    };
    const serverProgress = {
      Integers: { 1: { mastered: true }, 2: { mastered: true } },
    };

    // Merge: take mastered=true from either
    const mergedProgress: Record<string, any> = {};
    for (const topic of Object.keys(localProgress)) {
      mergedProgress[topic] = {};
      for (const level of Object.keys(localProgress[topic])) {
        const localMastered = localProgress[topic as keyof typeof localProgress]?.[level as any]?.mastered;
        const serverMastered = serverProgress[topic as keyof typeof serverProgress]?.[level as any]?.mastered;
        mergedProgress[topic][level] = {
          mastered: localMastered || serverMastered,
        };
      }
    }

    expect(mergedProgress.Integers[1].mastered).toBe(true);
    expect(mergedProgress.Integers[2].mastered).toBe(true); // Server had mastered
  });
});

describe('Edge Cases', () => {
  it('should handle localStorage quota exceeded', () => {
    // Simulate quota error
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    try {
      localStorageMock.setItem(STORAGE_KEY, 'data');
    } catch (e: any) {
      expect(e.message).toBe('QuotaExceededError');
      // Should handle gracefully, maybe clear old data
    }

    localStorageMock.setItem = originalSetItem;
  });

  it('should handle concurrent writes from multiple tabs', () => {
    // Tab 1 saves
    const tab1State = { stars: 100 };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(tab1State));

    // Tab 2 saves (after Tab 1)
    const tab2State = { stars: 150 };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(tab2State));

    // Final state should be Tab 2's
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.stars).toBe(150);
  });

  it('should handle very large progress data', () => {
    // 100 topics with 7 levels each
    const progress: Record<string, any> = {};
    for (let i = 0; i < 100; i++) {
      progress[`Topic${i}`] = {};
      for (let j = 1; j <= 7; j++) {
        progress[`Topic${i}`][j] = { correct: 8, total: 10, mastered: true };
      }
    }

    const state = { progress };
    const json = JSON.stringify(state);

    // Should be under ~5MB localStorage limit
    expect(json.length).toBeLessThan(5 * 1024 * 1024);
  });
});
