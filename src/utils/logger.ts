/**
 * Structured logger that suppresses debug/info in production.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('[selectTopic]', 'some detail');
 *   logger.warn('Something unexpected');
 *   logger.error('Critical failure', error);
 */

const IS_DEV = import.meta.env.DEV;

export const logger = {
  /** Debug-level: only prints in development. */
  debug: (...args: unknown[]) => {
    if (IS_DEV) console.log(...args);
  },

  /** Info-level: only prints in development. */
  info: (...args: unknown[]) => {
    if (IS_DEV) console.info(...args);
  },

  /** Warn-level: always prints. */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /** Error-level: always prints. */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
