import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LastSessionData {
  subject: string;
  topic: string;
  level: number;
  timestamp: number;
}

interface ContinueSessionProps {
  currentSubject: string;
  onContinue: (topic: string) => void;
  getTopicProgress: (topic: string) => { percentage: number; currentLevel: number; maxLevel: number };
}

const formatTopicName = (name: string) => {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return 'Over a week ago';
};

export const ContinueSession = ({ currentSubject, onContinue, getTopicProgress }: ContinueSessionProps) => {
  const [lastSession, setLastSession] = useState<LastSessionData | null>(null);

  useEffect(() => {
    try {
      // Use subject-specific key as the single source of truth
      const subjectKey = `last-session-${currentSubject}`;
      const stored = localStorage.getItem(subjectKey);

      if (stored) {
        const data: LastSessionData = JSON.parse(stored);
        // Only show if not too old (7 days)
        const isRecent = Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000;
        if (isRecent) {
          setLastSession(data);
        } else {
          setLastSession(null);
          // Clean up old session
          localStorage.removeItem(subjectKey);
        }
      } else {
        setLastSession(null);
      }
    } catch (e) {
      console.error('Failed to load last session:', e);
      setLastSession(null);
    }
  }, [currentSubject]);

  if (!lastSession) return null;

  const progress = getTopicProgress(lastSession.topic);
  
  // Don't show if topic is complete
  if (progress.percentage >= 100) return null;

  const handleContinue = () => {
    onContinue(lastSession.topic);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Button
        onClick={handleContinue}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg group"
        size="lg"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="text-left">
              <div className="font-semibold flex items-center gap-2">
                Continue Learning
                <span className="text-xs opacity-75 font-normal">
                  {getTimeAgo(lastSession.timestamp)}
                </span>
              </div>
              <div className="text-sm opacity-90 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {formatTopicName(lastSession.topic)} • Level {progress.currentLevel}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </Button>
    </motion.div>
  );
};

// Helper function to save last session - call this when starting a topic
// Uses single subject-specific key to avoid data divergence
export const saveLastSession = (subject: string, topic: string, level: number) => {
  try {
    const data: LastSessionData = {
      subject,
      topic,
      level,
      timestamp: Date.now(),
    };
    // Use only subject-specific key as single source of truth
    localStorage.setItem(`last-session-${subject}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save last session:', e);
  }
};
