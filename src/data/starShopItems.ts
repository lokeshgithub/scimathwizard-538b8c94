/**
 * Star Shop Items
 *
 * Digital rewards students can purchase with earned stars.
 * Prices are balanced so:
 * - Cheap items: achievable with 5 level 1 completions (~500 stars)
 * - Medium items: need 1-2 chapters complete (~2000-5000 stars)
 * - Expensive items: need 3-4 chapters complete (~10000+ stars)
 * - Legendary items: dedicated practice required (~25000+ stars)
 */

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  price: number;
  category: 'avatar' | 'badge' | 'theme' | 'pet' | 'title' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockMessage: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // === COMMON (100-500 stars) - Easy to get ===
  {
    id: 'avatar_wizard_hat',
    name: 'Wizard Hat',
    description: 'A magical pointy hat for your profile',
    emoji: '🧙',
    price: 100,
    category: 'avatar',
    rarity: 'common',
    unlockMessage: 'You got a magical wizard hat!',
  },
  {
    id: 'badge_star_collector',
    name: 'Star Collector',
    description: 'Shows you love collecting stars',
    emoji: '⭐',
    price: 150,
    category: 'badge',
    rarity: 'common',
    unlockMessage: 'Star Collector badge unlocked!',
  },
  {
    id: 'avatar_book_worm',
    name: 'Book Worm',
    description: 'A cute reading companion',
    emoji: '📚',
    price: 200,
    category: 'avatar',
    rarity: 'common',
    unlockMessage: 'Book Worm is now your companion!',
  },
  {
    id: 'badge_early_bird',
    name: 'Early Bird',
    description: 'For students who start early',
    emoji: '🐦',
    price: 250,
    category: 'badge',
    rarity: 'common',
    unlockMessage: 'Early Bird badge earned!',
  },
  {
    id: 'title_apprentice',
    name: 'Apprentice Title',
    description: 'Display "Apprentice" on your profile',
    emoji: '🎓',
    price: 300,
    category: 'title',
    rarity: 'common',
    unlockMessage: 'You are now an Apprentice!',
  },

  // === UNCOMMON (500-1500 stars) - Some effort needed ===
  {
    id: 'pet_owl',
    name: 'Wise Owl',
    description: 'A magical owl companion',
    emoji: '🦉',
    price: 500,
    category: 'pet',
    rarity: 'uncommon',
    unlockMessage: 'Wise Owl joins your journey!',
  },
  {
    id: 'badge_streak_master',
    name: 'Streak Master',
    description: 'For those who keep their streaks going',
    emoji: '🔥',
    price: 750,
    category: 'badge',
    rarity: 'uncommon',
    unlockMessage: 'Streak Master badge unlocked!',
  },
  {
    id: 'avatar_lightning',
    name: 'Lightning Bolt',
    description: 'Show your quick thinking',
    emoji: '⚡',
    price: 800,
    category: 'avatar',
    rarity: 'uncommon',
    unlockMessage: 'Lightning speed unlocked!',
  },
  {
    id: 'theme_ocean',
    name: 'Ocean Theme',
    description: 'Cool blue ocean vibes',
    emoji: '🌊',
    price: 1000,
    category: 'theme',
    rarity: 'uncommon',
    unlockMessage: 'Ocean Theme activated!',
  },
  {
    id: 'pet_dragon_baby',
    name: 'Baby Dragon',
    description: 'A tiny dragon friend',
    emoji: '🐉',
    price: 1200,
    category: 'pet',
    rarity: 'uncommon',
    unlockMessage: 'Baby Dragon hatched!',
  },
  {
    id: 'title_scholar',
    name: 'Scholar Title',
    description: 'Display "Scholar" on your profile',
    emoji: '📖',
    price: 1500,
    category: 'title',
    rarity: 'uncommon',
    unlockMessage: 'You are now a Scholar!',
  },

  // === RARE (2000-5000 stars) - 1-2 chapters needed ===
  {
    id: 'badge_perfectionist',
    name: 'Perfectionist',
    description: 'For those who aim for 100%',
    emoji: '💯',
    price: 2000,
    category: 'badge',
    rarity: 'rare',
    unlockMessage: 'Perfectionist badge earned!',
  },
  {
    id: 'pet_phoenix',
    name: 'Phoenix',
    description: 'Rise from mistakes stronger',
    emoji: '🔥',
    price: 2500,
    category: 'pet',
    rarity: 'rare',
    unlockMessage: 'Phoenix rises with you!',
  },
  {
    id: 'theme_galaxy',
    name: 'Galaxy Theme',
    description: 'Stars and cosmic beauty',
    emoji: '🌌',
    price: 3000,
    category: 'theme',
    rarity: 'rare',
    unlockMessage: 'Galaxy Theme unlocked!',
  },
  {
    id: 'avatar_crown_silver',
    name: 'Silver Crown',
    description: 'A shiny silver crown',
    emoji: '👑',
    price: 3500,
    category: 'avatar',
    rarity: 'rare',
    unlockMessage: 'Silver Crown is yours!',
  },
  {
    id: 'title_expert',
    name: 'Expert Title',
    description: 'Display "Expert" on your profile',
    emoji: '🏆',
    price: 4000,
    category: 'title',
    rarity: 'rare',
    unlockMessage: 'You are now an Expert!',
  },
  {
    id: 'special_double_stars',
    name: 'Star Doubler (1 Day)',
    description: 'Double stars for 24 hours!',
    emoji: '✨',
    price: 5000,
    category: 'special',
    rarity: 'rare',
    unlockMessage: 'Star Doubler activated for 24 hours!',
  },

  // === EPIC (7500-15000 stars) - 3-4 chapters needed ===
  {
    id: 'pet_unicorn',
    name: 'Magical Unicorn',
    description: 'A rare and beautiful companion',
    emoji: '🦄',
    price: 7500,
    category: 'pet',
    rarity: 'epic',
    unlockMessage: 'Magical Unicorn is yours!',
  },
  {
    id: 'theme_aurora',
    name: 'Aurora Theme',
    description: 'Beautiful northern lights',
    emoji: '🌈',
    price: 8500,
    category: 'theme',
    rarity: 'epic',
    unlockMessage: 'Aurora Theme glows!',
  },
  {
    id: 'avatar_crown_gold',
    name: 'Golden Crown',
    description: 'The ultimate crown',
    emoji: '👑',
    price: 10000,
    category: 'avatar',
    rarity: 'epic',
    unlockMessage: 'Golden Crown achieved!',
  },
  {
    id: 'badge_champion',
    name: 'Champion Badge',
    description: 'Only for true champions',
    emoji: '🏅',
    price: 12000,
    category: 'badge',
    rarity: 'epic',
    unlockMessage: 'Champion Badge unlocked!',
  },
  {
    id: 'title_master',
    name: 'Master Title',
    description: 'Display "Master" on your profile',
    emoji: '🎖️',
    price: 15000,
    category: 'title',
    rarity: 'epic',
    unlockMessage: 'You are now a Master!',
  },

  // === LEGENDARY (20000+ stars) - Dedicated practice needed ===
  {
    id: 'pet_galaxy_dragon',
    name: 'Galaxy Dragon',
    description: 'A dragon made of stars',
    emoji: '🐲',
    price: 20000,
    category: 'pet',
    rarity: 'legendary',
    unlockMessage: 'Galaxy Dragon descends!',
  },
  {
    id: 'theme_enchanted',
    name: 'Enchanted Forest',
    description: 'Magical forest theme',
    emoji: '🌳',
    price: 25000,
    category: 'theme',
    rarity: 'legendary',
    unlockMessage: 'Enchanted Forest unlocked!',
  },
  {
    id: 'badge_legend',
    name: 'Legend Badge',
    description: 'The rarest badge of all',
    emoji: '💎',
    price: 30000,
    category: 'badge',
    rarity: 'legendary',
    unlockMessage: 'LEGENDARY! You are a true Legend!',
  },
  {
    id: 'title_grandmaster',
    name: 'Grandmaster Title',
    description: 'Display "Grandmaster" - the highest honor',
    emoji: '🌟',
    price: 50000,
    category: 'title',
    rarity: 'legendary',
    unlockMessage: 'GRANDMASTER! The ultimate achievement!',
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

// Rarity colors for UI
export const RARITY_COLORS: Record<ShopItem['rarity'], string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-emerald-500',
  rare: 'from-blue-400 to-indigo-500',
  epic: 'from-purple-400 to-fuchsia-500',
  legendary: 'from-yellow-400 to-orange-500',
};

export const RARITY_LABELS: Record<ShopItem['rarity'], string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
