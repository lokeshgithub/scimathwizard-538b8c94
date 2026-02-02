import { motion } from 'framer-motion';
import { AlertTriangle, Play, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QuestionTiming } from '@/types/quiz';

interface AreasToImproveProps {
  questionTimings: QuestionTiming[];
  onPractice: (topic: string) => void;
}

interface WeakTopic {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTimeSeconds: number;
}

export const AreasToImprove = ({ questionTimings, onPractice }: AreasToImproveProps) => {
  // Group timings by topic and calculate accuracy
  const topicStats = new Map<string, { correct: number; total: number; totalTime: number }>();

  for (const timing of questionTimings) {
    const topic = timing.topic;
    if (topic === 'mixed') continue; // Skip mixed mode entries

    const existing = topicStats.get(topic) || { correct: 0, total: 0, totalTime: 0 };
    existing.total += 1;
    if (timing.wasCorrect) existing.correct += 1;
    existing.totalTime += timing.timeSpentSeconds;
    topicStats.set(topic, existing);
  }

  // Find weak topics (< 60% accuracy, at least 3 questions attempted)
  const weakTopics: WeakTopic[] = [];

  for (const [topic, stats] of topicStats) {
    if (stats.total < 3) continue; // Need at least 3 questions for meaningful data

    const accuracy = stats.correct / stats.total;
    if (accuracy < 0.6) {
      weakTopics.push({
        topic,
        correct: stats.correct,
        total: stats.total,
        accuracy,
        avgTimeSeconds: stats.totalTime / stats.total,
      });
    }
  }

  // Sort by accuracy (lowest first)
  weakTopics.sort((a, b) => a.accuracy - b.accuracy);

  // Only show if there are weak topics
  if (weakTopics.length === 0) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4"
      data-testid="areas-to-improve"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-semibold text-amber-900 dark:text-amber-100">
          Areas to Improve
        </h3>
        <span className="text-xs text-amber-600 dark:text-amber-400 ml-auto">
          Based on this session
        </span>
      </div>

      <div className="space-y-2">
        {weakTopics.slice(0, 3).map((weak) => (
          <div
            key={weak.topic}
            className="flex items-center justify-between bg-white/60 dark:bg-white/5 rounded-lg p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {formatName(weak.topic)}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {weak.correct}/{weak.total} correct ({Math.round(weak.accuracy * 100)}%)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Avg {formatTime(weak.avgTimeSeconds)}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPractice(weak.topic)}
              className="ml-2 shrink-0 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              data-testid={`practice-${weak.topic}`}
            >
              <Play className="w-3 h-3 mr-1" />
              Practice
            </Button>
          </div>
        ))}
      </div>

      {weakTopics.length > 3 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
          +{weakTopics.length - 3} more topic{weakTopics.length - 3 !== 1 ? 's' : ''} need attention
        </p>
      )}
    </motion.div>
  );
};
