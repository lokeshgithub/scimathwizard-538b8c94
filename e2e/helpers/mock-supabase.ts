import { Page } from '@playwright/test';
import { SUBJECTS, TOPICS, QUESTIONS } from '../fixtures/mock-data';

/**
 * Build a QuestionBank (the shape the app stores in localStorage)
 * from our flat mock data so the app starts with questions pre-loaded.
 */
function buildQuestionBankCache() {
  const subjectMap = new Map(SUBJECTS.map((s) => [s.id, s.name.toLowerCase()]));
  const topicMap = new Map(TOPICS.map((t) => [t.id, { name: t.name, subject: subjectMap.get(t.subject_id) ?? 'math' }]));

  const bank: Record<string, Record<string, unknown[]>> = {};

  for (const q of QUESTIONS) {
    const info = topicMap.get(q.topic_id);
    if (!info) continue;
    if (!bank[info.subject]) bank[info.subject] = {};
    if (!bank[info.subject][info.name]) bank[info.subject][info.name] = [];

    bank[info.subject][info.name].push({
      id: q.id,
      level: q.level,
      question: q.question,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correct: -1,
      explanation: q.explanation ?? '',
      concepts: [],
      hint: q.hint ?? undefined,
      shuffleMap: [0, 1, 2, 3],
      chapter: info.name,
    });
  }
  return bank;
}

const QUESTION_BANK = buildQuestionBankCache();

/** JSON blob written to `magical-mastery-questions-cache`. */
const BANK_CACHE = JSON.stringify({
  bank: QUESTION_BANK,
  timestamp: Date.now(),
});

/** JSON blob written to `magical-mastery-quiz` (the main quiz state). */
const QUIZ_STATE = JSON.stringify({
  schemaVersion: 4,
  banks: QUESTION_BANK,
  progress: {},
  questionTracking: {},
  sessionStats: { solved: 0, correct: 0, streak: 0, mastered: 0, stars: 0, totalCorrect: 0, maxStreak: 0 },
  unlockedLevels: {},
});

/**
 * Intercept all Supabase REST-API and Edge-Function requests so
 * the app can render a fully populated dashboard without a live DB.
 *
 * Call this BEFORE `page.goto()` in every test (or via the shared
 * `setupTest` helper).
 */
export async function setupSupabaseMocks(page: Page): Promise<void> {
  // Pre-seed localStorage so the app starts with a populated question bank
  // (skips the empty-skeleton phase → level buttons render immediately),
  // and suppress the welcome modal so it doesn't block interactions.
  await page.addInitScript(({ quizState, bankCache }: { quizState: string; bankCache: string }) => {
    localStorage.setItem('magical-mastery-quiz', quizState);
    localStorage.setItem('magical-mastery-questions-cache', bankCache);
    localStorage.setItem('magic-mastery-welcome-seen', 'true');
  }, { quizState: QUIZ_STATE, bankCache: BANK_CACHE });
  // ── REST: GET /rest/v1/subjects ──────────────────────────────
  await page.route('**/rest/v1/subjects*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SUBJECTS),
    });
  });

  // ── REST: GET /rest/v1/topics ────────────────────────────────
  await page.route('**/rest/v1/topics*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOPICS),
    });
  });

  // ── RPC: get_public_questions ────────────────────────────────
  await page.route('**/rest/v1/rpc/get_public_questions*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(QUESTIONS),
    });
  });

  // ── RPC: get_questions_by_topics ─────────────────────────────
  await page.route('**/rest/v1/rpc/get_questions_by_topics*', async (route) => {
    let topicIds: string[] = [];
    try {
      const body = route.request().postDataJSON();
      topicIds = body?.p_topic_ids ?? [];
    } catch { /* empty */ }

    const filtered = topicIds.length
      ? QUESTIONS.filter((q) => topicIds.includes(q.topic_id))
      : QUESTIONS;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(filtered),
    });
  });

  // ── Edge function: validate-answer ───────────────────────────
  await page.route('**/functions/v1/validate-answer*', async (route) => {
    let questionId = '';
    let selectedAnswer = 0;
    try {
      const body = route.request().postDataJSON();
      questionId = body?.questionId ?? '';
      selectedAnswer = body?.selectedAnswer ?? 0;
    } catch { /* empty */ }

    // Always say the first option (index 0) is correct for test simplicity.
    const isCorrect = selectedAnswer === 0;
    const question = QUESTIONS.find((q) => q.id === questionId);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isCorrect,
        correctIndex: 0,
        explanation: question?.explanation ?? 'Mock explanation.',
      }),
    });
  });

  // ── REST: GET /rest/v1/questions (admin query, select) ───────
  await page.route('**/rest/v1/questions*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(QUESTIONS),
    });
  });

  // ── Auth endpoints (return "no session" so ProtectedRoute still redirects) ──
  await page.route('**/auth/v1/token*', (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'No session' }),
    });
  });

  await page.route('**/auth/v1/user*', (route) => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'not authenticated' }),
    });
  });
}
