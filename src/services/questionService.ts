import { supabase } from '@/integrations/supabase/client';
import type { Question, QuestionBank, Subject } from '@/types/quiz';
import * as XLSX from 'xlsx';

/**
 * Shuffle an array of options and return the shuffled array plus a map
 * that tracks where each shuffled element came from.
 * shuffleMap[shuffledIdx] = originalIdx
 */
function shuffleOptions(options: string[]): { shuffledOptions: string[]; shuffleMap: number[] } {
  // Create array of indices [0, 1, 2, 3]
  const indices = options.map((_, i) => i);
  
  // Fisher-Yates shuffle on indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Build shuffled options and map
  const shuffledOptions = indices.map(i => options[i]);
  const shuffleMap = indices; // shuffleMap[newIdx] = originalIdx
  
  return { shuffledOptions, shuffleMap };
}

interface DBSubject {
  id: string;
  name: string;
  icon: string | null;
}

interface DBTopic {
  id: string;
  name: string;
  subject_id: string;
}

// Question data with correct_answer for instant local validation
interface DBQuestion {
  id: string;
  topic_id: string;
  level: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  hint: string | null;
  sub_topic: string | null; // Sub-topic within a chapter (Physics/Chemistry hierarchy)
}

// In-memory cache for instant answer validation
const answerCache = new Map<string, { correctIndex: number; explanation: string }>();

// LocalStorage cache for questions to speed up initial load
const QUESTIONS_CACHE_KEY = 'magical-mastery-questions-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL

interface CachedQuestions {
  bank: QuestionBank;
  timestamp: number;
}

function loadQuestionsFromCache(): QuestionBank | null {
  try {
    const cached = localStorage.getItem(QUESTIONS_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedQuestions = JSON.parse(cached);
    // Check if cache is still valid
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      // Rebuild answer cache from stored data
      for (const subjectKey of Object.keys(parsed.bank)) {
        for (const topicName of Object.keys(parsed.bank[subjectKey])) {
          for (const q of parsed.bank[subjectKey][topicName]) {
            answerCache.set(q.id, {
              correctIndex: q.correct,
              explanation: q.explanation || '',
            });
          }
        }
      }
      console.log('Loaded questions from localStorage cache');
      return parsed.bank;
    }
  } catch (e) {
    console.error('Failed to load questions cache:', e);
  }
  return null;
}

function saveQuestionsToCache(bank: QuestionBank): void {
  try {
    const cached: CachedQuestions = {
      bank,
      timestamp: Date.now(),
    };
    localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.error('Failed to save questions cache:', e);
  }
}

// Fetch all questions organized by subject and topic (with answers for instant validation)
export async function fetchAllQuestions(): Promise<QuestionBank> {
  // Try to load from cache first for instant display
  const cachedBank = loadQuestionsFromCache();
  if (cachedBank && Object.keys(cachedBank).length > 0) {
    // Refresh in background for next time (non-blocking)
    refreshQuestionsInBackground();
    return cachedBank;
  }
  const bank: QuestionBank = {};

  // Fetch subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*');

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return bank;
  }

  // Fetch topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*');

  if (topicsError) {
    console.error('Error fetching topics:', topicsError);
    return bank;
  }

  // Fetch ALL questions using the public RPC function (bypasses RLS for read access)
  // Supabase has a default 1000 row limit, so we need to paginate
  let allQuestions: DBQuestion[] = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: batch, error: questionsError } = await supabase
      .rpc('get_public_questions')
      .range(offset, offset + pageSize - 1) as { data: DBQuestion[] | null; error: any };
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      break;
    }
    
    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allQuestions = [...allQuestions, ...batch];
      offset += pageSize;
      hasMore = batch.length === pageSize;
    }
  }
  
  const questions = allQuestions;
  
  if (questions.length === 0) {
    console.error('No questions fetched from database');
    return bank;
  }
  
  console.log(`Fetched ${questions.length} questions from database (paginated)`);

  // Build lookup maps
  const subjectMap = new Map<string, DBSubject>(
    (subjects as DBSubject[]).map(s => [s.id, s])
  );
  const topicMap = new Map<string, DBTopic>(
    (topics as DBTopic[]).map(t => [t.id, t])
  );

  // Clear and rebuild answer cache
  answerCache.clear();

  // Organize questions with correct answer stored in memory
  for (const q of questions) {
    const topic = topicMap.get(q.topic_id);
    if (!topic) continue;

    const subject = subjectMap.get(topic.subject_id);
    if (!subject) continue;

    const subjectKey = subject.name.toLowerCase() as Subject;
    const topicName = topic.name;

    if (!bank[subjectKey]) {
      bank[subjectKey] = {};
    }
    if (!bank[subjectKey][topicName]) {
      bank[subjectKey][topicName] = [];
    }

    // Convert A/B/C/D to 0/1/2/3
    const originalCorrectIndex = q.correct_answer.toUpperCase().charCodeAt(0) - 65;

    // Shuffle options for each student session
    const originalOptions = [q.option_a, q.option_b, q.option_c, q.option_d];
    const { shuffledOptions, shuffleMap } = shuffleOptions(originalOptions);

    // Find where the correct answer ended up after shuffling
    // shuffleMap[newIdx] = originalIdx, so we need to find newIdx where shuffleMap[newIdx] === originalCorrectIndex
    const shuffledCorrectIndex = shuffleMap.findIndex(origIdx => origIdx === originalCorrectIndex);

    // Cache the correct answer for instant validation
    answerCache.set(q.id, {
      correctIndex: shuffledCorrectIndex,
      explanation: q.explanation || '',
    });

    // Use only custom hints from database - no auto-generation
    const hint = q.hint || undefined;

    // Store shuffled correct index locally for instant validation
    // For sub-topic: if null, same as topic name (backward compat for Math)
    bank[subjectKey][topicName].push({
      id: q.id,
      level: q.level,
      question: q.question,
      options: shuffledOptions,
      correct: shuffledCorrectIndex, // Now stored for instant validation!
      explanation: q.explanation || '',
      concepts: [],
      hint,
      shuffleMap,
      subTopic: q.sub_topic || undefined, // Sub-topic within chapter (Physics/Chemistry)
      chapter: topicName, // Parent chapter/topic name
    });
  }

  console.log(`Loaded ${questions.length} questions into memory for instant validation`);

  // Save to cache for faster subsequent loads
  saveQuestionsToCache(bank);

  return bank;
}

// Background refresh - fetches latest questions without blocking UI
async function refreshQuestionsInBackground(): Promise<void> {
  try {
    // Fetch from database silently
    const { data: subjects } = await supabase.from('subjects').select('*');
    const { data: topics } = await supabase.from('topics').select('*');

    if (!subjects || !topics) return;

    let allQuestions: DBQuestion[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch } = await supabase
        .rpc('get_public_questions')
        .range(offset, offset + pageSize - 1) as { data: DBQuestion[] | null; error: any };

      if (!batch || batch.length === 0) {
        hasMore = false;
      } else {
        allQuestions = [...allQuestions, ...batch];
        offset += pageSize;
        hasMore = batch.length === pageSize;
      }
    }

    if (allQuestions.length > 0) {
      // Build new bank (same logic as fetchAllQuestions)
      const bank: QuestionBank = {};
      const subjectMap = new Map<string, DBSubject>(
        (subjects as DBSubject[]).map(s => [s.id, s])
      );
      const topicMap = new Map<string, DBTopic>(
        (topics as DBTopic[]).map(t => [t.id, t])
      );

      for (const q of allQuestions) {
        const topic = topicMap.get(q.topic_id);
        if (!topic) continue;
        const subject = subjectMap.get(topic.subject_id);
        if (!subject) continue;

        const subjectKey = subject.name.toLowerCase() as Subject;
        const topicName = topic.name;

        if (!bank[subjectKey]) bank[subjectKey] = {};
        if (!bank[subjectKey][topicName]) bank[subjectKey][topicName] = [];

        const originalCorrectIndex = q.correct_answer.toUpperCase().charCodeAt(0) - 65;
        const originalOptions = [q.option_a, q.option_b, q.option_c, q.option_d];
        const { shuffledOptions, shuffleMap } = shuffleOptions(originalOptions);
        const shuffledCorrectIndex = shuffleMap.findIndex(origIdx => origIdx === originalCorrectIndex);

        bank[subjectKey][topicName].push({
          id: q.id,
          level: q.level,
          question: q.question,
          options: shuffledOptions,
          correct: shuffledCorrectIndex,
          explanation: q.explanation || '',
          concepts: [],
          hint: q.hint || undefined,
          shuffleMap,
          subTopic: q.sub_topic || undefined,
          chapter: topicName,
        });
      }

      // Update cache for next load
      saveQuestionsToCache(bank);
      console.log('Background refresh completed - cache updated');
    }
  } catch (e) {
    // Silent fail - background refresh is optional
    console.error('Background refresh failed:', e);
  }
}

// Instant local answer validation - no network call needed!
export function validateAnswerLocal(
  questionId: string,
  selectedAnswer: number
): { isCorrect: boolean; correctIndex: number; explanation: string } | null {
  const cached = answerCache.get(questionId);
  if (!cached) return null;
  
  return {
    isCorrect: selectedAnswer === cached.correctIndex,
    correctIndex: cached.correctIndex,
    explanation: cached.explanation,
  };
}

// Background logging to edge function (fire-and-forget, non-blocking)
export function logAnswerToServer(
  questionId: string,
  selectedAnswer: number,
  isCorrect: boolean
): void {
  // Fire and forget - don't await
  supabase.functions.invoke('validate-answer', {
    body: { questionId, selectedAnswer, logOnly: true },
  }).catch(() => {
    // Silently ignore errors - this is just for logging
  });
}

// Legacy validate answer via edge function (kept for fallback)
export async function validateAnswer(
  questionId: string,
  selectedAnswer: number
): Promise<{ isCorrect: boolean; correctIndex: number; explanation: string }> {
  // Try local validation first (instant!)
  const localResult = validateAnswerLocal(questionId, selectedAnswer);
  if (localResult) {
    // Log to server in background (non-blocking)
    logAnswerToServer(questionId, selectedAnswer, localResult.isCorrect);
    return localResult;
  }

  // Fallback to edge function if not in cache
  const { data, error } = await supabase.functions.invoke('validate-answer', {
    body: { questionId, selectedAnswer },
  });

  if (error) {
    console.error('Error validating answer:', error);
    throw new Error('Failed to validate answer');
  }

  return data;
}

// Check for duplicate questions in a topic
export async function checkDuplicateQuestions(
  topicId: string,
  questions: Array<{ question: string }>
): Promise<Set<string>> {
  // Fetch existing questions for this topic (admin can access via RLS)
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('question')
    .eq('topic_id', topicId);

  const existingSet = new Set<string>(
    (existingQuestions || []).map((q: { question: string }) => q.question.trim().toLowerCase())
  );

  return existingSet;
}

// Delete all questions for a topic
export async function deleteTopicQuestions(topicId: string): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .delete()
      .eq('topic_id', topicId)
      .select('id');

    if (error) throw new Error(`Failed to delete questions: ${error.message}`);
    
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Delete ALL questions, topics, and optionally subjects for a fresh start
export async function deleteAllQuestionData(options: { keepSubjects?: boolean } = {}): Promise<{ 
  success: boolean; 
  error?: string; 
  deletedQuestions?: number;
  deletedTopics?: number;
  deletedSubjects?: number;
}> {
  try {
    // Delete all questions first (child table)
    const { data: deletedQuestions, error: questionsError } = await supabase
      .from('questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (workaround for no .deleteAll())
      .select('id');

    if (questionsError) throw new Error(`Failed to delete questions: ${questionsError.message}`);

    // Delete all topics
    const { data: deletedTopics, error: topicsError } = await supabase
      .from('topics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (topicsError) throw new Error(`Failed to delete topics: ${topicsError.message}`);

    let deletedSubjectsCount = 0;
    if (!options.keepSubjects) {
      // Delete all subjects
      const { data: deletedSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('id');

      if (subjectsError) throw new Error(`Failed to delete subjects: ${subjectsError.message}`);
      deletedSubjectsCount = deletedSubjects?.length || 0;
    }

    return { 
      success: true, 
      deletedQuestions: deletedQuestions?.length || 0,
      deletedTopics: deletedTopics?.length || 0,
      deletedSubjects: deletedSubjectsCount,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Delete a specific topic and all its questions
export async function deleteTopicById(topicId: string): Promise<{ 
  success: boolean; 
  error?: string; 
  deletedQuestions?: number;
}> {
  try {
    // First delete all questions in this topic
    const { data: deletedQuestions, error: questionsError } = await supabase
      .from('questions')
      .delete()
      .eq('topic_id', topicId)
      .select('id');

    if (questionsError) throw new Error(`Failed to delete questions: ${questionsError.message}`);

    // Then delete the topic itself
    const { error: topicError } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId);

    if (topicError) throw new Error(`Failed to delete topic: ${topicError.message}`);

    return { 
      success: true, 
      deletedQuestions: deletedQuestions?.length || 0,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Canonical topic name mappings - maps normalized lowercase to proper display name
// Official blueprint topics - these are the ONLY valid topic names
export const BLUEPRINT_TOPICS: Record<string, string[]> = {
  'Math': [
    'Integers', 'Rational Numbers', 'Fractions', 'Decimals',
    'Exponents and Powers', 'Ratio and Proportion', 'Unitary Methods',
    'Percentages', 'Profit and Loss', 'Simple Interest',
    'Algebraic Expressions', 'Linear Equations', 'Set Concepts',
    'Lines and Angles', 'Triangles', 'Pythagoras Theorem', 'Congruence',
    'Symmetry', 'Perimeter and Area', 'Mensuration', 'Quadrilaterals',
    'Circles', 'Constructions', 'Data Handling', 'Probability',
  ],
  'Physics': [
    'Motion', 'Force', 'Gravitation', 'Work and Energy', 'Sound',
    'Light', 'Electricity', 'Magnetism', 'Heat',
  ],
  'Chemistry': [
    'Matter', 'Atoms and Molecules', 'Chemical Reactions', 'Acids and Bases',
    'Metals and Non-metals', 'Carbon Compounds', 'Periodic Table',
  ],
};

const TOPIC_NAME_MAP: Record<string, string> = {
  // Integers
  'integers': 'Integers',
  'integer': 'Integers',
  // Rational Numbers
  'rationalnumbers': 'Rational Numbers',
  'rational numbers': 'Rational Numbers',
  'rational number': 'Rational Numbers',
  // Fractions
  'fractions': 'Fractions',
  'fraction': 'Fractions',
  // Decimals
  'decimals': 'Decimals',
  'decimal': 'Decimals',
  'decimal fractions': 'Decimals',
  // Exponents and Powers
  'exponentsandpowers': 'Exponents and Powers',
  'exponents and powers': 'Exponents and Powers',
  'exponents': 'Exponents and Powers',
  'exponent': 'Exponents and Powers',
  'powers': 'Exponents and Powers',
  // Ratio and Proportion
  'ratioandproportion': 'Ratio and Proportion',
  'ratio and proportion': 'Ratio and Proportion',
  'ratioproportion': 'Ratio and Proportion',
  'ratio proportion': 'Ratio and Proportion',
  'ratioandprop': 'Ratio and Proportion',
  'ratio and prop': 'Ratio and Proportion',
  'ratio': 'Ratio and Proportion',
  'proportion': 'Ratio and Proportion',
  // Unitary Methods
  'unitarymethods': 'Unitary Methods',
  'unitary methods': 'Unitary Methods',
  'unitary method': 'Unitary Methods',
  'unitarymethod': 'Unitary Methods',
  // Percentages
  'percentages': 'Percentages',
  'percentage': 'Percentages',
  'percent': 'Percentages',
  'percent and percentage': 'Percentages',
  'percentpercentage': 'Percentages',
  'percent percentage': 'Percentages',
  // Profit and Loss
  'profitandloss': 'Profit and Loss',
  'profit and loss': 'Profit and Loss',
  'profitloss': 'Profit and Loss',
  'profit loss': 'Profit and Loss',
  'profit loss and discount': 'Profit and Loss',
  'profitlossdiscount': 'Profit and Loss',
  'profit loss discount': 'Profit and Loss',
  'profit': 'Profit and Loss',
  'loss': 'Profit and Loss',
  'discount': 'Profit and Loss',
  // Simple Interest
  'simpleinterest': 'Simple Interest',
  'simple interest': 'Simple Interest',
  'interest': 'Simple Interest',
  // Algebraic Expressions
  'algebraicexpressions': 'Algebraic Expressions',
  'algebraic expressions': 'Algebraic Expressions',
  'algebraic_expressions': 'Algebraic Expressions',
  'algebraic expression': 'Algebraic Expressions',
  'algebra': 'Algebraic Expressions',
  'fundamental concepts': 'Algebraic Expressions',
  // Probability
  'probability': 'Probability',
  // Linear Equations
  'linearequations': 'Linear Equations',
  'linear equations': 'Linear Equations',
  'linear equation': 'Linear Equations',
  'simple linear equations': 'Linear Equations',
  // Set Concepts
  'setconcepts': 'Set Concepts',
  'set concepts': 'Set Concepts',
  'sets': 'Set Concepts',
  'set': 'Set Concepts',
  // Lines and Angles
  'linesandangles': 'Lines and Angles',
  'lines and angles': 'Lines and Angles',
  'lines': 'Lines and Angles',
  'angles': 'Lines and Angles',
  // Triangles
  'triangles': 'Triangles',
  'triangle': 'Triangles',
  // Pythagoras Theorem
  'pythagorastheorem': 'Pythagoras Theorem',
  'pythagoras theorem': 'Pythagoras Theorem',
  'pythagoras': 'Pythagoras Theorem',
  // Symmetry
  'symmetry': 'Symmetry',
  // Perimeter and Area
  'perimeter and area': 'Perimeter and Area',
  'perimeterandarea': 'Perimeter and Area',
  'perimeter': 'Perimeter and Area',
  'area': 'Perimeter and Area',
  // Congruence
  'congruence': 'Congruence',
  'congruent triangles': 'Congruence',
  'congruent': 'Congruence',
  // Data Handling
  'datahandling': 'Data Handling',
  'data handling': 'Data Handling',
  'data': 'Data Handling',
  // Mensuration
  'mensuration': 'Mensuration',
  // Quadrilaterals
  'quadrilaterals': 'Quadrilaterals',
  'quadrilateral': 'Quadrilaterals',
  // Circles
  'circles': 'Circles',
  'circle': 'Circles',
  // Constructions
  'constructions': 'Constructions',
  'construction': 'Constructions',
};

/**
 * Calculate similarity between two strings (0-1)
 * Uses a combination of techniques for robust matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const containmentScore = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.max(0.7, containmentScore);
  }

  // Calculate word overlap
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size > 0 && words2.size > 0) {
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    const jaccardScore = intersection / union;
    if (jaccardScore > 0.5) return jaccardScore;
  }

  // Levenshtein distance based similarity
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Parse a filename/sheet name to extract topic name and level
 * Examples:
 * - "Data Handling Level 1" → { topic: "Data Handling", level: 1 }
 * - "ch1-integers" → { topic: "Integers", level: null }
 * - "Profit and Loss L2" → { topic: "Profit and Loss", level: 2 }
 */
export function parseTopicFromName(rawName: string): { topic: string; level: number | null } {
  let name = rawName.trim();
  let extractedLevel: number | null = null;
  
  // Remove file extension if present
  name = name.replace(/\.(csv|tsv|txt|xlsx|xls)$/i, '');
  
  // Extract level from patterns like "Level 1", "L1", "level-1", "Lvl 2"
  const levelPatterns = [
    /\s*level\s*[-_]?\s*(\d+)\s*$/i,   // "Level 1", "level-1", "level_1"
    /\s*l(\d+)\s*$/i,                   // "L1", "l2"
    /\s*lvl\s*[-_]?\s*(\d+)\s*$/i,     // "Lvl 1", "lvl-2"
    /\s*[-_]\s*(\d+)\s*$/,              // trailing "-1" or "_2"
  ];
  
  for (const pattern of levelPatterns) {
    const match = name.match(pattern);
    if (match) {
      extractedLevel = parseInt(match[1], 10);
      name = name.replace(pattern, '').trim();
      break;
    }
  }
  
  // Remove chapter prefixes like "ch1-", "chapter2-"
  name = name.replace(/^(ch(apter)?[\d]+[a-z]?[-_\s]*)/i, '');
  
  // Clean up underscores and hyphens
  name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Try to normalize the topic name
  const normalized = normalizeTopicName(name);
  
  return { topic: normalized, level: extractedLevel };
}

/**
 * Find the best matching blueprint topic for a given input
 * Uses fuzzy matching with 80% similarity threshold
 * Returns the official topic name if found, otherwise null
 */
export function findBlueprintMatch(inputTopic: string, subject: string): string | null {
  const blueprintTopics = BLUEPRINT_TOPICS[subject] || BLUEPRINT_TOPICS['Math'];
  const normalizedInput = inputTopic.toLowerCase().replace(/\s+/g, '');
  const SIMILARITY_THRESHOLD = 0.6; // 60% minimum similarity for a match

  // 1. Direct exact match (case-insensitive)
  for (const topic of blueprintTopics) {
    if (topic.toLowerCase() === inputTopic.toLowerCase()) {
      return topic;
    }
  }

  // 2. Check TOPIC_NAME_MAP first (explicit mappings)
  const lowerInput = inputTopic.toLowerCase();
  const noSpaceInput = lowerInput.replace(/\s+/g, '');
  if (TOPIC_NAME_MAP[lowerInput]) {
    return TOPIC_NAME_MAP[lowerInput];
  }
  if (TOPIC_NAME_MAP[noSpaceInput]) {
    return TOPIC_NAME_MAP[noSpaceInput];
  }

  // 3. Fuzzy match - remove spaces and compare
  for (const topic of blueprintTopics) {
    const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '');
    if (normalizedTopic === normalizedInput) {
      return topic;
    }
  }

  // 4. Partial match - check if input contains topic or vice versa
  for (const topic of blueprintTopics) {
    const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '');
    if (normalizedInput.includes(normalizedTopic) || normalizedTopic.includes(normalizedInput)) {
      return topic;
    }
  }

  // 5. Similarity-based fuzzy match (find best match above threshold)
  let bestMatch: string | null = null;
  let bestScore = SIMILARITY_THRESHOLD;

  for (const topic of blueprintTopics) {
    const similarity = calculateSimilarity(inputTopic, topic);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = topic;
    }
  }

  if (bestMatch) {
    console.log(`Fuzzy matched "${inputTopic}" → "${bestMatch}" (${(bestScore * 100).toFixed(0)}% similarity)`);
  }

  return bestMatch;
}

// Normalize topic name to a clean, human-readable format
// Handles: "ch1-integers" → "Integers", "ch10-simpleinterest" → "Simple Interest"
// Also handles: "ch01_integers_master_final" → "Integers"
export function normalizeTopicName(rawName: string): string {
  let name = rawName.trim();
  
  // Remove common prefixes like "ch1-", "ch11b-", "chapter1-", etc.
  name = name.replace(/^(ch(apter)?[\d]+[a-z]?[-_\s]*)/i, '');
  
  // Remove common suffixes like "_master", "_final", "_v2", "_backup", etc.
  name = name.replace(/[-_\s]*(master|final|backup|copy|v\d+|version\d*|draft|new|old|updated|edited|revised)[-_\s]*/gi, ' ');
  
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]+/g, ' ');
  
  // Remove extra spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Check if we have a known mapping (try both with and without spaces)
  const lowerName = name.toLowerCase();
  const noSpaceName = lowerName.replace(/\s+/g, '');
  
  if (TOPIC_NAME_MAP[lowerName]) {
    return TOPIC_NAME_MAP[lowerName];
  }
  if (TOPIC_NAME_MAP[noSpaceName]) {
    return TOPIC_NAME_MAP[noSpaceName];
  }
  
  // Fallback: Split camelCase/concatenated words and title case
  // Handle cases like "simpleinterest" → "Simple Interest"
  name = name
    // Insert space before capital letters (for camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between word boundaries in concatenated lowercase words
    .replace(/(interest|numbers|expressions|equations|handling|methods|concepts|theorem|angles|triangles|proportion|powers)/gi, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Title case each word
  name = name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => {
      const lowerWord = word.toLowerCase();
      // Keep small words lowercase unless first word
      if (['and', 'or', 'of', 'the', 'in', 'on', 'at', 'to', 'for'].includes(lowerWord)) {
        return lowerWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  // Capitalize first letter always
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  // Check mapping again after processing
  const processedLower = name.toLowerCase();
  if (TOPIC_NAME_MAP[processedLower]) {
    return TOPIC_NAME_MAP[processedLower];
  }
  
  return name;
}

// Find existing topic by normalized name (case-insensitive fuzzy match)
export async function findMatchingTopic(
  subjectId: string, 
  rawTopicName: string
): Promise<{ id: string; name: string } | null> {
  const normalizedInput = normalizeTopicName(rawTopicName).toLowerCase();
  
  // Fetch all topics for this subject
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject_id', subjectId);
  
  if (!topics || topics.length === 0) return null;
  
  // Try to find a match
  for (const topic of topics) {
    const normalizedExisting = normalizeTopicName(topic.name).toLowerCase();
    if (normalizedExisting === normalizedInput) {
      return topic;
    }
  }
  
  return null;
}

// Sanitize database error messages for user display
function sanitizeDbError(error: { message?: string; code?: string; details?: string } | null): string {
  if (!error?.message) return 'Database operation failed';
  const msg = error.message.toLowerCase();

  // Log full error for debugging
  console.error('[DB Error]', { message: error.message, code: error.code, details: error.details });

  if (msg.includes('duplicate') || msg.includes('unique')) return 'Item already exists';
  if (msg.includes('foreign key')) return 'Invalid reference - related item not found';
  if (msg.includes('not-null') || msg.includes('null value')) return `Missing required field: ${error.message}`;
  if (msg.includes('violates check')) return 'Invalid data format';
  if (msg.includes('permission denied') || msg.includes('rls')) return 'Permission denied - check RLS policies';
  if (msg.includes('column') && msg.includes('does not exist')) return `Column missing: ${error.message}`;

  // For unknown errors, show more detail in dev
  return `Database error: ${error.message.slice(0, 100)}`;
}

// Admin function to upload questions from CSV
export async function uploadQuestionsFromCSV(
  subjectName: string,
  topicName: string,
  questions: Array<{
    level: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
    subTopic?: string; // Sub-topic within chapter (Physics/Chemistry hierarchy)
  }>,
  options: { replaceExisting?: boolean } = {}
): Promise<{ success: boolean; error?: string; count?: number; skipped?: number; normalizedTopicName?: string; blueprintMatch?: boolean }> {
  try {
    // Parse the topic name to extract actual topic and level from filename
    const { topic: parsedTopic, level: filenameLevel } = parseTopicFromName(topicName);
    
    // Check if this matches a blueprint topic
    const blueprintMatch = findBlueprintMatch(parsedTopic, subjectName);
    const normalizedTopicName = blueprintMatch || normalizeTopicName(parsedTopic);
    
    // Get or create subject
    let { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', subjectName)
      .maybeSingle();

    if (!subject) {
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ name: subjectName })
        .select('id')
        .single();

      if (subjectError) {
        console.error('Subject creation error:', subjectError);
        throw new Error(`Failed to create subject: ${sanitizeDbError(subjectError)}`);
      }
      subject = newSubject;
    }

    // Try to find an existing topic with matching normalized name
    let topic = await findMatchingTopic(subject.id, topicName);
    
    if (!topic) {
      // No match found - create new topic with normalized name
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({ subject_id: subject.id, name: normalizedTopicName })
        .select('id, name')
        .single();

      if (topicError) {
        console.error('Topic creation error:', topicError);
        throw new Error(`Failed to create topic: ${sanitizeDbError(topicError)}`);
      }
      topic = newTopic;
    }

    // If replaceExisting is true, delete all existing questions first
    if (options.replaceExisting) {
      await deleteTopicQuestions(topic.id);
    }

    // Check for duplicates (only if not replacing)
    let existingQuestions = new Set<string>();
    if (!options.replaceExisting) {
      existingQuestions = await checkDuplicateQuestions(topic.id, questions);
    }

    // Filter out duplicates and prepare questions for insert
    let skippedCount = 0;
    const questionsToInsert: Array<{
      topic_id: string;
      level: number;
      question: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_answer: string;
      explanation: string | null;
      hint: string | null;
      sub_topic: string | null; // Sub-topic within chapter (Physics/Chemistry)
    }> = [];

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      
      // Check for duplicate
      if (existingQuestions.has(q.question.trim().toLowerCase())) {
        skippedCount++;
        continue;
      }

      // Ensure correct_answer is a valid uppercase letter A-D
      const answer = q.correctAnswer.trim().toUpperCase();
      const validAnswer = ['A', 'B', 'C', 'D'].includes(answer) ? answer : 'A';

      // Validate level is between 1-7 (throw error if > 7)
      const rawLevel = q.level || 1;
      if (rawLevel > 7) {
        throw new Error(`Question ${index + 1} has invalid level ${rawLevel}. Maximum supported level is 7.`);
      }
      if (rawLevel < 1) {
        throw new Error(`Question ${index + 1} has invalid level ${rawLevel}. Minimum level is 1.`);
      }
      const validLevel = Math.max(1, Math.min(7, rawLevel));
      
      // Sanitize and validate text fields with length limits
      const sanitizeText = (text: string, maxLength: number): string => {
        if (!text) return '';
        return text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, maxLength);
      };
      
      const questionText = sanitizeText(q.question, 2000);
      const optionA = sanitizeText(q.optionA, 500);
      const optionB = sanitizeText(q.optionB, 500);
      const optionC = sanitizeText(q.optionC, 500);
      const optionD = sanitizeText(q.optionD, 500);
      const explanation = sanitizeText(q.explanation, 5000);
      const hint = q.hint ? sanitizeText(q.hint, 2000) : null;
      
      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      
      // Sanitize sub_topic if provided
      const subTopic = q.subTopic ? sanitizeText(q.subTopic, 200) : null;

      questionsToInsert.push({
        topic_id: topic!.id,
        level: validLevel,
        question: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: validAnswer,
        explanation: explanation || null,
        hint: hint,
        sub_topic: subTopic, // NULL for Math (backward compat), set for Physics/Chemistry
      });
    }

    if (questionsToInsert.length > 0) {
      // Try insert with sub_topic first
      let { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      // If sub_topic column doesn't exist, retry without it
      if (insertError && insertError.message?.includes('sub_topic')) {
        console.log('sub_topic column not found, retrying without it...');
        const questionsWithoutSubTopic = questionsToInsert.map(({ sub_topic, ...rest }) => rest);
        const retryResult = await supabase
          .from('questions')
          .insert(questionsWithoutSubTopic);
        insertError = retryResult.error;
      }

      if (insertError) {
        console.error('Question insert error:', insertError);
        throw new Error(`Failed to insert questions: ${sanitizeDbError(insertError)}`);
      }
    }

    return {
      success: true,
      count: questionsToInsert.length,
      skipped: skippedCount,
      normalizedTopicName: topic.name,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// SMART UPLOAD WITH CHANGE DETECTION
// ============================================

// Types for smart upload report
export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface UpdatedQuestion {
  rowNumber: number;
  questionId: string;
  questionPreview: string; // First 80 chars of question text
  changes: FieldChange[];
}

export interface InsertedQuestion {
  rowNumber: number;
  questionPreview: string;
  level: number;
}

export interface SmartUploadReport {
  success: boolean;
  error?: string;
  topicName: string;
  summary: {
    total: number;
    inserted: number;
    updated: number;
    unchanged: number;
    errors: number;
  };
  inserted: InsertedQuestion[];
  updated: UpdatedQuestion[];
  errors: Array<{ rowNumber: number; error: string }>;
}

// Existing question from database for comparison
interface ExistingQuestion {
  id: string;
  topic_id: string;
  level: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  hint: string | null;
  sub_topic: string | null;
}

// Smart upload that detects changes and only updates modified questions
export async function smartUploadQuestions(
  subjectName: string,
  topicName: string,
  questions: Array<{
    level: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
    subTopic?: string;
  }>
): Promise<SmartUploadReport> {
  const report: SmartUploadReport = {
    success: false,
    topicName: '',
    summary: { total: questions.length, inserted: 0, updated: 0, unchanged: 0, errors: 0 },
    inserted: [],
    updated: [],
    errors: [],
  };

  try {
    // Parse and normalize topic name
    const { topic: parsedTopic } = parseTopicFromName(topicName);
    const blueprintMatch = findBlueprintMatch(parsedTopic, subjectName);
    const normalizedTopicName = blueprintMatch || normalizeTopicName(parsedTopic);
    report.topicName = normalizedTopicName;

    // Get or create subject
    let { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', subjectName)
      .maybeSingle();

    if (!subject) {
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ name: subjectName })
        .select('id')
        .single();

      if (subjectError) {
        report.error = `Failed to create subject: ${sanitizeDbError(subjectError)}`;
        return report;
      }
      subject = newSubject;
    }

    // Get or create topic
    let topic = await findMatchingTopic(subject.id, topicName);

    if (!topic) {
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({ subject_id: subject.id, name: normalizedTopicName })
        .select('id, name')
        .single();

      if (topicError) {
        report.error = `Failed to create topic: ${sanitizeDbError(topicError)}`;
        return report;
      }
      topic = newTopic;
    }

    // Fetch ALL existing questions for this topic
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topic.id);

    if (fetchError) {
      report.error = `Failed to fetch existing questions: ${sanitizeDbError(fetchError)}`;
      return report;
    }

    // Create a map for quick lookup by normalized question text
    const existingMap = new Map<string, ExistingQuestion>();
    for (const eq of (existingQuestions || [])) {
      const key = eq.question.trim().toLowerCase();
      existingMap.set(key, eq as ExistingQuestion);
    }

    // Sanitize helper
    const sanitizeText = (text: string, maxLength: number): string => {
      if (!text) return '';
      return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, maxLength);
    };

    // Process each question
    const questionsToInsert: Array<{
      topic_id: string;
      level: number;
      question: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_answer: string;
      explanation: string | null;
      hint: string | null;
      sub_topic: string | null;
    }> = [];

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      const rowNumber = index + 2; // +2 because index 0 = row 2 (after header)

      try {
        // Validate and sanitize
        const rawLevel = q.level || 1;
        if (rawLevel < 1 || rawLevel > 7) {
          report.errors.push({ rowNumber, error: `Invalid level ${rawLevel}. Must be 1-7.` });
          report.summary.errors++;
          continue;
        }

        const questionText = sanitizeText(q.question, 2000);
        const optionA = sanitizeText(q.optionA, 500);
        const optionB = sanitizeText(q.optionB, 500);
        const optionC = sanitizeText(q.optionC, 500);
        const optionD = sanitizeText(q.optionD, 500);
        const explanation = sanitizeText(q.explanation, 5000) || null;
        const hint = q.hint ? sanitizeText(q.hint, 2000) : null;
        const subTopic = q.subTopic ? sanitizeText(q.subTopic, 200) : null;
        const correctAnswer = q.correctAnswer.trim().toUpperCase();
        const validAnswer = ['A', 'B', 'C', 'D'].includes(correctAnswer) ? correctAnswer : 'A';

        if (!questionText || !optionA || !optionB || !optionC || !optionD) {
          report.errors.push({ rowNumber, error: 'Missing required fields (question or options)' });
          report.summary.errors++;
          continue;
        }

        // Check if this question exists
        const key = questionText.trim().toLowerCase();
        const existing = existingMap.get(key);

        if (existing) {
          // Question exists - check for changes
          const changes: FieldChange[] = [];

          if (existing.level !== rawLevel) {
            changes.push({ field: 'Level', oldValue: String(existing.level), newValue: String(rawLevel) });
          }
          if (existing.option_a !== optionA) {
            changes.push({ field: 'Option A', oldValue: existing.option_a, newValue: optionA });
          }
          if (existing.option_b !== optionB) {
            changes.push({ field: 'Option B', oldValue: existing.option_b, newValue: optionB });
          }
          if (existing.option_c !== optionC) {
            changes.push({ field: 'Option C', oldValue: existing.option_c, newValue: optionC });
          }
          if (existing.option_d !== optionD) {
            changes.push({ field: 'Option D', oldValue: existing.option_d, newValue: optionD });
          }
          if (existing.correct_answer !== validAnswer) {
            changes.push({ field: 'Correct Answer', oldValue: existing.correct_answer, newValue: validAnswer });
          }
          if ((existing.explanation || '') !== (explanation || '')) {
            changes.push({
              field: 'Explanation',
              oldValue: (existing.explanation || '').slice(0, 100) + (existing.explanation && existing.explanation.length > 100 ? '...' : ''),
              newValue: (explanation || '').slice(0, 100) + (explanation && explanation.length > 100 ? '...' : '')
            });
          }
          if ((existing.hint || '') !== (hint || '')) {
            changes.push({
              field: 'Hint',
              oldValue: existing.hint || '(none)',
              newValue: hint || '(none)'
            });
          }
          if ((existing.sub_topic || '') !== (subTopic || '')) {
            changes.push({
              field: 'Sub-Topic',
              oldValue: existing.sub_topic || '(none)',
              newValue: subTopic || '(none)'
            });
          }

          if (changes.length > 0) {
            // Has changes - update the question
            let { error: updateError } = await supabase
              .from('questions')
              .update({
                level: rawLevel,
                option_a: optionA,
                option_b: optionB,
                option_c: optionC,
                option_d: optionD,
                correct_answer: validAnswer,
                explanation,
                hint,
                sub_topic: subTopic,
              })
              .eq('id', existing.id);

            // If sub_topic column doesn't exist, retry without it
            if (updateError && updateError.message?.includes('sub_topic')) {
              const retryResult = await supabase
                .from('questions')
                .update({
                  level: rawLevel,
                  option_a: optionA,
                  option_b: optionB,
                  option_c: optionC,
                  option_d: optionD,
                  correct_answer: validAnswer,
                  explanation,
                  hint,
                })
                .eq('id', existing.id);
              updateError = retryResult.error;
            }

            if (updateError) {
              report.errors.push({ rowNumber, error: `Update failed: ${sanitizeDbError(updateError)}` });
              report.summary.errors++;
            } else {
              report.updated.push({
                rowNumber,
                questionId: existing.id,
                questionPreview: questionText.slice(0, 80) + (questionText.length > 80 ? '...' : ''),
                changes,
              });
              report.summary.updated++;
            }
          } else {
            // No changes
            report.summary.unchanged++;
          }
        } else {
          // New question - add to insert batch
          questionsToInsert.push({
            topic_id: topic!.id,
            level: rawLevel,
            question: questionText,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_answer: validAnswer,
            explanation,
            hint,
            sub_topic: subTopic,
          });

          report.inserted.push({
            rowNumber,
            questionPreview: questionText.slice(0, 80) + (questionText.length > 80 ? '...' : ''),
            level: rawLevel,
          });
        }
      } catch (err) {
        report.errors.push({ rowNumber, error: (err as Error).message });
        report.summary.errors++;
      }
    }

    // Batch insert new questions
    if (questionsToInsert.length > 0) {
      let { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      // If sub_topic column doesn't exist, retry without it
      if (insertError && insertError.message?.includes('sub_topic')) {
        console.log('sub_topic column not found, retrying without it...');
        const questionsWithoutSubTopic = questionsToInsert.map(({ sub_topic, ...rest }) => rest);
        const retryResult = await supabase
          .from('questions')
          .insert(questionsWithoutSubTopic);
        insertError = retryResult.error;
      }

      if (insertError) {
        report.error = `Failed to insert new questions: ${sanitizeDbError(insertError)}`;
        // Mark all pending inserts as errors
        report.summary.errors += questionsToInsert.length;
        report.inserted = []; // Clear since they failed
        return report;
      }
      report.summary.inserted = questionsToInsert.length;
    }

    report.success = true;
    return report;

  } catch (error) {
    report.error = (error as Error).message;
    return report;
  }
}

// Fetch all questions for admin (with correct answers for export)
export async function fetchAllQuestionsForAdmin(): Promise<{
  subjects: Array<{
    name: string;
    topics: Array<{
      name: string;
      questions: Array<{
        level: number;
        question: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
        correctAnswer: string;
        explanation: string;
      }>;
    }>;
  }>;
}> {
  const { data: subjects } = await supabase.from('subjects').select('*');
  const { data: topics } = await supabase.from('topics').select('*');
  const { data: questions } = await supabase.from('questions').select('*');

  if (!subjects || !topics || !questions) {
    return { subjects: [] };
  }

  const result: Array<{
    name: string;
    topics: Array<{
      name: string;
      questions: Array<{
        level: number;
        question: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
        correctAnswer: string;
        explanation: string;
      }>;
    }>;
  }> = [];

  for (const subject of subjects) {
    const subjectTopics = topics.filter(t => t.subject_id === subject.id);
    const topicsWithQuestions = subjectTopics.map(topic => {
      const topicQuestions = questions
        .filter(q => q.topic_id === topic.id)
        .map(q => ({
          level: q.level,
          question: q.question,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || '',
        }));

      return {
        name: topic.name,
        questions: topicQuestions,
      };
    }).filter(t => t.questions.length > 0);

    if (topicsWithQuestions.length > 0) {
      result.push({
        name: subject.name,
        topics: topicsWithQuestions,
      });
    }
  }

  return { subjects: result };
}

// Export question bank to Excel workbook
export function exportQuestionBankToExcel(data: Awaited<ReturnType<typeof fetchAllQuestionsForAdmin>>): Blob {
  const workbook = XLSX.utils.book_new();

  for (const subject of data.subjects) {
    for (const topic of subject.topics) {
      // Create sheet data with headers
      const sheetData = [
        ['#', 'Level', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Explanation'],
        ...topic.questions.map((q, index) => [
          index + 1,
          q.level,
          q.question,
          q.optionA,
          q.optionB,
          q.optionC,
          q.optionD,
          q.correctAnswer,
          q.explanation,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },   // #
        { wch: 6 },   // Level
        { wch: 50 },  // Question
        { wch: 25 },  // Option A
        { wch: 25 },  // Option B
        { wch: 25 },  // Option C
        { wch: 25 },  // Option D
        { wch: 15 },  // Correct Answer
        { wch: 40 },  // Explanation
      ];

      // Sheet name: Subject - Topic (max 31 chars for Excel)
      const sheetName = `${subject.name}-${topic.name}`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Parse CSV/TSV content - auto-detects delimiter
export function parseCSVContent(text: string): Array<{
  level: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  hint?: string;
  subTopic?: string; // Sub-topic within chapter (Physics/Chemistry hierarchy)
}> {
  const questions: Array<{
    level: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
    subTopic?: string;
  }> = [];

  // Auto-detect delimiter: check first line for tabs vs commas
  const firstLine = text.split('\n')[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  // Parse delimited content
  // For TSV files, use simple split (quotes are just regular characters)
  // For CSV files, handle quoted fields properly
  const parseDelimited = (content: string, delim: string): string[][] => {
    // For TSV (tab-delimited), use simple parsing - quotes are NOT special
    // This avoids issues with unescaped quotes in field content
    if (delim === '\t') {
      return content
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .map(line => line.split('\t').map(field => field.trim()));
    }

    // For CSV (comma-delimited), handle quoted fields
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const rows = parseDelimited(text, delimiter);

  // Skip header row
  // Column layout: 0=#, 1=Level, 2=Question, 3-6=Options A-D, 7=Correct, 8=Explanation, 9=Hint, 10=SubTopic
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length >= 9) {
      questions.push({
        level: parseInt(values[1]) || 1,
        question: values[2],
        optionA: values[3],
        optionB: values[4],
        optionC: values[5],
        optionD: values[6],
        correctAnswer: values[7],
        explanation: values[8],
        hint: values[9] || undefined, // hints column (index 9)
        subTopic: values[10] || undefined, // sub-topic column (index 10) - for Physics/Chemistry hierarchy
      });
    }
  }

  return questions;
}

// Parse question data from a single row (used by both CSV/TSV and Excel parsers)
// Column layout: 0=#, 1=Level, 2=Question, 3-6=Options A-D, 7=Correct, 8=Explanation, 9=Hint, 10=SubTopic
function parseQuestionRow(values: string[]): {
  level: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  hint?: string;
  subTopic?: string;
} | null {
  if (values.length < 9) return null;

  const level = parseInt(values[1]) || 1;
  const question = values[2]?.trim();
  const optionA = values[3]?.trim();
  const optionB = values[4]?.trim();
  const optionC = values[5]?.trim();
  const optionD = values[6]?.trim();
  const correctAnswer = values[7]?.trim();
  const explanation = values[8]?.trim() || '';
  const hint = values[9]?.trim() || undefined;
  const subTopic = values[10]?.trim() || undefined;

  if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    return null;
  }

  return { level, question, optionA, optionB, optionC, optionD, correctAnswer, explanation, hint, subTopic };
}

// Parse Excel file and return sheets with their questions
export interface ExcelSheet {
  name: string;
  questions: Array<{
    level: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
    subTopic?: string; // Sub-topic within chapter (Physics/Chemistry hierarchy)
  }>;
}

export function parseExcelFile(buffer: ArrayBuffer): ExcelSheet[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: ExcelSheet[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    
    const questions: ExcelSheet['questions'] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      // Convert all values to strings
      const values = row.map(cell => String(cell ?? ''));
      const parsed = parseQuestionRow(values);
      
      if (parsed) {
        questions.push(parsed);
      }
    }
    
    if (questions.length > 0) {
      sheets.push({ name: sheetName, questions });
    }
  }
  
  return sheets;
}
