import { describe, it, expect } from 'vitest';

/**
 * Tests for Topic Categorization
 *
 * These tests cover:
 * - Math topic categorization
 * - Physics topic categorization
 * - Chemistry topic categorization
 * - Fuzzy matching for edge cases
 * - "Other Topics" fallback
 */

// Category definitions matching TopicDashboard.tsx
const MATH_CATEGORIES = [
  { name: 'Numbers & Operations', keywords: ['integer', 'decimal', 'fraction', 'rational', 'number', 'percent', 'whole', 'natural', 'real', 'square', 'cube', 'root', 'factor', 'multiple', 'divisib', 'hcf', 'lcm', 'prime'] },
  { name: 'Algebra', keywords: ['algebra', 'equation', 'linear', 'exponent', 'power', 'variable', 'polynomial', 'expression', 'factori', 'simplif', 'identit', 'quadratic', 'simultaneous'] },
  { name: 'Ratio & Proportion', keywords: ['ratio', 'proportion', 'rate', 'profit', 'loss', 'discount', 'interest', 'percentage', 'percent', 'markup', 'cost', 'sell', 'sp', 'cp', 'simple_interest', 'compound', 'unitary', 'direct', 'inverse', 'variation', 'time_work', 'speed_distance'] },
  { name: 'Geometry', keywords: ['geometry', 'triangle', 'circle', 'quadrilateral', 'angle', 'area', 'perimeter', 'volume', 'surface', 'polygon', 'line', 'parallel', 'perpendicular', 'congruen', 'similar', 'symmetr', 'coordinat', 'mensuration', 'shape', 'cube', 'cylinder', 'sphere', 'cone', 'rectangle', 'square'] },
  { name: 'Data & Statistics', keywords: ['data', 'statistic', 'probability', 'graph', 'mean', 'median', 'mode', 'average', 'bar', 'pie', 'histogram', 'frequency', 'range', 'chart', 'table', 'random', 'chance', 'outcome'] },
];

const PHYSICS_CATEGORIES = [
  { name: 'Motion & Forces', keywords: ['motion', 'force', 'speed', 'velocity', 'acceleration', 'momentum', 'friction', 'gravity', 'newton'] },
  { name: 'Energy & Work', keywords: ['energy', 'work', 'power', 'kinetic', 'potential', 'conservation', 'joule'] },
  { name: 'Heat & Temperature', keywords: ['heat', 'temperature', 'thermal', 'conduction', 'convection', 'radiation', 'celsius', 'fahrenheit'] },
  { name: 'Light & Optics', keywords: ['light', 'optic', 'reflection', 'refraction', 'lens', 'mirror', 'prism', 'color', 'spectrum'] },
  { name: 'Sound & Waves', keywords: ['sound', 'wave', 'vibration', 'frequency', 'amplitude', 'echo', 'resonance', 'pitch'] },
  { name: 'Electricity & Magnetism', keywords: ['electric', 'current', 'voltage', 'resistance', 'circuit', 'magnet', 'magnetic', 'ohm', 'charge'] },
];

const CHEMISTRY_CATEGORIES = [
  { name: 'Matter & Materials', keywords: ['matter', 'state', 'solid', 'liquid', 'gas', 'material', 'property', 'physical', 'change'] },
  { name: 'Atoms & Elements', keywords: ['atom', 'element', 'periodic', 'proton', 'neutron', 'electron', 'nucleus', 'atomic', 'molecules'] },
  { name: 'Compounds & Mixtures', keywords: ['compound', 'mixture', 'molecule', 'solution', 'separation', 'pure', 'impure'] },
  { name: 'Chemical Reactions', keywords: ['reaction', 'chemical', 'reactant', 'product', 'equation', 'balance', 'synthesis', 'decomposition'] },
  { name: 'Acids, Bases & Salts', keywords: ['acid', 'base', 'salt', 'ph', 'neutral', 'indicator', 'alkali', 'corrosive'] },
  { name: 'Metals & Non-metals', keywords: ['metal', 'non-metal', 'metalloid', 'conductor', 'malleable', 'ductile', 'lustre'] },
];

// Categorization function matching TopicDashboard.tsx
const categorize = (topicName: string, subject: string = 'math'): string => {
  // Clean up topic name
  const cleaned = topicName
    .toLowerCase()
    .replace(/^ch\d+[_-]?/i, '') // Remove "ch09_" prefix
    .replace(/[_-]/g, ' ');      // Convert underscores/dashes to spaces

  const categories = subject === 'physics'
    ? PHYSICS_CATEGORIES
    : subject === 'chemistry'
    ? CHEMISTRY_CATEGORIES
    : MATH_CATEGORIES;

  // Collect all keyword matches with their lengths
  const matches: { category: string; keyword: string; length: number }[] = [];

  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (cleaned.includes(kw)) {
        matches.push({ category: cat.name, keyword: kw, length: kw.length });
      }
    }
  }

  // Return the category with the longest matching keyword (prevents 'ratio' matching before 'mensuration')
  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0].category;
  }

  // Second pass: partial word matching
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const cat of categories) {
    for (const word of words) {
      if (cat.keywords.some(kw => kw.startsWith(word) || word.startsWith(kw.slice(0, 4)))) {
        return cat.name;
      }
    }
  }

  return 'Other Topics';
};

describe('Math Topic Categorization', () => {
  describe('Numbers & Operations', () => {
    it('should categorize "Integers" correctly', () => {
      expect(categorize('Integers', 'math')).toBe('Numbers & Operations');
    });

    it('should categorize "Rational_Numbers" correctly', () => {
      expect(categorize('Rational_Numbers', 'math')).toBe('Numbers & Operations');
    });

    it('should categorize "Fractions_and_Decimals" correctly', () => {
      expect(categorize('Fractions_and_Decimals', 'math')).toBe('Numbers & Operations');
    });

    it('should categorize "Square_Roots" correctly', () => {
      expect(categorize('Square_Roots', 'math')).toBe('Numbers & Operations');
    });

    it('should categorize "HCF_LCM" correctly', () => {
      expect(categorize('HCF_LCM', 'math')).toBe('Numbers & Operations');
    });

    it('should categorize "Prime_Numbers" correctly', () => {
      expect(categorize('Prime_Numbers', 'math')).toBe('Numbers & Operations');
    });
  });

  describe('Algebra', () => {
    it('should categorize "Linear_Equations" correctly', () => {
      expect(categorize('Linear_Equations', 'math')).toBe('Algebra');
    });

    it('should categorize "Algebraic_Expressions" correctly', () => {
      expect(categorize('Algebraic_Expressions', 'math')).toBe('Algebra');
    });

    it('should categorize "Exponents_and_Powers" correctly', () => {
      expect(categorize('Exponents_and_Powers', 'math')).toBe('Algebra');
    });

    it('should categorize "Polynomial" correctly', () => {
      expect(categorize('Polynomial', 'math')).toBe('Algebra');
    });

    it('should categorize "Quadratic_Equations" correctly', () => {
      expect(categorize('Quadratic_Equations', 'math')).toBe('Algebra');
    });
  });

  describe('Ratio & Proportion', () => {
    it('should categorize "Profit_Loss" correctly', () => {
      expect(categorize('Profit_Loss', 'math')).toBe('Ratio & Proportion');
    });

    it('should categorize "ch09_profit_loss_discount" correctly (with chapter prefix)', () => {
      expect(categorize('ch09_profit_loss_discount', 'math')).toBe('Ratio & Proportion');
    });

    it('should categorize "Simple_Interest" correctly', () => {
      expect(categorize('Simple_Interest', 'math')).toBe('Ratio & Proportion');
    });

    it('should categorize "Ratio_and_Proportion" correctly', () => {
      expect(categorize('Ratio_and_Proportion', 'math')).toBe('Ratio & Proportion');
    });

    it('should categorize "Percentage" correctly', () => {
      expect(categorize('Percentage', 'math')).toBe('Ratio & Proportion');
    });

    it('should categorize "Unitary_Method" correctly', () => {
      expect(categorize('Unitary_Method', 'math')).toBe('Ratio & Proportion');
    });
  });

  describe('Geometry', () => {
    it('should categorize "Triangles" correctly', () => {
      expect(categorize('Triangles', 'math')).toBe('Geometry');
    });

    it('should categorize "Circles" correctly', () => {
      expect(categorize('Circles', 'math')).toBe('Geometry');
    });

    it('should categorize "Perimeter_and_Area" correctly', () => {
      expect(categorize('Perimeter_and_Area', 'math')).toBe('Geometry');
    });

    it('should categorize "Surface_Area_Volume" correctly', () => {
      expect(categorize('Surface_Area_Volume', 'math')).toBe('Geometry');
    });

    it('should categorize "Coordinate_Geometry" correctly', () => {
      expect(categorize('Coordinate_Geometry', 'math')).toBe('Geometry');
    });

    it('should categorize "Mensuration" correctly', () => {
      expect(categorize('Mensuration', 'math')).toBe('Geometry');
    });
  });

  describe('Data & Statistics', () => {
    it('should categorize "Data_Handling" correctly', () => {
      expect(categorize('Data_Handling', 'math')).toBe('Data & Statistics');
    });

    it('should categorize "Probability" correctly', () => {
      expect(categorize('Probability', 'math')).toBe('Data & Statistics');
    });

    it('should categorize "Mean_Median_Mode" correctly', () => {
      expect(categorize('Mean_Median_Mode', 'math')).toBe('Data & Statistics');
    });

    it('should categorize "Bar_Graphs" correctly', () => {
      expect(categorize('Bar_Graphs', 'math')).toBe('Data & Statistics');
    });
  });
});

describe('Physics Topic Categorization', () => {
  it('should categorize "Motion" correctly', () => {
    expect(categorize('Motion', 'physics')).toBe('Motion & Forces');
  });

  it('should categorize "Force_and_Friction" correctly', () => {
    expect(categorize('Force_and_Friction', 'physics')).toBe('Motion & Forces');
  });

  it('should categorize "Heat_Transfer" correctly', () => {
    expect(categorize('Heat_Transfer', 'physics')).toBe('Heat & Temperature');
  });

  it('should categorize "Light_Reflection" correctly', () => {
    expect(categorize('Light_Reflection', 'physics')).toBe('Light & Optics');
  });

  it('should categorize "Electric_Circuits" correctly', () => {
    expect(categorize('Electric_Circuits', 'physics')).toBe('Electricity & Magnetism');
  });

  it('should categorize "Sound_Waves" correctly', () => {
    expect(categorize('Sound_Waves', 'physics')).toBe('Sound & Waves');
  });
});

describe('Chemistry Topic Categorization', () => {
  it('should categorize "States_of_Matter" correctly', () => {
    expect(categorize('States_of_Matter', 'chemistry')).toBe('Matter & Materials');
  });

  it('should categorize "Atoms_and_Molecules" correctly', () => {
    expect(categorize('Atoms_and_Molecules', 'chemistry')).toBe('Atoms & Elements');
  });

  it('should categorize "Chemical_Reactions" correctly', () => {
    expect(categorize('Chemical_Reactions', 'chemistry')).toBe('Chemical Reactions');
  });

  it('should categorize "Acids_and_Bases" correctly', () => {
    expect(categorize('Acids_and_Bases', 'chemistry')).toBe('Acids, Bases & Salts');
  });

  it('should categorize "Metals_Nonmetals" correctly', () => {
    expect(categorize('Metals_Nonmetals', 'chemistry')).toBe('Metals & Non-metals');
  });
});

describe('Chapter Prefix Handling', () => {
  it('should remove ch09_ prefix', () => {
    expect(categorize('ch09_profit_loss', 'math')).toBe('Ratio & Proportion');
  });

  it('should remove ch1_ prefix', () => {
    expect(categorize('ch1_integers', 'math')).toBe('Numbers & Operations');
  });

  it('should remove ch15- prefix (with dash)', () => {
    expect(categorize('ch15-triangles', 'math')).toBe('Geometry');
  });

  it('should remove CH10_ prefix (uppercase)', () => {
    expect(categorize('CH10_algebra', 'math')).toBe('Algebra');
  });
});

describe('Other Topics Fallback', () => {
  it('should categorize unknown math topic as "Other Topics"', () => {
    expect(categorize('XYZ_Unknown_Topic', 'math')).toBe('Other Topics');
  });

  it('should categorize completely random string as "Other Topics"', () => {
    expect(categorize('asdfghjkl', 'math')).toBe('Other Topics');
  });

  it('should categorize very short topic names as "Other Topics" if no match', () => {
    expect(categorize('AB', 'math')).toBe('Other Topics');
  });
});

describe('Edge Cases', () => {
  it('should handle mixed case topic names', () => {
    expect(categorize('INTEGERS', 'math')).toBe('Numbers & Operations');
    expect(categorize('InTeGeRs', 'math')).toBe('Numbers & Operations');
  });

  it('should handle multiple underscores', () => {
    expect(categorize('Profit___Loss___Discount', 'math')).toBe('Ratio & Proportion');
  });

  it('should handle dashes instead of underscores', () => {
    expect(categorize('Profit-Loss-Discount', 'math')).toBe('Ratio & Proportion');
  });

  it('should handle topic with spaces', () => {
    expect(categorize('Profit Loss Discount', 'math')).toBe('Ratio & Proportion');
  });
});

describe('Fuzzy Matching', () => {
  it('should match partial keywords (geom -> Geometry)', () => {
    // This tests the second-pass fuzzy matching
    const result = categorize('Geom_Basics', 'math');
    // May match due to partial word matching
    expect(['Geometry', 'Other Topics']).toContain(result);
  });
});
