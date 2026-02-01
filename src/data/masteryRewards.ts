/**
 * Progressive Reward System - Mastery-Focused
 *
 * Design principles:
 * - Reward consistent effort AND deep mastery
 * - Higher levels = significantly more stars per question
 * - Subject mastery unlocks the biggest rewards
 * - ~200-250 stars/hour of focused practice at early levels
 * - ~400-500 stars/hour when working on higher levels
 *
 * Expected progression:
 * - 4-5 hours: ~1,000-1,500 stars (Common/Uncommon rewards)
 * - 15-20 hours: ~5,000-8,000 stars (Rare rewards)
 * - 40-50 hours: ~15,000-20,000 stars (Epic/Legendary rewards)
 * - 100+ hours (half subject mastery): ~40,000+ stars (Mythic rewards)
 * - 200+ hours (full subject mastery): ~100,000+ stars (Transcendent rewards)
 *
 * Topic counts (from blueprint):
 * - Math: 25 topics
 * - Physics: 9 topics
 * - Chemistry: 7 topics
 * - Total: 41 topics
 */

// Topic counts per subject for mastery calculations
export const SUBJECT_TOPIC_COUNTS: Record<string, number> = {
  math: 25,
  physics: 9,
  chemistry: 7,
};

// Stars per correct answer at each level (progressive scaling)
// Reaching higher levels is hard, so reward each correct answer generously
const STARS_PER_LEVEL: Record<number, number> = {
  1: 1,    // Beginner - building foundation
  2: 2,    // Getting started
  3: 4,    // Making progress
  4: 6,    // Intermediate - good effort!
  5: 10,   // Advanced - impressive!
  6: 15,   // Expert - excellent work!
  7: 22,   // Master - amazing achievement!
};

// Streak bonuses (progressive, capped to prevent easy grinding)
const STREAK_BONUSES: Record<number, number> = {
  3: 1,    // Small encouragement
  5: 2,    // Getting hot!
  7: 3,    // On fire!
  10: 4,   // Blazing!
  15: 5,   // Great focus!
  20: 6,   // Maximum streak bonus (capped)
};

// Level completion bonuses (rewards for mastering each level in a topic)
const LEVEL_MASTERY_BONUSES: Record<number, number> = {
  1: 20,   // Good start!
  2: 35,   // Building momentum
  3: 55,   // Solid progress
  4: 80,   // Strong foundation
  5: 120,  // Advanced mastery
  6: 175,  // Expert level!
  7: 250,  // Master achievement!
};

// ============================================
// TOPIC & SUBJECT MASTERY BONUSES
// These are the BIG rewards for true dedication
// ============================================

// Bonus for mastering a full topic (completing all 7 levels)
export const TOPIC_MASTERY_BONUS = 500;

// Milestone bonuses for mastering multiple topics in ANY subject
export const TOPIC_COUNT_BONUSES: Record<number, number> = {
  3: 300,      // First milestone
  5: 600,      // Getting serious
  10: 1500,    // Dedicated learner
  15: 3000,    // True scholar
  20: 5000,    // Almost there
  25: 8000,    // Math master potential
  30: 12000,   // Multi-subject progress
  35: 18000,   // Approaching greatness
  41: 30000,   // ALL topics mastered!
};

// Subject-specific mastery bonuses (BIG rewards)
export const SUBJECT_MASTERY_BONUSES = {
  // Half-subject mastery (rounded up)
  halfMath: 5000,        // 13+ Math topics
  halfPhysics: 3000,     // 5+ Physics topics
  halfChemistry: 2500,   // 4+ Chemistry topics

  // Full subject mastery
  fullMath: 20000,       // All 25 Math topics
  fullPhysics: 12000,    // All 9 Physics topics
  fullChemistry: 10000,  // All 7 Chemistry topics

  // Multi-subject achievements
  twoSubjects: 25000,    // Master 2 full subjects
  allSubjects: 75000,    // Master ALL 3 subjects - ULTIMATE ACHIEVEMENT
};

/**
 * Get bonus stars for mastering a single level within a topic
 */
export const getLevelMasteryBonus = (level: number): number => {
  return LEVEL_MASTERY_BONUSES[level] || LEVEL_MASTERY_BONUSES[5];
};

/**
 * Get bonus for mastering a complete topic (all 7 levels)
 */
export const getTopicMasteryBonus = (): number => {
  return TOPIC_MASTERY_BONUS;
};

/**
 * Get milestone bonus for total topics mastered
 * Returns the bonus for the highest milestone reached
 */
export const getTopicCountMilestoneBonus = (totalTopicsMastered: number): number => {
  const milestones = Object.keys(TOPIC_COUNT_BONUSES)
    .map(Number)
    .sort((a, b) => b - a); // Descending

  for (const milestone of milestones) {
    if (totalTopicsMastered >= milestone) {
      return TOPIC_COUNT_BONUSES[milestone];
    }
  }
  return 0;
};

/**
 * Calculate subject mastery progress and bonuses
 */
export const getSubjectMasteryStatus = (
  masteredTopicsPerSubject: Record<string, number>
): {
  mathProgress: number;
  physicsProgress: number;
  chemistryProgress: number;
  earnedBonuses: string[];
  totalBonus: number;
} => {
  const math = masteredTopicsPerSubject.math || 0;
  const physics = masteredTopicsPerSubject.physics || 0;
  const chemistry = masteredTopicsPerSubject.chemistry || 0;

  const earnedBonuses: string[] = [];
  let totalBonus = 0;

  // Half-subject mastery checks
  if (math >= 13) {
    earnedBonuses.push('halfMath');
    totalBonus += SUBJECT_MASTERY_BONUSES.halfMath;
  }
  if (physics >= 5) {
    earnedBonuses.push('halfPhysics');
    totalBonus += SUBJECT_MASTERY_BONUSES.halfPhysics;
  }
  if (chemistry >= 4) {
    earnedBonuses.push('halfChemistry');
    totalBonus += SUBJECT_MASTERY_BONUSES.halfChemistry;
  }

  // Full subject mastery checks
  const fullSubjectCount =
    (math >= 25 ? 1 : 0) + (physics >= 9 ? 1 : 0) + (chemistry >= 7 ? 1 : 0);

  if (math >= 25) {
    earnedBonuses.push('fullMath');
    totalBonus += SUBJECT_MASTERY_BONUSES.fullMath;
  }
  if (physics >= 9) {
    earnedBonuses.push('fullPhysics');
    totalBonus += SUBJECT_MASTERY_BONUSES.fullPhysics;
  }
  if (chemistry >= 7) {
    earnedBonuses.push('fullChemistry');
    totalBonus += SUBJECT_MASTERY_BONUSES.fullChemistry;
  }

  // Multi-subject bonuses
  if (fullSubjectCount >= 3) {
    earnedBonuses.push('allSubjects');
    totalBonus += SUBJECT_MASTERY_BONUSES.allSubjects;
  } else if (fullSubjectCount >= 2) {
    earnedBonuses.push('twoSubjects');
    totalBonus += SUBJECT_MASTERY_BONUSES.twoSubjects;
  }

  return {
    mathProgress: Math.round((math / 25) * 100),
    physicsProgress: Math.round((physics / 9) * 100),
    chemistryProgress: Math.round((chemistry / 7) * 100),
    earnedBonuses,
    totalBonus,
  };
};

/**
 * Get bonus stars for improving on a previously failed level
 * Rewards growth mindset
 */
export const getImprovementBonus = (previousAccuracy: number, currentAccuracy: number): number => {
  if (previousAccuracy >= currentAccuracy) return 0;

  const improvement = currentAccuracy - previousAccuracy;

  if (improvement >= 0.4) return 30; // 40%+ improvement - huge growth!
  if (improvement >= 0.3) return 20; // 30%+ improvement
  if (improvement >= 0.2) return 12; // 20%+ improvement
  if (improvement >= 0.1) return 6;  // 10%+ improvement
  return 0;
};

/**
 * Calculate stars earned for a single question answer
 *
 * Progressive formula - higher levels reward more:
 * - Level 1: 1 star, Level 2: 2 stars, Level 3: 4 stars
 * - Level 4: 6 stars, Level 5: 10 stars
 * - Level 6: 15 stars, Level 7: 22 stars
 *
 * Streak bonuses are capped at +6 to prevent easy grinding:
 * - 3 streak: +1, 5 streak: +2, 7 streak: +3
 * - 10 streak: +4, 15 streak: +5, 20+ streak: +6
 *
 * At this rate: ~50-60 correct answers = ~150 stars (first reward!)
 */
export const getQuestionStars = (isCorrect: boolean, streak: number, level: number): number => {
  if (!isCorrect) return 0;

  // Base stars based on level (progressive)
  const baseStars = STARS_PER_LEVEL[level] || STARS_PER_LEVEL[4];

  // Progressive streak bonus - check highest applicable tier (CAPPED at 6)
  let streakBonus = 0;
  if (streak >= 20) streakBonus = STREAK_BONUSES[20];
  else if (streak >= 15) streakBonus = STREAK_BONUSES[15];
  else if (streak >= 10) streakBonus = STREAK_BONUSES[10];
  else if (streak >= 7) streakBonus = STREAK_BONUSES[7];
  else if (streak >= 5) streakBonus = STREAK_BONUSES[5];
  else if (streak >= 3) streakBonus = STREAK_BONUSES[3];

  return baseStars + streakBonus;
};

/**
 * Get total stars for completing a level
 * Big rewards for mastery, extra for perfect/near-perfect scores
 */
export const getLevelCompletionStars = (level: number, accuracy: number): number => {
  const masteryBonus = getLevelMasteryBonus(level);

  // Accuracy bonus: 100% = +50%, 90%+ = +25%, 80%+ = +10%
  let accuracyMultiplier = 0;
  if (accuracy >= 1.0) accuracyMultiplier = 0.50;      // Perfect!
  else if (accuracy >= 0.9) accuracyMultiplier = 0.25; // Excellent
  else if (accuracy >= 0.8) accuracyMultiplier = 0.10; // Good

  const accuracyBonus = Math.round(masteryBonus * accuracyMultiplier);

  return masteryBonus + accuracyBonus;
};
