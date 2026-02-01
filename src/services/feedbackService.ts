/**
 * Feedback Service
 *
 * Manages feedback display logic:
 * - Shows either character message OR fun element (not both)
 * - Fun elements appear rarely (~5% chance) - reduced for snappier flow
 * - Character "special" messages only for exceptional performance (streak >= 7 or major milestones)
 * - Tracks used messages in session to prevent repetition
 */

import { Character, getRandomCharacter, getRandomMessage, themeLevels } from '@/data/characters';
import { getRandomFunElement, FunElement } from '@/data/funElements';

// Session-level tracking for used messages (reset on page refresh)
const usedCharacterMessages = new Set<string>();
const usedCharacterPhrases = new Set<string>();

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
 * Determines if student is performing exceptionally (worth special character message)
 * Made VERY selective - only for major achievements to avoid interrupting flow
 */
function isExceptionalPerformance(context: FeedbackContext): boolean {
  // Only show character feedback for MAJOR streaks (10+)
  if (context.isCorrect && context.streak >= 9) { // Will become 10 after this answer
    return true;
  }

  // Struggling feedback only after 5+ wrong (very struggling)
  if (!context.isCorrect && context.recentWrongCount >= 4) { // Will become 5 after this answer
    return true;
  }

  // No milestone-based triggers - keep flow snappy

  return false;
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
 */
export function getFeedback(context: FeedbackContext): FeedbackResult {
  const { isCorrect, level, streak } = context;
  
  // Check if this is exceptional performance (deserves character message)
  const isExceptional = isExceptionalPerformance(context);
  
  // Fun elements: ~2% chance, ONLY on correct answers with streak 3+, and ONLY if not showing character
  // Made very rare to keep question flow snappy
  const showFunElement = isCorrect && !isExceptional && streak >= 3 && Math.random() < 0.02;
  
  if (showFunElement) {
    const funElement = getRandomFunElement(level);
    if (funElement) {
      return {
        type: 'fun_element',
        funElement,
      };
    }
    // Fall through to simple if no fun element available
  }
  
  // Exceptional performance: show character with special message
  if (isExceptional) {
    const character = getUniqueCharacter(level);
    const messageType = isCorrect ? 'correct' : 'incorrect';
    const message = getUniqueCharacterMessage(character, messageType);
    
    return {
      type: 'character',
      character,
      message,
    };
  }
  
  // Normal case: simple feedback
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
}

/**
 * Get encouragement message for hints or timeouts
 */
export function getEncouragementMessage(level: number): { character: Character; message: string } {
  const character = getUniqueCharacter(level);
  const message = getUniqueCharacterMessage(character, 'encouragement');
  return { character, message };
}
