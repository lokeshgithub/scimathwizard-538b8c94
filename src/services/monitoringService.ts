import { logger } from '@/utils/logger';

/**
 * Lightweight client-side error tracking and performance monitoring.
 * Captures unhandled errors, promise rejections, and slow interactions.
 */

const ERROR_BUFFER_KEY = 'scimathwizard-error-buffer';
const MAX_BUFFERED_ERRORS = 20;
const SLOW_INTERACTION_THRESHOLD_MS = 3000;

interface TrackedError {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  type: 'error' | 'unhandled_rejection' | 'slow_interaction' | 'api_error';
}

/** Buffer errors locally (for future server-side reporting) */
function bufferError(error: TrackedError) {
  try {
    const buffer: TrackedError[] = JSON.parse(localStorage.getItem(ERROR_BUFFER_KEY) || '[]');
    buffer.push(error);
    // Keep only last N errors
    const trimmed = buffer.slice(-MAX_BUFFERED_ERRORS);
    localStorage.setItem(ERROR_BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable - silently ignore
  }
}

/** Get buffered errors (for admin dashboard) */
export function getBufferedErrors(): TrackedError[] {
  try {
    return JSON.parse(localStorage.getItem(ERROR_BUFFER_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Clear error buffer */
export function clearBufferedErrors() {
  localStorage.removeItem(ERROR_BUFFER_KEY);
}

/** Track a custom error */
export function trackError(message: string, type: TrackedError['type'] = 'error', stack?: string) {
  const error: TrackedError = {
    message,
    stack,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    type,
  };
  bufferError(error);
  logger.warn(`[monitor] ${type}: ${message}`);
}

/** Track slow API calls */
export function trackSlowCall(name: string, durationMs: number) {
  if (durationMs > SLOW_INTERACTION_THRESHOLD_MS) {
    trackError(`Slow call: ${name} took ${Math.round(durationMs)}ms`, 'slow_interaction');
  }
}

/** Initialize global error listeners */
export function initErrorTracking() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    trackError(
      event.message || 'Unknown error',
      'error',
      event.error?.stack
    );
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || 'Unhandled rejection';
    trackError(message, 'unhandled_rejection', event.reason?.stack);
  });

  // Performance observer for long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > SLOW_INTERACTION_THRESHOLD_MS) {
            trackError(
              `Long task: ${entry.name || 'unknown'} took ${Math.round(entry.duration)}ms`,
              'slow_interaction'
            );
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported in this browser
    }
  }

  logger.debug('[monitor] Error tracking initialized');
}

/** Log Web Vitals (called once on load) */
export function logWebVitals() {
  if ('performance' in window) {
    // Log page load timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (timing) {
          const metrics = {
            dns: Math.round(timing.domainLookupEnd - timing.domainLookupStart),
            tcp: Math.round(timing.connectEnd - timing.connectStart),
            ttfb: Math.round(timing.responseStart - timing.requestStart),
            domLoad: Math.round(timing.domContentLoadedEventEnd - timing.startTime),
            fullLoad: Math.round(timing.loadEventEnd - timing.startTime),
          };
          logger.debug('[perf] Page load metrics:', metrics);
        }
      }, 0);
    });
  }
}
