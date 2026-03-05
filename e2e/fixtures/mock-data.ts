/**
 * Mock Supabase data for E2E tests.
 *
 * Provides subjects, topics, and questions so the app renders a
 * fully populated dashboard without a live database connection.
 */

// ── Subjects ───────────────────────────────────────────────────
export const SUBJECTS = [
  { id: 'subj-math-0001', name: 'Math' },
  { id: 'subj-phys-0002', name: 'Physics' },
  { id: 'subj-chem-0003', name: 'Chemistry' },
];

// ── Topics ─────────────────────────────────────────────────────
export const TOPICS = [
  // Math
  { id: 'topic-integers-01', name: 'Integers', subject_id: 'subj-math-0001', grade: 7 },
  { id: 'topic-fractions-02', name: 'Fractions', subject_id: 'subj-math-0001', grade: 7 },
  { id: 'topic-algebra-03', name: 'Algebra', subject_id: 'subj-math-0001', grade: 7 },
  // Physics
  { id: 'topic-motion-04', name: 'Motion', subject_id: 'subj-phys-0002', grade: 7 },
  { id: 'topic-force-05', name: 'Force', subject_id: 'subj-phys-0002', grade: 7 },
  { id: 'topic-energy-06', name: 'Energy', subject_id: 'subj-phys-0002', grade: 7 },
  // Chemistry
  { id: 'topic-matter-07', name: 'Matter', subject_id: 'subj-chem-0003', grade: 7 },
  { id: 'topic-elements-08', name: 'Elements', subject_id: 'subj-chem-0003', grade: 7 },
  { id: 'topic-acids-09', name: 'Acids and Bases', subject_id: 'subj-chem-0003', grade: 7 },
];

// ── Question generator ─────────────────────────────────────────
function makeQuestion(
  id: string,
  topicId: string,
  level: number,
  questionText: string,
) {
  return {
    id,
    topic_id: topicId,
    level,
    question: questionText,
    option_a: 'A. First option',
    option_b: 'B. Second option',
    option_c: 'C. Third option',
    option_d: 'D. Fourth option',
    correct_answer: 'A',
    explanation: `This is the explanation for: ${questionText}`,
    hint: 'Think carefully about the concept.',
    sub_topic: null,
  };
}

let qIdx = 0;
function questionsForTopic(topicId: string, topicName: string) {
  const qs = [];
  for (let level = 1; level <= 3; level++) {
    for (let i = 1; i <= 4; i++) {
      qIdx++;
      qs.push(
        makeQuestion(
          `q-${String(qIdx).padStart(4, '0')}`,
          topicId,
          level,
          `${topicName} L${level} Q${i}: What is the answer?`,
        ),
      );
    }
  }
  return qs;
}

// ── All questions (flat array, same shape the RPC returns) ─────
export const QUESTIONS = TOPICS.flatMap((t) =>
  questionsForTopic(t.id, t.name),
);
