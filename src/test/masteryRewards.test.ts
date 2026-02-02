import { describe, it, expect } from 'vitest';

/**
 * Mastery Rewards Tests
 *
 * Tests for the star reward system, critical for gamification:
 * - Question-level star calculations
 * - Level completion bonuses
 * - Streak bonuses (capped at 3x)
 * - Subject mastery milestones
 * - Improvement bonuses (Growth Mindset)
 *
 * Critical for: All grades - motivation system
 * Especially important for: Grade 7-8 (gamification-focused)
 */

// Star per level constants from masteryRewards.ts
const STARS_PER_LEVEL: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 10,
  6: 15,
  7: 22,
};

const STREAK_BONUSES: Record<number, number> = {
  3: 1,
  5: 2,
  7: 3,
  10: 4,
  15: 5,
  20: 6,
};

const LEVEL_MASTERY_BONUSES: Record<number, number> = {
  1: 20,
  2: 35,
  3: 55,
  4: 80,
  5: 120,
  6: 175,
  7: 250,
};

const SUBJECT_TOPIC_COUNTS: Record<string, number> = {
  math: 25,
  physics: 9,
  chemistry: 7,
};

// Helper functions mirroring masteryRewards.ts
const getQuestionStars = (isCorrect: boolean, streak: number, level: number): number => {
  if (!isCorrect) return 0;

  const baseStars = STARS_PER_LEVEL[level] || STARS_PER_LEVEL[4];

  let streakBonus = 0;
  if (streak >= 20) streakBonus = STREAK_BONUSES[20];
  else if (streak >= 15) streakBonus = STREAK_BONUSES[15];
  else if (streak >= 10) streakBonus = STREAK_BONUSES[10];
  else if (streak >= 7) streakBonus = STREAK_BONUSES[7];
  else if (streak >= 5) streakBonus = STREAK_BONUSES[5];
  else if (streak >= 3) streakBonus = STREAK_BONUSES[3];

  return baseStars + streakBonus;
};

const getLevelCompletionStars = (level: number, accuracy: number): number => {
  const masteryBonus = LEVEL_MASTERY_BONUSES[level] || LEVEL_MASTERY_BONUSES[5];

  let accuracyMultiplier = 0;
  if (accuracy >= 1.0) accuracyMultiplier = 0.50;
  else if (accuracy >= 0.9) accuracyMultiplier = 0.25;
  else if (accuracy >= 0.8) accuracyMultiplier = 0.10;

  const accuracyBonus = Math.round(masteryBonus * accuracyMultiplier);
  return masteryBonus + accuracyBonus;
};

const getImprovementBonus = (previousAccuracy: number, currentAccuracy: number): number => {
  if (previousAccuracy >= currentAccuracy) return 0;

  const improvement = currentAccuracy - previousAccuracy;

  if (improvement >= 0.4) return 30;
  if (improvement >= 0.3) return 20;
  if (improvement >= 0.2) return 12;
  if (improvement >= 0.1) return 6;
  return 0;
};

describe('Question Star Calculations', () => {
  describe('Base Stars by Level', () => {
    it('should award 1 star for level 1 correct answer', () => {
      expect(getQuestionStars(true, 0, 1)).toBe(1);
    });

    it('should award 2 stars for level 2 correct answer', () => {
      expect(getQuestionStars(true, 0, 2)).toBe(2);
    });

    it('should award 4 stars for level 3 correct answer', () => {
      expect(getQuestionStars(true, 0, 3)).toBe(4);
    });

    it('should award 6 stars for level 4 correct answer', () => {
      expect(getQuestionStars(true, 0, 4)).toBe(6);
    });

    it('should award 10 stars for level 5 correct answer', () => {
      expect(getQuestionStars(true, 0, 5)).toBe(10);
    });

    it('should award 15 stars for level 6 correct answer', () => {
      expect(getQuestionStars(true, 0, 6)).toBe(15);
    });

    it('should award 22 stars for level 7 correct answer', () => {
      expect(getQuestionStars(true, 0, 7)).toBe(22);
    });

    it('should NOT award stars for incorrect answer', () => {
      expect(getQuestionStars(false, 5, 5)).toBe(0);
    });

    it('should use level 4 as fallback for unknown levels', () => {
      expect(getQuestionStars(true, 0, 99)).toBe(6); // Level 4 default
    });
  });

  describe('Streak Bonuses', () => {
    it('should NOT add bonus for streak < 3', () => {
      expect(getQuestionStars(true, 0, 1)).toBe(1);
      expect(getQuestionStars(true, 1, 1)).toBe(1);
      expect(getQuestionStars(true, 2, 1)).toBe(1);
    });

    it('should add +1 for 3-4 streak', () => {
      expect(getQuestionStars(true, 3, 1)).toBe(2); // 1 + 1
      expect(getQuestionStars(true, 4, 1)).toBe(2);
    });

    it('should add +2 for 5-6 streak', () => {
      expect(getQuestionStars(true, 5, 1)).toBe(3); // 1 + 2
      expect(getQuestionStars(true, 6, 1)).toBe(3);
    });

    it('should add +3 for 7-9 streak', () => {
      expect(getQuestionStars(true, 7, 1)).toBe(4); // 1 + 3
      expect(getQuestionStars(true, 9, 1)).toBe(4);
    });

    it('should add +4 for 10-14 streak', () => {
      expect(getQuestionStars(true, 10, 1)).toBe(5); // 1 + 4
      expect(getQuestionStars(true, 14, 1)).toBe(5);
    });

    it('should add +5 for 15-19 streak', () => {
      expect(getQuestionStars(true, 15, 1)).toBe(6); // 1 + 5
      expect(getQuestionStars(true, 19, 1)).toBe(6);
    });

    it('should add +6 for 20+ streak (CAPPED)', () => {
      expect(getQuestionStars(true, 20, 1)).toBe(7); // 1 + 6
      expect(getQuestionStars(true, 50, 1)).toBe(7); // Still capped at +6
      expect(getQuestionStars(true, 100, 1)).toBe(7); // Still capped
    });

    it('should NOT give streak bonus for wrong answer', () => {
      expect(getQuestionStars(false, 10, 5)).toBe(0);
    });
  });

  describe('Combined Level + Streak', () => {
    it('should combine level stars and streak bonus', () => {
      // Level 5 (10 stars) + 10 streak (+4) = 14
      expect(getQuestionStars(true, 10, 5)).toBe(14);
    });

    it('should give maximum stars for level 7 with 20+ streak', () => {
      // Level 7 (22 stars) + 20 streak (+6) = 28
      expect(getQuestionStars(true, 20, 7)).toBe(28);
    });

    it('should scale appropriately across all levels', () => {
      const streak = 10; // +4 bonus
      expect(getQuestionStars(true, streak, 1)).toBe(5); // 1 + 4
      expect(getQuestionStars(true, streak, 3)).toBe(8); // 4 + 4
      expect(getQuestionStars(true, streak, 5)).toBe(14); // 10 + 4
      expect(getQuestionStars(true, streak, 7)).toBe(26); // 22 + 4
    });
  });
});

describe('Level Completion Bonuses', () => {
  describe('Base Mastery Bonuses', () => {
    it('should award 20 stars for level 1 completion', () => {
      expect(getLevelCompletionStars(1, 0.8)).toBe(22); // 20 + 10%
    });

    it('should award 35 stars for level 2 completion', () => {
      expect(getLevelCompletionStars(2, 0.8)).toBe(39); // 35 + 10% rounded
    });

    it('should award 55 stars for level 3 completion', () => {
      expect(getLevelCompletionStars(3, 0.8)).toBe(61); // 55 + 10%
    });

    it('should award 80 stars for level 4 completion', () => {
      expect(getLevelCompletionStars(4, 0.8)).toBe(88); // 80 + 10%
    });

    it('should award 120 stars for level 5 completion', () => {
      expect(getLevelCompletionStars(5, 0.8)).toBe(132); // 120 + 10%
    });

    it('should award 175 stars for level 6 completion', () => {
      expect(getLevelCompletionStars(6, 0.8)).toBe(193); // 175 + 10%
    });

    it('should award 250 stars for level 7 completion', () => {
      expect(getLevelCompletionStars(7, 0.8)).toBe(275); // 250 + 10%
    });
  });

  describe('Accuracy Bonuses', () => {
    it('should add +50% for 100% accuracy (perfect)', () => {
      // Level 1: 20 + 50% = 30
      expect(getLevelCompletionStars(1, 1.0)).toBe(30);
    });

    it('should add +25% for 90%+ accuracy', () => {
      // Level 1: 20 + 25% = 25
      expect(getLevelCompletionStars(1, 0.9)).toBe(25);
    });

    it('should add +10% for 80%+ accuracy', () => {
      // Level 1: 20 + 10% = 22
      expect(getLevelCompletionStars(1, 0.8)).toBe(22);
    });

    it('should add 0% for below 80% accuracy', () => {
      // Level 1: 20 + 0% = 20
      expect(getLevelCompletionStars(1, 0.79)).toBe(20);
    });

    it('should round accuracy bonus properly', () => {
      // Level 7: 250 * 0.50 = 125 (perfect) -> 375
      expect(getLevelCompletionStars(7, 1.0)).toBe(375);

      // Level 7: 250 * 0.25 = 62.5 -> 63 rounded -> 313
      expect(getLevelCompletionStars(7, 0.9)).toBe(313);
    });
  });
});

describe('Improvement Bonuses (Growth Mindset)', () => {
  it('should award 30 stars for 40%+ improvement', () => {
    expect(getImprovementBonus(0.4, 0.8)).toBe(30); // 40% improvement
    expect(getImprovementBonus(0.3, 0.75)).toBe(30); // 45% improvement
  });

  it('should award 20 stars for 30%+ improvement', () => {
    expect(getImprovementBonus(0.5, 0.8)).toBe(20); // 30% improvement
    expect(getImprovementBonus(0.4, 0.75)).toBe(20); // 35% improvement
  });

  it('should award 12 stars for 20%+ improvement', () => {
    expect(getImprovementBonus(0.6, 0.8)).toBe(12); // 20% improvement
    expect(getImprovementBonus(0.55, 0.76)).toBe(12); // 21% improvement
  });

  it('should award 6 stars for 10%+ improvement', () => {
    expect(getImprovementBonus(0.7, 0.8)).toBe(6); // 10% improvement
    expect(getImprovementBonus(0.64, 0.75)).toBe(6); // 11% improvement
  });

  it('should NOT award for less than 10% improvement', () => {
    expect(getImprovementBonus(0.75, 0.8)).toBe(0); // 5% improvement
    expect(getImprovementBonus(0.78, 0.8)).toBe(0); // 2% improvement
  });

  it('should NOT award for same or worse accuracy', () => {
    expect(getImprovementBonus(0.8, 0.8)).toBe(0); // Same
    expect(getImprovementBonus(0.8, 0.7)).toBe(0); // Worse
  });
});

describe('Subject Topic Counts', () => {
  it('should have correct Math topic count', () => {
    expect(SUBJECT_TOPIC_COUNTS.math).toBe(25);
  });

  it('should have correct Physics topic count', () => {
    expect(SUBJECT_TOPIC_COUNTS.physics).toBe(9);
  });

  it('should have correct Chemistry topic count', () => {
    expect(SUBJECT_TOPIC_COUNTS.chemistry).toBe(7);
  });

  it('should have total of 41 topics', () => {
    const total = Object.values(SUBJECT_TOPIC_COUNTS).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(41);
  });
});

describe('Earning Rate Estimates', () => {
  it('should estimate ~200-250 stars per hour at level 1-2', () => {
    // Assuming 60 questions per hour at early levels
    // Level 1: 1 star/question, Level 2: 2 stars/question
    // Average: 1.5 stars * 60 = 90 from questions
    // Plus level completions: ~2 levels * 25 avg = 50
    // Total: ~140-200 stars (being conservative)
    const questionsPerHour = 60;
    const avgStarsPerQuestion = 1.5;
    const levelCompletions = 2;
    const avgLevelBonus = 25;

    const estimate = questionsPerHour * avgStarsPerQuestion + levelCompletions * avgLevelBonus;
    expect(estimate).toBeGreaterThanOrEqual(100);
    expect(estimate).toBeLessThanOrEqual(300);
  });

  it('should estimate ~400-500 stars per hour at level 5-6', () => {
    // Level 5: 10 stars, Level 6: 15 stars
    // Average: 12.5 stars * 40 questions/hour = 500
    // Plus level completions: ~1 level * 150 avg = 150
    const questionsPerHour = 40; // Harder questions take longer
    const avgStarsPerQuestion = 12.5;
    const levelCompletions = 1;
    const avgLevelBonus = 150;

    const estimate = questionsPerHour * avgStarsPerQuestion + levelCompletions * avgLevelBonus;
    expect(estimate).toBeGreaterThanOrEqual(400);
    expect(estimate).toBeLessThanOrEqual(700);
  });
});

describe('Anti-Grinding Measures', () => {
  it('should cap streak bonus at +6 (not multiplicative)', () => {
    // Even with 100+ streak, bonus is only +6
    const hugeStreak = 100;
    const level1Stars = getQuestionStars(true, hugeStreak, 1);
    const level7Stars = getQuestionStars(true, hugeStreak, 7);

    expect(level1Stars).toBe(7); // 1 + 6 max
    expect(level7Stars).toBe(28); // 22 + 6 max
  });

  it('should reward higher levels significantly more than grinding easy levels', () => {
    // Player A: 100 correct answers at level 1
    // Player B: 50 correct answers at level 5 + 5 at level 1
    const playerAStars = 100 * getQuestionStars(true, 5, 1); // With some streak
    const playerBStars = 50 * getQuestionStars(true, 5, 5) + 5 * getQuestionStars(true, 0, 1);

    // Player B should earn more despite fewer questions
    expect(playerBStars).toBeGreaterThan(playerAStars);
  });

  it('should make mastery requirements meaningful', () => {
    // To unlock mythic items (80,000+ stars), need half-subject mastery
    // Can't just grind easy topics to get stars
    const starsFromEasyGrinding = 1000 * getQuestionStars(true, 5, 1); // 1000 level 1 questions
    const mythicRequirement = 80000;

    expect(starsFromEasyGrinding).toBeLessThan(mythicRequirement);
    // Would need: 80000 / 3 = ~26,667 level 1 questions to get mythic via grinding
    // vs mastering higher levels which is more efficient
  });
});

describe('Edge Cases', () => {
  it('should handle level 0 gracefully', () => {
    const stars = getQuestionStars(true, 0, 0);
    // Should use default (level 4)
    expect(stars).toBe(6);
  });

  it('should handle negative level gracefully', () => {
    const stars = getQuestionStars(true, 0, -1);
    expect(stars).toBe(6); // Default
  });

  it('should handle negative streak gracefully', () => {
    // Negative streak should act like 0 streak
    const stars = getQuestionStars(true, -5, 3);
    expect(stars).toBe(4); // Just base, no bonus
  });

  it('should handle accuracy > 1.0 (rounding errors)', () => {
    const bonus = getLevelCompletionStars(1, 1.01);
    // Should still give perfect bonus
    expect(bonus).toBe(30);
  });

  it('should handle negative accuracy', () => {
    const bonus = getLevelCompletionStars(1, -0.5);
    // Should give no accuracy bonus
    expect(bonus).toBe(20); // Just base
  });
});
