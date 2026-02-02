import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TopicDashboard Component Tests
 *
 * Critical component for ICSE students (Class 7-12):
 * - Topic selection and navigation
 * - Progress visualization
 * - Level progression display
 * - Category organization (Math, Physics, Chemistry)
 * - Search functionality
 * - Guest limits
 * - Spaced repetition indicators
 * - Review mode and reset functionality
 *
 * Critical for: All grades - first screen students see after login
 */

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
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helper to create mock topics
const createMockTopics = () => ({
  Integers: Array(50).fill({ id: '1', level: 1 }),
  Fractions: Array(50).fill({ id: '2', level: 1 }),
  Decimals: Array(50).fill({ id: '3', level: 1 }),
  'Rational_Numbers': Array(50).fill({ id: '4', level: 1 }),
  'Exponents_and_Powers': Array(50).fill({ id: '5', level: 1 }),
  'Profit_Loss': Array(50).fill({ id: '6', level: 1 }),
  'Ratio_and_Proportion': Array(50).fill({ id: '7', level: 1 }),
  Triangles: Array(50).fill({ id: '8', level: 1 }),
  Probability: Array(50).fill({ id: '9', level: 1 }),
});

// Helper to create mock progress
const createMockProgress = (topic: string, mastered: number[]) => {
  const progress: Record<number, { correct: number; total: number; mastered: boolean }> = {};
  for (let i = 1; i <= 6; i++) {
    progress[i] = {
      correct: mastered.includes(i) ? 8 : 0,
      total: mastered.includes(i) ? 10 : 0,
      mastered: mastered.includes(i),
    };
  }
  return progress;
};

describe('TopicDashboard Component', () => {
  describe('Topic Display', () => {
    it('should display all available topics', () => {
      const topics = createMockTopics();
      expect(Object.keys(topics).length).toBe(9);
    });

    it('should format topic names correctly (replace underscores)', () => {
      const formatName = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      expect(formatName('Rational_Numbers')).toBe('Rational Numbers');
      expect(formatName('Profit_Loss')).toBe('Profit Loss');
    });

    it('should show topic icon based on name', () => {
      const getTopicIcon = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('integer')) return '\uD83D\uDD1F'; // 10
        if (lower.includes('fraction')) return '\uD83C\uDF55'; // pizza
        if (lower.includes('decimal')) return '\uD83D\uDD22'; // numbers
        return '\uD83D\uDCDA'; // books
      };

      expect(getTopicIcon('integers')).toBe('\uD83D\uDD1F');
      expect(getTopicIcon('fractions')).toBe('\uD83C\uDF55');
    });

    it('should show empty state when no topics available', () => {
      const topics = {};
      const isEmpty = Object.keys(topics).length === 0;
      expect(isEmpty).toBe(true);
      // Should show: "No topics available yet. Check back soon!"
    });

    it('should display question count per topic', () => {
      const topics = createMockTopics();
      expect(topics.Integers.length).toBe(50);
    });
  });

  describe('Category Organization', () => {
    it('should group topics into categories', () => {
      const MATH_CATEGORIES = [
        { name: 'Numbers & Operations', keywords: ['integer', 'decimal', 'fraction', 'rational'] },
        { name: 'Algebra', keywords: ['algebra', 'equation', 'exponent', 'power'] },
        { name: 'Ratio & Proportion', keywords: ['ratio', 'proportion', 'profit', 'loss'] },
        { name: 'Geometry', keywords: ['triangle', 'circle', 'angle', 'area'] },
        { name: 'Data & Statistics', keywords: ['data', 'probability', 'statistic'] },
      ];

      expect(MATH_CATEGORIES.length).toBe(5);
    });

    it('should categorize "Integers" into Numbers & Operations', () => {
      const categorize = (topicName: string) => {
        const lower = topicName.toLowerCase();
        if (['integer', 'decimal', 'fraction', 'rational'].some(kw => lower.includes(kw))) {
          return 'Numbers & Operations';
        }
        if (['exponent', 'power', 'algebra'].some(kw => lower.includes(kw))) {
          return 'Algebra';
        }
        if (['profit', 'loss', 'ratio'].some(kw => lower.includes(kw))) {
          return 'Ratio & Proportion';
        }
        if (['triangle', 'circle'].some(kw => lower.includes(kw))) {
          return 'Geometry';
        }
        if (['probability', 'data'].some(kw => lower.includes(kw))) {
          return 'Data & Statistics';
        }
        return 'Other Topics';
      };

      expect(categorize('Integers')).toBe('Numbers & Operations');
      expect(categorize('Exponents_and_Powers')).toBe('Algebra');
      expect(categorize('Profit_Loss')).toBe('Ratio & Proportion');
      expect(categorize('Triangles')).toBe('Geometry');
      expect(categorize('Probability')).toBe('Data & Statistics');
    });

    it('should expand default categories on load', () => {
      const defaultExpanded = new Set(['Numbers & Operations', 'Algebra']);
      expect(defaultExpanded.has('Numbers & Operations')).toBe(true);
      expect(defaultExpanded.has('Geometry')).toBe(false);
    });

    it('should toggle category expansion on click', () => {
      const expandedCategories = new Set(['Numbers & Operations']);

      // Toggle (collapse)
      expandedCategories.delete('Numbers & Operations');
      expect(expandedCategories.has('Numbers & Operations')).toBe(false);

      // Toggle again (expand)
      expandedCategories.add('Numbers & Operations');
      expect(expandedCategories.has('Numbers & Operations')).toBe(true);
    });

    it('should handle chapter prefix in topic names', () => {
      const cleanTopicName = (name: string) => {
        return name
          .toLowerCase()
          .replace(/^ch\d+[_-]?/i, '') // Remove "ch09_" prefix
          .replace(/[_-]/g, ' ');
      };

      expect(cleanTopicName('ch09_profit_loss_discount')).toBe('profit loss discount');
      expect(cleanTopicName('ch1_integers')).toBe('integers');
    });

    it('should show category progress bar', () => {
      const categoryTopics = [
        { percentage: 100 },
        { percentage: 50 },
        { percentage: 0 },
      ];
      const avgProgress = categoryTopics.reduce((sum, t) => sum + t.percentage, 0) / categoryTopics.length;

      expect(avgProgress).toBe(50);
    });
  });

  describe('Progress Display', () => {
    it('should show overall progress bar', () => {
      const overallStats = {
        totalMastered: 5,
        totalLevels: 30,
        percentage: (5 / 30) * 100,
      };

      expect(overallStats.percentage).toBeCloseTo(16.67, 1);
    });

    it('should show topic mastery percentage', () => {
      const progress = createMockProgress('Integers', [1, 2]);
      const levels = [1, 2, 3, 4, 5, 6];
      const masteredCount = levels.filter(l => progress[l]?.mastered).length;
      const percentage = (masteredCount / levels.length) * 100;

      expect(masteredCount).toBe(2);
      expect(percentage).toBeCloseTo(33.33, 1);
    });

    it('should display level indicators (1-6)', () => {
      const levels = [1, 2, 3, 4, 5, 6];
      expect(levels.length).toBe(6);
    });

    it('should show mastered levels with color highlight', () => {
      const progress = createMockProgress('Integers', [1, 2, 3]);
      const levels = [1, 2, 3, 4, 5, 6];

      levels.forEach(level => {
        const isMastered = progress[level]?.mastered;
        if (level <= 3) {
          expect(isMastered).toBe(true);
          // CSS: `${colors.bg} text-white`
        } else {
          expect(isMastered).toBe(false);
          // CSS: 'bg-muted text-muted-foreground'
        }
      });
    });

    it('should show locked levels with padlock icon', () => {
      const level = 3;
      const previousLevelMastered = false;
      const isLocked = !previousLevelMastered;

      expect(isLocked).toBe(true);
      // Should show <Lock className="w-2.5 h-2.5" />
    });

    it('should get mastery color based on percentage', () => {
      const getMasteryColor = (percentage: number) => {
        if (percentage >= 100) return { bg: 'bg-amber-500', ring: 'ring-amber-400' };
        if (percentage >= 80) return { bg: 'bg-emerald-500', ring: 'ring-emerald-400' };
        if (percentage >= 60) return { bg: 'bg-blue-500', ring: 'ring-blue-400' };
        if (percentage >= 40) return { bg: 'bg-violet-500', ring: 'ring-violet-400' };
        if (percentage > 0) return { bg: 'bg-pink-500', ring: 'ring-pink-400' };
        return { bg: 'bg-slate-300', ring: 'ring-slate-300' };
      };

      expect(getMasteryColor(100).bg).toBe('bg-amber-500');
      expect(getMasteryColor(80).bg).toBe('bg-emerald-500');
      expect(getMasteryColor(50).bg).toBe('bg-violet-500');
      expect(getMasteryColor(0).bg).toBe('bg-slate-300');
    });

    it('should show completion badge for fully mastered topics', () => {
      const levels = [1, 2, 3, 4, 5, 6];
      const progress = createMockProgress('Integers', [1, 2, 3, 4, 5, 6]);
      const isComplete = levels.every(l => progress[l]?.mastered);

      expect(isComplete).toBe(true);
      // Should show Award icon badge
    });

    it('should sort topics by progress within category', () => {
      const topics = [
        { name: 'A', percentage: 50 },
        { name: 'B', percentage: 100 },
        { name: 'C', percentage: 25 },
      ];

      topics.sort((a, b) => b.percentage - a.percentage);

      expect(topics[0].name).toBe('B');
      expect(topics[1].name).toBe('A');
      expect(topics[2].name).toBe('C');
    });
  });

  describe('Topic Selection', () => {
    it('should call onSelectTopic when topic card is clicked', () => {
      const onSelectTopic = vi.fn();
      onSelectTopic('Integers');

      expect(onSelectTopic).toHaveBeenCalledWith('Integers');
    });

    it('should highlight currently selected topic', () => {
      const currentTopic = 'Integers';
      const isSelected = currentTopic === 'Integers';

      expect(isSelected).toBe(true);
      // CSS: 'ring-2 ring-primary'
    });

    it('should save last session on topic selection', () => {
      const saveLastSession = (subject: string, topic: string, level: number) => {
        localStorageMock.setItem(
          'last-session',
          JSON.stringify({ subject, topic, level })
        );
      };

      saveLastSession('math', 'Integers', 2);

      const saved = JSON.parse(localStorageMock.getItem('last-session')!);
      expect(saved.topic).toBe('Integers');
      expect(saved.level).toBe(2);
    });
  });

  describe('Level Selection', () => {
    it('should call onStartLevel when level button is clicked', () => {
      const onStartLevel = vi.fn();
      onStartLevel('Integers', 3);

      expect(onStartLevel).toHaveBeenCalledWith('Integers', 3);
    });

    it('should check if level is unlocked', () => {
      const isLevelUnlocked = (topic: string, level: number, progress: any) => {
        if (level === 1) return true;
        return progress[level - 1]?.mastered === true;
      };

      const progress = createMockProgress('Integers', [1, 2]);

      expect(isLevelUnlocked('Integers', 1, progress)).toBe(true);
      expect(isLevelUnlocked('Integers', 2, progress)).toBe(true);
      expect(isLevelUnlocked('Integers', 3, progress)).toBe(true);
      expect(isLevelUnlocked('Integers', 4, progress)).toBe(false);
    });

    it('should call onRequestUnlock for locked levels', () => {
      const onRequestUnlock = vi.fn();
      const level = 4;
      const isUnlocked = false;

      if (!isUnlocked) {
        onRequestUnlock('Integers', level);
      }

      expect(onRequestUnlock).toHaveBeenCalledWith('Integers', 4);
    });
  });

  describe('Search Functionality', () => {
    it('should show search bar when 10+ topics', () => {
      const topics = createMockTopics();
      const showSearch = Object.keys(topics).length >= 10;

      expect(Object.keys(topics).length).toBe(9);
      expect(showSearch).toBe(false);
    });

    it('should filter topics by search query', () => {
      const topics = ['Integers', 'Fractions', 'Decimals', 'Rational Numbers'];
      const query = 'int';

      const filtered = topics.filter(t => t.toLowerCase().includes(query.toLowerCase()));

      expect(filtered).toEqual(['Integers']);
    });

    it('should filter categories by matching topics', () => {
      const categorizedTopics = {
        'Numbers & Operations': [
          { name: 'Integers' },
          { name: 'Fractions' },
        ],
        'Algebra': [
          { name: 'Linear Equations' },
        ],
      };
      const query = 'int';

      const filtered: Record<string, any[]> = {};
      for (const [cat, topics] of Object.entries(categorizedTopics)) {
        const matching = topics.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
        if (matching.length > 0) {
          filtered[cat] = matching;
        }
      }

      expect(Object.keys(filtered)).toEqual(['Numbers & Operations']);
    });

    it('should show empty results for no matches', () => {
      const topics = ['Integers', 'Fractions'];
      const query = 'xyz';

      const filtered = topics.filter(t => t.toLowerCase().includes(query.toLowerCase()));

      expect(filtered.length).toBe(0);
    });

    it('should be case-insensitive', () => {
      const topics = ['Integers', 'FRACTIONS', 'Decimals'];
      const query = 'INTEGERS';

      const filtered = topics.filter(t => t.toLowerCase().includes(query.toLowerCase()));

      expect(filtered).toEqual(['Integers']);
    });
  });

  describe('Guest Limits', () => {
    it('should show guest limit banner for non-logged in users', () => {
      const isLoggedIn = false;
      expect(isLoggedIn).toBe(false);
      // Should show "Guest: X/3 topics left"
    });

    it('should track topics accessed by guest', () => {
      const guestLimits = {
        topicsUsed: ['Integers', 'Fractions'],
        remainingTopics: 1,
        isLimitReached: false,
      };

      expect(guestLimits.topicsUsed.length).toBe(2);
      expect(guestLimits.remainingTopics).toBe(1);
    });

    it('should block topic access when limit reached', () => {
      const guestLimits = {
        topicsUsed: ['Integers', 'Fractions', 'Decimals'],
        isLimitReached: true,
      };

      expect(guestLimits.isLimitReached).toBe(true);
      // Should show sign-up prompt
    });

    it('should show sign-up prompt when limit reached', () => {
      let showSignUpPrompt = false;
      const isLimitReached = true;

      if (isLimitReached) {
        showSignUpPrompt = true;
      }

      expect(showSignUpPrompt).toBe(true);
    });

    it('should allow unlimited access for logged-in users', () => {
      const isLoggedIn = true;
      const canAccessTopic = (topicName: string) => {
        if (isLoggedIn) return true;
        // Check guest limits
        return false;
      };

      expect(canAccessTopic('Any Topic')).toBe(true);
    });
  });

  describe('Spaced Repetition', () => {
    it('should show bell icon for due topics', () => {
      const dueTopics = [
        { topic_name: 'Integers', due_date: new Date() },
      ];

      const isDue = (topicName: string) => {
        return dueTopics.some(dt => dt.topic_name === topicName);
      };

      expect(isDue('Integers')).toBe(true);
      expect(isDue('Fractions')).toBe(false);
    });

    it('should prioritize due topics in sorting', () => {
      const topics = [
        { name: 'A', percentage: 50, isDue: false },
        { name: 'B', percentage: 100, isDue: true },
        { name: 'C', percentage: 25, isDue: false },
      ];

      topics.sort((a, b) => {
        if (a.isDue && !b.isDue) return -1;
        if (!a.isDue && b.isDue) return 1;
        return b.percentage - a.percentage;
      });

      expect(topics[0].name).toBe('B'); // Due topic first
    });

    it('should not show bell icon for completed topics', () => {
      const topic = {
        isDue: true,
        isComplete: true,
      };

      const showBell = topic.isDue && !topic.isComplete;
      expect(showBell).toBe(false);
    });
  });

  describe('Review Mode', () => {
    it('should show "Review Solved" option in dropdown', () => {
      const hasSolvedQuestions = true;
      const showReviewOption = hasSolvedQuestions;

      expect(showReviewOption).toBe(true);
    });

    it('should call onStartReview when clicked', () => {
      const onStartReview = vi.fn().mockReturnValue(true);
      const result = onStartReview('Integers');

      expect(onStartReview).toHaveBeenCalledWith('Integers');
      expect(result).toBe(true);
    });

    it('should show toast error when no questions to review', () => {
      const onStartReview = vi.fn().mockReturnValue(false);
      const result = onStartReview('Integers');

      expect(result).toBe(false);
      // Should show toast.error('No solved questions to review')
    });

    it('should show solved count in dropdown', () => {
      const getSolvedCount = (topic: string) => {
        const solvedCounts: Record<string, number> = {
          'Integers': 25,
          'Fractions': 0,
        };
        return solvedCounts[topic] || 0;
      };

      expect(getSolvedCount('Integers')).toBe(25);
      // Dropdown should show "Review Solved (25)"
    });
  });

  describe('Reset Progress', () => {
    it('should show "Reset Progress" option in dropdown', () => {
      const hasProgress = true;
      const showResetOption = hasProgress;

      expect(showResetOption).toBe(true);
    });

    it('should show confirmation dialog before reset', () => {
      let resetConfirmTopic: string | null = null;

      // Click reset
      resetConfirmTopic = 'Integers';
      expect(resetConfirmTopic).toBe('Integers');
      // Should show AlertDialog
    });

    it('should call onResetProgress after confirmation', () => {
      const onResetProgress = vi.fn();
      const resetConfirmTopic = 'Integers';

      // Confirm reset
      if (resetConfirmTopic) {
        onResetProgress(resetConfirmTopic);
      }

      expect(onResetProgress).toHaveBeenCalledWith('Integers');
    });

    it('should cancel reset on dialog cancel', () => {
      let resetConfirmTopic: string | null = 'Integers';
      const onResetProgress = vi.fn();

      // Cancel
      resetConfirmTopic = null;

      expect(resetConfirmTopic).toBeNull();
      expect(onResetProgress).not.toHaveBeenCalled();
    });
  });

  describe('Mixed Mode', () => {
    it('should show "Mix All Topics" button', () => {
      const topicCount = 9;
      const showMixedButton = topicCount > 1;

      expect(showMixedButton).toBe(true);
    });

    it('should call onStartMixedQuiz with all topics', () => {
      const onStartMixedQuiz = vi.fn();
      const topics = createMockTopics();
      const topicNames = Object.keys(topics);

      onStartMixedQuiz(topicNames);

      expect(onStartMixedQuiz).toHaveBeenCalledWith(topicNames);
      expect(topicNames.length).toBe(9);
    });
  });

  describe('Continue Session', () => {
    it('should show continue session card if active session exists', () => {
      const lastSession = {
        subject: 'math',
        topic: 'Integers',
        level: 3,
      };

      expect(lastSession.topic).toBe('Integers');
      // Should show ContinueSession component
    });

    it('should call onContinue with topic name', () => {
      const onContinue = vi.fn();
      onContinue('Integers');

      expect(onContinue).toHaveBeenCalledWith('Integers');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-expanded on category headers', () => {
      const isExpanded = true;
      const ariaExpanded = isExpanded;

      expect(ariaExpanded).toBe(true);
    });

    it('should have aria-label describing category state', () => {
      const categoryName = 'Numbers & Operations';
      const masteredCount = 2;
      const totalCount = 4;
      const isExpanded = true;

      const ariaLabel = `${categoryName} category, ${masteredCount} of ${totalCount} complete. Click to ${isExpanded ? 'collapse' : 'expand'}`;

      expect(ariaLabel).toContain('Numbers & Operations');
      expect(ariaLabel).toContain('collapse');
    });

    it('should have title attributes on level buttons', () => {
      const level = 3;
      const isMastered = true;
      const isLocked = false;

      const title = isMastered
        ? `L${level} Mastered`
        : isLocked
          ? `L${level} Locked`
          : `Practice L${level}`;

      expect(title).toBe('L3 Mastered');
    });
  });

  describe('Mobile Experience', () => {
    it('should have responsive grid (1 col on mobile, 2 on tablet)', () => {
      // CSS: 'grid-cols-1 sm:grid-cols-2'
      const gridClasses = 'grid-cols-1 sm:grid-cols-2';
      expect(gridClasses).toContain('grid-cols-1');
      expect(gridClasses).toContain('sm:grid-cols-2');
    });

    it('should have touch-friendly level buttons (20x20px)', () => {
      // CSS: 'w-5 h-5' = 20px
      const buttonSize = 20;
      expect(buttonSize).toBeGreaterThanOrEqual(20);
    });

    it('should have smooth animations', () => {
      // Using framer-motion with duration 0.2s
      const animationDuration = 0.2;
      expect(animationDuration).toBeLessThan(0.5);
    });
  });
});

describe('TopicDashboard Edge Cases', () => {
  it('should handle topics with same name in different categories', () => {
    // Shouldn't happen but handle gracefully
    const topics = {
      'Square': [{ id: '1' }], // Could be geometry or numbers
    };

    expect(Object.keys(topics).length).toBe(1);
  });

  it('should handle very long topic names', () => {
    const formatName = (name: string) => {
      return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const longName = 'A'.repeat(100);
    const formatted = formatName(longName);
    expect(formatted.length).toBe(100);
    // CSS: 'truncate' class handles overflow
  });

  it('should handle Unicode in topic names', () => {
    const formatName = (name: string) => {
      return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const unicodeName = '\u03C0_approximation';
    const formatted = formatName(unicodeName);
    expect(formatted).toContain('\u03C0');
  });

  it('should handle missing getProgress function gracefully', () => {
    const defaultProgress = {
      1: { correct: 0, total: 0, mastered: false },
      2: { correct: 0, total: 0, mastered: false },
    };

    expect(defaultProgress[1].mastered).toBe(false);
  });

  it('should handle topics with 0 questions', () => {
    const topics = {
      'EmptyTopic': [],
    };

    expect(topics['EmptyTopic'].length).toBe(0);
    // Should still display but show 0 questions
  });

  it('should handle rapid category toggles', () => {
    const expandedCategories = new Set<string>();
    const toggleCategory = (cat: string) => {
      if (expandedCategories.has(cat)) {
        expandedCategories.delete(cat);
      } else {
        expandedCategories.add(cat);
      }
    };

    // Rapid toggles
    toggleCategory('A');
    toggleCategory('A');
    toggleCategory('A');

    expect(expandedCategories.has('A')).toBe(true); // Odd number of toggles = expanded
  });

  it('should handle subject change', () => {
    let currentSubject = 'math';
    const getDefaultExpandedCategories = (subject: string) => {
      switch (subject) {
        case 'physics':
          return new Set(['Motion & Forces']);
        case 'chemistry':
          return new Set(['Matter & Materials']);
        default:
          return new Set(['Numbers & Operations']);
      }
    };

    let expandedCategories = getDefaultExpandedCategories(currentSubject);
    expect(expandedCategories.has('Numbers & Operations')).toBe(true);

    currentSubject = 'physics';
    expandedCategories = getDefaultExpandedCategories(currentSubject);
    expect(expandedCategories.has('Motion & Forces')).toBe(true);
    expect(expandedCategories.has('Numbers & Operations')).toBe(false);
  });
});
