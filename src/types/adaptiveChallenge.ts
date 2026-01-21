import type { Question, Subject } from './quiz';

// Skill rating tiers with rich, meaningful feedback
export interface SkillTier {
  id: string;
  minScore: number;
  maxScore: number;
  title: string;
  emoji: string;
  description: string;
  capabilities: string[];
  encouragement: string;
  colorClass: string;
  glowClass: string;
}

export const SKILL_TIERS: SkillTier[] = [
  {
    id: 'beginner',
    minScore: 0,
    maxScore: 19,
    title: 'Rising Star',
    emoji: '🌱',
    description: 'You\'re building your foundation!',
    capabilities: [
      'You can solve basic conceptual questions',
      'Keep practicing to build stronger fundamentals',
    ],
    encouragement: 'Every expert was once a beginner. Keep practicing, and you\'ll see amazing progress!',
    colorClass: 'from-slate-400 to-slate-500',
    glowClass: 'shadow-slate-400/30',
  },
  {
    id: 'developing',
    minScore: 20,
    maxScore: 39,
    title: 'Promising Learner',
    emoji: '📚',
    description: 'You\'re developing solid skills!',
    capabilities: [
      'You can handle most school-level questions',
      'You understand basic concepts well',
      'Focus on advanced problem-solving techniques',
    ],
    encouragement: 'You\'re making great progress! A little more practice will take you to the next level.',
    colorClass: 'from-blue-400 to-blue-500',
    glowClass: 'shadow-blue-400/30',
  },
  {
    id: 'proficient',
    minScore: 40,
    maxScore: 54,
    title: 'Strong Performer',
    emoji: '⭐',
    description: 'You\'re among the top students in your class!',
    capabilities: [
      'You can easily solve school exam questions',
      'You handle complex problems with confidence',
      'You\'re ready for competitive exam preparation',
    ],
    encouragement: 'Excellent work! You\'re performing above average. Push yourself with harder challenges!',
    colorClass: 'from-emerald-400 to-emerald-500',
    glowClass: 'shadow-emerald-400/30',
  },
  {
    id: 'advanced',
    minScore: 55,
    maxScore: 69,
    title: 'Academic Achiever',
    emoji: '🏆',
    description: 'You\'re in the top 10% of students!',
    capabilities: [
      'You can tackle JEE Mains level questions',
      'Your problem-solving speed is impressive',
      'You understand concepts at a deeper level',
      'You\'re ready to start IIT preparation',
    ],
    encouragement: 'Outstanding! You have what it takes for competitive exams. Keep challenging yourself!',
    colorClass: 'from-amber-400 to-orange-500',
    glowClass: 'shadow-amber-400/30',
  },
  {
    id: 'elite',
    minScore: 70,
    maxScore: 84,
    title: 'IIT-Level Thinker',
    emoji: '🎯',
    description: 'You\'re in the top 5% of students in India!',
    capabilities: [
      'You can solve JEE Advanced level problems',
      'You have already reached IIT-level preparation',
      'You can tackle most competitive exam questions',
      'Your conceptual understanding is exceptional',
    ],
    encouragement: 'Remarkable! You\'re performing at IIT-entrance level. The top institutes are within your reach!',
    colorClass: 'from-purple-500 to-violet-600',
    glowClass: 'shadow-purple-500/30',
  },
  {
    id: 'exceptional',
    minScore: 85,
    maxScore: 94,
    title: 'Olympiad Contender',
    emoji: '🥇',
    description: 'You\'re in the top 1% of students in India!',
    capabilities: [
      'You can crack most questions that appear in Olympiad-level exams',
      'You easily solve IIT-level questions',
      'You think like a scientist or mathematician',
      'Your problem-solving approach is innovative',
    ],
    encouragement: 'Phenomenal! You have the potential to represent India in international Olympiads!',
    colorClass: 'from-rose-500 to-pink-600',
    glowClass: 'shadow-rose-500/30',
  },
  {
    id: 'genius',
    minScore: 95,
    maxScore: 100,
    title: 'Genius Level',
    emoji: '🧠✨',
    description: 'You stand in the top 0.1% of students in India!',
    capabilities: [
      'You can solve the hardest Olympiad problems',
      'You demonstrate exceptional logical reasoning',
      'You approach problems like a research scientist',
      'International medals are within your reach',
      'You\'re ready for IMO, IPhO, or IChO level challenges',
    ],
    encouragement: 'Extraordinary! You have a truly exceptional mind. The world\'s top universities would love to have you!',
    colorClass: 'from-yellow-400 via-amber-500 to-orange-500',
    glowClass: 'shadow-yellow-400/50',
  },
];

export interface AdaptiveState {
  isActive: boolean;
  currentQuestion: Question | null;
  questionHistory: AdaptiveQuestionResult[];
  currentLevel: number;
  highestLevelReached: number;
  questionsAtCurrentLevel: number;
  correctAtCurrentLevel: number;
  totalQuestions: number;
  totalCorrect: number;
  startTime: number;
  endTime?: number;
  subject: Subject;
  selectedTopics: string[];
  isComplete: boolean;
  finalScore: number;
  skillTier: SkillTier | null;
}

export interface AdaptiveQuestionResult {
  question: Question;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  levelAtTime: number;
}

export interface AdaptiveConfig {
  questionsToAdvance: number; // Correct answers needed to go up a level
  questionsToStay: number; // Max wrong before stopping at a level
  minQuestionsPerLevel: number;
  maxQuestions: number; // Maximum total questions
  startLevel: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  questionsToAdvance: 3, // 3 correct to advance
  questionsToStay: 2, // 2 wrong at a level triggers level down or stop
  minQuestionsPerLevel: 3,
  maxQuestions: 25,
  startLevel: 3, // Start at middle level
};

// Calculate skill score based on adaptive performance
export function calculateSkillScore(
  highestLevel: number,
  maxLevel: number,
  totalCorrect: number,
  totalQuestions: number,
  avgTimePerQuestion: number
): number {
  if (totalQuestions === 0) return 0;
  
  // Base score from highest level reached (0-60 points)
  const levelScore = (highestLevel / maxLevel) * 60;
  
  // Accuracy bonus (0-25 points)
  const accuracy = totalCorrect / totalQuestions;
  const accuracyScore = accuracy * 25;
  
  // Speed bonus (0-15 points) - faster = more points
  // Assume 30s is slow, 10s is fast
  const speedScore = Math.max(0, Math.min(15, (30 - avgTimePerQuestion) / 20 * 15));
  
  return Math.min(100, Math.round(levelScore + accuracyScore + speedScore));
}

export function getSkillTier(score: number): SkillTier {
  const tier = SKILL_TIERS.find(t => score >= t.minScore && score <= t.maxScore);
  return tier || SKILL_TIERS[0];
}
