import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  ArrowLeft, BookOpen, Loader2, RefreshCw, Sparkles,
  Brain, AlertCircle, ChevronUp, Play, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { streamLesson, type LessonRequest } from '@/services/lessonService';
import { TutorChat } from '@/components/learn/TutorChat';
import { useQuizMode } from '@/contexts/QuizModeContext';
import { haptics } from '@/utils/haptics';

const formatTopicName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

const SECTION_ICONS: Record<string, string> = {
  '🧠': '🧠',
  '🔍': '🔍',
  '⚠️': '⚠️',
  '💡': '💡',
  '🎯': '🎯',
};

const SECTION_COLORS: Record<string, string> = {
  '🧠': 'from-primary/10 to-primary/5 border-primary/20',
  '🔍': 'from-secondary/10 to-secondary/5 border-secondary/20',
  '⚠️': 'from-destructive/10 to-destructive/5 border-destructive/20',
  '💡': 'from-accent/10 to-accent/5 border-accent/20',
  '🎯': 'from-success/10 to-success/5 border-success/20',
};

/** Split streamed markdown into sections by ## headers */
function parseSections(markdown: string) {
  const sections: Array<{ emoji: string; title: string; content: string }> = [];
  const lines = markdown.split('\n');
  let current: { emoji: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+([\p{Emoji}])\s+(.+)$/u);
    if (headerMatch) {
      if (current) {
        sections.push({ emoji: current.emoji, title: current.title, content: current.lines.join('\n').trim() });
      }
      current = { emoji: headerMatch[1], title: headerMatch[2], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    sections.push({ emoji: current.emoji, title: current.title, content: current.lines.join('\n').trim() });
  }

  return sections;
}

export default function GuidedLearn() {
  const { topic } = useParams<{ topic: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setIsInQuizMode } = useQuizMode();

  const subject = searchParams.get('subject') || 'math';
  const grade = Number(searchParams.get('grade')) || 7;
  const level = Number(searchParams.get('level')) || 1;

  const [lessonMarkdown, setLessonMarkdown] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  // Hide bottom nav during learning
  useEffect(() => {
    setIsInQuizMode(true);
    return () => setIsInQuizMode(false);
  }, [setIsInQuizMode]);

  const generateLesson = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLessonMarkdown('');
    setError(null);
    setIsStreaming(true);
    setActiveSection(0);
    startTimeRef.current = Date.now();

    const request: LessonRequest = {
      topic: topic || '',
      subject,
      grade,
      level,
    };

    // Try to get wrong questions from sessionStorage (set by entry points)
    try {
      const stored = sessionStorage.getItem('learn-wrong-questions');
      if (stored) {
        request.wrongQuestions = JSON.parse(stored);
        sessionStorage.removeItem('learn-wrong-questions');
      }
    } catch { /* ignore */ }

    streamLesson({
      request,
      onDelta: (text) => {
        setLessonMarkdown((prev) => prev + text);
      },
      onDone: () => {
        setIsStreaming(false);
        haptics.success();
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
      },
      signal: controller.signal,
    });
  }, [topic, subject, grade, level]);

  useEffect(() => {
    generateLesson();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [generateLesson]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = parseSections(lessonMarkdown);
  const progress = isStreaming
    ? Math.min(90, (lessonMarkdown.length / 3000) * 100)
    : lessonMarkdown.length > 0
    ? 100
    : 0;

  const topicDisplay = formatTopicName(topic || '');

  return (
    <div className="min-h-screen bg-background">
      {/* KaTeX CSS */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
        crossOrigin="anonymous"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-foreground truncate">
                  {topicDisplay}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Guided Learning • Level {level}
              </p>
            </div>

            {!isStreaming && lessonMarkdown && (
              <Button
                variant="outline"
                size="sm"
                onClick={generateLesson}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2"
            >
              <Progress value={progress} className="h-1" />
            </motion.div>
          )}

          {/* Section nav pills */}
          {sections.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-1"
            >
              {sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    haptics.light();
                    setActiveSection(i);
                    const el = document.getElementById(`section-${i}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeSection === i
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Main content */}
      <main ref={contentRef} className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Loading state */}
        {isStreaming && !lessonMarkdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg"
            >
              <Brain className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Preparing your lesson...
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Our AI tutor is creating a personalized lesson on{' '}
              <strong>{topicDisplay}</strong> just for you
            </p>
            <motion.div
              className="flex gap-1 mt-4"
              initial="hidden"
              animate="visible"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="font-bold text-foreground mb-2">
              Couldn't generate the lesson
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">{error}</p>
            <Button onClick={generateLesson} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Lesson content - rendered as sections */}
        {sections.length > 0 ? (
          <div className="space-y-6">
            {sections.map((section, i) => (
              <motion.section
                key={i}
                id={`section-${i}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border bg-gradient-to-br p-5 sm:p-6 ${
                  SECTION_COLORS[section.emoji] || 'from-muted/30 to-muted/10 border-border'
                }`}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{section.emoji}</span>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {section.title}
                  </h2>
                </div>

                {/* Markdown content */}
                <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              </motion.section>
            ))}

            {/* Streaming indicator at bottom */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 py-4 text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Writing more...</span>
              </motion.div>
            )}
          </div>
        ) : (
          /* Fallback: render raw markdown while sections haven't been parsed yet */
          lessonMarkdown && !sections.length && (
            <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {lessonMarkdown}
              </ReactMarkdown>
            </div>
          )
        )}

        {/* Bottom CTA - after lesson is done */}
        {!isStreaming && lessonMarkdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-card rounded-2xl border border-border p-6 text-center shadow-sm"
          >
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">
              Ready to put this into practice?
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              You've learned the key concepts. Now let's see how much you've
              improved — try the quiz again!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate(`/?startTopic=${topic}&level=${level}&subject=${subject}`)}
                className="gap-2"
                size="lg"
              >
                <Play className="w-4 h-4" />
                Practice {topicDisplay}
              </Button>
              <Button
                variant="outline"
                onClick={generateLesson}
                className="gap-2"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Lesson
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      {/* AI Tutor Chat */}
      {!isStreaming && lessonMarkdown && (
        <TutorChat
          topic={topic || ''}
          subject={subject}
          grade={grade}
          lessonContext={lessonMarkdown}
        />
      )}

      {/* Scroll to top FAB */}
      <AnimatePresence>
        {showScrollTop && !isStreaming && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-lg flex items-center justify-center hover:bg-muted/80 transition-colors border border-border"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
