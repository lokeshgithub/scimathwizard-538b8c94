/**
 * Professional, encouraging feedback characters for Focused Learner mode.
 * No fictional references — just supportive academic mentorship.
 */

import type { Character } from '@/types/quiz';

const encouragingMentor: Character = {
  name: 'Coach',
  emoji: '🎯',
  correctMessages: [
    "Excellent work! You're building strong foundations. 🎯",
    "Spot on! Your understanding is growing. ✅",
    "Correct! Keep this momentum going. 💪",
    "Well done! That shows real comprehension. 🧠",
    "Perfect! You've nailed the concept. ✓",
  ],
  incorrectMessages: [
    "Not quite — but this is how we learn. Review the explanation below. 📖",
    "Incorrect this time. Understanding why helps you improve. 🔍",
    "That's not right, but don't worry — study the solution carefully. 📝",
  ],
  encouragementMessages: [
    "Take your time and think it through. You've got this! 💪",
    "Focus on the key concept. You're closer than you think. 🎯",
  ],
  levelUpMessages: [
    "Outstanding! You've mastered this level. Ready for the next challenge! 🏆",
  ],
};

const analyticalGuide: Character = {
  name: 'Guide',
  emoji: '📊',
  correctMessages: [
    "Correct! Your accuracy is improving steadily. 📊",
    "Right answer! Strong analytical thinking. 🔬",
    "That's it! Solid problem-solving skills. ✅",
  ],
  incorrectMessages: [
    "Not the right answer. Let's break down the solution step by step. 📋",
    "Incorrect — review the explanation to strengthen this concept. 📖",
  ],
  encouragementMessages: [
    "Every question is an opportunity to learn. Give it your best! 📈",
  ],
  levelUpMessages: [
    "Level complete! Your skills are advancing — keep pushing forward! 📈",
  ],
};

export const focusedCharacters: Character[] = [encouragingMentor, analyticalGuide];

export const getFocusedCharacter = (): Character => {
  return focusedCharacters[Math.floor(Math.random() * focusedCharacters.length)];
};

export const getFocusedMessage = (
  character: Character,
  type: 'correct' | 'incorrect' | 'encouragement' | 'levelUp'
): string => {
  const messages = {
    correct: character.correctMessages,
    incorrect: character.incorrectMessages,
    encouragement: character.encouragementMessages,
    levelUp: character.levelUpMessages,
  }[type];
  return messages[Math.floor(Math.random() * messages.length)];
};
