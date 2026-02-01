/**
 * Mastery-focused reward system (Conservative)
 *
 * Design principle: Stars should require real effort
 * - ~100-150 stars/hour of practice
 * - Cheapest item requires 2-3 hours
 * - Legendary items require 100+ hours
 */

// Level-based mastery bonuses (awarded when completing a level)
// Much more conservative - completing a level is a small bonus, not a windfall
const LEVEL_MASTERY_BONUSES: Record<number, number> = {
  1: 5,    // Easy start
  2: 8,    // Building up
  3: 12,   // Getting harder
  4: 18,   // Intermediate
  5: 25,   // Advanced
  6: 35,   // Expert
  7: 50,   // Master
};

/**
 * Get bonus stars for mastering a level
 */
export const getLevelMasteryBonus = (level: number): number => {
  return LEVEL_MASTERY_BONUSES[level] || LEVEL_MASTERY_BONUSES[5];
};

/**
 * Get bonus stars for improving on a previously failed level
 * Small bonus for growth mindset
 */
export const getImprovementBonus = (previousAccuracy: number, currentAccuracy: number): number => {
  if (previousAccuracy >= currentAccuracy) return 0;

  const improvement = currentAccuracy - previousAccuracy;

  if (improvement >= 0.4) return 10; // 40%+ improvement
  if (improvement >= 0.3) return 7;  // 30%+ improvement
  if (improvement >= 0.2) return 5;  // 20%+ improvement
  if (improvement >= 0.1) return 3;  // 10%+ improvement
  return 0;
};

/**
 * Calculate stars earned for a single question answer
 *
 * Conservative formula:
 * - Level 1: 1 star
 * - Level 2: 2 stars
 * - Level 3: 3 stars (and so on, linear)
 * - Small streak bonus: +1 at streak 5, +2 at streak 10
 *
 * @param isCorrect - Whether the answer was correct
 * @param streak - Current streak count
 * @param level - Question difficulty level (1-7)
 */
export const getQuestionStars = (isCorrect: boolean, streak: number, level: number): number => {
  if (!isCorrect) return 0;

  // Base stars = level number (1-7 stars, linear)
  const baseStars = Math.min(level, 7);

  // Small streak bonus (capped at +2)
  const streakBonus = streak >= 10 ? 2 : streak >= 5 ? 1 : 0;

  return baseStars + streakBonus;
};

/**
 * Get total stars for completing a level
 * Small bonus for mastery, slight extra for perfect score
 */
export const getLevelCompletionStars = (level: number, accuracy: number): number => {
  const masteryBonus = getLevelMasteryBonus(level);

  // Small accuracy bonus: 100% = +50%, 90%+ = +25%
  const accuracyBonus = accuracy >= 1.0 ? Math.round(masteryBonus * 0.5) :
                        accuracy >= 0.9 ? Math.round(masteryBonus * 0.25) : 0;

  return masteryBonus + accuracyBonus;
};
