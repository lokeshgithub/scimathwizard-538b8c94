import { supabase } from '@/integrations/supabase/client';
import type { Question, QuestionBank, Subject } from '@/types/quiz';

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

// Public question data (without correct_answer for security)
interface DBQuestionPublic {
  id: string;
  topic_id: string;
  level: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string | null;
}

// Fetch all questions organized by subject and topic
export async function fetchAllQuestions(): Promise<QuestionBank> {
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

  // Fetch questions via secure function (excludes correct_answer)
  const { data: questions, error: questionsError } = await supabase
    .rpc('get_public_questions') as { data: DBQuestionPublic[] | null; error: any };

  if (questionsError || !questions) {
    console.error('Error fetching questions:', questionsError);
    return bank;
  }

  // Build lookup maps
  const subjectMap = new Map<string, DBSubject>(
    (subjects as DBSubject[]).map(s => [s.id, s])
  );
  const topicMap = new Map<string, DBTopic>(
    (topics as DBTopic[]).map(t => [t.id, t])
  );

  // Organize questions (correct answer will be validated server-side)
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

    // correct is set to -1 as it will be validated server-side
    bank[subjectKey][topicName].push({
      id: q.id,
      level: q.level,
      question: q.question,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correct: -1, // Will be validated by edge function
      explanation: q.explanation || '',
      concepts: [],
    });
  }

  return bank;
}

// Validate answer via edge function (secure server-side validation)
export async function validateAnswer(
  questionId: string,
  selectedAnswer: number
): Promise<{ isCorrect: boolean; correctIndex: number; explanation: string }> {
  const { data, error } = await supabase.functions.invoke('validate-answer', {
    body: { questionId, selectedAnswer },
  });

  if (error) {
    console.error('Error validating answer:', error);
    throw new Error('Failed to validate answer');
  }

  return data;
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
  }>
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
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

      if (subjectError) throw new Error(`Failed to create subject: ${subjectError.message}`);
      subject = newSubject;
    }

    // Get or create topic
    let { data: topic } = await supabase
      .from('topics')
      .select('id')
      .eq('subject_id', subject.id)
      .eq('name', topicName)
      .maybeSingle();

    if (!topic) {
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({ subject_id: subject.id, name: topicName })
        .select('id')
        .single();

      if (topicError) throw new Error(`Failed to create topic: ${topicError.message}`);
      topic = newTopic;
    }

    // Validate and sanitize questions before insert
    const questionsToInsert = questions.map((q, index) => {
      // Ensure correct_answer is a valid uppercase letter A-D
      const answer = q.correctAnswer.trim().toUpperCase();
      const validAnswer = ['A', 'B', 'C', 'D'].includes(answer) ? answer : 'A';
      
      // Ensure level is between 1-5
      const validLevel = Math.min(5, Math.max(1, q.level || 1));
      
      // Sanitize and validate text fields with length limits
      const sanitizeText = (text: string, maxLength: number): string => {
        if (!text) return '';
        // Remove any potential script tags and trim
        return text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .trim()
          .slice(0, maxLength);
      };
      
      const questionText = sanitizeText(q.question, 2000);
      const optionA = sanitizeText(q.optionA, 500);
      const optionB = sanitizeText(q.optionB, 500);
      const optionC = sanitizeText(q.optionC, 500);
      const optionD = sanitizeText(q.optionD, 500);
      const explanation = sanitizeText(q.explanation, 5000);
      
      // Validate required fields
      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      
      return {
        topic_id: topic!.id,
        level: validLevel,
        question: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: validAnswer,
        explanation: explanation || null,
      };
    });

    const { error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (insertError) throw new Error(`Failed to insert questions: ${insertError.message}`);

    return { success: true, count: questions.length };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Parse CSV content
export function parseCSVContent(text: string): Array<{
  level: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
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
  }> = [];

  // Parse CSV handling multi-line quoted fields
  const parseCSV = (content: string): string[][] => {
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
      } else if (char === ',' && !inQuotes) {
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

  const rows = parseCSV(text);

  // Skip header row
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
      });
    }
  }

  return questions;
}
