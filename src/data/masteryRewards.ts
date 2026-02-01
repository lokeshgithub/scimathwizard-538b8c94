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
 * Very conservative formula - rewards require real effort:
 * - Levels 1-3: 1 star (easy questions)
 * - Levels 4-5: 2 stars (medium questions)
 * - Levels 6-7: 3 stars (hard questions)
 * - Small streak bonus: +1 at streak 10 only
 *
 * At this rate: ~60-80 correct answers = ~100 stars
 * Cheapest item (150 stars) = ~120 correct answers = ~2 hours focused practice
 *
 * @param isCorrect - Whether the answer was correct
 * @param streak - Current streak count
 * @param level - Question difficulty level (1-7)
 */
export const getQuestionStars = (isCorrect: boolean, streak: number, level: number): number => {
  if (!isCorrect) return 0;

  // Base stars based on difficulty tier (not linear)
  const baseStars = level <= 3 ? 1 : level <= 5 ? 2 : 3;

  // Very small streak bonus (only at streak 10+)
  const streakBonus = streak >= 10 ? 1 : 0;

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
