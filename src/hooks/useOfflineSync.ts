import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { saveSessionReport } from '@/services/reportService';
import { toast } from 'sonner';

/**
 * Hook to monitor online/offline status and sync queued actions.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(offlineSyncService.getPendingCount());
  const isSyncing = useRef(false);

  // Monitor online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync when coming back online
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You\'re offline. Your progress will be saved locally and synced when you reconnect.', {
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queued actions
  const syncQueue = useCallback(async () => {
    if (isSyncing.current || !navigator.onLine) return;
    isSyncing.current = true;

    const count = offlineSyncService.getPendingCount();
    if (count === 0) {
      isSyncing.current = false;
      return;
    }

    try {
      const result = await offlineSyncService.processQueue({
        session_report: async (payload) => {
          return saveSessionReport(
            payload.sessionId,
            payload.analysis,
            payload.subject,
            payload.sessionStats
          );
        },
        profile_update: async () => {
          // Profile updates are handled by useAuth's updateStats
          // Just clear these from queue since they'll be stale
          return true;
        },
      });

      if (result.processed > 0) {
        toast.success(`Synced ${result.processed} offline action${result.processed > 1 ? 's' : ''}!`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync. Will retry later.`);
      }
    } finally {
      isSyncing.current = false;
      setPendingCount(offlineSyncService.getPendingCount());
    }
  }, []);

  // Periodically update pending count
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(offlineSyncService.getPendingCount());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    pendingCount,
    syncQueue,
  };
}
