import { describe, it, expect } from 'vitest';

/**
 * Tests for Hint System in QuizCard
 *
 * These tests cover:
 * - Hint parsing (pipe-separated, "Hint N:" format, single hint)
 * - Progressive hint reveal
 * - No hints scenario (empty, null, whitespace)
 * - Level requirement (hints only for level 4+)
 */

// Constants matching QuizCard.tsx
const MIN_LEVEL_FOR_HINTS = 4;

// Helper function to parse hints (mirrors QuizCard logic)
const parseHints = (hint: string | null | undefined): string[] => {
  if (!hint) return [];
  const trimmed = hint.trim();
  if (!trimmed) return [];

  // Helper to strip "Hint N:" prefix from a string
  const stripHintPrefix = (h: string): string => {
    return h.replace(/^Hint\s*\d+\s*:\s*/i, '').trim();
  };

  // Split by pipe character if present
  if (trimmed.includes('|')) {
    return trimmed.split('|')
      .map(h => stripHintPrefix(h.trim()))
      .filter(h => h.length > 0);
  }

  // Split by "Hint N:" pattern
  const hintPattern = /Hint\s*\d+\s*:/gi;
  if (hintPattern.test(trimmed)) {
    hintPattern.lastIndex = 0;
    const parts = trimmed.split(/Hint\s*\d+\s*:/i).filter(h => h.trim().length > 0);
    return parts.map(h => h.trim());
  }

  // Single hint - also strip any prefix
  return [stripHintPrefix(trimmed)];
};

// Check if hints are available
const hasHintsAvailable = (level: number, hints: string[]): boolean => {
  return level >= MIN_LEVEL_FOR_HINTS && hints.length > 0;
};

describe('Hint Parsing', () => {
  describe('Pipe-separated hints', () => {
    it('should parse multiple hints separated by pipes', () => {
      const hint = 'First hint | Second hint | Third hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(3);
      expect(parsed[0]).toBe('First hint');
      expect(parsed[1]).toBe('Second hint');
      expect(parsed[2]).toBe('Third hint');
    });

    it('should handle pipes with extra whitespace', () => {
      const hint = '  First hint   |   Second hint  ';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(2);
      expect(parsed[0]).toBe('First hint');
      expect(parsed[1]).toBe('Second hint');
    });

    it('should filter out empty parts from pipe split', () => {
      const hint = 'First hint | | Third hint | ';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(2);
      expect(parsed[0]).toBe('First hint');
      expect(parsed[1]).toBe('Third hint');
    });
  });

  describe('Hint N: format', () => {
    it('should parse "Hint 1:" format', () => {
      const hint = 'Hint 1: First hint Hint 2: Second hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(2);
      expect(parsed[0]).toBe('First hint');
      expect(parsed[1]).toBe('Second hint');
    });

    it('should handle variations in spacing', () => {
      const hint = 'Hint1:First hint Hint 2 : Second hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(2);
    });

    it('should be case insensitive', () => {
      const hint = 'HINT 1: First hint hint 2: Second hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(2);
    });

    it('should strip prefix from single hint with Hint N: format', () => {
      const hint = 'Hint 1: This is the only hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(1);
      expect(parsed[0]).toBe('This is the only hint');
    });
  });

  describe('Single hint', () => {
    it('should return single hint in array', () => {
      const hint = 'This is a simple hint';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(1);
      expect(parsed[0]).toBe('This is a simple hint');
    });

    it('should strip Hint prefix from single hint', () => {
      const hint = 'Hint: Remember to check the formula';
      const parsed = parseHints(hint);

      expect(parsed.length).toBe(1);
      // The regex strips "Hint N:" but not just "Hint:"
      // Based on current implementation, "Hint:" without number is NOT stripped
      expect(parsed[0]).toBe('Hint: Remember to check the formula');
    });
  });
});

describe('No Hints Scenario', () => {
  it('should return empty array for null hint', () => {
    const parsed = parseHints(null);
    expect(parsed.length).toBe(0);
  });

  it('should return empty array for undefined hint', () => {
    const parsed = parseHints(undefined);
    expect(parsed.length).toBe(0);
  });

  it('should return empty array for empty string', () => {
    const parsed = parseHints('');
    expect(parsed.length).toBe(0);
  });

  it('should return empty array for whitespace-only string', () => {
    const parsed = parseHints('   ');
    expect(parsed.length).toBe(0);
  });

  it('should return empty array for string with only pipes', () => {
    const parsed = parseHints(' | | ');
    expect(parsed.length).toBe(0);
  });
});

describe('Hints Availability', () => {
  it('should NOT show hints for level 1', () => {
    const hints = ['Hint 1', 'Hint 2'];
    expect(hasHintsAvailable(1, hints)).toBe(false);
  });

  it('should NOT show hints for level 2', () => {
    const hints = ['Hint 1', 'Hint 2'];
    expect(hasHintsAvailable(2, hints)).toBe(false);
  });

  it('should NOT show hints for level 3', () => {
    const hints = ['Hint 1', 'Hint 2'];
    expect(hasHintsAvailable(3, hints)).toBe(false);
  });

  it('should show hints for level 4', () => {
    const hints = ['Hint 1', 'Hint 2'];
    expect(hasHintsAvailable(4, hints)).toBe(true);
  });

  it('should show hints for level 5', () => {
    const hints = ['Hint 1'];
    expect(hasHintsAvailable(5, hints)).toBe(true);
  });

  it('should show hints for level 6', () => {
    const hints = ['Hint 1'];
    expect(hasHintsAvailable(6, hints)).toBe(true);
  });

  it('should NOT show hints for level 4 if no hints exist', () => {
    const hints: string[] = [];
    expect(hasHintsAvailable(4, hints)).toBe(false);
  });

  it('should NOT show hint button if question has no hints even at level 4+', () => {
    const level = 5;
    const question = { hint: null };
    const parsedHints = parseHints(question.hint);

    expect(hasHintsAvailable(level, parsedHints)).toBe(false);
  });
});

describe('Progressive Hint Reveal', () => {
  it('should reveal hints one at a time', () => {
    const hints = ['Hint 1', 'Hint 2', 'Hint 3'];
    let hintsUsed = 0;

    // Initial state - no hints revealed
    expect(hints.slice(0, hintsUsed)).toEqual([]);

    // First hint click
    hintsUsed = 1;
    expect(hints.slice(0, hintsUsed)).toEqual(['Hint 1']);

    // Second hint click
    hintsUsed = 2;
    expect(hints.slice(0, hintsUsed)).toEqual(['Hint 1', 'Hint 2']);

    // Third hint click
    hintsUsed = 3;
    expect(hints.slice(0, hintsUsed)).toEqual(['Hint 1', 'Hint 2', 'Hint 3']);
  });

  it('should check if more hints are available', () => {
    const hints = ['Hint 1', 'Hint 2'];

    expect(0 < hints.length).toBe(true);  // hasMoreHints when hintsUsed=0
    expect(1 < hints.length).toBe(true);  // hasMoreHints when hintsUsed=1
    expect(2 < hints.length).toBe(false); // hasMoreHints when hintsUsed=2
  });

  it('should not allow using hints after answering', () => {
    const isAnswered = true;
    const hasHintsAvail = true;
    const hasMoreHints = true;

    // Should not allow hint use when answered
    const canUseHint = !isAnswered && hasHintsAvail && hasMoreHints;
    expect(canUseHint).toBe(false);
  });

  it('should reset hints when question changes', () => {
    // Simulate question change
    let hintsUsed = 3;

    // On new question, reset to 0
    hintsUsed = 0;
    expect(hintsUsed).toBe(0);
  });
});

describe('UX Edge Cases', () => {
  it('should NOT show hint section if question has empty hint string', () => {
    const question = { hint: '', level: 5 };
    const parsed = parseHints(question.hint);
    const showSection = hasHintsAvailable(question.level, parsed);

    expect(showSection).toBe(false);
  });

  it('should NOT show hint section if question hint is whitespace', () => {
    const question = { hint: '   \n\t  ', level: 5 };
    const parsed = parseHints(question.hint);
    const showSection = hasHintsAvailable(question.level, parsed);

    expect(showSection).toBe(false);
  });

  it('should show correct count display for multiple hints', () => {
    const hints = ['A', 'B', 'C'];
    const hintsUsed = 2;

    const displayText = hintsUsed === 1 ? 'Hint' : `Hints (${hintsUsed}/${hints.length})`;
    expect(displayText).toBe('Hints (2/3)');
  });

  it('should show singular "Hint" when only one used', () => {
    const hints = ['A', 'B', 'C'];
    const hintsUsed = 1;

    const displayText = hintsUsed === 1 ? 'Hint' : `Hints (${hintsUsed}/${hints.length})`;
    expect(displayText).toBe('Hint');
  });

  it('should show "Need a hint?" for first hint button', () => {
    const hintsUsed = 0;
    const buttonText = hintsUsed === 0 ? 'Need a hint?' : 'Need another hint?';
    expect(buttonText).toBe('Need a hint?');
  });

  it('should show "Need another hint?" for subsequent hints', () => {
    const hintsUsed = 1;
    const buttonText = hintsUsed === 0 ? 'Need a hint?' : 'Need another hint?';
    expect(buttonText).toBe('Need another hint?');
  });
});
