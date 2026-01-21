import { supabase } from '@/integrations/supabase/client';
import type { Question, QuestionBank, Subject } from '@/types/quiz';
import * as XLSX from 'xlsx';

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

  const existingSet = new Set(
    (existingQuestions || []).map(q => q.question.trim().toLowerCase())
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
  }>,
  options: { replaceExisting?: boolean } = {}
): Promise<{ success: boolean; error?: string; count?: number; skipped?: number }> {
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
      
      // Ensure level is between 1-5
      const validLevel = Math.min(5, Math.max(1, q.level || 1));
      
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
      
      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      
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
      });
    }

    if (questionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (insertError) throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    return { 
      success: true, 
      count: questionsToInsert.length,
      skipped: skippedCount
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
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

  // Auto-detect delimiter: check first line for tabs vs commas
  const firstLine = text.split('\n')[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  // Parse delimited content handling multi-line quoted fields
  const parseDelimited = (content: string, delim: string): string[][] => {
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

// Parse question data from a single row (used by both CSV/TSV and Excel parsers)
function parseQuestionRow(values: string[]): {
  level: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
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
  
  if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    return null;
  }
  
  return { level, question, optionA, optionB, optionC, optionD, correctAnswer, explanation };
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
