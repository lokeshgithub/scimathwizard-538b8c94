import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Target, Loader2, AlertTriangle, TrendingUp, 
  Clock, Zap, Play, CheckCircle, BookOpen, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeakTopics, type WeakTopic } from '@/services/adaptiveResultsService';
import { useAuth } from '@/hooks/useAuth';
import { useQuizStore } from '@/hooks/useQuizStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useConfetti } from '@/hooks/useConfetti';
import { QuizCard } from '@/components/quiz/QuizCard';
import { SoundToggle } from '@/components/quiz/SoundToggle';
import { MasteryPanel } from '@/components/quiz/MasteryPanel';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Subject } from '@/types/quiz';

const formatTopicName = (name: string) => {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const formatSubjectName = (subject: string) => {
  const names: Record<string, string> = {
    math: 'Mathematics',
    physics: 'Physics',
    chemistry: 'Chemistry',
  };
  return names[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);
};

export default function FocusedPractice() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const quiz = useQuizStore();
  const sound = useSoundEffects();
  const confetti = useConfetti();
  
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<WeakTopic | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const fetchWeakTopics = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const { data, error } = await getWeakTopics();
      
      if (error) {
        setError(error);
      } else {
        setWeakTopics(data || []);
      }
      setIsLoading(false);
    };

    if (!authLoading) {
      fetchWeakTopics();
    }
  }, [user, authLoading]);

  const startPractice = useCallback((topic: WeakTopic) => {
    setSelectedTopic(topic);
    setIsPracticing(true);
    setPracticeStats({ correct: 0, total: 0 });
    setAnswered(false);
    setLastResult(null);
    
    // Select the topic in quiz store
    quiz.setSubject(topic.subject);
    setTimeout(() => {
      quiz.selectTopic(topic.topicName);
    }, 100);
  }, [quiz]);

  const handleAnswer = useCallback(async (selectedIndex: number) => {
    if (answered) return;
    
    const result = await quiz.answerQuestion(selectedIndex);
    setAnswered(true);
    setLastResult({ isCorrect: result.isCorrect, correctIndex: result.correctIndex });
    
    if (result.isCorrect) {
      sound.playCorrect();
      setPracticeStats(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
      if (practiceStats.correct > 0 && (practiceStats.correct + 1) % 3 === 0) {
        confetti.fireLevelUp(true);
      }
    } else {
      sound.playIncorrect();
      setPracticeStats(prev => ({ ...prev, total: prev.total + 1 }));
    }
    
    return result;
  }, [answered, quiz, sound, confetti, practiceStats.correct]);

  const handleNext = useCallback(() => {
    setAnswered(false);
    setLastResult(null);
    
    const masteryResult = quiz.checkMastery();
    if (masteryResult === 'passed') {
      confetti.fireLevelUp(true);
      quiz.advanceLevel();
    } else if (masteryResult === 'failed') {
      quiz.retryLevel();
    }
    
    quiz.nextQuestion();
  }, [quiz, confetti]);

  const endPractice = useCallback(() => {
    setIsPracticing(false);
    setSelectedTopic(null);
    setAnswered(false);
    setLastResult(null);
    // Refresh weak topics to see if improvement was made
    if (user) {
      getWeakTopics().then(result => {
        if (result.data) setWeakTopics(result.data);
      });
    }
  }, [user]);

  const getImprovementColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-success bg-success/10';
    }
  };

  const getImprovementIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'low': return <TrendingUp className="w-4 h-4" />;
    }
  };

  if (authLoading || isLoading || quiz.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Focused practice uses your adaptive challenge history to identify weak areas.
          </p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.currentQuestion;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/adaptive">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Focused Practice
              </h1>
              <p className="text-sm opacity-80">Target your weak spots</p>
            </div>
          </div>
          <SoundToggle enabled={sound.enabled} onToggle={sound.toggleSound} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {!isPracticing ? (
            /* Topic Selection */
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl">
                  {error}
                </div>
              )}

              {weakTopics.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-foreground mb-2">Great Job!</h2>
                  <p className="text-muted-foreground mb-6">
                    No weak topics found. Complete more adaptive challenges to get personalized recommendations.
                  </p>
                  <Link to="/adaptive">
                    <Button>Take an Adaptive Challenge</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span>Based on your adaptive challenge performance, focus on these topics:</span>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {weakTopics.map((topic, index) => (
                      <motion.div
                        key={`${topic.subject}-${topic.topicName}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card rounded-xl p-4 shadow-card border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getImprovementColor(topic.improvementNeeded)}`}>
                                {getImprovementIcon(topic.improvementNeeded)}
                              </span>
                              <h3 className="font-semibold text-foreground">
                                {formatTopicName(topic.topicName)}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                              <span className="bg-muted px-2 py-0.5 rounded text-xs">
                                {formatSubjectName(topic.subject)}
                              </span>
                              <span>Level {topic.highestLevel}</span>
                              <span>{topic.questionsAttempted} questions attempted</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-muted-foreground" />
                                <span className={topic.accuracy < 50 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                  {topic.accuracy}% accuracy
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {topic.averageTime}s avg
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Last practiced {formatDistanceToNow(parseISO(topic.lastPracticed), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => startPractice(topic)}
                            className="shrink-0"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Practice
                          </Button>
                        </div>
                        
                        {/* Accuracy bar */}
                        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              topic.accuracy < 40 ? 'bg-destructive' :
                              topic.accuracy < 60 ? 'bg-warning' : 'bg-success'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.accuracy}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            /* Practice Mode */
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Practice Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {formatTopicName(selectedTopic?.topicName || '')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatSubjectName(selectedTopic?.subject || '')} • Starting accuracy: {selectedTopic?.accuracy}%
                  </p>
                </div>
                <Button variant="outline" onClick={endPractice}>
                  End Practice
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 text-center shadow-card">
                  <div className="text-2xl font-bold text-foreground">{practiceStats.total}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <div className="bg-card rounded-xl p-3 text-center shadow-card">
                  <div className="text-2xl font-bold text-success">{practiceStats.correct}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="bg-card rounded-xl p-3 text-center shadow-card">
                  <div className="text-2xl font-bold text-foreground">
                    {practiceStats.total > 0 ? Math.round((practiceStats.correct / practiceStats.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              </div>

              {/* Mastery Panel */}
              {quiz.topic && (
                <MasteryPanel
                  topicName={quiz.topic}
                  currentLevel={quiz.level}
                  progress={quiz.getTopicProgress(quiz.topic)}
                  levelStats={quiz.levelStats}
                  perLevel={5}
                  topicLevels={quiz.getTopicLevels(quiz.topic)}
                />
              )}

              {/* Quiz Card */}
              {currentQuestion ? (
                <QuizCard
                  question={currentQuestion}
                  level={quiz.level}
                  levelStats={quiz.levelStats}
                  sessionStats={quiz.sessionStats}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  onSolutionViewed={quiz.markSolutionViewed}
                />
              ) : (
                <div className="bg-card rounded-xl p-8 text-center shadow-card">
                  <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No more questions available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You've answered all questions for this topic at the current level.
                  </p>
                  <Button onClick={endPractice}>Back to Topics</Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
