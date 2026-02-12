import { motion } from 'framer-motion';
import { GraduationCap, ChevronRight } from 'lucide-react';

interface GradeSelectorProps {
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
  availableGrades?: number[];
}

const GRADES = [7, 8, 9, 10, 11, 12];

const GRADE_THEMES: Record<number, { emoji: string; label: string; color: string }> = {
  7: { emoji: '🌱', label: 'Foundation', color: 'from-emerald-500 to-teal-500' },
  8: { emoji: '🌿', label: 'Building Blocks', color: 'from-teal-500 to-cyan-500' },
  9: { emoji: '🔥', label: 'Pre-Board Prep', color: 'from-blue-500 to-indigo-500' },
  10: { emoji: '🎯', label: 'Board Ready', color: 'from-indigo-500 to-violet-500' },
  11: { emoji: '🚀', label: 'Advanced', color: 'from-violet-500 to-purple-500' },
  12: { emoji: '👑', label: 'Mastery', color: 'from-purple-500 to-pink-500' },
};

export const GradeSelector = ({ selectedGrade, onSelectGrade, availableGrades }: GradeSelectorProps) => {
  const grades = availableGrades || GRADES;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">Select Your Class</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {grades.map((grade, index) => {
          const theme = GRADE_THEMES[grade] || { emoji: '📚', label: '', color: 'from-gray-500 to-gray-600' };
          const isSelected = selectedGrade === grade;

          return (
            <motion.button
              key={grade}
              onClick={() => onSelectGrade(grade)}
              className={`
                relative p-3 rounded-xl text-center transition-all
                ${isSelected
                  ? `bg-gradient-to-br ${theme.color} text-white shadow-lg`
                  : 'bg-card shadow-card hover:shadow-card-hover border border-border'
                }
              `}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-1">{theme.emoji}</div>
              <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                {grade}
              </div>
              <div className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                {theme.label}
              </div>
              {isSelected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <ChevronRight className="w-3 h-3 text-primary" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
