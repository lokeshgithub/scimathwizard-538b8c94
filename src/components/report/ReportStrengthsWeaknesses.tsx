import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Target, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ReportStrengthsWeaknessesProps {
  strengths: string[];
  weaknesses: string[];
  formatName: (n: string) => string;
}

export const ReportStrengthsWeaknesses = ({
  strengths,
  weaknesses,
  formatName,
}: ReportStrengthsWeaknessesProps) => {
  if (strengths.length === 0 && weaknesses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((topic) => (
              <li
                key={topic}
                className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200"
              >
                <Award className="w-4 h-4" />
                <span>{formatName(topic)}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {weaknesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Areas to Improve</h3>
          </div>
          <ul className="space-y-2">
            {weaknesses.map((topic) => (
              <li
                key={topic}
                className="flex items-center justify-between text-amber-800 dark:text-amber-200"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {formatName(topic)}
                </span>
                <Link to={`/?topic=${encodeURIComponent(topic)}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    Practice
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};
