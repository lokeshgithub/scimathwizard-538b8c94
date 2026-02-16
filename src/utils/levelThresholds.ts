/**
 * Returns the mastery threshold for a given level.
 * L1: 100%, L2-3: 90%, L4-5: 80%, L6+: 70%
 */
export const getThresholdForLevel = (level: number): number => {
  if (level <= 1) return 1.0;
  if (level <= 3) return 0.9;
  if (level <= 5) return 0.8;
  return 0.7;
};
