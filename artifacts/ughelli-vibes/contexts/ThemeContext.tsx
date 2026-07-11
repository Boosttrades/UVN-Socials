import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The user's chosen preference — may be 'system' to follow the device setting. */
  mode: ThemeMode;
  /** The actual palette in effect right now ('light' or 'dark'), resolving 'system'. */
  resolvedScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = '@ughelli_vibes/theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, setMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
