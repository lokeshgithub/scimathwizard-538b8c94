/**
 * Mastery-focused reward system
 * Rewards mastery over volume - higher levels = more stars
 */

// Level-based mastery bonuses (awarded when completing a level)
const LEVEL_MASTERY_BONUSES: Record<number, number> = {
  1: 50,   // Easy start
  2: 75,   // Building up
  3: 100,  // Getting harder
  4: 150,  // Intermediate
  5: 250,  // Advanced
  6: 500,  // Expert
  7: 1000, // Master
};

/**
 * Get bonus stars for mastering a level
 */
export const getLevelMasteryBonus = (level: number): number => {
  return LEVEL_MASTERY_BONUSES[level] || LEVEL_MASTERY_BONUSES[5];
};

/**
 * Get bonus stars for improving on a previously failed level
 * Rewards growth mindset - failing then passing earns extra
 */
export const getImprovementBonus = (previousAccuracy: number, currentAccuracy: number): number => {
  if (previousAccuracy >= currentAccuracy) return 0;

  const improvement = currentAccuracy - previousAccuracy;

  if (improvement >= 0.4) return 100; // 40%+ improvement
  if (improvement >= 0.3) return 75;  // 30%+ improvement
  if (improvement >= 0.2) return 50;  // 20%+ improvement
  if (improvement >= 0.1) return 25;  // 10%+ improvement
  return 0;
};

/**
 * Get bonus for correctly answering a hard question
 * Level multiplier encourages tackling higher levels
 */
export const getHardTopicBonus = (level: number, isCorrect: boolean): number => {
  if (!isCorrect) return 0;

  // Higher levels get progressively more bonus
  if (level >= 6) return 15;
  if (level >= 5) return 10;
  if (level >= 4) return 7;
  if (level >= 3) return 5;
  return 3;
};

/**
 * Calculate stars earned for a single question answer
 * Caps streak bonus at 3x to prevent easy-topic grinding
 *
 * @param isCorrect - Whether the answer was correct
 * @param streak - Current streak count
 * @param level - Question difficulty level (1-7)
 */
export const getQuestionStars = (isCorrect: boolean, streak: number, level: number): number => {
  if (!isCorrect) return 0;

  const baseStars = 10;

  // Level multiplier: L1=1x, L2=1.2x, ... L5=2x, L6=2.5x, L7=3x
  const levelMultiplier = Math.min(3, 1 + (level - 1) * 0.25);

  // Streak multiplier: Caps at 3x to prevent grinding easy topics
  const cappedStreak = Math.min(streak, 10);
  const streakMultiplier = cappedStreak >= 5 ? 3 :
                          cappedStreak >= 3 ? 2 :
                          cappedStreak >= 2 ? 1.5 : 1;

  return Math.round(baseStars * levelMultiplier * streakMultiplier);
};

/**
 * Get total stars for completing a level
 * Combines level mastery bonus with accuracy bonus
 */
export const getLevelCompletionStars = (level: number, accuracy: number): number => {
  const masteryBonus = getLevelMasteryBonus(level);

  // Accuracy bonus: 100% = 50% extra, 80% = 0% extra
  const accuracyBonus = accuracy >= 1.0 ? masteryBonus * 0.5 :
                        accuracy >= 0.9 ? masteryBonus * 0.25 : 0;

  return Math.round(masteryBonus + accuracyBonus);
};
