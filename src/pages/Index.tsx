import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BarChart3, LogIn, LogOut, GraduationCap, Brain, Settings, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useAchievements } from '@/hooks/useAchievements';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useConfetti } from '@/hooks/useConfetti';
import { StatsBar } from '@/components/quiz/StatsBar';
import { SubjectTabs } from '@/components/quiz/SubjectTabs';
import { TopicDashboard } from '@/components/quiz/TopicDashboard';
import { MasteryPanel } from '@/components/quiz/MasteryPanel';
import { QuizCard } from '@/components/quiz/QuizCard';
import { LevelCompleteModal } from '@/components/quiz/LevelCompleteModal';
import { SessionSummary } from '@/components/quiz/SessionSummary';
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
  const dailyChallenge = useDailyChallenge(quiz.banks);
  const { user, profile, isAdmin, signOut, updateStats } = useAuth();
  const sound = useSoundEffects();
  const confetti = useConfetti();
  const [showModal, setShowModal] = useState(false);
  const [modalPassed, setModalPassed] = useState(false);
  const [lastAnswerTime, setLastAnswerTime] = useState<number>(0);
  const [wasRetrying, setWasRetrying] = useState(false);
  const [dueTopics, setDueTopics] = useState<DueTopic[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Track what we've already synced to avoid duplicate additions
  // Initialize with current session stats to prevent re-syncing on page reload
  const lastSyncedRef = useRef<{ stars: number; solved: number; mastered: number } | null>(null);
  const hasInitializedStars = useRef(false);

  // Ref for auto-scrolling to quiz card
  const quizCardRef = useRef<HTMLDivElement>(null);

  // Sync stars FROM database when user logs in (for cross-device consistency)
  useEffect(() => {
    if (!user || !profile || hasInitializedStars.current) return;

    // Initialize local stars from database profile
    const profileStars = profile.total_stars || 0;
    if (profileStars > 0) {
      quiz.syncStarsFromProfile(profileStars);
    }
    hasInitializedStars.current = true;
  }, [user, profile, quiz]);

  // Sync stats TO database incrementally - on every answer
  useEffect(() => {
    if (!user || !profile) return;

    const { stars, solved, mastered } = quiz.sessionStats;

    // On first run, initialize the ref with current values to prevent re-sync of old data
    if (lastSyncedRef.current === null) {
      lastSyncedRef.current = { stars, solved, mastered };
      return; // Don't sync on first mount - data was already synced previously
    }

    const lastSynced = lastSyncedRef.current;

    // Calculate incremental changes since last sync
    const starsToAdd = stars - lastSynced.stars;
    const solvedToAdd = solved - lastSynced.solved;
    const masteredToAdd = mastered - lastSynced.mastered;

    // Only sync if there's something new (positive increment)
    if (starsToAdd > 0 || solvedToAdd > 0 || masteredToAdd > 0) {
      updateStats({
        total_stars: (profile.total_stars || 0) + starsToAdd,
        questions_answered: (profile.questions_answered || 0) + solvedToAdd,
        topics_mastered: (profile.topics_mastered || 0) + masteredToAdd,
      });

      // Update what we've synced
      lastSyncedRef.current = { stars, solved, mastered };
    }
  }, [quiz.sessionStats.stars, quiz.sessionStats.solved, quiz.sessionStats.mastered, user, profile, updateStats]);

  // Helper to add stars from daily challenge/login rewards
  const handleAddStars = useCallback((stars: number) => {
    // Stars are tracked in sessionStats - update profile if logged in
    if (user && profile) {
      updateStats({
        total_stars: (profile.total_stars || 0) + stars,
      });
    }
  }, [user, profile, updateStats]);


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

  const topics = quiz.banks[quiz.subject] || {};
  const hasTopics = Object.keys(topics).length > 0;
  const hasAnsweredQuestions = quiz.sessionPerformance.questionTimings.length > 0;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <motion.header
        className="bg-gradient-magical text-white py-4 px-4 overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto">
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

              {/* Grade Badge - Prominent class indicator */}
              {profile && (
                <motion.div
                  className="flex items-center gap-1 bg-white/30 backdrop-blur-sm rounded-full px-2 py-1 border border-white/40 flex-shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-lg">Class {profile.grade || 7}</span>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Pathway Navigation - hidden on very small screens */}
              <div className="hidden sm:block">
                <PathwayNav />
              </div>

              {/* AI Analysis Button - Always visible, enabled after answering questions */}
              <Button
                variant="secondary"
                size="sm"
                onClick={quiz.endSession}
                disabled={!hasAnsweredQuestions}
                className={`flex items-center gap-1 sm:gap-2 border-0 transition-all px-2 sm:px-3 ${
                  hasAnsweredQuestions
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-muted text-muted-foreground'
                }`}
                title={hasAnsweredQuestions ? 'Get AI-powered analysis of your practice session' : 'Answer some questions first'}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Analyze</span>
                {hasAnsweredQuestions && (
                  <span className="hidden md:inline bg-white/20 rounded-full px-1.5 py-0.5 text-xs">
                    {quiz.sessionPerformance.questionTimings.length}
                  </span>
                )}
              </Button>

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
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
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
                  getTopicLevels={quiz.getTopicLevels}
                  isAdmin={false}
                  currentSubject={quiz.subject}
                  isLoggedIn={!!user}
                  dueTopics={dueTopics}
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

            {/* Back to Topics Button - shown when in a quiz */}
            {quiz.topic && quiz.currentQuestion && (
              <motion.button
                onClick={() => {
                  // Show confirmation if there's in-progress work
                  if (quiz.levelStats.total > 0) {
                    setShowExitConfirm(true);
                  } else {
                    quiz.exitToTopics();
                  }
                }}
                className="flex items-center gap-2 mb-4 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -3 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Topics
              </motion.button>
            )}

            {quiz.topic && quiz.currentQuestion && (
              <MasteryPanel
                topicName={quiz.topic}
                currentLevel={quiz.level}
                progress={quiz.getTopicProgress(quiz.topic)}
                levelStats={quiz.levelStats}
                perLevel={quiz.PER_LEVEL}
                topicLevels={quiz.getTopicLevels(quiz.topic)}
                onResetProgress={() => {
                  quiz.resetTopicProgress(quiz.topic!);
                  quiz.selectTopic(quiz.topic!);
                }}
                onPracticeLevel={(level) => {
                  quiz.startUnlimitedPractice(quiz.topic!, level);
                }}
                getQuestionsCount={(level) => quiz.getQuestionsCountForLevel(quiz.topic!, level)}
              />
            )}

            {quiz.mixedTopics && quiz.mixedTopics.length > 0 && quiz.currentQuestion && (
              <>
                <motion.button
                  onClick={() => {
                    if (quiz.levelStats.total > 0) {
                      setShowExitConfirm(true);
                    } else {
                      quiz.exitToTopics();
                    }
                  }}
                  className="flex items-center gap-2 mb-4 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -3 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Topics
                </motion.button>
                <motion.div
                  className="bg-gradient-magical text-white p-4 rounded-xl mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span>🎲 Mixed Mode:</span>
                    <span>{quiz.mixedTopics.length} topics selected</span>
                  </div>
                </motion.div>
              </>
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
                <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Available</h3>
                <p className="text-muted-foreground mb-4">
                  There are no questions for Level {quiz.level} in this topic yet.
                </p>
                <Button onClick={quiz.exitToTopics} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Choose Another Topic
                </Button>
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

    </div>
  );
};

export default Index;
