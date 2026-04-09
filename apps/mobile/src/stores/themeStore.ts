import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  // State
  isDarkMode: boolean;
  fontScale: number;
  useSystemTheme: boolean;

  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  setFontScale: (scale: number) => void;
  setUseSystemTheme: (value: boolean) => void;
  resetTheme: () => void;
}

const initialState = {
  isDarkMode: false,
  fontScale: 1,
  useSystemTheme: true,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      setDarkMode: (value) => set({ isDarkMode: value }),

      setFontScale: (scale) => set({ fontScale: Math.max(0.8, Math.min(1.5, scale)) }),

      setUseSystemTheme: (value) => set({ useSystemTheme: value }),

      resetTheme: () => set(initialState),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
