import { WifiOff, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export const OfflineIndicator = () => {
  const { isOnline, pendingCount } = useOfflineSync();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 shadow-md"
        >
          <WifiOff className="w-4 h-4" />
          <span>You're offline — questions are cached locally, keep practicing!</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-destructive-foreground/20 rounded-full text-xs">
              <CloudOff className="w-3 h-3" />
              {pendingCount} pending sync
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
