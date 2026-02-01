/**
 * Feedback Service
 *
 * Manages feedback display logic:
 * - Shows simple feedback most of the time for snappy flow
 * - Character messages and riddles appear with smart spacing (min 3 questions gap)
 * - Random gap of 4-15 questions for normal performance
 * - Immediate feedback for exceptional (10+ streak) or struggling (5+ wrong)
 */

import { Character, getRandomCharacter, getRandomMessage, themeLevels } from '@/data/characters';
import { getRandomFunElement, FunElement } from '@/data/funElements';

// Session-level tracking for used messages (reset on page refresh)
const usedCharacterMessages = new Set<string>();
const usedCharacterPhrases = new Set<string>();

// Track questions since last special feedback (character/riddle)
let questionsSinceLastSpecialFeedback = 0;
let nextSpecialFeedbackAt = getRandomGap(); // Random gap 4-15

function getRandomGap(): number {
  // Random number between 4 and 15
  return Math.floor(Math.random() * 12) + 4;
}

// Generic simple messages for normal feedback (not exceptional performance)
const simpleCorrectMessages = [
  "Correct! ✓",
  "Right answer! ✓",
  "You got it! ✓",
  "That's right! ✓",
  "Well done! ✓",
  "Nice! ✓",
  "Good job! ✓",
  "Exactly! ✓",
];

const simpleIncorrectMessages = [
  "Not quite. Let's see the answer.",
  "That's not it. Check the solution.",
  "Incorrect. Review below.",
  "Wrong answer. See explanation.",
  "Not right. Let's learn from this.",
];

// Track used simple messages to avoid immediate repeats
let lastSimpleCorrectIndex = -1;
let lastSimpleIncorrectIndex = -1;

export interface FeedbackResult {
  type: 'simple' | 'character' | 'fun_element';
  // For simple type
  simpleMessage?: string;
  // For character type
  character?: Character;
  message?: string;
  // For fun_element type
  funElement?: FunElement;
}

interface FeedbackContext {
  isCorrect: boolean;
  level: number;
  streak: number;          // Current consecutive correct answers
  totalAnswered: number;   // Total questions answered in session
  recentWrongCount: number; // Wrong answers in last 5 questions (for struggling detection)
}

/**
 * Determines if student deserves immediate special feedback (override normal spacing)
 * - Exceptional performance: 10+ streak
 * - Struggling: 5+ wrong in a row
 */
function isExceptionalPerformance(context: FeedbackContext): boolean {
  // Exceptional success: 10+ streak - celebrate immediately
  if (context.isCorrect && context.streak >= 10) {
    return true;
  }

  // Struggling: 5+ wrong in a row - encourage immediately
  if (!context.isCorrect && context.recentWrongCount >= 5) {
    return true;
  }

  return false;
}

/**
 * Determines if it's time to show special feedback based on spacing rules
 * - Minimum 3 questions gap
 * - Random 4-15 questions for normal performance
 */
function shouldShowSpecialFeedback(context: FeedbackContext): boolean {
  // Always allow if exceptional performance (override spacing)
  if (isExceptionalPerformance(context)) {
    return true;
  }

  // Must have at least 3 questions gap (safety minimum)
  if (questionsSinceLastSpecialFeedback < 3) {
    return false;
  }

  // Check if we've reached the random gap
  return questionsSinceLastSpecialFeedback >= nextSpecialFeedbackAt;
}

/**
 * Get simple feedback message (non-character, just short text)
 */
function getSimpleFeedback(isCorrect: boolean): string {
  const messages = isCorrect ? simpleCorrectMessages : simpleIncorrectMessages;
  let index: number;
  
  // Avoid repeating the last message
  do {
    index = Math.floor(Math.random() * messages.length);
  } while (index === (isCorrect ? lastSimpleCorrectIndex : lastSimpleIncorrectIndex) && messages.length > 1);
  
  if (isCorrect) {
    lastSimpleCorrectIndex = index;
  } else {
    lastSimpleIncorrectIndex = index;
  }
  
  return messages[index];
}

/**
 * Get a character message that hasn't been used this session
 */
function getUniqueCharacterMessage(
  character: Character, 
  type: 'correct' | 'incorrect' | 'encouragement' | 'levelUp'
): string {
  const messages = {
    correct: character.correctMessages,
    incorrect: character.incorrectMessages,
    encouragement: character.encouragementMessages,
    levelUp: character.levelUpMessages,
  }[type];
  
  // Filter out already used messages
  const unusedMessages = messages.filter(msg => !usedCharacterPhrases.has(msg));
  
  // If all messages used, reset and use any
  const availableMessages = unusedMessages.length > 0 ? unusedMessages : messages;
  const selectedMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
  
  // Mark as used
  usedCharacterPhrases.add(selectedMessage);
  
  return selectedMessage;
}

/**
 * Get unique character (avoid repeating same character consecutively)
 */
let lastCharacterName = '';

function getUniqueCharacter(level: number): Character {
  const themeLevel = themeLevels.find(t => t.level === level) || themeLevels[0];
  const characters = themeLevel.characters;
  
  if (characters.length === 1) {
    return characters[0];
  }
  
  // Try to pick a different character
  let attempts = 0;
  let character: Character;
  do {
    character = characters[Math.floor(Math.random() * characters.length)];
    attempts++;
  } while (character.name === lastCharacterName && attempts < 5);
  
  lastCharacterName = character.name;
  return character;
}

/**
 * Main feedback decision function
 * Returns what type of feedback to show and the content
 *
 * Logic:
 * - Most answers: simple "Correct!" or "Not quite."
 * - Special feedback (character/riddle) with smart spacing:
 *   - Min 3 questions gap
 *   - Random 4-15 questions for normal performance
 *   - Immediate for exceptional (10+ streak) or struggling (5+ wrong)
 */
export function getFeedback(context: FeedbackContext): FeedbackResult {
  const { isCorrect, level } = context;

  // Increment counter
  questionsSinceLastSpecialFeedback++;

  // Check if we should show special feedback (character or riddle)
  if (shouldShowSpecialFeedback(context)) {
    // Reset counter and set new random gap
    questionsSinceLastSpecialFeedback = 0;
    nextSpecialFeedbackAt = getRandomGap();

    // 50% chance: character message, 50% chance: fun element (riddle/joke)
    const showCharacter = Math.random() < 0.5;

    if (showCharacter) {
      const character = getUniqueCharacter(level);
      const messageType = isCorrect ? 'correct' : 'encouragement';
      const message = getUniqueCharacterMessage(character, messageType);

      return {
        type: 'character',
        character,
        message,
      };
    } else {
      // Show fun element (riddle, joke, fact, etc.)
      const funElement = getRandomFunElement(level);
      if (funElement) {
        return {
          type: 'fun_element',
          funElement,
        };
      }
      // Fallback to character if no fun element available
      const character = getUniqueCharacter(level);
      const message = getUniqueCharacterMessage(character, isCorrect ? 'correct' : 'encouragement');
      return {
        type: 'character',
        character,
        message,
      };
    }
  }

  // Normal case: simple feedback (most common)
  return {
    type: 'simple',
    simpleMessage: getSimpleFeedback(isCorrect),
  };
}

/**
 * Reset session tracking (call when starting new session)
 */
export function resetFeedbackTracking(): void {
  usedCharacterMessages.clear();
  usedCharacterPhrases.clear();
  lastCharacterName = '';
  lastSimpleCorrectIndex = -1;
  lastSimpleIncorrectIndex = -1;
  questionsSinceLastSpecialFeedback = 0;
  nextSpecialFeedbackAt = getRandomGap();
}

/**
 * Get encouragement message for hints or timeouts
 */
export function getEncouragementMessage(level: number): { character: Character; message: string } {
  const character = getUniqueCharacter(level);
  const message = getUniqueCharacterMessage(character, 'encouragement');
  return { character, message };
}
