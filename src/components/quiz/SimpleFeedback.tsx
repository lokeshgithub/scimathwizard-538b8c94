import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

interface SimpleFeedbackProps {
  message: string;
  isCorrect: boolean;
}

export const SimpleFeedback = ({ message, isCorrect }: SimpleFeedbackProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-3 p-4 rounded-xl ${
        isCorrect 
          ? 'bg-success/10 border border-success/30' 
          : 'bg-destructive/10 border border-destructive/30'
      }`}
    >
      {isCorrect ? (
        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
      )}
      <p className={`font-medium ${isCorrect ? 'text-success' : 'text-destructive'}`}>
        {message}
      </p>
    </motion.div>
  );
};
