import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'focused' | 'fun';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isFunMode: boolean;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'focused',
  setMode: () => {},
  isFunMode: false,
});

const STORAGE_KEY = 'app-learning-mode';

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'fun' ? 'fun' : 'focused';
    } catch {
      return 'focused';
    }
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch { /* ignore */ }
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, isFunMode: mode === 'fun' }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => useContext(AppModeContext);
