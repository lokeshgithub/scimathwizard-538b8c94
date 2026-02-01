import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopicProgress } from '@/types/quiz';
import {
  Sparkles, Flame, Target, ChevronDown, ChevronRight,
  Zap, Award, BookOpen, Lock, Bell, Play, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContinueSession, saveLastSession } from './ContinueSession';
import { SignUpPrompt } from './SignUpPrompt';
import { useGuestLimits, GUEST_TOPIC_LIMIT_COUNT } from '@/hooks/useGuestLimits';
import type { DueTopic } from '@/services/spacedRepetitionService';

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
}

const formatName = (name: string) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Topic categories for Math
const MATH_CATEGORIES: { name: string; icon: string; color: string; keywords: string[] }[] = [
  { name: 'Numbers & Operations', icon: '🔢', color: 'from-blue-500 to-cyan-500', keywords: ['integer', 'decimal', 'fraction', 'rational', 'number', 'percent'] },
  { name: 'Algebra', icon: '🔤', color: 'from-purple-500 to-pink-500', keywords: ['algebra', 'equation', 'linear', 'exponent', 'power', 'variable', 'polynomial'] },
  { name: 'Ratio & Proportion', icon: '⚖️', color: 'from-amber-500 to-orange-500', keywords: ['ratio', 'proportion', 'rate', 'profit', 'loss', 'discount', 'interest'] },
  { name: 'Geometry', icon: '📐', color: 'from-green-500 to-emerald-500', keywords: ['geometry', 'triangle', 'circle', 'quadrilateral', 'angle', 'area', 'perimeter', 'volume'] },
  { name: 'Data & Statistics', icon: '📊', color: 'from-rose-500 to-red-500', keywords: ['data', 'statistic', 'probability', 'graph', 'mean', 'median'] },
];

// Categorize a topic based on its name
const categorize = (topicName: string): string => {
  const lower = topicName.toLowerCase();
  for (const cat of MATH_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat.name;
    }
  }
  return 'Other Topics';
};

// Get topic icon
const getTopicIcon = (name: string): string => {
  const lower = name.toLowerCase();
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
}: TopicDashboardProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Numbers & Operations', 'Algebra']));
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const guestLimits = useGuestLimits(isLoggedIn);
  const topicEntries = Object.entries(topics);

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

      const category = categorize(name);
      if (!categories[category]) categories[category] = [];

      categories[category].push({
        name,
        questionCount: questions.length,
        levels,
        masteredCount,
        totalLevels: levels.length,
        percentage,
        icon: getTopicIcon(name),
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
  }, [topicEntries, getProgress, getTopicLevels, dueTopicNames]);

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

  // Get ordered category list
  const categoryOrder = [...MATH_CATEGORIES.map(c => c.name), 'Other Topics'];
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

        {/* Category Groups */}
        <div className="space-y-3">
          {orderedCategories.map((categoryName) => {
            const categoryTopics = filteredCategories[categoryName];
            const categoryInfo = MATH_CATEGORIES.find(c => c.name === categoryName) || {
              icon: '📚',
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

                          return (
                            <motion.button
                              key={topic.name}
                              onClick={() => handleSelectTopic(topic.name)}
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
                              {topic.isDue && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                  <Bell className="w-3 h-3 text-white" />
                                </div>
                              )}

                              {/* Complete badge */}
                              {topic.isComplete && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                  <Award className="w-3 h-3 text-white" />
                                </div>
                              )}

                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{topic.icon}</span>
                                <span className="font-medium text-foreground text-sm truncate flex-1">
                                  {formatName(topic.name)}
                                </span>
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
                                      title={isMastered ? `L${level} Mastered` : isLocked ? `L${level} Locked` : `Practice L${level}`}
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
                            </motion.button>
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
      </div>

      {/* Sign Up Prompt */}
      <SignUpPrompt
        isOpen={showSignUpPrompt}
        onClose={() => setShowSignUpPrompt(false)}
        topicsUsed={guestLimits.topicsUsed.length}
      />
    </>
  );
};
