"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const TIMER_STORAGE_KEY = "health-os-exercise-timer";

interface ActiveTimer {
  exerciseType: string;
  startTime: number;
}

interface ExerciseSessionContextType {
  activeTimer: ActiveTimer | null;
  elapsed: number;
  setActiveTimer: (timer: ActiveTimer | null) => void;
}

const ExerciseSessionContext = createContext<ExerciseSessionContextType>({
  activeTimer: null,
  elapsed: 0,
  setActiveTimer: () => {},
});

export function ExerciseSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimerState] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        setActiveTimerState(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Sync localStorage on change
  const setActiveTimer = useCallback((timer: ActiveTimer | null) => {
    setActiveTimerState(timer);
    try {
      if (timer) {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
      } else {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Listen for storage changes from other tabs/components
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem(TIMER_STORAGE_KEY);
        setActiveTimerState(stored ? JSON.parse(stored) : null);
      } catch {}
    };
    window.addEventListener("storage", handler);
    // Also poll for changes from same tab (localStorage doesn't fire storage event in same tab)
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(TIMER_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        setActiveTimerState((prev) => {
          if (parsed?.startTime !== prev?.startTime || parsed?.exerciseType !== prev?.exerciseType) {
            return parsed;
          }
          return prev;
        });
      } catch {}
    }, 2000);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  // Tick elapsed
  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  return (
    <ExerciseSessionContext.Provider value={{ activeTimer, elapsed, setActiveTimer }}>
      {children}
    </ExerciseSessionContext.Provider>
  );
}

export function useExerciseSession() {
  return useContext(ExerciseSessionContext);
}
