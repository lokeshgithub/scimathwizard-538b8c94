import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Trophy, Target, ChevronRight, ChevronLeft, X, BarChart3, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_COMPLETE_KEY = 'magic-mastery-onboarding-complete';

interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="subject-tabs"]',
    title: 'Pick Your Subject',
    description: 'Start by choosing Math, Physics, or Chemistry. Each subject has topics organized by your grade level.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="topic-grid"]',
    title: 'Choose a Topic',
    description: 'Tap any topic to see its levels. Each topic has 4-7 levels of increasing difficulty — master them one by one!',
    icon: <Target className="w-5 h-5" />,
    position: 'top',
  },
  {
    targetSelector: '[data-tour="stats-bar"]',
    title: 'Track Your Stars ⭐',
    description: 'Earn stars for every correct answer! Streaks multiply your rewards. Spend stars in the Star Shop for fun rewards.',
    icon: <Star className="w-5 h-5" />,
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="daily-goals"]',
    title: 'Stay Consistent',
    description: 'Hit your daily goal of 20 questions to build streaks. Consistency beats cramming — even 10 minutes a day adds up!',
    icon: <Trophy className="w-5 h-5" />,
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="nav-adaptive"], a[href="/adaptive"]',
    title: 'Skill Assessment',
    description: 'Test your skills with AI-powered adaptive quizzes that adjust difficulty in real-time. Get a score out of 100!',
    icon: <Brain className="w-5 h-5" />,
    position: 'top',
  },
  {
    targetSelector: '[data-tour="nav-report"], a[href="/report"]',
    title: 'Performance Reports',
    description: 'View detailed breakdowns of your accuracy, speed, strengths, and weaknesses across all sessions. Download PDF reports!',
    icon: <BarChart3 className="w-5 h-5" />,
    position: 'top',
  },
];

export const OnboardingTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    const welcomeSeen = localStorage.getItem('magic-mastery-welcome-seen');
    
    // Only show tour after welcome modal has been seen and tour not completed
    if (welcomeSeen && !hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const positionTooltip = useCallback(() => {
    const step = tourSteps[currentStep];
    // Support comma-separated selectors (fallback)
    const selectors = step.targetSelector.split(',').map(s => s.trim());
    let target: Element | null = null;
    for (const sel of selectors) {
      target = document.querySelector(sel);
      if (target) break;
    }
    
    if (!target) {
      // If target not found, skip to next step or finish
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    setHighlightRect(rect);

    // Scroll element into view if needed
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Position tooltip based on step config
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + padding;
        left = Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
        break;
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (isActive) {
      // Small delay to let DOM settle
      const timer = setTimeout(positionTooltip, 200);
      window.addEventListener('resize', positionTooltip);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', positionTooltip);
      };
    }
  }, [isActive, currentStep, positionTooltip]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsActive(false);
  }, []);

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay with spotlight cutout */}
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={handleComplete} />

            {/* Spotlight highlight on target element */}
            {highlightRect && (
              <motion.div
                className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  top: highlightRect.top - 6,
                  left: highlightRect.left - 6,
                  width: highlightRect.width + 12,
                  height: highlightRect.height + 12,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px 4px hsl(var(--primary) / 0.4)',
                }}
              />
            )}
          </motion.div>

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            className="fixed z-[70] w-80"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, top: tooltipPos.top, left: tooltipPos.left }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Step header */}
              <div className="bg-gradient-magical p-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-bold text-lg">{step.title}</h3>
                  </div>
                  <button
                    onClick={handleComplete}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Skip tour"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step body */}
              <div className="p-4">
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  {/* Step dots */}
                  <div className="flex items-center gap-1.5">
                    {tourSteps.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentStep
                            ? 'bg-primary w-5'
                            : i < currentStep
                              ? 'bg-primary/50'
                              : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {currentStep > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrev}
                        className="text-muted-foreground"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="bg-gradient-magical text-primary-foreground hover:opacity-90"
                    >
                      {currentStep < tourSteps.length - 1 ? (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Start Learning!
                          <Sparkles className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook to reset onboarding (for testing)
export const useResetOnboarding = () => {
  return () => {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    localStorage.removeItem('magic-mastery-welcome-seen');
  };
};
