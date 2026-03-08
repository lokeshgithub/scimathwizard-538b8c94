import { logger } from '@/utils/logger';

const OFFLINE_QUEUE_KEY = 'magical-mastery-offline-queue';

interface QueuedAction {
  id: string;
  type: 'answer' | 'session_report' | 'profile_update';
  payload: any;
  timestamp: number;
}

/**
 * Manages a queue of actions to sync when the user comes back online.
 * Questions are already cached in localStorage by questionService.
 * This service handles syncing user progress/answers when offline.
 */
export const offlineSyncService = {
  /** Check if currently online */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /** Get all queued actions */
  getQueue(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Add an action to the offline queue */
  enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
    try {
      const queue = this.getQueue();
      queue.push({
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      logger.debug(`[offlineSync] Queued action: ${action.type}`);
    } catch (e) {
      logger.warn('[offlineSync] Failed to enqueue action:', e);
    }
  },

  /** Remove a processed action from the queue */
  dequeue(id: string): void {
    try {
      const queue = this.getQueue().filter(a => a.id !== id);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      logger.warn('[offlineSync] Failed to dequeue:', e);
    }
  },

  /** Clear entire queue */
  clearQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  /** Process all queued actions (called when coming back online) */
  async processQueue(handlers: {
    session_report?: (payload: any) => Promise<boolean>;
    profile_update?: (payload: any) => Promise<boolean>;
  }): Promise<{ processed: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    logger.debug(`[offlineSync] Processing ${queue.length} queued actions`);
    let processed = 0;
    let failed = 0;

    for (const action of queue) {
      try {
        const handler = handlers[action.type as keyof typeof handlers];
        if (handler) {
          const success = await handler(action.payload);
          if (success) {
            this.dequeue(action.id);
            processed++;
          } else {
            failed++;
          }
        } else {
          // No handler for this type, remove it
          this.dequeue(action.id);
          processed++;
        }
      } catch (e) {
        logger.warn(`[offlineSync] Failed to process action ${action.id}:`, e);
        failed++;
      }
    }

    return { processed, failed };
  },

  /** Get count of pending actions */
  getPendingCount(): number {
    return this.getQueue().length;
  },
};
