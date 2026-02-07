import { motion } from 'framer-motion';
import { BarChart3, Clock } from 'lucide-react';

interface TopicEntry {
  attempted: number;
  correct: number;
  accuracy: number;
  avgTime: number;
}

interface ReportTopicBreakdownProps {
  topicSummary: Record<string, TopicEntry>;
  formatTime: (s: number) => string;
  formatName: (n: string) => string;
}

export const ReportTopicBreakdown = ({
  topicSummary,
  formatTime,
  formatName,
}: ReportTopicBreakdownProps) => {
  const entries = Object.entries(topicSummary);

  if (entries.length === 0) return null;

  // Sort by number of questions attempted (most first)
  const sorted = [...entries].sort((a, b) => b[1].attempted - a[1].attempted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-xl p-4 shadow-card"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Topic Breakdown
      </h3>
      <div className="space-y-3">
        {sorted.map(([topic, data]) => (
          <div key={topic} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{formatName(topic)}</span>
              <span className="text-muted-foreground">
                {data.correct}/{data.attempted} ({Math.round(data.accuracy * 100)}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.accuracy * 100}%` }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={`h-full rounded-full ${
                  data.accuracy >= 0.8
                    ? 'bg-emerald-500'
                    : data.accuracy >= 0.6
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Avg {formatTime(data.avgTime)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
