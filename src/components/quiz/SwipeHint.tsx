import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeHintProps {
  isVisible: boolean;
  canGoBack?: boolean;
}

/**
 * Visual hint showing users they can swipe left/right after answering a question.
 * Appears briefly then fades out.
 */
export const SwipeHint = ({ isVisible, canGoBack = false }: SwipeHintProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="flex items-center justify-center gap-4 py-2 text-muted-foreground text-xs"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.7, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {canGoBack && (
            <span className="flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />
              Swipe right for previous
            </span>
          )}
          <span className="flex items-center gap-1">
            Swipe left for next
            <ChevronRight className="w-3 h-3" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
