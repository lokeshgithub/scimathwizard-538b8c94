import { motion } from 'framer-motion';
import { Target, TrendingUp, Clock, Award } from 'lucide-react';

interface ReportStatsProps {
  totalQuestions: number;
  accuracy: number;
  avgTime: number;
  stars: number;
  sessionsCount: number;
  formatTime: (s: number) => string;
}

export const ReportStats = ({
  totalQuestions,
  accuracy,
  avgTime,
  stars,
  sessionsCount,
  formatTime,
}: ReportStatsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      data-testid="report-stats"
    >
      <div className="bg-card rounded-xl p-4 shadow-card text-center" data-testid="stat-questions">
        <div className="text-3xl font-bold text-primary">{totalQuestions}</div>
        <div className="text-sm text-muted-foreground">Questions</div>
      </div>
      <div className="bg-card rounded-xl p-4 shadow-card text-center" data-testid="stat-accuracy">
        <div className="text-3xl font-bold text-emerald-500">
          {Math.round(accuracy * 100)}%
        </div>
        <div className="text-sm text-muted-foreground">Accuracy</div>
      </div>
      <div className="bg-card rounded-xl p-4 shadow-card text-center">
        <div className="text-3xl font-bold text-blue-500">{formatTime(avgTime)}</div>
        <div className="text-sm text-muted-foreground">Avg Time</div>
      </div>
      <div className="bg-card rounded-xl p-4 shadow-card text-center">
        <div className="text-3xl font-bold text-amber-500">{stars}</div>
        <div className="text-sm text-muted-foreground">
          {sessionsCount > 1 ? 'Total Stars' : 'Stars Earned'}
        </div>
      </div>
    </motion.div>
  );
};
