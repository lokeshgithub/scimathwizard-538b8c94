import type { Question, QuestionTracking } from '@/types/quiz';

/**
 * Adaptive difficulty engine for within-level question ordering.
 *
 * Rather than serving questions in random order, this reorders them so that:
 *   - When the student is doing well (high accuracy) → prioritise unseen and
 *     previously-failed questions to keep them challenged.
 *   - When the student is struggling (low accuracy) → mix in previously-correct
 *     questions to rebuild confidence, while still surfacing new material.
 *
 * The algorithm assigns each question a *priority score* then sorts descending.
 * A small random jitter prevents the ordering from feeling deterministic.
 */

/** How many recent answers to consider when computing running accuracy. */
const WINDOW_SIZE = 8;

export interface AnswerRecord {
  questionId: string;
  wasCorrect: boolean;
}

/**
 * Compute running accuracy over the last N answers.
 * Returns a value between 0 and 1 (or 0.5 if no history).
 */
export function getRunningAccuracy(
  recentAnswers: AnswerRecord[],
  window: number = WINDOW_SIZE,
): number {
  if (recentAnswers.length === 0) return 0.5; // neutral start
  const slice = recentAnswers.slice(-window);
  const correct = slice.filter((a) => a.wasCorrect).length;
  return correct / slice.length;
}

/** Difficulty bucket for a question based on tracking data. */
type DifficultyBucket = 'hard' | 'medium' | 'easy';

function classifyQuestion(
  q: Question,
  tracking: QuestionTracking,
): DifficultyBucket {
  const status = tracking[q.id];
  if (!status) return 'medium'; // never seen
  if (!status.answeredCorrectly) return 'hard'; // previously wrong
  if (status.solutionViewed) return 'medium'; // correct but needed help
  return 'easy'; // answered correctly without solution
}

/**
 * Reorder `questions` adaptively based on the student's running accuracy
 * and per-question history.
 *
 * Returns a new array (does not mutate).
 */
export function adaptiveReorder(
  questions: Question[],
  tracking: QuestionTracking,
  recentAnswers: AnswerRecord[],
): Question[] {
  const accuracy = getRunningAccuracy(recentAnswers);

  // Weight multipliers per bucket, scaled by accuracy.
  // High accuracy → boost hard, suppress easy.
  // Low accuracy  → boost easy, suppress hard.
  const weights: Record<DifficultyBucket, number> = {
    hard: 1.0 + accuracy, // 1.0 – 2.0
    medium: 1.0, // always 1.0
    easy: 1.0 + (1.0 - accuracy), // 1.0 – 2.0 (inverse)
  };

  // High-accuracy students should be challenged more
  if (accuracy >= 0.75) {
    weights.hard = 2.5;
    weights.easy = 0.5;
  } else if (accuracy <= 0.4) {
    weights.hard = 0.6;
    weights.easy = 2.0;
  }

  const scored = questions.map((q) => {
    const bucket = classifyQuestion(q, tracking);
    const weight = weights[bucket];
    // Add random jitter (±0.3) to prevent deterministic ordering
    const jitter = (Math.random() - 0.5) * 0.6;
    return { question: q, score: weight + jitter };
  });

  // Sort descending by score (highest-priority questions first)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.question);
}
