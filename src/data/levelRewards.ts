// Level-based reward system with badges, certificates, and titles

export interface LevelReward {
  level: number;
  badge: {
    name: string;
    icon: string;
    color: string;
    description: string;
  };
  title: string;
  certificate: {
    name: string;
    description: string;
  };
  starsBonus: number;
  achievementMessage: string;
  percentileMessage: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  {
    level: 1,
    badge: {
      name: 'Beginner Badge',
      icon: '🌱',
      color: 'from-green-400 to-green-600',
      description: 'You\'ve started your learning journey!',
    },
    title: 'Explorer',
    certificate: {
      name: 'Certificate of Beginning',
      description: 'Successfully completed Level 1 challenges',
    },
    starsBonus: 50,
    achievementMessage: 'Great start! You\'re on your way to becoming a master!',
    percentileMessage: 'You\'re building a strong foundation!',
  },
  {
    level: 2,
    badge: {
      name: 'Bronze Badge',
      icon: '🥉',
      color: 'from-amber-600 to-amber-800',
      description: 'You\'re developing strong skills!',
    },
    title: 'Apprentice',
    certificate: {
      name: 'Certificate of Progress',
      description: 'Demonstrated consistent learning in Level 2',
    },
    starsBonus: 100,
    achievementMessage: 'Excellent progress! Keep pushing forward!',
    percentileMessage: 'You\'re above average in your class!',
  },
  {
    level: 3,
    badge: {
      name: 'Silver Badge',
      icon: '🥈',
      color: 'from-gray-300 to-gray-500',
      description: 'You\'re becoming smarter every day!',
    },
    title: 'Scholar',
    certificate: {
      name: 'Certificate of Achievement',
      description: 'Achieved Level 3 mastery',
    },
    starsBonus: 200,
    achievementMessage: '🎉 Amazing! You\'re getting smarter with every question!',
    percentileMessage: 'You\'re in the top 50% of students in your class!',
  },
  {
    level: 4,
    badge: {
      name: 'Gold Badge',
      icon: '🥇',
      color: 'from-yellow-400 to-yellow-600',
      description: 'Outstanding performance!',
    },
    title: 'Champion',
    certificate: {
      name: 'Certificate of Excellence',
      description: 'Achieved Level 4 excellence',
    },
    starsBonus: 350,
    achievementMessage: '🏆 Incredible! You\'re among the best in your class!',
    percentileMessage: 'You\'re in the top 25% of students!',
  },
  {
    level: 5,
    badge: {
      name: 'Platinum Badge',
      icon: '💎',
      color: 'from-cyan-400 to-blue-600',
      description: 'You\'re a class topper!',
    },
    title: 'Genius',
    certificate: {
      name: 'Certificate of Distinction',
      description: 'Achieved Level 5 distinction - Class Topper Status',
    },
    starsBonus: 500,
    achievementMessage: '🌟 EXTRAORDINARY! You\'re among the TOP 5% of your class!',
    percentileMessage: 'You\'re a CLASS TOPPER! Top 5% nationwide!',
  },
  {
    level: 6,
    badge: {
      name: 'Diamond Badge',
      icon: '👑',
      color: 'from-purple-500 to-pink-600',
      description: 'You\'re among the best in India!',
    },
    title: 'Wizard Master',
    certificate: {
      name: 'Certificate of Mastery',
      description: 'Achieved Level 6 mastery - National Level Excellence',
    },
    starsBonus: 1000,
    achievementMessage: '👑 LEGENDARY! You\'re among the TOP 1% in INDIA!',
    percentileMessage: 'You\'re a NATIONAL CHAMPION! Top 1% in India!',
  },
  {
    level: 7,
    badge: {
      name: 'Legendary Badge',
      icon: '⭐',
      color: 'from-rose-500 to-orange-500',
      description: 'Absolute mastery achieved!',
    },
    title: 'Grand Master',
    certificate: {
      name: 'Certificate of Grand Mastery',
      description: 'Achieved Level 7 - Legendary Status',
    },
    starsBonus: 2000,
    achievementMessage: '🔥 UNSTOPPABLE! You\'ve achieved LEGENDARY status!',
    percentileMessage: 'You\'re among the ELITE! Olympiad Champion material!',
  },
];

export const getLevelReward = (level: number): LevelReward | undefined => {
  return LEVEL_REWARDS.find(r => r.level === level);
};

export const getHighestUnlockedReward = (maxLevelReached: number): LevelReward | undefined => {
  return LEVEL_REWARDS.filter(r => r.level <= maxLevelReached).pop();
};

export const getTotalBonusStars = (maxLevelReached: number): number => {
  return LEVEL_REWARDS
    .filter(r => r.level <= maxLevelReached)
    .reduce((sum, r) => sum + r.starsBonus, 0);
};

export const getLevelProgressMessage = (currentLevel: number): string => {
  if (currentLevel >= 6) return 'You\'re among the TOP 1% in India! 🇮🇳';
  if (currentLevel >= 5) return 'You\'re a CLASS TOPPER! 🏆';
  if (currentLevel >= 4) return 'You\'re in the top 25%! 💪';
  if (currentLevel >= 3) return 'You\'re getting smarter! 🧠';
  if (currentLevel >= 2) return 'Great progress! Keep going! 📈';
  return 'Your journey begins! 🌱';
};
