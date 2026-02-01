/**
 * Star Shop Items
 *
 * Digital rewards students can purchase with earned stars.
 *
 * Star earning rate (progressive by level):
 * - Level 1-3: 1-4 stars + streak bonus (0-6)
 * - Level 4-5: 6-10 stars + streak bonus
 * - Level 6-7: 15-22 stars + streak bonus
 * - Plus level completion bonuses (20-250 stars per level)
 * - Plus topic mastery bonus (500 stars per full topic)
 * - Plus subject mastery bonuses (up to 75,000 for all subjects!)
 *
 * Expected progression:
 * - ~200-300 stars per hour at early levels
 * - ~400-500 stars per hour at advanced levels
 *
 * Pricing tiers (effort required):
 * - Common: 4-5 hours → 800-1,200 stars
 * - Uncommon: 8-12 hours → 2,000-4,000 stars
 * - Rare: 20-30 hours → 6,000-10,000 stars
 * - Epic: 40-60 hours → 15,000-25,000 stars
 * - Legendary: 80-120 hours → 35,000-60,000 stars
 * - Mythic: Half-subject mastery → 80,000-120,000 stars
 * - Transcendent: Full subject mastery → 150,000-250,000 stars
 */

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  price: number;
  category: 'avatar' | 'badge' | 'theme' | 'pet' | 'title' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'transcendent';
  unlockMessage: string;
  // Optional: require specific mastery achievements
  requiresMastery?: {
    type: 'topics' | 'halfSubject' | 'fullSubject' | 'multiSubject';
    subject?: 'math' | 'physics' | 'chemistry' | 'any';
    count?: number;
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  // === COMMON (800-1,200 stars) - 4-5 hours of practice ===
  {
    id: 'avatar_wizard_hat',
    name: 'Wizard Hat',
    description: 'A magical pointy hat for your profile',
    emoji: '🧙',
    price: 800,
    category: 'avatar',
    rarity: 'common',
    unlockMessage: 'You got a magical wizard hat!',
  },
  {
    id: 'badge_star_collector',
    name: 'Star Collector',
    description: 'Shows you love collecting stars',
    emoji: '⭐',
    price: 900,
    category: 'badge',
    rarity: 'common',
    unlockMessage: 'Star Collector badge unlocked!',
  },
  {
    id: 'avatar_book_worm',
    name: 'Book Worm',
    description: 'A cute reading companion',
    emoji: '📚',
    price: 1000,
    category: 'avatar',
    rarity: 'common',
    unlockMessage: 'Book Worm is now your companion!',
  },
  {
    id: 'badge_early_bird',
    name: 'Early Bird',
    description: 'For students who start early',
    emoji: '🐦',
    price: 1100,
    category: 'badge',
    rarity: 'common',
    unlockMessage: 'Early Bird badge earned!',
  },
  {
    id: 'title_apprentice',
    name: 'Apprentice Title',
    description: 'Display "Apprentice" on your profile',
    emoji: '🎓',
    price: 1200,
    category: 'title',
    rarity: 'common',
    unlockMessage: 'You are now an Apprentice!',
  },

  // === UNCOMMON (2,000-4,000 stars) - 8-12 hours of practice ===
  {
    id: 'pet_owl',
    name: 'Wise Owl',
    description: 'A magical owl companion',
    emoji: '🦉',
    price: 2000,
    category: 'pet',
    rarity: 'uncommon',
    unlockMessage: 'Wise Owl joins your journey!',
  },
  {
    id: 'badge_streak_master',
    name: 'Streak Master',
    description: 'For those who keep their streaks going',
    emoji: '🔥',
    price: 2500,
    category: 'badge',
    rarity: 'uncommon',
    unlockMessage: 'Streak Master badge unlocked!',
  },
  {
    id: 'avatar_lightning',
    name: 'Lightning Bolt',
    description: 'Show your quick thinking',
    emoji: '⚡',
    price: 3000,
    category: 'avatar',
    rarity: 'uncommon',
    unlockMessage: 'Lightning speed unlocked!',
  },
  {
    id: 'theme_ocean',
    name: 'Ocean Theme',
    description: 'Cool blue ocean vibes',
    emoji: '🌊',
    price: 3500,
    category: 'theme',
    rarity: 'uncommon',
    unlockMessage: 'Ocean Theme activated!',
  },
  {
    id: 'title_scholar',
    name: 'Scholar Title',
    description: 'Display "Scholar" on your profile',
    emoji: '📖',
    price: 4000,
    category: 'title',
    rarity: 'uncommon',
    unlockMessage: 'You are now a Scholar!',
  },

  // === RARE (6,000-10,000 stars) - 20-30 hours of practice ===
  {
    id: 'pet_dragon_baby',
    name: 'Baby Dragon',
    description: 'A tiny dragon friend',
    emoji: '🐉',
    price: 6000,
    category: 'pet',
    rarity: 'rare',
    unlockMessage: 'Baby Dragon hatched!',
  },
  {
    id: 'badge_perfectionist',
    name: 'Perfectionist',
    description: 'For those who aim for 100%',
    emoji: '💯',
    price: 7000,
    category: 'badge',
    rarity: 'rare',
    unlockMessage: 'Perfectionist badge earned!',
  },
  {
    id: 'theme_galaxy',
    name: 'Galaxy Theme',
    description: 'Stars and cosmic beauty',
    emoji: '🌌',
    price: 8000,
    category: 'theme',
    rarity: 'rare',
    unlockMessage: 'Galaxy Theme unlocked!',
  },
  {
    id: 'avatar_crown_silver',
    name: 'Silver Crown',
    description: 'A shiny silver crown',
    emoji: '👑',
    price: 9000,
    category: 'avatar',
    rarity: 'rare',
    unlockMessage: 'Silver Crown is yours!',
  },
  {
    id: 'title_expert',
    name: 'Expert Title',
    description: 'Display "Expert" on your profile',
    emoji: '🏆',
    price: 10000,
    category: 'title',
    rarity: 'rare',
    unlockMessage: 'You are now an Expert!',
  },

  // === EPIC (15,000-25,000 stars) - 40-60 hours of practice ===
  {
    id: 'pet_phoenix',
    name: 'Phoenix',
    description: 'Rise from mistakes stronger',
    emoji: '🔥',
    price: 15000,
    category: 'pet',
    rarity: 'epic',
    unlockMessage: 'Phoenix rises with you!',
  },
  {
    id: 'theme_aurora',
    name: 'Aurora Theme',
    description: 'Beautiful northern lights',
    emoji: '🌈',
    price: 18000,
    category: 'theme',
    rarity: 'epic',
    unlockMessage: 'Aurora Theme glows!',
  },
  {
    id: 'avatar_crown_gold',
    name: 'Golden Crown',
    description: 'The crown of dedication',
    emoji: '👑',
    price: 20000,
    category: 'avatar',
    rarity: 'epic',
    unlockMessage: 'Golden Crown achieved!',
  },
  {
    id: 'badge_champion',
    name: 'Champion Badge',
    description: 'Only for true champions',
    emoji: '🏅',
    price: 22000,
    category: 'badge',
    rarity: 'epic',
    unlockMessage: 'Champion Badge unlocked!',
  },
  {
    id: 'title_master',
    name: 'Master Title',
    description: 'Display "Master" on your profile',
    emoji: '🎖️',
    price: 25000,
    category: 'title',
    rarity: 'epic',
    unlockMessage: 'You are now a Master!',
  },

  // === LEGENDARY (35,000-60,000 stars) - 80-120 hours of practice ===
  {
    id: 'pet_unicorn',
    name: 'Magical Unicorn',
    description: 'A rare and beautiful companion',
    emoji: '🦄',
    price: 35000,
    category: 'pet',
    rarity: 'legendary',
    unlockMessage: 'Magical Unicorn is yours!',
  },
  {
    id: 'theme_enchanted',
    name: 'Enchanted Forest',
    description: 'Magical forest theme',
    emoji: '🌳',
    price: 45000,
    category: 'theme',
    rarity: 'legendary',
    unlockMessage: 'Enchanted Forest unlocked!',
  },
  {
    id: 'badge_legend',
    name: 'Legend Badge',
    description: 'A badge of true dedication',
    emoji: '💎',
    price: 50000,
    category: 'badge',
    rarity: 'legendary',
    unlockMessage: 'Legend Badge earned through dedication!',
  },
  {
    id: 'title_grandmaster',
    name: 'Grandmaster Title',
    description: 'Display "Grandmaster" - elite status',
    emoji: '🌟',
    price: 60000,
    category: 'title',
    rarity: 'legendary',
    unlockMessage: 'GRANDMASTER! Elite achievement unlocked!',
  },

  // === MYTHIC (80,000-120,000 stars) - Requires half-subject mastery ===
  {
    id: 'pet_galaxy_dragon',
    name: 'Galaxy Dragon',
    description: 'A dragon made of stars - for true scholars',
    emoji: '🐲',
    price: 80000,
    category: 'pet',
    rarity: 'mythic',
    unlockMessage: 'Galaxy Dragon descends from the cosmos!',
    requiresMastery: { type: 'halfSubject', subject: 'any' },
  },
  {
    id: 'badge_half_master_math',
    name: 'Math Scholar',
    description: 'Mastered half of Mathematics',
    emoji: '🔢',
    price: 85000,
    category: 'badge',
    rarity: 'mythic',
    unlockMessage: 'Math Scholar - halfway to mathematical mastery!',
    requiresMastery: { type: 'halfSubject', subject: 'math' },
  },
  {
    id: 'badge_half_master_physics',
    name: 'Physics Scholar',
    description: 'Mastered half of Physics',
    emoji: '⚛️',
    price: 85000,
    category: 'badge',
    rarity: 'mythic',
    unlockMessage: 'Physics Scholar - understanding the universe!',
    requiresMastery: { type: 'halfSubject', subject: 'physics' },
  },
  {
    id: 'badge_half_master_chemistry',
    name: 'Chemistry Scholar',
    description: 'Mastered half of Chemistry',
    emoji: '🧪',
    price: 85000,
    category: 'badge',
    rarity: 'mythic',
    unlockMessage: 'Chemistry Scholar - mastering matter!',
    requiresMastery: { type: 'halfSubject', subject: 'chemistry' },
  },
  {
    id: 'theme_celestial',
    name: 'Celestial Theme',
    description: 'Divine cosmic patterns - mythic rarity',
    emoji: '✨',
    price: 100000,
    category: 'theme',
    rarity: 'mythic',
    unlockMessage: 'Celestial Theme - you shine among the stars!',
    requiresMastery: { type: 'topics', count: 15 },
  },
  {
    id: 'title_sage',
    name: 'Sage Title',
    description: 'Display "Sage" - true wisdom achieved',
    emoji: '🧙‍♂️',
    price: 120000,
    category: 'title',
    rarity: 'mythic',
    unlockMessage: 'SAGE! Your wisdom is recognized!',
    requiresMastery: { type: 'halfSubject', subject: 'any' },
  },

  // === TRANSCENDENT (150,000-250,000 stars) - Requires full subject mastery ===
  {
    id: 'pet_cosmic_phoenix',
    name: 'Cosmic Phoenix',
    description: 'Born from the heart of a star - ultimate companion',
    emoji: '🌟',
    price: 150000,
    category: 'pet',
    rarity: 'transcendent',
    unlockMessage: 'Cosmic Phoenix - reborn through mastery!',
    requiresMastery: { type: 'fullSubject', subject: 'any' },
  },
  {
    id: 'badge_math_master',
    name: 'Mathematics Master',
    description: 'Complete mastery of all Math topics',
    emoji: '🏛️',
    price: 160000,
    category: 'badge',
    rarity: 'transcendent',
    unlockMessage: 'MATHEMATICS MASTER - all 25 topics conquered!',
    requiresMastery: { type: 'fullSubject', subject: 'math' },
  },
  {
    id: 'badge_physics_master',
    name: 'Physics Master',
    description: 'Complete mastery of all Physics topics',
    emoji: '🌌',
    price: 160000,
    category: 'badge',
    rarity: 'transcendent',
    unlockMessage: 'PHYSICS MASTER - laws of the universe understood!',
    requiresMastery: { type: 'fullSubject', subject: 'physics' },
  },
  {
    id: 'badge_chemistry_master',
    name: 'Chemistry Master',
    description: 'Complete mastery of all Chemistry topics',
    emoji: '⚗️',
    price: 160000,
    category: 'badge',
    rarity: 'transcendent',
    unlockMessage: 'CHEMISTRY MASTER - molecular secrets revealed!',
    requiresMastery: { type: 'fullSubject', subject: 'chemistry' },
  },
  {
    id: 'theme_dimensional',
    name: 'Dimensional Rift',
    description: 'Theme from another dimension - transcendent beauty',
    emoji: '🌀',
    price: 180000,
    category: 'theme',
    rarity: 'transcendent',
    unlockMessage: 'Dimensional Rift - reality bends to your will!',
    requiresMastery: { type: 'fullSubject', subject: 'any' },
  },
  {
    id: 'title_archmage',
    name: 'Archmage Title',
    description: 'Display "Archmage" - supreme knowledge',
    emoji: '🔮',
    price: 200000,
    category: 'title',
    rarity: 'transcendent',
    unlockMessage: 'ARCHMAGE! Supreme mastery achieved!',
    requiresMastery: { type: 'fullSubject', subject: 'any' },
  },
  {
    id: 'badge_dual_master',
    name: 'Dual Discipline Master',
    description: 'Mastered two complete subjects',
    emoji: '⚔️',
    price: 220000,
    category: 'badge',
    rarity: 'transcendent',
    unlockMessage: 'DUAL MASTER - two subjects conquered!',
    requiresMastery: { type: 'multiSubject', count: 2 },
  },

  // === ULTIMATE (300,000+ stars) - All subjects mastered ===
  {
    id: 'pet_eternal_dragon',
    name: 'Eternal Dragon',
    description: 'The ultimate companion - grants wishes to masters',
    emoji: '🐉',
    price: 300000,
    category: 'pet',
    rarity: 'transcendent',
    unlockMessage: 'ETERNAL DRAGON - the ultimate achievement!',
    requiresMastery: { type: 'multiSubject', count: 3 },
  },
  {
    id: 'badge_triple_crown',
    name: 'Triple Crown',
    description: 'Mastered ALL three subjects - rarest badge',
    emoji: '👑',
    price: 350000,
    category: 'badge',
    rarity: 'transcendent',
    unlockMessage: 'TRIPLE CROWN - Math, Physics, Chemistry MASTERED!',
    requiresMastery: { type: 'multiSubject', count: 3 },
  },
  {
    id: 'theme_omniscient',
    name: 'Omniscient Theme',
    description: 'See all, know all - the ultimate theme',
    emoji: '👁️',
    price: 400000,
    category: 'theme',
    rarity: 'transcendent',
    unlockMessage: 'OMNISCIENT - you have achieved enlightenment!',
    requiresMastery: { type: 'multiSubject', count: 3 },
  },
  {
    id: 'title_supreme_scholar',
    name: 'Supreme Scholar Title',
    description: 'Display "Supreme Scholar" - the ultimate honor',
    emoji: '🌠',
    price: 500000,
    category: 'title',
    rarity: 'transcendent',
    unlockMessage: 'SUPREME SCHOLAR - The pinnacle of achievement!',
    requiresMastery: { type: 'multiSubject', count: 3 },
  },
];

// Get items by category
export const getItemsByCategory = (category: ShopItem['category']): ShopItem[] => {
  return SHOP_ITEMS.filter(item => item.category === category);
};

// Get items by rarity
export const getItemsByRarity = (rarity: ShopItem['rarity']): ShopItem[] => {
  return SHOP_ITEMS.filter(item => item.rarity === rarity);
};

// Get affordable items based on star count
export const getAffordableItems = (stars: number): ShopItem[] => {
  return SHOP_ITEMS.filter(item => item.price <= stars);
};

// Check if user meets mastery requirements for an item
export const meetsRequirements = (
  item: ShopItem,
  masteredTopicsPerSubject: Record<string, number>
): boolean => {
  if (!item.requiresMastery) return true;

  const math = masteredTopicsPerSubject.math || 0;
  const physics = masteredTopicsPerSubject.physics || 0;
  const chemistry = masteredTopicsPerSubject.chemistry || 0;
  const total = math + physics + chemistry;

  switch (item.requiresMastery.type) {
    case 'topics':
      return total >= (item.requiresMastery.count || 0);

    case 'halfSubject':
      if (item.requiresMastery.subject === 'math') return math >= 13;
      if (item.requiresMastery.subject === 'physics') return physics >= 5;
      if (item.requiresMastery.subject === 'chemistry') return chemistry >= 4;
      // 'any' - at least one half-subject
      return math >= 13 || physics >= 5 || chemistry >= 4;

    case 'fullSubject':
      if (item.requiresMastery.subject === 'math') return math >= 25;
      if (item.requiresMastery.subject === 'physics') return physics >= 9;
      if (item.requiresMastery.subject === 'chemistry') return chemistry >= 7;
      // 'any' - at least one full subject
      return math >= 25 || physics >= 9 || chemistry >= 7;

    case 'multiSubject':
      const fullCount =
        (math >= 25 ? 1 : 0) + (physics >= 9 ? 1 : 0) + (chemistry >= 7 ? 1 : 0);
      return fullCount >= (item.requiresMastery.count || 2);

    default:
      return true;
  }
};

// Rarity colors for UI
export const RARITY_COLORS: Record<ShopItem['rarity'], string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-emerald-500',
  rare: 'from-blue-400 to-indigo-500',
  epic: 'from-purple-400 to-fuchsia-500',
  legendary: 'from-yellow-400 to-orange-500',
  mythic: 'from-pink-400 to-rose-600',
  transcendent: 'from-cyan-300 via-purple-500 to-pink-500',
};

export const RARITY_LABELS: Record<ShopItem['rarity'], string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
  transcendent: 'Transcendent',
};

// Rarity glow effects for UI
export const RARITY_GLOW: Record<ShopItem['rarity'], string> = {
  common: '',
  uncommon: 'shadow-green-400/30',
  rare: 'shadow-blue-400/40',
  epic: 'shadow-purple-400/50',
  legendary: 'shadow-yellow-400/60 animate-pulse',
  mythic: 'shadow-pink-500/70 animate-pulse',
  transcendent: 'shadow-cyan-400/80 animate-pulse shadow-2xl',
};
