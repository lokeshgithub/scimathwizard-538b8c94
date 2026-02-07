import { motion } from 'framer-motion';
import { Filter, Calendar, History, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportFilters } from '@/services/reportService';
import type { Subject } from '@/types/quiz';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  availableTopics: string[];
  showHistory: boolean;
  onToggleHistory: () => void;
}

const TIME_RANGES = [
  { value: 'last_session', label: 'Last Session' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_3_weeks', label: 'Last 3 Weeks' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'all_time', label: 'All Time' },
] as const;

const SUBJECTS = [
  { value: 'all', label: 'All Subjects' },
  { value: 'math', label: 'Math' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
] as const;

const formatName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export const ReportFiltersBar = ({
  filters,
  onFiltersChange,
  availableTopics,
  showHistory,
  onToggleHistory,
}: ReportFiltersBarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4 shadow-card mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Time Range */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Time Period</label>
          <select
            value={filters.timeRange}
            onChange={(e) =>
              onFiltersChange({ ...filters, timeRange: e.target.value as ReportFilters['timeRange'] })
            }
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIME_RANGES.map((tr) => (
              <option key={tr.value} value={tr.value}>
                {tr.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
          <select
            value={filters.subject}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                subject: e.target.value as ReportFilters['subject'],
                topic: 'all', // Reset topic when subject changes
              })
            }
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Topic</label>
          <select
            value={filters.topic}
            onChange={(e) =>
              onFiltersChange({ ...filters, topic: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Topics</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>
                {formatName(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History toggle */}
      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHistory}
          className="text-xs gap-1"
        >
          <History className="w-3 h-3" />
          {showHistory ? 'Hide' : 'Show'} Past Sessions
          <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </motion.div>
  );
};
