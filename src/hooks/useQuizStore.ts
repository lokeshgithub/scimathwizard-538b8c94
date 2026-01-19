import { useState, useCallback, useEffect } from 'react';
import type { 
  QuestionBank, 
  Progress, 
  QuestionTracking, 
  SessionStats, 
  Question, 
  Subject 
} from '@/types/quiz';

const STORAGE_KEY = 'magical-mastery-quiz';
const THRESHOLD = 0.8;
const PER_LEVEL = 5;
const MAX_LEVEL = 5;
const XP_PER_CORRECT = 10;
const XP_STREAK_BONUS = 5;
const XP_LEVEL_UP = 50;

interface QuizState {
  banks: QuestionBank;
  subject: Subject;
  topic: string | null;
  level: number;
  progress: Progress;
  questionTracking: QuestionTracking;
  sessionStats: SessionStats;
  currentQuestions: Question[];
  questionIndex: number;
  levelStats: { correct: number; total: number };
}

const initialSessionStats: SessionStats = {
  solved: 0,
  correct: 0,
  streak: 0,
  mastered: 0,
  xp: 0,
};

const loadFromStorage = (): Partial<QuizState> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        banks: parsed.banks || {},
        progress: parsed.progress || {},
        questionTracking: parsed.questionTracking || {},
        sessionStats: parsed.sessionStats || initialSessionStats,
      };
    }
  } catch (e) {
    console.error('Failed to load quiz state:', e);
  }
  return {};
};

const saveToStorage = (state: Partial<QuizState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      banks: state.banks,
      progress: state.progress,
      questionTracking: state.questionTracking,
      sessionStats: state.sessionStats,
    }));
  } catch (e) {
    console.error('Failed to save quiz state:', e);
  }
};

export const useQuizStore = () => {
  const stored = loadFromStorage();
  
  const [banks, setBanks] = useState<QuestionBank>(stored.banks || {});
  const [subject, setSubject] = useState<Subject>('math');
  const [topic, setTopic] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState<Progress>(stored.progress || {});
  const [questionTracking, setQuestionTracking] = useState<QuestionTracking>(
    stored.questionTracking || {}
  );
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    stored.sessionStats || initialSessionStats
  );
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [levelStats, setLevelStats] = useState({ correct: 0, total: 0 });

  // Save to storage when relevant state changes
  useEffect(() => {
    saveToStorage({ banks, progress, questionTracking, sessionStats });
  }, [banks, progress, questionTracking, sessionStats]);

  const parseCSV = useCallback((text: string): Question[] => {
    const lines = text.trim().split('\n');
    const questions: Question[] = [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const c of line) {
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      result.push(current.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length >= 9) {
        questions.push({
          id: values[0],
          level: parseInt(values[1]) || 1,
          question: values[2],
          options: [values[3], values[4], values[5], values[6]],
          correct: values[7].toUpperCase().charCodeAt(0) - 65,
          explanation: values[8],
          concepts: values[9] ? values[9].split(';').map(c => c.trim()) : [],
        });
      }
    }

    return questions;
  }, []);

  const uploadQuestionBank = useCallback((fileName: string, content: string) => {
    const questions = parseCSV(content);
    const name = fileName.replace('.csv', '');
    
    let detectedSubject: Subject = 'math';
    if (/physics|heat|motion|light|electric/i.test(name)) {
      detectedSubject = 'physics';
    } else if (/chemistry|acid|chemical|fibre/i.test(name)) {
      detectedSubject = 'chemistry';
    }

    setBanks(prev => {
      const updated = { ...prev };
      if (!updated[detectedSubject]) {
        updated[detectedSubject] = {};
      }
      updated[detectedSubject][name] = questions;
      return updated;
    });
  }, [parseCSV]);

  const getTopicProgress = useCallback((topicName: string) => {
    if (!progress[topicName]) {
      const newProgress: any = {};
      for (let i = 1; i <= MAX_LEVEL; i++) {
        newProgress[i] = { correct: 0, total: 0, mastered: false };
      }
      return newProgress;
    }
    return progress[topicName];
  }, [progress]);

  const getAvailableQuestions = useCallback((topicName: string, lvl: number): Question[] => {
    const allQuestions = banks[subject]?.[topicName] || [];
    const levelQuestions = allQuestions.filter(q => q.level === lvl);
    
    // Filter out questions that have been answered correctly or solution viewed
    return levelQuestions.filter(q => {
      const status = questionTracking[q.id];
      if (!status) return true;
      return !status.answeredCorrectly && !status.solutionViewed;
    });
  }, [banks, subject, questionTracking]);

  const selectTopic = useCallback((topicName: string) => {
    setTopic(topicName);
    const prog = getTopicProgress(topicName);
    
    // Find the current level (first non-mastered level)
    let currentLevel = 1;
    for (let i = 1; i <= MAX_LEVEL; i++) {
      if (!prog[i]?.mastered) {
        currentLevel = i;
        break;
      }
      if (i === MAX_LEVEL && prog[i]?.mastered) {
        currentLevel = MAX_LEVEL;
      }
    }
    
    setLevel(currentLevel);
    setLevelStats({ correct: 0, total: 0 });
    
    // Get available questions for this level
    const available = getAvailableQuestions(topicName, currentLevel);
    const allForLevel = banks[subject]?.[topicName]?.filter(q => q.level === currentLevel) || [];
    
    // If no new questions available, use all questions for the level (allow repeats for practice)
    const questionsToUse = available.length > 0 ? available : allForLevel;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
  }, [getTopicProgress, getAvailableQuestions, banks, subject]);

  const markQuestionAnswered = useCallback((questionId: string, correct: boolean) => {
    setQuestionTracking(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answeredCorrectly: correct || prev[questionId]?.answeredCorrectly || false,
        solutionViewed: prev[questionId]?.solutionViewed || false,
      },
    }));
  }, []);

  const markSolutionViewed = useCallback((questionId: string) => {
    setQuestionTracking(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answeredCorrectly: prev[questionId]?.answeredCorrectly || false,
        solutionViewed: true,
      },
    }));
  }, []);

  const answerQuestion = useCallback((selectedIndex: number) => {
    const currentQ = currentQuestions[questionIndex];
    if (!currentQ) return { isCorrect: false, question: null };

    const isCorrect = selectedIndex === currentQ.correct;
    
    // Update level stats
    setLevelStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Update session stats
    setSessionStats(prev => {
      let xpGain = isCorrect ? XP_PER_CORRECT : 0;
      if (isCorrect && prev.streak >= 2) {
        xpGain += XP_STREAK_BONUS * Math.min(prev.streak, 5);
      }
      
      return {
        solved: prev.solved + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? prev.streak + 1 : 0,
        mastered: prev.mastered,
        xp: prev.xp + xpGain,
      };
    });

    // Mark question as answered
    markQuestionAnswered(currentQ.id, isCorrect);

    return { isCorrect, question: currentQ };
  }, [currentQuestions, questionIndex, markQuestionAnswered]);

  const checkMastery = useCallback((): 'passed' | 'failed' | 'continue' => {
    if (levelStats.total < PER_LEVEL) return 'continue';
    
    const accuracy = levelStats.correct / levelStats.total;
    
    if (accuracy >= THRESHOLD) {
      // Mark level as mastered
      setProgress(prev => {
        const topicProg = { ...getTopicProgress(topic!) };
        topicProg[level] = {
          correct: levelStats.correct,
          total: levelStats.total,
          mastered: true,
        };
        return { ...prev, [topic!]: topicProg };
      });
      
      setSessionStats(prev => ({
        ...prev,
        mastered: prev.mastered + 1,
        xp: prev.xp + XP_LEVEL_UP,
      }));
      
      return 'passed';
    }
    
    return 'failed';
  }, [levelStats, level, topic, getTopicProgress]);

  const advanceLevel = useCallback(() => {
    if (level < MAX_LEVEL) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setLevelStats({ correct: 0, total: 0 });
      
      // Get questions for new level
      const available = getAvailableQuestions(topic!, newLevel);
      const allForLevel = banks[subject]?.[topic!]?.filter(q => q.level === newLevel) || [];
      const questionsToUse = available.length > 0 ? available : allForLevel;
      const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
      
      setCurrentQuestions(shuffled);
      setQuestionIndex(0);
    }
  }, [level, topic, getAvailableQuestions, banks, subject]);

  const retryLevel = useCallback(() => {
    setLevelStats({ correct: 0, total: 0 });
    
    // Get questions for current level
    const available = getAvailableQuestions(topic!, level);
    const allForLevel = banks[subject]?.[topic!]?.filter(q => q.level === level) || [];
    const questionsToUse = available.length > 0 ? available : allForLevel;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    
    setCurrentQuestions(shuffled);
    setQuestionIndex(0);
  }, [level, topic, getAvailableQuestions, banks, subject]);

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= currentQuestions.length) {
      // Reshuffle and start over
      const shuffled = [...currentQuestions].sort(() => Math.random() - 0.5);
      setCurrentQuestions(shuffled);
      setQuestionIndex(0);
    } else {
      setQuestionIndex(prev => prev + 1);
    }
  }, [questionIndex, currentQuestions]);

  const getCurrentQuestion = useCallback(() => {
    return currentQuestions[questionIndex] || null;
  }, [currentQuestions, questionIndex]);

  return {
    // State
    banks,
    subject,
    topic,
    level,
    progress,
    sessionStats,
    levelStats,
    currentQuestion: getCurrentQuestion(),
    
    // Constants
    MAX_LEVEL,
    PER_LEVEL,
    THRESHOLD,
    
    // Actions
    setSubject,
    selectTopic,
    uploadQuestionBank,
    answerQuestion,
    checkMastery,
    advanceLevel,
    retryLevel,
    nextQuestion,
    markSolutionViewed,
    getTopicProgress,
  };
};
