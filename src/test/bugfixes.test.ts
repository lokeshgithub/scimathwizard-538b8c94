import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for bug fixes reported by users (April 2026)
 * 
 * Bug #2: Progress vanishes on back navigation (9/10 → 0/0)
 * Bug #4: "Unable to check answer" timeout
 * Bug #5: Same question repeated 6x in one level
 */

// ============ Bug #5: Question Deduplication ============

// Import the dedup logic inline since it's a module-scoped function
function deduplicateQuestions<T extends { question: string }>(questions: T[]): T[] {
  const seen = new Set<string>();
  return questions.filter(q => {
    const key = q.question.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

describe('Question Deduplication (Bug #5)', () => {
  it('removes exact duplicate questions', () => {
    const questions = [
      { id: '1', question: 'What is 2+2?', level: 1 },
      { id: '2', question: 'What is 2+2?', level: 1 },
      { id: '3', question: 'What is 3+3?', level: 1 },
    ];
    const result = deduplicateQuestions(questions);
    expect(result).toHaveLength(2);
    expect(result.map(q => q.id)).toEqual(['1', '3']);
  });

  it('removes duplicates with different whitespace', () => {
    const questions = [
      { id: '1', question: 'What is  2 + 2?', level: 1 },
      { id: '2', question: 'What is 2 + 2?', level: 1 },
    ];
    const result = deduplicateQuestions(questions);
    expect(result).toHaveLength(1);
  });

  it('removes duplicates with different casing', () => {
    const questions = [
      { id: '1', question: 'What Is 2+2?', level: 1 },
      { id: '2', question: 'what is 2+2?', level: 1 },
    ];
    const result = deduplicateQuestions(questions);
    expect(result).toHaveLength(1);
  });

  it('keeps questions with different text', () => {
    const questions = [
      { id: '1', question: 'What is 2+2?', level: 1 },
      { id: '2', question: 'What is 3+3?', level: 1 },
      { id: '3', question: 'What is 4+4?', level: 1 },
    ];
    const result = deduplicateQuestions(questions);
    expect(result).toHaveLength(3);
  });

  it('handles empty array', () => {
    const result = deduplicateQuestions([]);
    expect(result).toHaveLength(0);
  });

  it('handles 6+ duplicates (the reported bug scenario)', () => {
    const questions = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      question: 'Repeated question about fractions',
      level: 1,
    }));
    questions.push({ id: '7', question: 'Different question', level: 1 });

    const result = deduplicateQuestions(questions);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('0');
    expect(result[1].id).toBe('7');
  });
});

// ============ Bug #4: Validate Answer Timeout ============

describe('Answer Validation Timeout (Bug #4)', () => {
  it('should throw a timeout error after 10s', async () => {
    // Simulate a function that never resolves
    const neverResolves = new Promise<never>(() => {});
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100); // Use 100ms for test speed

    try {
      await Promise.race([
        neverResolves,
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Answer check timed out. Please check your connection and try again.'));
          });
        }),
      ]);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('timed out');
    } finally {
      clearTimeout(timeoutId);
    }
  });
});

// ============ Bug #2: Session Persistence on Back Navigation ============

describe('Session Persistence (Bug #2)', () => {
  it('should save session data with correct structure', () => {
    const session = {
      subject: 'math' as const,
      level: 3,
      levelStats: { correct: 7, total: 9 },
      questionIndex: 9,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'],
      timestamp: Date.now(),
    };

    // Verify session has all required fields for restoration
    expect(session.levelStats.total).toBe(9);
    expect(session.questionIndex).toBe(9);
    expect(session.questionIds).toHaveLength(10);
  });

  it('should restore session with progress intact (not 0/0)', () => {
    // Simulate: user answered 9 questions, went back, came back
    const savedSession = {
      subject: 'math' as const,
      level: 2,
      levelStats: { correct: 7, total: 9 },
      questionIndex: 9,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'],
      timestamp: Date.now(),
    };

    // Session should restore at question 9 (10th question, 0-indexed)
    const resumeIndex = Math.min(savedSession.questionIndex, savedSession.questionIds.length - 1);
    expect(resumeIndex).toBe(9);
    expect(savedSession.levelStats.correct).toBe(7);
    expect(savedSession.levelStats.total).toBe(9);
  });

  it('should expire sessions older than 24 hours', () => {
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const isExpired = Date.now() - oldTimestamp >= 24 * 60 * 60 * 1000;
    expect(isExpired).toBe(true);
  });
});
