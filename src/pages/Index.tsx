import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BarChart3, LogIn, LogOut, User, Brain, Trophy, BookOpen } from 'lucide-react';
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
import { SpacedRepetitionCard } from '@/components/adaptive/SpacedRepetitionCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Index = () => {
  const quiz = useQuizStore();
  const achievements = useAchievements();
  const dailyChallenge = useDailyChallenge(quiz.banks);
  const { user, profile, signOut, updateStats } = useAuth();
  const sound = useSoundEffects();
  const confetti = useConfetti();
  const [showModal, setShowModal] = useState(false);
  const [modalPassed, setModalPassed] = useState(false);
  const [lastAnswerTime, setLastAnswerTime] = useState<number>(0);
  const [wasRetrying, setWasRetrying] = useState(false);

  // Sync stats to database when session stats change
  useEffect(() => {
    if (user && profile && quiz.sessionStats.solved > 0) {
      const newTotalStars = (profile.total_stars || 0) + quiz.sessionStats.stars;
      const newQuestionsAnswered = (profile.questions_answered || 0) + quiz.sessionStats.solved;
      
      // Only update if there are new answers
      if (quiz.sessionStats.solved > 0) {
        updateStats({
          total_stars: newTotalStars,
          questions_answered: newQuestionsAnswered,
          topics_mastered: quiz.sessionStats.mastered,
        });
      }
    }
  }, [quiz.showSessionSummary]); // Sync when session ends

  // Helper to add stars from daily challenge
  const handleAddStars = useCallback((stars: number) => {
    // Stars are tracked in sessionStats - we'd need to update the quiz store
    // For now, this is handled internally by daily challenge
  }, []);

  // Track subject exploration for achievements
  useEffect(() => {
    achievements.recordSubjectExplored(quiz.subject);
  }, [quiz.subject, achievements]);

  const handleAnswer = useCallback(async (selectedIndex: number) => {
    const result = await quiz.answerQuestion(selectedIndex);
    
    // Play sound and confetti effects
    if (result.isCorrect) {
      sound.playCorrect();
      const streak = quiz.sessionStats.streak;
      if (streak >= 3) {
        sound.playStreak(streak);
        confetti.fireStreak(streak);
      }
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        className="bg-gradient-magical text-white py-6 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-2"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8" />
              <h1 className="text-2xl md:text-3xl font-bold">Magic Mastery Quiz</h1>
              <Sparkles className="w-8 h-8" />
            </motion.div>
            
            <div className="flex items-center gap-2">
              {/* Practice Mode Button - Active on home page */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 cursor-default"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Practice</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  <p className="font-semibold">Practice Mode</p>
                  <p className="text-xs text-muted-foreground">Pick topics & master each level step by step</p>
                </TooltipContent>
              </Tooltip>

              {/* Adaptive Challenge Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="bg-white/10 text-white/80 hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-500 hover:text-white border-0"
                  >
                    <Link to="/adaptive" className="flex items-center gap-1">
                      <Brain className="w-4 h-4" />
                      <span className="hidden sm:inline">Adaptive</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  <p className="font-semibold">Adaptive Challenge</p>
                  <p className="text-xs text-muted-foreground">AI adjusts difficulty based on your performance</p>
                </TooltipContent>
              </Tooltip>

              {/* Olympiad Test Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="bg-white/10 text-white/80 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white border-0"
                  >
                    <Link to="/olympiad" className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      <span className="hidden sm:inline">Olympiad</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  <p className="font-semibold">Olympiad Test</p>
                  <p className="text-xs text-muted-foreground">Timed exam prep with competition-style questions</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Sound Toggle */}
              <SoundToggle enabled={sound.enabled} onToggle={sound.toggleSound} />
              
              {hasAnsweredQuestions && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={quiz.endSession}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">View Summary</span>
                </Button>
              )}
              
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {profile?.display_name || 'Student'}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={signOut}
                    className="flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
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
            Master each level (90% accuracy) with your magical friends! ✨
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

            {quiz.topic && quiz.currentQuestion && (
              <MasteryPanel
                topicName={quiz.topic}
                currentLevel={quiz.level}
                progress={quiz.getTopicProgress(quiz.topic)}
                levelStats={quiz.levelStats}
                perLevel={quiz.PER_LEVEL}
                topicLevels={quiz.getTopicLevels(quiz.topic)}
              />
            )}

            {quiz.mixedTopics && quiz.mixedTopics.length > 0 && quiz.currentQuestion && (
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
            )}

            {quiz.currentQuestion && (
              <QuizCard
                question={quiz.currentQuestion}
                level={quiz.level}
                levelStats={quiz.levelStats}
                sessionStats={quiz.sessionStats}
                onAnswer={handleAnswer}
                onNext={handleNext}
                onSolutionViewed={quiz.markSolutionViewed}
              />
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

      {/* Leaderboard */}
      <Leaderboard currentUserId={user?.id} />

      {/* Achievements Panel */}
      <AchievementsPanel 
        achievements={achievements.achievements}
        unlockedCount={achievements.getUnlockedCount()}
        totalCount={achievements.getTotalCount()}
      />

      {/* Achievement Unlocked Animation */}
      <AchievementUnlocked 
        achievement={achievements.newlyUnlocked}
        onComplete={() => {
          sound.playAchievement();
          confetti.fireAchievement();
          achievements.clearNewlyUnlocked();
        }}
      />
    </div>
  );
};

export default Index;
