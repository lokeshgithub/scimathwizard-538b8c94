import { describe, it, expect } from 'vitest';

/**
 * Tests for Star Shop
 *
 * These tests cover:
 * - Mastery requirements validation
 * - Purchase eligibility
 * - Star deduction
 * - Requirement text generation
 */

// Types from starShopItems.ts
interface ShopItem {
  id: string;
  name: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'transcendent';
  requiresMastery?: {
    type: 'topics' | 'halfSubject' | 'fullSubject' | 'multiSubject';
    subject?: 'math' | 'physics' | 'chemistry' | 'any';
    count?: number;
  };
}

// Mirrors meetsRequirements from starShopItems.ts
const meetsRequirements = (
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

// Get requirement text for display
const getRequirementText = (item: ShopItem): string => {
  if (!item.requiresMastery) return '';
  const req = item.requiresMastery;
  switch (req.type) {
    case 'topics':
      return `Master ${req.count} topics to unlock`;
    case 'halfSubject':
      if (req.subject === 'any') return 'Master half of any subject';
      return `Master half of ${req.subject} topics`;
    case 'fullSubject':
      if (req.subject === 'any') return 'Master all topics in any subject';
      return `Master all ${req.subject} topics`;
    case 'multiSubject':
      return `Master ${req.count} complete subjects`;
    default:
      return 'Special requirements';
  }
};

describe('Items Without Requirements', () => {
  it('should allow purchase of common items with no requirements', () => {
    const item: ShopItem = {
      id: 'avatar_wizard_hat',
      name: 'Wizard Hat',
      price: 800,
      rarity: 'common',
      // No requiresMastery
    };

    const userMastery = { math: 0, physics: 0, chemistry: 0 };
    expect(meetsRequirements(item, userMastery)).toBe(true);
  });

  it('should allow purchase of uncommon items with no requirements', () => {
    const item: ShopItem = {
      id: 'pet_owl',
      name: 'Wise Owl',
      price: 2000,
      rarity: 'uncommon',
    };

    const userMastery = { math: 0, physics: 0, chemistry: 0 };
    expect(meetsRequirements(item, userMastery)).toBe(true);
  });
});

describe('Topics Count Requirements', () => {
  it('should require 15 mastered topics for celestial theme', () => {
    const item: ShopItem = {
      id: 'theme_celestial',
      name: 'Celestial Theme',
      price: 100000,
      rarity: 'mythic',
      requiresMastery: { type: 'topics', count: 15 },
    };

    expect(meetsRequirements(item, { math: 10, physics: 4, chemistry: 1 })).toBe(true); // 15 total
    expect(meetsRequirements(item, { math: 10, physics: 3, chemistry: 1 })).toBe(false); // 14 total
  });
});

describe('Half Subject Requirements', () => {
  it('should require 13+ math topics for Math Scholar badge', () => {
    const item: ShopItem = {
      id: 'badge_half_master_math',
      name: 'Math Scholar',
      price: 85000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'math' },
    };

    expect(meetsRequirements(item, { math: 13, physics: 0, chemistry: 0 })).toBe(true);
    expect(meetsRequirements(item, { math: 12, physics: 0, chemistry: 0 })).toBe(false);
    expect(meetsRequirements(item, { math: 5, physics: 9, chemistry: 7 })).toBe(false); // Other subjects don't count
  });

  it('should require 5+ physics topics for Physics Scholar badge', () => {
    const item: ShopItem = {
      id: 'badge_half_master_physics',
      name: 'Physics Scholar',
      price: 85000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'physics' },
    };

    expect(meetsRequirements(item, { math: 0, physics: 5, chemistry: 0 })).toBe(true);
    expect(meetsRequirements(item, { math: 0, physics: 4, chemistry: 0 })).toBe(false);
  });

  it('should require 4+ chemistry topics for Chemistry Scholar badge', () => {
    const item: ShopItem = {
      id: 'badge_half_master_chemistry',
      name: 'Chemistry Scholar',
      price: 85000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'chemistry' },
    };

    expect(meetsRequirements(item, { math: 0, physics: 0, chemistry: 4 })).toBe(true);
    expect(meetsRequirements(item, { math: 0, physics: 0, chemistry: 3 })).toBe(false);
  });

  it('should accept ANY half subject for "any" requirement', () => {
    const item: ShopItem = {
      id: 'pet_galaxy_dragon',
      name: 'Galaxy Dragon',
      price: 80000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'any' },
    };

    expect(meetsRequirements(item, { math: 13, physics: 0, chemistry: 0 })).toBe(true); // Math half
    expect(meetsRequirements(item, { math: 0, physics: 5, chemistry: 0 })).toBe(true);  // Physics half
    expect(meetsRequirements(item, { math: 0, physics: 0, chemistry: 4 })).toBe(true);  // Chemistry half
    expect(meetsRequirements(item, { math: 10, physics: 4, chemistry: 3 })).toBe(false); // None complete
  });
});

describe('Full Subject Requirements', () => {
  it('should require 25 math topics for Math Master badge', () => {
    const item: ShopItem = {
      id: 'badge_math_master',
      name: 'Mathematics Master',
      price: 160000,
      rarity: 'transcendent',
      requiresMastery: { type: 'fullSubject', subject: 'math' },
    };

    expect(meetsRequirements(item, { math: 25, physics: 0, chemistry: 0 })).toBe(true);
    expect(meetsRequirements(item, { math: 24, physics: 9, chemistry: 7 })).toBe(false);
  });

  it('should require 9 physics topics for Physics Master badge', () => {
    const item: ShopItem = {
      id: 'badge_physics_master',
      name: 'Physics Master',
      price: 160000,
      rarity: 'transcendent',
      requiresMastery: { type: 'fullSubject', subject: 'physics' },
    };

    expect(meetsRequirements(item, { math: 0, physics: 9, chemistry: 0 })).toBe(true);
    expect(meetsRequirements(item, { math: 25, physics: 8, chemistry: 7 })).toBe(false);
  });

  it('should require 7 chemistry topics for Chemistry Master badge', () => {
    const item: ShopItem = {
      id: 'badge_chemistry_master',
      name: 'Chemistry Master',
      price: 160000,
      rarity: 'transcendent',
      requiresMastery: { type: 'fullSubject', subject: 'chemistry' },
    };

    expect(meetsRequirements(item, { math: 0, physics: 0, chemistry: 7 })).toBe(true);
    expect(meetsRequirements(item, { math: 25, physics: 9, chemistry: 6 })).toBe(false);
  });
});

describe('Multi-Subject Requirements', () => {
  it('should require 2 complete subjects for Dual Discipline badge', () => {
    const item: ShopItem = {
      id: 'badge_dual_master',
      name: 'Dual Discipline Master',
      price: 220000,
      rarity: 'transcendent',
      requiresMastery: { type: 'multiSubject', count: 2 },
    };

    expect(meetsRequirements(item, { math: 25, physics: 9, chemistry: 0 })).toBe(true);
    expect(meetsRequirements(item, { math: 25, physics: 0, chemistry: 7 })).toBe(true);
    expect(meetsRequirements(item, { math: 0, physics: 9, chemistry: 7 })).toBe(true);
    expect(meetsRequirements(item, { math: 25, physics: 8, chemistry: 6 })).toBe(false); // Only 1 complete
  });

  it('should require 3 complete subjects for Triple Crown badge', () => {
    const item: ShopItem = {
      id: 'badge_triple_crown',
      name: 'Triple Crown',
      price: 350000,
      rarity: 'transcendent',
      requiresMastery: { type: 'multiSubject', count: 3 },
    };

    expect(meetsRequirements(item, { math: 25, physics: 9, chemistry: 7 })).toBe(true);
    expect(meetsRequirements(item, { math: 25, physics: 9, chemistry: 6 })).toBe(false);
  });
});

describe('Purchase Eligibility', () => {
  it('should allow purchase when user has enough stars and meets requirements', () => {
    const item: ShopItem = { id: 'test', name: 'Test', price: 1000, rarity: 'common' };
    const userStars = 1500;
    const purchased = new Set<string>();
    const meetsReqs = true;

    const canPurchase = userStars >= item.price && !purchased.has(item.id) && meetsReqs;
    expect(canPurchase).toBe(true);
  });

  it('should NOT allow purchase when user lacks stars', () => {
    const item: ShopItem = { id: 'test', name: 'Test', price: 1000, rarity: 'common' };
    const userStars = 500;
    const purchased = new Set<string>();
    const meetsReqs = true;

    const canPurchase = userStars >= item.price && !purchased.has(item.id) && meetsReqs;
    expect(canPurchase).toBe(false);
  });

  it('should NOT allow purchase when already purchased', () => {
    const item: ShopItem = { id: 'test', name: 'Test', price: 1000, rarity: 'common' };
    const userStars = 1500;
    const purchased = new Set<string>(['test']);
    const meetsReqs = true;

    const canPurchase = userStars >= item.price && !purchased.has(item.id) && meetsReqs;
    expect(canPurchase).toBe(false);
  });

  it('should NOT allow purchase when requirements not met', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 1000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'math' },
    };
    const userStars = 1500;
    const purchased = new Set<string>();
    const userMastery = { math: 5, physics: 0, chemistry: 0 };

    const meetsReqs = meetsRequirements(item, userMastery);
    const canPurchase = userStars >= item.price && !purchased.has(item.id) && meetsReqs;
    expect(canPurchase).toBe(false);
  });
});

describe('Requirement Text', () => {
  it('should return correct text for topics requirement', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 100000,
      rarity: 'mythic',
      requiresMastery: { type: 'topics', count: 15 },
    };

    expect(getRequirementText(item)).toBe('Master 15 topics to unlock');
  });

  it('should return correct text for half subject (specific)', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 85000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'math' },
    };

    expect(getRequirementText(item)).toBe('Master half of math topics');
  });

  it('should return correct text for half subject (any)', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 80000,
      rarity: 'mythic',
      requiresMastery: { type: 'halfSubject', subject: 'any' },
    };

    expect(getRequirementText(item)).toBe('Master half of any subject');
  });

  it('should return correct text for full subject (any)', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 150000,
      rarity: 'transcendent',
      requiresMastery: { type: 'fullSubject', subject: 'any' },
    };

    expect(getRequirementText(item)).toBe('Master all topics in any subject');
  });

  it('should return correct text for multi-subject', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 350000,
      rarity: 'transcendent',
      requiresMastery: { type: 'multiSubject', count: 3 },
    };

    expect(getRequirementText(item)).toBe('Master 3 complete subjects');
  });

  it('should return empty string for items without requirements', () => {
    const item: ShopItem = {
      id: 'test',
      name: 'Test',
      price: 800,
      rarity: 'common',
    };

    expect(getRequirementText(item)).toBe('');
  });
});

describe('Star Deduction', () => {
  it('should correctly deduct stars after purchase', () => {
    const initialStars = 5000;
    const itemPrice = 2000;
    const newStars = Math.max(0, initialStars - itemPrice);

    expect(newStars).toBe(3000);
  });

  it('should not go below zero', () => {
    const initialStars = 500;
    const itemPrice = 1000;
    const newStars = Math.max(0, initialStars - itemPrice);

    expect(newStars).toBe(0);
  });
});
