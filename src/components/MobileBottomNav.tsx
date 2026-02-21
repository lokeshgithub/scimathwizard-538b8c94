import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Brain, BarChart3, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuizMode } from '@/contexts/QuizModeContext';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/adaptive', icon: Brain, label: 'Quiz' },
  { path: '/report', icon: BarChart3, label: 'Report' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const MobileBottomNav = () => {
  const isMobile = useIsMobile();
  const { isInQuizMode } = useQuizMode();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {!isInQuizMode && (
        <motion.nav
          initial={{ y: 56 }}
          animate={{ y: 0 }}
          exit={{ y: 56 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom"
        >
          <div className="flex items-center justify-around h-14">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};
