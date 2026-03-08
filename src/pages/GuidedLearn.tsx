import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  ArrowLeft, BookOpen, Loader2, RefreshCw, Sparkles,
  Brain, AlertCircle, ChevronUp, Play, GraduationCap,
  Lightbulb, CheckCircle2, XCircle, Target, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { streamLesson, fetchCachedLesson, cacheLessonInDB, type LessonRequest } from '@/services/lessonService';
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

/** Detect visual aid type from blockquote text */
function getBlockquoteType(text: string): 'formula' | 'key-idea' | 'wrong' | 'correct' | 'answer' | 'normal' {
  if (text.includes('📐') && text.includes('Formula')) return 'formula';
  if (text.includes('🔑') && text.includes('Key Idea')) return 'key-idea';
  if (text.includes('❌') && text.includes('Wrong')) return 'wrong';
  if (text.includes('✅') && text.includes('Correct')) return 'correct';
  if (text.includes('🎯') && text.includes('Answer')) return 'answer';
  return 'normal';
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as any).props.children);
  }
  return '';
}

/** Custom markdown components for visual aids */
function useVisualAidComponents(): Components {
  return useMemo<Components>(() => ({
    blockquote: ({ children, ...props }) => {
      const text = extractText(children);
      const type = getBlockquoteType(text);

      const styles: Record<string, string> = {
        'formula': 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-4 border-primary rounded-xl p-4 my-4 shadow-sm',
        'key-idea': 'bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border-l-4 border-accent rounded-xl p-4 my-4 shadow-sm',
        'wrong': 'bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent border-l-4 border-destructive rounded-xl p-4 my-3',
        'correct': 'bg-gradient-to-r from-success/10 via-success/5 to-transparent border-l-4 border-success rounded-xl p-4 my-3',
        'answer': 'bg-gradient-to-r from-success/15 via-success/5 to-transparent border-l-4 border-success rounded-xl p-4 my-4 shadow-md ring-1 ring-success/20',
        'normal': 'border-l-4 border-muted-foreground/30 bg-muted/30 rounded-xl p-4 my-3',
      };

      return (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={styles[type]}
        >
          <blockquote className="[&>p]:m-0 [&>p]:leading-relaxed" {...props}>
            {children}
          </blockquote>
        </motion.div>
      );
    },

    // Render ```diagram blocks as visual diagram cards
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      if (lang === 'diagram') {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-5 rounded-2xl bg-card border-2 border-dashed border-primary/30 p-5 overflow-x-auto shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Diagram</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre m-0 bg-transparent border-0 p-0">
              {children}
            </pre>
          </motion.div>
        );
      }

      // Regular code blocks
      return (
        <code className={`${className || ''} bg-muted px-1.5 py-0.5 rounded text-sm`} {...props}>
          {children}
        </code>
      );
    },

    // Enhanced tables
    table: ({ children, ...props }) => (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-5 rounded-xl border border-border overflow-hidden shadow-sm"
      >
        <table className="w-full text-sm" {...props}>{children}</table>
      </motion.div>
    ),
    thead: ({ children }) => (
      <thead className="bg-primary/10">{children}</thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-4 py-2.5 text-left font-bold text-foreground text-xs uppercase tracking-wider border-b border-border" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-2.5 border-b border-border/50 text-foreground/90" {...props}>
        {children}
      </td>
    ),

    // Step-by-step detection in paragraphs
    p: ({ children, ...props }) => {
      const text = extractText(children);
      const stepMatch = text.match(/^\*?\*?Step\s+(\d+)\s*→\*?\*?\s*/);

      if (stepMatch) {
        const stepNum = stepMatch[1];
        return (
          <div className="flex gap-3 items-start my-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-primary-foreground">{stepNum}</span>
            </div>
            <p className="flex-1 pt-1 text-foreground/90 leading-relaxed" {...props}>
              {children}
            </p>
          </div>
        );
      }

      return <p className="leading-relaxed" {...props}>{children}</p>;
    },

    // Enhanced strong for step markers
    strong: ({ children, ...props }) => {
      const text = extractText(children);
      if (text.match(/^Step\s+\d+\s*→/)) {
        return <strong className="text-primary font-bold" {...props}>{children}</strong>;
      }
      return <strong {...props}>{children}</strong>;
    },
  }), []);
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
  const [highlightedText, setHighlightedText] = useState('');
  const [selectionPopup, setSelectionPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  const markdownComponents = useVisualAidComponents();

  // Hide bottom nav during learning
  useEffect(() => {
    setIsInQuizMode(true);
    return () => setIsInQuizMode(false);
  }, [setIsInQuizMode]);

  const generateLesson = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLessonMarkdown('');
    setError(null);
    setIsStreaming(true);
    setActiveSection(0);
    startTimeRef.current = Date.now();

    // 1. Check DB for cached lesson first
    try {
      const cached = await fetchCachedLesson(topic || '', subject, grade, level);
      if (cached) {
        setLessonMarkdown(cached);
        setIsStreaming(false);
        haptics.success();
        return;
      }
    } catch { /* fall through to AI generation */ }

    // 2. No cached lesson — generate via AI
    const request: LessonRequest = {
      topic: topic || '',
      subject,
      grade,
      level,
    };

    // Try to get wrong questions from sessionStorage
    try {
      const stored = sessionStorage.getItem('learn-wrong-questions');
      if (stored) {
        request.wrongQuestions = JSON.parse(stored);
        sessionStorage.removeItem('learn-wrong-questions');
      }
    } catch { /* ignore */ }

    let fullContent = '';

    streamLesson({
      request,
      onDelta: (text) => {
        fullContent += text;
        setLessonMarkdown((prev) => prev + text);
      },
      onDone: () => {
        setIsStreaming(false);
        haptics.success();
        // 3. Cache the generated lesson in DB for future students
        if (fullContent.length > 200) {
          cacheLessonInDB(topic || '', subject, grade, level, fullContent);
        }
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

  // Text selection detection for "Ask about this"
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      
      if (text.length > 5 && text.length < 500 && contentRef.current) {
        const anchorNode = selection?.anchorNode;
        if (anchorNode && contentRef.current.contains(anchorNode)) {
          const range = selection!.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionPopup({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        } else {
          setSelectionPopup(null);
        }
      } else {
        setSelectionPopup(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    const dismissPopup = () => setSelectionPopup(null);
    window.addEventListener('scroll', dismissPopup, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', dismissPopup);
    };
  }, []);

  const handleAskAboutSelection = useCallback(() => {
    if (selectionPopup) {
      setHighlightedText(selectionPopup.text);
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
      haptics.light();
    }
  }, [selectionPopup]);

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
                <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
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
                components={markdownComponents}
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

      {/* Selection popup - "Ask about this" */}
      <AnimatePresence>
        {selectionPopup && (
          <motion.button
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleAskAboutSelection}
            className="fixed z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-xl text-xs font-semibold hover:bg-primary/90 transition-colors"
            style={{
              left: Math.min(Math.max(selectionPopup.x - 70, 16), window.innerWidth - 156),
              top: Math.max(selectionPopup.y + window.scrollY - 44, 8),
              position: 'absolute',
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask tutor about this
          </motion.button>
        )}
      </AnimatePresence>

      {/* AI Tutor Chat */}
      {!isStreaming && lessonMarkdown && (
        <TutorChat
          topic={topic || ''}
          subject={subject}
          grade={grade}
          lessonContext={lessonMarkdown}
          highlightedText={highlightedText}
          onHighlightConsumed={() => setHighlightedText('')}
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
