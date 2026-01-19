export interface Question {
  id: string;
  level: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  concepts: string[];
}

export interface QuestionBank {
  [subject: string]: {
    [topic: string]: Question[];
  };
}

export interface LevelProgress {
  correct: number;
  total: number;
  mastered: boolean;
}

export interface TopicProgress {
  [level: number]: LevelProgress;
}

export interface Progress {
  [topic: string]: TopicProgress;
}

export interface QuestionStatus {
  answeredCorrectly: boolean;
  solutionViewed: boolean;
}

export interface QuestionTracking {
  [questionId: string]: QuestionStatus;
}

export interface SessionStats {
  solved: number;
  correct: number;
  streak: number;
  mastered: number;
  xp: number;
}

export interface Character {
  name: string;
  emoji: string;
  correctMessages: string[];
  incorrectMessages: string[];
  encouragementMessages: string[];
  levelUpMessages: string[];
}

export interface ThemeLevel {
  level: number;
  theme: string;
  characters: Character[];
  bgClass: string;
  accentColor: string;
}

export type Subject = 'math' | 'physics' | 'chemistry';
