import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BarChart3, LogIn, LogOut, GraduationCap, Brain, Settings, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useAchievements } from '@/hooks/useAchievements';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useConfetti } from '@/hooks/useConfetti';
import { StatsBar } from '@/components/quiz/StatsBar';
import { SubjectTabs } from '@/components/quiz/SubjectTabs';
import { GradeSelector } from '@/components/quiz/GradeSelector';
import { TopicDashboard } from '@/components/quiz/TopicDashboard';
import { MasteryPanel } from '@/components/quiz/MasteryPanel';
import { QuizCard } from '@/components/quiz/QuizCard';
import { LevelCompleteModal } from '@/components/quiz/LevelCompleteModal';
import { SessionSummary } from '@/components/quiz/SessionSummary';
import { LevelUnlockModal } from '@/components/quiz/LevelUnlockModal';
import { AchievementsPanel } from '@/components/quiz/AchievementsPanel';
import { AchievementUnlocked } from '@/components/quiz/AchievementUnlocked';
import { DailyGoalTracker } from '@/components/quiz/DailyGoalTracker';
import { DailyStreakTracker } from '@/components/quiz/DailyStreakTracker';
import { DailyChallengeCard } from '@/components/quiz/DailyChallengeCard';

import { BattleMode } from '@/components/quiz/BattleMode';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { SoundToggle } from '@/components/quiz/SoundToggle';
import { PathwayNav } from '@/components/quiz/PathwayNav';
import { PathwayProgress } from '@/components/quiz/PathwayProgress';
import { WelcomeModal } from '@/components/quiz/WelcomeModal';
import { SpacedRepetitionCard } from '@/components/adaptive/SpacedRepetitionCard';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { StarShop } from '@/components/quiz/StarShop';
import { Button } from '@/components/ui/button';
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
import { getDueTopics, DueTopic } from '@/services/spacedRepetitionService';

const Index = () => {
  const quiz = useQuizStore();
  const achievements = useAchievements();
  // Pass user progress for adaptive daily challenge difficulty
  const dailyChallenge = useDailyChallenge(quiz.banks, quiz.progress);
  const { user, profile, isAdmin, signOut, updateStats } = useAuth();
  const sound = useSoundEffects();
  const confetti = useConfetti();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [modalPassed, setModalPassed] = useState(false);
  const [lastAnswerTime, setLastAnswerTime] = useState<number>(0);
  const [wasRetrying, setWasRetrying] = useState(false);
  const [dueTopics, setDueTopics] = useState<DueTopic[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Deep-link: auto-select topic from ?topic= query param (e.g. from Report page)
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      quiz.selectTopic(topicParam);
      // Clear the param so it doesn't re-trigger
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, quiz]);

  // Level unlock modal state
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ topic: string; level: number } | null>(null);
  const [unlockQuestions, setUnlockQuestions] = useState<typeof quiz.banks[string][string]>([]);

  // Track what we've already synced to avoid duplicate additions
  const lastSyncedRef = useRef<{ stars: number; solved: number; mastered: number } | null>(null);
  const hasInitializedStars = useRef(false);
  // Track sync state to prevent concurrent updates
  const isSyncingToDb = useRef(false);

  // Ref for auto-scrolling to quiz card
  const quizCardRef = useRef<HTMLDivElement>(null);

  // Sync stars FROM database when user logs in (DATABASE IS SOURCE OF TRUTH)
  useEffect(() => {
    if (!user || !profile || hasInitializedStars.current) return;

    // DATABASE IS THE SOURCE OF TRUTH - always sync from profile
    const profileStars = profile.total_stars || 0;
    const profileSolved = profile.questions_answered || 0;
    const profileMastered = profile.topics_mastered || 0;

    quiz.syncStarsFromProfile(profileStars);

    // Initialize lastSyncedRef to the profile value to prevent re-syncing old localStorage data
    lastSyncedRef.current = {
      stars: profileStars,
      solved: profileSolved,
      mastered: profileMastered
    };

    hasInitializedStars.current = true;

    console.log(`[Star Sync] Synced ${profileStars} stars from database for user ${user.id}`);
  }, [user, profile, quiz]);

  // Admin Test Mode: Check for admin test params in sessionStorage
  useEffect(() => {
    // Wait for questions to be loaded first
    if (quiz.isLoading) return;

    const adminTestData = sessionStorage.getItem('adminTestMode');
    if (!adminTestData) return;

    try {
      const { subject, topic, level, timestamp } = JSON.parse(adminTestData);

      // Only use if recent (within 60 seconds) to avoid stale test triggers
      if (Date.now() - timestamp > 60000) {
        sessionStorage.removeItem('adminTestMode');
        return;
      }

      // Clear AFTER checking isLoading to prevent losing data during load
      sessionStorage.removeItem('adminTestMode');

      // Set subject first
      if (subject && quiz.setSubject) {
        quiz.setSubject(subject);
      }

      // Start quiz at selected topic/level
      setTimeout(() => {
        if (topic && level) {
          quiz.startUnlimitedPractice(topic, level);
          toast.success(`🧪 Admin Test Mode: ${subject} → ${topic} → Level ${level}`);
        }
      }, 100);

    } catch (e) {
      console.error('Failed to parse admin test mode data:', e);
      sessionStorage.removeItem('adminTestMode');
    }
  }, [quiz.isLoading]);

  // Sync stats TO database incrementally - on every answer
  useEffect(() => {
    if (!user || !profile) return;

    // Don't sync until we've initialized from profile
    if (!hasInitializedStars.current) return;

    // Prevent concurrent syncs
    if (isSyncingToDb.current) return;

    const { stars, solved, mastered } = quiz.sessionStats;

    // Safety: lastSyncedRef should be initialized by the FROM effect above
    if (lastSyncedRef.current === null) {
      lastSyncedRef.current = { stars, solved, mastered };
      return;
    }

    const lastSynced = lastSyncedRef.current;

    // Calculate incremental changes since last sync
    const starsChange = stars - lastSynced.stars;
    const solvedToAdd = solved - lastSynced.solved;
    const masteredToAdd = mastered - lastSynced.mastered;

    // Sync stars if there's any change (positive for earning, negative for spending in Star Shop)
    // Cap at 5000 change per sync as sanity check (should never hit this in normal play)
    const hasStarsToSync = starsChange !== 0 && Math.abs(starsChange) <= 5000;
    const hasStatsToSync = solvedToAdd > 0 || masteredToAdd > 0;

    if (hasStarsToSync || hasStatsToSync) {
      isSyncingToDb.current = true;
      
      const updates: Record<string, number> = {};

      if (hasStarsToSync) {
        // Use lastSynced.stars as base (not profile.total_stars) to avoid race conditions
        // profile might be stale, but lastSynced always reflects what we've committed
        const newTotal = lastSynced.stars + starsChange;
        updates.total_stars = Math.max(0, newTotal); // Ensure non-negative
        console.log(`[Star Sync] ${starsChange > 0 ? 'Adding' : 'Deducting'} ${Math.abs(starsChange)} stars (new total: ${updates.total_stars})`);
      }
      if (solvedToAdd > 0) {
        updates.questions_answered = (profile.questions_answered || 0) + solvedToAdd;
      }
      if (masteredToAdd > 0) {
        updates.topics_mastered = (profile.topics_mastered || 0) + masteredToAdd;
      }

      if (Object.keys(updates).length > 0) {
        updateStats(updates);
      }

      // Always update lastSyncedRef IMMEDIATELY to prevent double-counting
      lastSyncedRef.current = { stars, solved, mastered };
      
      // Release sync lock after a short delay to prevent rapid-fire updates
      setTimeout(() => {
        isSyncingToDb.current = false;
      }, 100);
    }
  }, [quiz.sessionStats.stars, quiz.sessionStats.solved, quiz.sessionStats.mastered, user, profile, updateStats]);

  // Helper to add stars from daily challenge/login rewards
  const handleAddStars = useCallback((stars: number) => {
    // Stars are tracked in sessionStats - update profile if logged in
    if (user && profile) {
      const newTotal = (profile.total_stars || 0) + stars;
      updateStats({ total_stars: newTotal });
      // Sync to quiz store so UI updates immediately
      quiz.syncStarsFromProfile(newTotal);
    }
  }, [user, profile, updateStats, quiz]);

  // Calculate mastered topics per subject for Star Shop requirements
  const masteredTopicsPerSubject = useMemo(() => {
    const counts: Record<string, number> = { math: 0, physics: 0, chemistry: 0 };
    for (const [subject, topics] of Object.entries(quiz.banks)) {
      if (topics && typeof topics === 'object') {
        for (const topicName of Object.keys(topics)) {
          const topicProgress = quiz.progress[topicName];
          if (topicProgress) {
            // Count topic as mastered if any level is mastered
            const hasMasteredLevel = Object.values(topicProgress).some(
              (level: { mastered?: boolean }) => level?.mastered
            );
            if (hasMasteredLevel) {
              counts[subject] = (counts[subject] || 0) + 1;
            }
          }
        }
      }
    }
    return counts;
  }, [quiz.banks, quiz.progress]);

  // Track subject exploration for achievements
  useEffect(() => {
    achievements.recordSubjectExplored(quiz.subject);
  }, [quiz.subject, achievements]);

  // Auto-clear achievements without showing pop-up (pop-ups disabled for snappy flow)
  useEffect(() => {
    if (achievements.newlyUnlocked) {
      achievements.clearNewlyUnlocked();
    }
  }, [achievements.newlyUnlocked, achievements]);

  // Fetch due topics for spaced repetition (when user is logged in)
  useEffect(() => {
    if (!user) {
      setDueTopics([]);
      return;
    }

    const fetchDueTopics = async () => {
      const { data } = await getDueTopics(quiz.subject);
      if (data) {
        setDueTopics(data);
      }
    };

    fetchDueTopics();
  }, [user, quiz.subject]);

  // Auto-scroll to quiz card when question loads so user sees question immediately
  // Other info is still accessible by scrolling up
  useEffect(() => {
    if (quiz.currentQuestion && quizCardRef.current) {
      // Small delay to ensure DOM is updated
      const timeout = setTimeout(() => {
        quizCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [quiz.currentQuestion?.id]);

  // Handle browser/device back button - navigate within app instead of exiting
  useEffect(() => {
    const isInQuiz = !!(quiz.currentQuestion && (quiz.topic || quiz.mixedTopics));

    // Push state when entering quiz mode
    if (isInQuiz) {
      // Only push if we don't already have a quiz state
      if (!window.history.state?.inQuiz) {
        window.history.pushState({ inQuiz: true }, '');
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      // If we were in a quiz, go back to topics instead of exiting
      if (quiz.currentQuestion && (quiz.topic || quiz.mixedTopics)) {
        // Prevent default back navigation
        event.preventDefault();

        // Show exit confirmation if there's progress, otherwise just exit
        if (quiz.levelStats.total > 0) {
          // Push state back so we stay on the page
          window.history.pushState({ inQuiz: true }, '');
          setShowExitConfirm(true);
        } else {
          quiz.exitToTopics();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [quiz.currentQuestion, quiz.topic, quiz.mixedTopics, quiz.levelStats.total, quiz.exitToTopics]);

  // Determine if we're in focused quiz mode (actively answering questions)
  const isInQuizMode = !!(quiz.currentQuestion && (quiz.topic || quiz.mixedTopics));

  const handleAnswer = useCallback(async (selectedIndex: number) => {
    const result = await quiz.answerQuestion(selectedIndex);
    
    // Play sound effects only - no confetti during quiz for snappy flow
    if (result.isCorrect) {
      sound.playCorrect();
      // Confetti disabled during quiz for faster flow
    } else {
      sound.playIncorrect();
    }
    
    // Record for achievements
    const timeSpent = result.timeSpent || 0;
    setLastAnswerTime(timeSpent);
    achievements.recordAnswer(
      result.isCorrect, 
      timeSpent, 
      result.isCorrect ? quiz.sessionStats.streak : 0
    );
    
    return result;
  }, [quiz, achievements, sound, confetti]);

  const handleNext = useCallback(() => {
    const masteryResult = quiz.checkMastery();
    if (masteryResult === 'continue') {
      quiz.nextQuestion();
    } else {
      setModalPassed(masteryResult === 'passed');
      setShowModal(true);
    }
  }, [quiz]);

  const handleModalAction = useCallback(() => {
    setShowModal(false);
    if (modalPassed) {
      // Play level up sound and confetti
      sound.playLevelUp();
      
      const isTopicComplete = quiz.level >= quiz.MAX_LEVEL;
      if (isTopicComplete) {
        confetti.fireMastery();
      } else {
        confetti.fireLevelUp(true);
      }
      
      // Check for perfect level (100% accuracy)
      if (quiz.levelStats.correct === quiz.levelStats.total && quiz.levelStats.total > 0) {
        achievements.recordPerfectLevel();
      }
      // Record mastery
      achievements.recordMastery();
      
      // Check for comeback kid achievement
      if (wasRetrying) {
        achievements.recordRetrySuccess();
        setWasRetrying(false);
      }
      
      if (quiz.level < quiz.MAX_LEVEL) {
        quiz.advanceLevel();
      } else {
        // Topic complete - go back to topic selection
        quiz.selectTopic(quiz.topic!);
      }
    } else {
      setWasRetrying(true);
      quiz.retryLevel();
    }
  }, [modalPassed, quiz, achievements, wasRetrying, sound, confetti]);

  // Handle request to unlock a level
  const handleRequestUnlock = useCallback((topicName: string, level: number) => {
    const questions = quiz.getUnlockAssessmentQuestions(topicName, level);
    if (questions.length === 0) {
      // No questions available for assessment, just unlock
      quiz.unlockLevel(topicName, level);
      return;
    }
    setUnlockTarget({ topic: topicName, level });
    setUnlockQuestions(questions);
    setUnlockModalOpen(true);
  }, [quiz]);

  // Handle successful level unlock
  const handleUnlockSuccess = useCallback((level: number) => {
    if (unlockTarget) {
      quiz.unlockLevel(unlockTarget.topic, level);
      sound.playLevelUp();
      confetti.fireLevelUp(false);
    }
  }, [unlockTarget, quiz, sound, confetti]);

  const topics = quiz.banks[quiz.subject] || {};
  const hasTopics = Object.keys(topics).length > 0;
  const hasAnsweredQuestions = quiz.sessionPerformance.questionTimings.length > 0;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header - Compact in quiz mode, full in dashboard mode */}
      <motion.header
        className={`bg-gradient-magical text-white px-4 overflow-hidden ${isInQuizMode ? 'py-2' : 'py-4'}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto">
          {isInQuizMode ? (
            /* Minimal header for focused quiz mode */
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (quiz.levelStats.total > 0) {
                    setShowExitConfirm(true);
                  } else {
                    quiz.exitToTopics();
                  }
                }}
                className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Exit</span>
              </button>

              <div className="flex items-center gap-2 text-center">
                <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-none">
                  {quiz.topic || 'Mixed Mode'}
                </span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                  L{quiz.level}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <SoundToggle enabled={sound.enabled} onToggle={sound.toggleSound} />
              </div>
            </div>
          ) : (
            /* Full header for dashboard mode */
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <motion.div
                    className="flex items-center gap-1 sm:gap-2 min-w-0"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold truncate">Magic Mastery Quiz</h1>
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 hidden sm:block" />
                  </motion.div>

                  {/* Grade Badge - Shows currently selected grade */}
                  <motion.div
                    className="flex items-center gap-1 bg-white/30 backdrop-blur-sm rounded-full px-2 py-1 border border-white/40 flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-bold text-sm sm:text-lg">Class {quiz.selectedGrade}</span>
                  </motion.div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Pathway Navigation - hidden on very small screens */}
                  <div className="hidden sm:block">
                    <PathwayNav />
                  </div>

                  {/* Report Button - Links to report page, shows session stats */}
                  <div className="relative group">
                    {hasAnsweredQuestions ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={quiz.endSession}
                        className="flex items-center gap-1 sm:gap-2 border-0 transition-all px-2 sm:px-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">View Report</span>
                        <span className="rounded-full px-1.5 py-0.5 text-xs font-bold bg-white/20">
                          {quiz.sessionPerformance.questionTimings.length}
                        </span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="flex items-center gap-1 sm:gap-2 border-0 transition-all px-2 sm:px-3 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                      >
                        <Link to="/report" className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          <span className="hidden sm:inline">Report</span>
                        </Link>
                      </Button>
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-card border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {hasAnsweredQuestions ? 'Session Report Ready' : 'Performance Report'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasAnsweredQuestions
                          ? `Click to see a detailed breakdown of your ${quiz.sessionPerformance.questionTimings.length} answered question${quiz.sessionPerformance.questionTimings.length !== 1 ? 's' : ''} — including accuracy, speed, and improvement tips.`
                          : 'View your stats, strengths, and areas to improve. Start practicing to build your session report.'}
                      </p>
                    </div>
                  </div>

                  {/* Sound Toggle */}
                  <SoundToggle enabled={sound.enabled} onToggle={sound.toggleSound} />

                  {user ? (
                    <div className="flex items-center gap-1 sm:gap-2">
                      {/* Admin Link - Only visible for admins */}
                      {isAdmin && (
                        <Link to="/admin">
                          <div className="flex items-center gap-1 bg-accent/50 hover:bg-accent/70 transition-colors rounded-full px-2 py-1 cursor-pointer border border-accent">
                            <Settings className="w-4 h-4" />
                            <span className="text-sm font-medium hidden md:inline">Admin</span>
                          </div>
                        </Link>
                      )}
                      <Link to="/profile">
                        <div className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors rounded-full pl-1 pr-2 py-1 cursor-pointer">
                          <UserAvatar
                            userId={user.id}
                            displayName={profile?.display_name || 'Student'}
                            size="sm"
                          />
                          <span className="text-sm font-medium truncate max-w-[60px] sm:max-w-[100px] hidden sm:inline">
                            {profile?.display_name || 'Student'}
                          </span>
                        </div>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={signOut}
                        className="flex items-center gap-1 px-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden md:inline">Sign Out</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="px-2 sm:px-3"
                    >
                      <Link to="/auth" className="flex items-center gap-1">
                        <LogIn className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign In</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-white/80 text-sm mt-2">
                Master each level (80% accuracy) with your magical friends! ✨
              </p>
            </>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-4 ${isInQuizMode ? 'py-3' : 'py-6'}`}>
        {/* Dashboard elements - hidden during focused quiz mode */}
        {!isInQuizMode && (
          <>
            {/* Daily Goal & Streak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <DailyGoalTracker questionsAnswered={quiz.sessionStats.solved} dailyGoal={20} />
              <DailyStreakTracker hasAnsweredToday={quiz.sessionStats.solved > 0} />
            </div>

            <StatsBar stats={quiz.sessionStats} />

            {/* Pathway Progress - Journey visualization */}
            <PathwayProgress
              topics={topics}
              getProgress={quiz.getTopicProgress}
              getTopicLevels={quiz.getTopicLevels}
            />

            <SubjectTabs currentSubject={quiz.subject} onSelectSubject={quiz.setSubject} />
            
            <GradeSelector selectedGrade={quiz.selectedGrade} onSelectGrade={quiz.setSelectedGrade} />
          </>
        )}
        
        {quiz.isLoading ? (
          <motion.div
            className="flex flex-col items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading magical questions...</p>
          </motion.div>
        ) : quiz.loadError ? (
          <motion.div
            className="flex flex-col items-center justify-center py-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-foreground font-medium mb-2">Oops! Something went wrong</p>
            <p className="text-muted-foreground mb-4">{quiz.loadError}</p>
            <Button onClick={quiz.retryLoadQuestions} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Show Dashboard when not in a quiz */}
            {!quiz.currentQuestion && (
              <>
                <TopicDashboard
                  topics={topics}
                  currentTopic={quiz.topic}
                  getProgress={quiz.getTopicProgress}
                  onSelectTopic={quiz.selectTopic}
                  onStartMixedQuiz={quiz.startMixedQuiz}
                  onStartLevel={quiz.startUnlimitedPractice}
                  getTopicLevels={quiz.getTopicLevels}
                  isAdmin={false}
                  currentSubject={quiz.subject}
                  isLoggedIn={!!user}
                  dueTopics={dueTopics}
                  isLevelUnlocked={quiz.isLevelUnlocked}
                  onRequestUnlock={handleRequestUnlock}
                  onStartReview={quiz.startReviewMode}
                  onResetProgress={quiz.resetTopicProgress}
                  getSolvedCount={quiz.getSolvedQuestionsCount}
                  questionTimings={quiz.sessionPerformance.questionTimings}
                />

                {/* Spaced Repetition Card - show when logged in */}
                {user && <SpacedRepetitionCard />}
              </>
            )}

            {!hasTopics && (
              <motion.div 
                className="text-center py-8 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="mb-2">No topics available for this subject yet.</p>
                <p className="text-sm">Questions will appear here once added by the admin.</p>
              </motion.div>
            )}

            {/* Minimal progress indicator during quiz - just shows current stats */}
            {isInQuizMode && (
              <motion.div
                className="flex items-center justify-between text-sm text-muted-foreground mb-3 px-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {quiz.isReviewMode ? (
                  <>
                    <span className="flex items-center gap-1.5 text-blue-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      Review Mode
                    </span>
                    <span className="text-xs text-muted-foreground">Answers don't count</span>
                  </>
                ) : (
                  <>
                    <span>{quiz.levelStats.correct}/{quiz.levelStats.total} correct</span>
                    <span>⭐ {quiz.sessionStats.stars}</span>
                  </>
                )}
              </motion.div>
            )}

            {quiz.currentQuestion && (
              <div ref={quizCardRef} className="scroll-mt-4">
                <QuizCard
                  question={quiz.currentQuestion}
                  level={quiz.level}
                  levelStats={quiz.levelStats}
                  sessionStats={quiz.sessionStats}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  onPrevious={quiz.previousQuestion}
                  canGoBack={quiz.canGoBack}
                  onSolutionViewed={quiz.markSolutionViewed}
                  onPrefetchNext={quiz.prefetchNextQuestion}
                />
              </div>
            )}

            {/* No questions available for this topic/level */}
            {quiz.topic && !quiz.currentQuestion && !quiz.mixedTopics && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                {quiz.getSolvedQuestionsCount(quiz.topic, quiz.level) > 0 ? (
                  // All questions solved in practice mode
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-2">All Questions Solved!</h3>
                    <p className="text-muted-foreground mb-4">
                      You've answered all {quiz.getSolvedQuestionsCount(quiz.topic, quiz.level)} questions in this level correctly.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => {
                        if (quiz.topic) {
                          const started = quiz.startReviewMode(quiz.topic, quiz.level);
                          if (!started) {
                            toast.error('No solved questions to review');
                          }
                        }
                      }} variant="outline">
                        Review Solved Questions
                      </Button>
                      <Button onClick={quiz.exitToTopics}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Topics
                      </Button>
                    </div>
                  </>
                ) : (
                  // No questions exist for this level
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Available</h3>
                    <p className="text-muted-foreground mb-4">
                      There are no questions for Level {quiz.level} in this topic yet.
                    </p>
                    <Button onClick={quiz.exitToTopics} variant="outline">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Choose Another Topic
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </>
        )}
      </main>

      <LevelCompleteModal
        isOpen={showModal}
        passed={modalPassed}
        level={quiz.level}
        stats={quiz.levelStats}
        maxLevel={quiz.MAX_LEVEL}
        onAdvance={handleModalAction}
        onRetry={handleModalAction}
      />

      {/* Session Summary Modal */}
      {quiz.showSessionSummary && (
        <SessionSummary
          analysis={quiz.calculateSessionAnalysis()}
          subject={quiz.subject}
          sessionStats={quiz.sessionStats}
          sessionId={quiz.sessionPerformance.sessionId}
          onClose={() => {
            quiz.setShowSessionSummary(false);
            quiz.resetSession();
          }}
        />
      )}

      {/* Daily Challenge */}
      <DailyChallengeCard
        challenge={dailyChallenge.challenge}
        stats={dailyChallenge.stats}
        isLoading={dailyChallenge.isLoading}
        isTodayCompleted={dailyChallenge.isTodayCompleted}
        bonusStars={dailyChallenge.bonusStars}
        onComplete={dailyChallenge.completeChallenge}
        onClearBonus={dailyChallenge.clearBonusStars}
        onAddStars={handleAddStars}
      />

      {/* Battle Mode */}
      <BattleMode banks={quiz.banks} currentSubject={quiz.subject} />

      {/* Friends Panel */}
      <FriendsPanel 
        currentSubject={quiz.subject}
        topics={Object.keys(quiz.banks[quiz.subject] || {})}
        onJoinBattle={(roomCode) => {
          // This will be handled by the BattleMode component's join functionality
          console.log('Join battle with code:', roomCode);
        }}
      />

      {/* Leaderboard */}
      <Leaderboard currentUserId={user?.id} />

      {/* Achievements Panel */}
      <AchievementsPanel 
        achievements={achievements.achievements}
        unlockedCount={achievements.getUnlockedCount()}
        totalCount={achievements.getTotalCount()}
      />

      {/* Achievement Unlocked Animation - DISABLED for snappier flow */}
      {/* Achievements still tracked, just no pop-up interruption */}

      {/* Star Shop - Spend stars on rewards */}
      <StarShop
        stars={quiz.sessionStats.stars}
        onPurchase={(cost) => quiz.deductStars(cost)}
        masteredTopicsPerSubject={masteredTopicsPerSubject}
      />

      {/* Welcome Modal for first-time users */}
      <WelcomeModal />

      {/* Exit Quiz Confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {quiz.levelStats.total} question{quiz.levelStats.total !== 1 ? 's' : ''} in this level.
              Your progress will be saved and you can continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitConfirm(false);
                quiz.exitToTopics();
              }}
            >
              Leave Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Level Unlock Assessment Modal */}
      {unlockTarget && (
        <LevelUnlockModal
          isOpen={unlockModalOpen}
          topic={unlockTarget.topic}
          targetLevel={unlockTarget.level}
          questions={unlockQuestions}
          onClose={() => {
            setUnlockModalOpen(false);
            setUnlockTarget(null);
            setUnlockQuestions([]);
          }}
          onUnlock={handleUnlockSuccess}
        />
      )}

    </div>
  );
};

export default Index;
