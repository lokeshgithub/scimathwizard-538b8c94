import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { TopicProgress, QuestionTiming } from '@/types/quiz';
import {
  Sparkles, Flame, Target, ChevronDown, ChevronRight,
  Zap, Award, BookOpen, Lock, Bell, Play, Search, Eye, RotateCcw, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContinueSession, saveLastSession } from './ContinueSession';
import { SignUpPrompt } from './SignUpPrompt';
import { AreasToImprove } from './AreasToImprove';
import { useGuestLimits, GUEST_TOPIC_LIMIT_COUNT } from '@/hooks/useGuestLimits';
import type { DueTopic } from '@/services/spacedRepetitionService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getThresholdForLevel } from '@/utils/levelThresholds';

interface TopicDashboardProps {
  topics: { [name: string]: any[] };
  currentTopic: string | null;
  getProgress: (topic: string) => TopicProgress;
  onSelectTopic: (topic: string) => void;
  onStartMixedQuiz?: (topics: string[]) => void;
  onStartLevel?: (topic: string, level: number) => void;
  getTopicLevels?: (topic: string) => number[];
  isAdmin?: boolean;
  currentSubject?: string;
  isLoggedIn?: boolean;
  dueTopics?: DueTopic[];
  isLevelUnlocked?: (topic: string, level: number) => boolean;
  onRequestUnlock?: (topic: string, level: number) => void;
  // Review mode and reset
  onStartReview?: (topic: string) => boolean | void;
  onResetProgress?: (topic: string) => void;
  getSolvedCount?: (topic: string) => number;
  // Session performance for areas to improve
  questionTimings?: QuestionTiming[];
}

const formatName = (name: string) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Category type definition
type CategoryDef = { name: string; icon: string; color: string; keywords: string[] };

// Topic categories for Math - expanded keywords for better coverage
const MATH_CATEGORIES: CategoryDef[] = [
  { name: 'Numbers & Operations', icon: '🔢', color: 'from-blue-500 to-cyan-500', keywords: ['integer', 'decimal', 'fraction', 'rational', 'number', 'percent', 'whole', 'natural', 'real', 'square', 'cube', 'root', 'factor', 'multiple', 'divisib', 'hcf', 'lcm', 'prime'] },
  { name: 'Algebra', icon: '🔤', color: 'from-purple-500 to-pink-500', keywords: ['algebra', 'equation', 'linear', 'exponent', 'power', 'variable', 'polynomial', 'expression', 'factori', 'simplif', 'identit', 'quadratic', 'simultaneous'] },
  { name: 'Ratio & Proportion', icon: '⚖️', color: 'from-amber-500 to-orange-500', keywords: ['ratio', 'proportion', 'rate', 'profit', 'loss', 'discount', 'interest', 'percent', 'markup', 'cost', 'sell', 'sp', 'cp', 'simple_interest', 'compound', 'unitary', 'direct', 'inverse', 'variation', 'time_work', 'speed_distance'] },
  { name: 'Geometry', icon: '📐', color: 'from-green-500 to-emerald-500', keywords: ['geometry', 'triangle', 'circle', 'quadrilateral', 'angle', 'area', 'perimeter', 'volume', 'surface', 'polygon', 'line', 'parallel', 'perpendicular', 'congruen', 'similar', 'symmetr', 'coordinat', 'mensuration', 'shape', 'cube', 'cylinder', 'sphere', 'cone', 'rectangle', 'square'] },
  { name: 'Data & Statistics', icon: '📊', color: 'from-rose-500 to-red-500', keywords: ['data', 'statistic', 'probability', 'graph', 'mean', 'median', 'mode', 'average', 'bar', 'pie', 'histogram', 'frequency', 'range', 'chart', 'table', 'random', 'chance', 'outcome'] },
];

// Topic categories for Physics (Class 7 onwards)
const PHYSICS_CATEGORIES: CategoryDef[] = [
  { name: 'Motion & Forces', icon: '🚀', color: 'from-blue-600 to-indigo-500', keywords: ['motion', 'force', 'speed', 'velocity', 'acceleration', 'momentum', 'friction', 'gravity', 'newton'] },
  { name: 'Energy & Work', icon: '⚡', color: 'from-amber-500 to-yellow-500', keywords: ['energy', 'work', 'power', 'kinetic', 'potential', 'conservation', 'joule'] },
  { name: 'Heat & Temperature', icon: '🌡️', color: 'from-red-500 to-orange-500', keywords: ['heat', 'temperature', 'thermal', 'conduction', 'convection', 'radiation', 'celsius', 'fahrenheit'] },
  { name: 'Light & Optics', icon: '💡', color: 'from-yellow-400 to-amber-400', keywords: ['light', 'optic', 'reflection', 'refraction', 'lens', 'mirror', 'prism', 'color', 'spectrum'] },
  { name: 'Sound & Waves', icon: '🔊', color: 'from-teal-500 to-cyan-500', keywords: ['sound', 'wave', 'vibration', 'frequency', 'amplitude', 'echo', 'resonance', 'pitch'] },
  { name: 'Electricity & Magnetism', icon: '🔌', color: 'from-violet-500 to-purple-500', keywords: ['electric', 'current', 'voltage', 'resistance', 'circuit', 'magnet', 'magnetic', 'ohm', 'charge'] },
];

// Topic categories for Chemistry (Class 7 onwards)
const CHEMISTRY_CATEGORIES: CategoryDef[] = [
  { name: 'Matter & Materials', icon: '🧱', color: 'from-slate-500 to-gray-600', keywords: ['matter', 'state', 'solid', 'liquid', 'gas', 'material', 'property', 'physical', 'change'] },
  { name: 'Atoms & Elements', icon: '⚛️', color: 'from-blue-500 to-cyan-500', keywords: ['atom', 'element', 'periodic', 'proton', 'neutron', 'electron', 'nucleus', 'atomic'] },
  { name: 'Compounds & Mixtures', icon: '🧪', color: 'from-green-500 to-emerald-500', keywords: ['compound', 'mixture', 'molecule', 'solution', 'separation', 'pure', 'impure'] },
  { name: 'Chemical Reactions', icon: '💥', color: 'from-orange-500 to-red-500', keywords: ['reaction', 'chemical', 'reactant', 'product', 'equation', 'balance', 'synthesis', 'decomposition'] },
  { name: 'Acids, Bases & Salts', icon: '🫧', color: 'from-lime-500 to-green-500', keywords: ['acid', 'base', 'salt', 'ph', 'neutral', 'indicator', 'alkali', 'corrosive'] },
  { name: 'Metals & Non-metals', icon: '🔩', color: 'from-amber-600 to-yellow-600', keywords: ['metal', 'non-metal', 'metalloid', 'conductor', 'malleable', 'ductile', 'lustre'] },
];

// Get categories for a specific subject
const getCategoriesForSubject = (subject: string): CategoryDef[] => {
  switch (subject.toLowerCase()) {
    case 'physics':
      return PHYSICS_CATEGORIES;
    case 'chemistry':
      return CHEMISTRY_CATEGORIES;
    case 'math':
    default:
      return MATH_CATEGORIES;
  }
};

// Categorize a topic based on its name and subject
const categorize = (topicName: string, subject: string = 'math'): string => {
  // Clean up topic name: remove chapter prefixes like "ch09_", underscores, etc.
  const cleaned = topicName
    .toLowerCase()
    .replace(/^ch\d+[_-]?/i, '') // Remove "ch09_" prefix
    .replace(/[_-]/g, ' ');      // Convert underscores/dashes to spaces

  const categories = getCategoriesForSubject(subject);

  // Collect all keyword matches with their lengths (longest match wins)
  // This prevents 'mensuration' from matching 'ratio' before 'mensuration'
  const matches: { category: string; keyword: string; length: number }[] = [];

  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (cleaned.includes(kw)) {
        matches.push({ category: cat.name, keyword: kw, length: kw.length });
      }
    }
  }

  // Return the category with the longest matching keyword
  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0].category;
  }

  // Second pass: try matching partial words (e.g., "geom" matches geometry category)
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const cat of categories) {
    for (const word of words) {
      if (cat.keywords.some(kw => kw.startsWith(word) || word.startsWith(kw.slice(0, 4)))) {
        return cat.name;
      }
    }
  }

  return 'Other Topics';
};

// Get topic icon based on name and subject
const getTopicIcon = (name: string, subject: string = 'math'): string => {
  const lower = name.toLowerCase();

  // Math icons
  if (lower.includes('decimal')) return '🔢';
  if (lower.includes('fraction')) return '🍕';
  if (lower.includes('ratio') && lower.includes('proportion')) return '⚖️';
  if (lower.includes('ratio')) return '🔗';
  if (lower.includes('proportion')) return '📊';
  if (lower.includes('exponent') || lower.includes('power')) return '⚡';
  if (lower.includes('rational')) return '➗';
  if (lower.includes('algebra')) return '🔤';
  if (lower.includes('percent')) return '💯';
  if (lower.includes('integer')) return '🔟';
  if (lower.includes('linear') || lower.includes('equation')) return '📈';
  if (lower.includes('triangle')) return '📐';
  if (lower.includes('circle')) return '⭕';
  if (lower.includes('quadrilateral')) return '🔷';
  if (lower.includes('geometry')) return '📐';
  if (lower.includes('statistic')) return '📊';
  if (lower.includes('probability')) return '🎲';
  if (lower.includes('profit') || lower.includes('loss')) return '💰';
  if (lower.includes('interest')) return '🏦';

  // Physics icons
  if (lower.includes('motion') || lower.includes('velocity') || lower.includes('speed')) return '🚀';
  if (lower.includes('force') || lower.includes('newton')) return '💪';
  if (lower.includes('friction')) return '🛑';
  if (lower.includes('gravity')) return '🌍';
  if (lower.includes('energy')) return '⚡';
  if (lower.includes('work') || lower.includes('power')) return '🔋';
  if (lower.includes('heat') || lower.includes('temperature') || lower.includes('thermal')) return '🌡️';
  if (lower.includes('light') || lower.includes('optic')) return '💡';
  if (lower.includes('reflection')) return '🪞';
  if (lower.includes('refraction') || lower.includes('lens')) return '🔍';
  if (lower.includes('sound') || lower.includes('wave')) return '🔊';
  if (lower.includes('electric') || lower.includes('current') || lower.includes('circuit')) return '🔌';
  if (lower.includes('magnet')) return '🧲';

  // Chemistry icons
  if (lower.includes('matter') || lower.includes('state')) return '🧱';
  if (lower.includes('atom') || lower.includes('element')) return '⚛️';
  if (lower.includes('periodic')) return '📋';
  if (lower.includes('compound') || lower.includes('molecule')) return '🧬';
  if (lower.includes('mixture') || lower.includes('solution')) return '🧪';
  if (lower.includes('reaction') || lower.includes('chemical')) return '💥';
  if (lower.includes('acid')) return '🫧';
  if (lower.includes('base') || lower.includes('alkali')) return '🧴';
  if (lower.includes('salt')) return '🧂';
  if (lower.includes('metal')) return '🔩';
  if (lower.includes('gas')) return '💨';
  if (lower.includes('liquid')) return '💧';
  if (lower.includes('solid')) return '🧊';

  // Default icons per subject
  if (subject === 'physics') return '🔬';
  if (subject === 'chemistry') return '⚗️';
  return '📚';
};

// Get mastery color
const getMasteryColor = (percentage: number): { bg: string; ring: string } => {
  if (percentage >= 100) return { bg: 'bg-amber-500', ring: 'ring-amber-400' };
  if (percentage >= 80) return { bg: 'bg-emerald-500', ring: 'ring-emerald-400' };
  if (percentage >= 60) return { bg: 'bg-blue-500', ring: 'ring-blue-400' };
  if (percentage >= 40) return { bg: 'bg-violet-500', ring: 'ring-violet-400' };
  if (percentage > 0) return { bg: 'bg-pink-500', ring: 'ring-pink-400' };
  return { bg: 'bg-slate-300', ring: 'ring-slate-300' };
};

export const TopicDashboard = ({
  topics,
  currentTopic,
  getProgress,
  onSelectTopic,
  onStartMixedQuiz,
  onStartLevel,
  getTopicLevels,
  isAdmin = false,
  currentSubject = 'math',
  isLoggedIn = false,
  dueTopics = [],
  isLevelUnlocked,
  onRequestUnlock,
  onStartReview,
  onResetProgress,
  getSolvedCount,
  questionTimings = [],
}: TopicDashboardProps) => {
  // Get default expanded categories based on subject
  const getDefaultExpandedCategories = useCallback((subject: string): Set<string> => {
    switch (subject.toLowerCase()) {
      case 'physics':
        return new Set(['Motion & Forces', 'Energy & Work']);
      case 'chemistry':
        return new Set(['Matter & Materials', 'Atoms & Elements']);
      case 'math':
      default:
        return new Set(['Numbers & Operations', 'Algebra']);
    }
  }, []);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => getDefaultExpandedCategories(currentSubject));
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetConfirmTopic, setResetConfirmTopic] = useState<string | null>(null);
  const guestLimits = useGuestLimits(isLoggedIn);
  const topicEntries = Object.entries(topics);

  // Reset expanded categories when subject changes - use useEffect to avoid render-phase state updates
  useEffect(() => {
    setExpandedCategories(getDefaultExpandedCategories(currentSubject));
  }, [currentSubject, getDefaultExpandedCategories]);

  // Create Set of due topics for quick lookup
  const dueTopicNames = useMemo(() => new Set(dueTopics.map(dt => dt.topic_name)), [dueTopics]);

  // Calculate topic stats and group by category
  const { categorizedTopics, overallStats } = useMemo(() => {
    const categories: { [cat: string]: any[] } = {};
    let totalMastered = 0;
    let totalLevels = 0;

    for (const [name, questions] of topicEntries) {
      const progress = getProgress(name);
      const levels = getTopicLevels ? getTopicLevels(name) : [1, 2, 3, 4, 5];
      const masteredCount = levels.filter(l => progress[l]?.mastered).length;
      const percentage = levels.length > 0 ? (masteredCount / levels.length) * 100 : 0;

      totalMastered += masteredCount;
      totalLevels += levels.length;

      const category = categorize(name, currentSubject);
      if (!categories[category]) categories[category] = [];

      categories[category].push({
        name,
        questionCount: questions.length,
        levels,
        masteredCount,
        totalLevels: levels.length,
        percentage,
        icon: getTopicIcon(name, currentSubject),
        isComplete: masteredCount === levels.length && levels.length > 0,
        progress,
        isDue: dueTopicNames.has(name),
      });
    }

    // Sort topics within each category by progress
    for (const cat of Object.keys(categories)) {
      categories[cat].sort((a, b) => {
        // Due topics first, then by progress
        if (a.isDue && !b.isDue) return -1;
        if (!a.isDue && b.isDue) return 1;
        return b.percentage - a.percentage;
      });
    }

    return {
      categorizedTopics: categories,
      overallStats: {
        totalMastered,
        totalLevels,
        percentage: totalLevels > 0 ? (totalMastered / totalLevels) * 100 : 0,
        completedTopics: Object.values(categories).flat().filter(t => t.isComplete).length,
        totalTopics: topicEntries.length,
      },
    };
  }, [topicEntries, getProgress, getTopicLevels, dueTopicNames, currentSubject]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categorizedTopics;

    const query = searchQuery.toLowerCase();
    const filtered: { [cat: string]: any[] } = {};

    for (const [cat, topics] of Object.entries(categorizedTopics)) {
      const matching = topics.filter(t => t.name.toLowerCase().includes(query));
      if (matching.length > 0) {
        filtered[cat] = matching;
      }
    }

    return filtered;
  }, [categorizedTopics, searchQuery]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectTopic = (topicName: string) => {
    if (!guestLimits.canAccessTopic(topicName)) {
      setShowSignUpPrompt(true);
      return;
    }
    guestLimits.recordTopicAccess(topicName);
    const progress = getProgress(topicName);
    const levels = getTopicLevels ? getTopicLevels(topicName) : [1, 2, 3, 4, 5];
    const currentLevel = levels.find(l => !progress[l]?.mastered) || levels[0];
    saveLastSession(currentSubject, topicName, currentLevel);
    onSelectTopic(topicName);
  };

  const handleStartLevel = (topicName: string, level: number) => {
    if (!guestLimits.canAccessTopic(topicName)) {
      setShowSignUpPrompt(true);
      return;
    }

    const unlocked = isLevelUnlocked ? isLevelUnlocked(topicName, level) : true;
    if (!unlocked && onRequestUnlock) {
      onRequestUnlock(topicName, level);
      return;
    }

    guestLimits.recordTopicAccess(topicName);
    if (onStartLevel) onStartLevel(topicName, level);
  };

  if (topicEntries.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-12 text-center shadow-card mb-6">
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">
          📚
        </motion.div>
        <p className="text-muted-foreground">No topics available yet. Check back soon!</p>
      </div>
    );
  }

  // Get ordered category list based on subject
  const subjectCategories = getCategoriesForSubject(currentSubject);
  const categoryOrder = [...subjectCategories.map(c => c.name), 'Other Topics'];
  const orderedCategories = categoryOrder.filter(cat => filteredCategories[cat]?.length > 0);

  return (
    <>
      <div className="space-y-4 mb-6">
        {/* Guest Limit Banner */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl border flex items-center justify-between ${
              guestLimits.isLimitReached ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/50 border-border'
            }`}
          >
            <div className="flex items-center gap-2">
              {guestLimits.isLimitReached ? <Lock className="w-4 h-4 text-destructive" /> : <Sparkles className="w-4 h-4 text-primary" />}
              <span className="text-sm">
                {guestLimits.isLimitReached ? (
                  <span className="text-destructive font-medium">Guest limit reached! Sign up for unlimited access.</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">Guest: </span>
                    <span className="font-medium">{guestLimits.remainingTopics}/{GUEST_TOPIC_LIMIT_COUNT} topics left</span>
                  </>
                )}
              </span>
            </div>
          </motion.div>
        )}

        {/* Continue Session */}
        <ContinueSession
          currentSubject={currentSubject}
          getTopicProgress={(topicName) => {
            const progress = getProgress(topicName);
            const levels = getTopicLevels ? getTopicLevels(topicName) : [1, 2, 3, 4, 5];
            const masteredCount = levels.filter(l => progress[l]?.mastered).length;
            const percentage = (masteredCount / levels.length) * 100;
            const currentLevel = levels.find(l => !progress[l]?.mastered) || levels[0];
            return { percentage, currentLevel, maxLevel: levels.length };
          }}
          onContinue={handleSelectTopic}
        />

        {/* Mixed Practice Button */}
        {onStartMixedQuiz && topicEntries.length > 1 && (
          <motion.button
            onClick={() => onStartMixedQuiz(topicEntries.map(([name]) => name))}
            className="w-full p-4 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-xl text-white font-semibold flex items-center justify-center gap-3 shadow-lg"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Sparkles className="w-5 h-5" />
            <span>Mix All Topics</span>
            <Play className="w-5 h-5" />
          </motion.button>
        )}

        {/* Overall Progress Bar */}
        <div className="bg-card rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {overallStats.completedTopics}/{overallStats.totalTopics} topics mastered
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallStats.percentage}%` }}
            />
          </div>
        </div>

        {/* Search (show when 10+ topics) */}
        {topicEntries.length >= 10 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Areas to Improve - shows weak topics from current session */}
        <AreasToImprove
          questionTimings={questionTimings}
          onPractice={handleSelectTopic}
        />

        {/* Category Groups */}
        <div className="space-y-3">
          {orderedCategories.map((categoryName) => {
            const categoryTopics = filteredCategories[categoryName];
            const categoryInfo = subjectCategories.find(c => c.name === categoryName) || {
              icon: currentSubject === 'physics' ? '🔬' : currentSubject === 'chemistry' ? '⚗️' : '📚',
              color: 'from-slate-500 to-slate-600',
            };
            const isExpanded = expandedCategories.has(categoryName);
            const categoryMastered = categoryTopics.filter(t => t.isComplete).length;
            const categoryProgress = categoryTopics.length > 0
              ? (categoryTopics.reduce((sum, t) => sum + t.percentage, 0) / categoryTopics.length)
              : 0;

            return (
              <div key={categoryName} className="bg-card rounded-xl shadow-card overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categoryName)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  aria-expanded={isExpanded}
                  aria-label={`${categoryName} category, ${categoryMastered} of ${categoryTopics.length} complete. Click to ${isExpanded ? 'collapse' : 'expand'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${categoryInfo.color} flex items-center justify-center text-xl`}>
                      {categoryInfo.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{categoryName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {categoryMastered}/{categoryTopics.length} complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini progress */}
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full bg-gradient-to-r ${categoryInfo.color} rounded-full`}
                        style={{ width: `${categoryProgress}%` }}
                      />
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Topics in Category */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {categoryTopics.map((topic) => {
                          const colors = getMasteryColor(topic.percentage);
                          const solvedCount = getSolvedCount ? getSolvedCount(topic.name) : 0;
                          const hasSolvedQuestions = solvedCount > 0;

                          return (
                            <motion.div
                              key={topic.name}
                              data-testid="topic-card"
                              className={`
                                relative p-3 rounded-lg text-left transition-all
                                bg-muted/50 hover:bg-muted border border-transparent
                                ${currentTopic === topic.name ? 'ring-2 ring-primary' : ''}
                                ${topic.isComplete ? 'border-amber-200 dark:border-amber-800' : ''}
                              `}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              {/* Due indicator */}
                              {topic.isDue && !topic.isComplete && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10">
                                  <Bell className="w-3 h-3 text-white" />
                                </div>
                              )}

                              {/* Complete badge */}
                              {topic.isComplete && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center z-10">
                                  <Award className="w-3 h-3 text-white" />
                                </div>
                              )}

                              {/* Main clickable area */}
                              <button
                                onClick={() => handleSelectTopic(topic.name)}
                                className="w-full text-left"
                                data-testid="topic-select-button"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl">{topic.icon}</span>
                                  <span className="font-medium text-foreground text-sm truncate flex-1">
                                    {formatName(topic.name)}
                                  </span>
                                  {/* Topic options menu */}
                                  {(hasSolvedQuestions || topic.percentage > 0) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button
                                          className="p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground"
                                          aria-label="Topic options"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                        {hasSolvedQuestions && onStartReview && (
                                          <DropdownMenuItem onClick={() => {
                                            const started = onStartReview(topic.name);
                                            if (started === false) {
                                              toast.error('No solved questions to review');
                                            }
                                          }}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Review Solved ({solvedCount})
                                          </DropdownMenuItem>
                                        )}
                                        {topic.percentage > 0 && onResetProgress && (
                                          <DropdownMenuItem
                                            onClick={() => setResetConfirmTopic(topic.name)}
                                            className="text-destructive focus:text-destructive"
                                          >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Reset Progress
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>

                                {/* Level indicators - compact */}
                                <div className="flex items-center gap-1 mb-2">
                                  {topic.levels.slice(0, 7).map((level: number) => {
                                    const isMastered = topic.progress[level]?.mastered;
                                    const unlocked = isLevelUnlocked ? isLevelUnlocked(topic.name, level) : true;
                                    const isLocked = !unlocked && !isMastered;

                                    return (
                                      <button
                                        key={level}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartLevel(topic.name, level);
                                        }}
                                        className={`
                                          w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                          transition-all hover:scale-110
                                          ${isMastered
                                            ? `${colors.bg} text-white`
                                            : isLocked
                                            ? 'bg-muted/70 text-muted-foreground/50'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                          }
                                        `}
                                        title={isMastered ? `L${level} Mastered` : isLocked ? `L${level} Locked` : `L${level} — need ${Math.round(getThresholdForLevel(level) * 100)}% to pass`}
                                        data-testid={`level-button-${level}`}
                                      >
                                        {isLocked ? <Lock className="w-2.5 h-2.5" /> : level}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Progress bar */}
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${colors.bg} rounded-full`}
                                    style={{ width: `${topic.percentage}%` }}
                                  />
                                </div>
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Color Legend - explains what the level colors mean */}
        <div className="bg-card rounded-xl p-3 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-2">Level Colors</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-xs text-muted-foreground">Mastered (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-xs text-muted-foreground">Strong (80%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className="text-xs text-muted-foreground">Good (60%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
              <span className="text-xs text-muted-foreground">Learning (40%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pink-500 inline-block" />
              <span className="text-xs text-muted-foreground">Started</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
              <span className="text-xs text-muted-foreground">Not started</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Up Prompt */}
      <SignUpPrompt
        isOpen={showSignUpPrompt}
        onClose={() => setShowSignUpPrompt(false)}
        topicsUsed={guestLimits.topicsUsed.length}
      />

      {/* Reset Progress Confirmation */}
      <AlertDialog open={!!resetConfirmTopic} onOpenChange={() => setResetConfirmTopic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all progress for <strong>{resetConfirmTopic && formatName(resetConfirmTopic)}</strong>.
              All solved questions will become available again for practice.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetConfirmTopic && onResetProgress) {
                  onResetProgress(resetConfirmTopic);
                  toast.success(`Progress reset for ${formatName(resetConfirmTopic)}`);
                }
                setResetConfirmTopic(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reset Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
