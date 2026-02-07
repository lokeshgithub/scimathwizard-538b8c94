import { motion } from 'framer-motion';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';
import type { StoredReport } from '@/services/reportService';

interface ReportHistoryListProps {
  reports: StoredReport[];
  formatTime: (s: number) => string;
  formatName: (n: string) => string;
}

export const ReportHistoryList = ({
  reports,
  formatTime,
  formatName,
}: ReportHistoryListProps) => {
  if (reports.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card rounded-xl shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Past Sessions ({reports.length})
        </h3>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {reports.map((report) => (
          <div key={report.id} className="p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">
                {formatDate(report.created_at)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {report.subject}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {report.total_questions} Q
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {Math.round(Number(report.accuracy) * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(Number(report.avg_time_per_question))}
              </span>
              <span>⭐ {report.stars_earned}</span>
            </div>
            {report.topic_breakdown.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {report.topic_breakdown.slice(0, 3).map((tb) => (
                  <span
                    key={tb.topic}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                  >
                    {formatName(tb.topic)}
                  </span>
                ))}
                {report.topic_breakdown.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{report.topic_breakdown.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
