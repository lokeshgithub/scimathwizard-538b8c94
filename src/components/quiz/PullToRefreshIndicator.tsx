import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  refreshing: boolean;
  pullDistance: number;
}

export const PullToRefreshIndicator = ({ isPulling, refreshing, pullDistance }: PullToRefreshIndicatorProps) => {
  if (!isPulling && !refreshing) return null;

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: pullDistance || 40 }}
      className="flex items-center justify-center overflow-hidden bg-muted"
    >
      <Loader2 className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
      <span className="ml-2 text-xs text-muted-foreground">
        {refreshing ? 'Refreshing...' : 'Pull to refresh'}
      </span>
    </motion.div>
  );
};
