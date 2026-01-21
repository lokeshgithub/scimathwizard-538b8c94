import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { useQuizStore } from '@/hooks/useQuizStore';
import { StatsBar } from '@/components/quiz/StatsBar';
import { SubjectTabs } from '@/components/quiz/SubjectTabs';
import { TopicGrid } from '@/components/quiz/TopicGrid';
import { MasteryPanel } from '@/components/quiz/MasteryPanel';
import { QuizCard } from '@/components/quiz/QuizCard';
import { WelcomeScreen } from '@/components/quiz/WelcomeScreen';
import { LevelCompleteModal } from '@/components/quiz/LevelCompleteModal';

const Index = () => {
  const quiz = useQuizStore();
  const [showModal, setShowModal] = useState(false);
  const [modalPassed, setModalPassed] = useState(false);

  const handleAnswer = useCallback((selectedIndex: number) => {
    const result = quiz.answerQuestion(selectedIndex);
    return result;
  }, [quiz]);

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
      if (quiz.level < quiz.MAX_LEVEL) {
        quiz.advanceLevel();
      } else {
        // Topic complete - go back to topic selection
        quiz.selectTopic(quiz.topic!);
      }
    } else {
      quiz.retryLevel();
    }
  }, [modalPassed, quiz]);

  const topics = quiz.banks[quiz.subject] || {};
  const hasTopics = Object.keys(topics).length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        className="bg-gradient-magical text-white py-6 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="inline-flex items-center gap-2 mb-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8" />
            <h1 className="text-2xl md:text-3xl font-bold">Magic Mastery Quiz</h1>
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <p className="text-white/80 text-sm">
            Master each level (80% accuracy) with your magical friends! ✨
          </p>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
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
            <TopicGrid 
              topics={topics}
              currentTopic={quiz.topic}
              getProgress={quiz.getTopicProgress}
              onSelectTopic={quiz.selectTopic}
              onStartMixedQuiz={quiz.startMixedQuiz}
              isMixedMode={quiz.mixedTopics !== null && quiz.mixedTopics.length > 0}
            />

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

            {quiz.topic && (
              <MasteryPanel
                topicName={quiz.topic}
                currentLevel={quiz.level}
                progress={quiz.getTopicProgress(quiz.topic)}
                levelStats={quiz.levelStats}
                perLevel={quiz.PER_LEVEL}
              />
            )}

            {quiz.mixedTopics && quiz.mixedTopics.length > 0 && (
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

            {quiz.currentQuestion ? (
              <QuizCard
                question={quiz.currentQuestion}
                level={quiz.level}
                levelStats={quiz.levelStats}
                sessionStats={quiz.sessionStats}
                onAnswer={handleAnswer}
                onNext={handleNext}
                onSolutionViewed={quiz.markSolutionViewed}
              />
            ) : (
              <WelcomeScreen />
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
    </div>
  );
};

export default Index;
