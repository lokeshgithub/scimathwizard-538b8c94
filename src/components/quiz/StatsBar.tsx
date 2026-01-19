import { motion } from 'framer-motion';
import { SessionStats } from '@/types/quiz';
import { Zap, Target, Flame, Trophy, Sparkles } from 'lucide-react';

interface StatsBarProps {
  stats: SessionStats;
}

export const StatsBar = ({ stats }: StatsBarProps) => {
  const accuracy = stats.solved > 0 
    ? Math.round((stats.correct / stats.solved) * 100) 
    : 0;

  const statItems = [
    { 
      icon: Zap, 
      value: stats.solved, 
      label: 'Solved', 
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    { 
      icon: Target, 
      value: `${accuracy}%`, 
      label: 'Accuracy', 
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    { 
      icon: Flame, 
      value: stats.streak, 
      label: 'Streak', 
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    { 
      icon: Trophy, 
      value: stats.mastered, 
      label: 'Mastered', 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
  ];

  return (
    <div className="mb-6">
      {/* XP Bar */}
      <motion.div 
        className="bg-card rounded-xl p-4 mb-4 shadow-card"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-gold rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-foreground">Magic XP</span>
              <span className="text-sm font-bold text-gradient-gold">{stats.xp} XP</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-gold"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp % 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Level {Math.floor(stats.xp / 100) + 1} Wizard 🧙
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            className="bg-card rounded-xl p-4 shadow-card text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className={`inline-flex p-2 rounded-lg ${item.bgColor} mb-2`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
