import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BarChart3 } from 'lucide-react';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useAchievements } from '@/hooks/useAchievements';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
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
import { Button } from '@/components/ui/button';

const Index = () => {
  const quiz = useQuizStore();
  const achievements = useAchievements();
  const dailyChallenge = useDailyChallenge(quiz.banks);
  const [showModal, setShowModal] = useState(false);
  const [modalPassed, setModalPassed] = useState(false);
  const [lastAnswerTime, setLastAnswerTime] = useState<number>(0);
  const [wasRetrying, setWasRetrying] = useState(false);

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
    
    // Record for achievements
    const timeSpent = result.timeSpent || 0;
    setLastAnswerTime(timeSpent);
    achievements.recordAnswer(
      result.isCorrect, 
      timeSpent, 
      result.isCorrect ? quiz.sessionStats.streak : 0
    );
    
    return result;
  }, [quiz, achievements]);

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
  }, [modalPassed, quiz, achievements, wasRetrying]);

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
            
            {hasAnsweredQuestions && (
              <Button
                variant="secondary"
                size="sm"
                onClick={quiz.endSession}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                View Summary
              </Button>
            )}
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
              <TopicDashboard 
                topics={topics}
                currentTopic={quiz.topic}
                getProgress={quiz.getTopicProgress}
                onSelectTopic={quiz.selectTopic}
                onStartMixedQuiz={quiz.startMixedQuiz}
                getTopicLevels={quiz.getTopicLevels}
                isAdmin={false}
                currentSubject={quiz.subject}
              />
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

      {/* Achievements Panel */}
      <AchievementsPanel 
        achievements={achievements.achievements}
        unlockedCount={achievements.getUnlockedCount()}
        totalCount={achievements.getTotalCount()}
      />

      {/* Achievement Unlocked Animation */}
      <AchievementUnlocked 
        achievement={achievements.newlyUnlocked}
        onComplete={achievements.clearNewlyUnlocked}
      />
    </div>
  );
};

export default Index;
