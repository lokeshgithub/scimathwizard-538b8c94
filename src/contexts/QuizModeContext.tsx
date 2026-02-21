import { createContext, useContext, useState, type ReactNode } from 'react';

interface QuizModeContextType {
  isInQuizMode: boolean;
  setIsInQuizMode: (value: boolean) => void;
}

const QuizModeContext = createContext<QuizModeContextType>({
  isInQuizMode: false,
  setIsInQuizMode: () => {},
});

export const useQuizMode = () => useContext(QuizModeContext);

export const QuizModeProvider = ({ children }: { children: ReactNode }) => {
  const [isInQuizMode, setIsInQuizMode] = useState(false);

  return (
    <QuizModeContext.Provider value={{ isInQuizMode, setIsInQuizMode }}>
      {children}
    </QuizModeContext.Provider>
  );
};
