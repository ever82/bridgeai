import { useThemeStore } from '../stores/themeStore';

const defaultTheme = {
  colors: {
    text: '#000000',
    textSecondary: '#666666',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    border: '#E0E0E0',
    primary: '#2196F3',
    disabled: '#BDBDBD',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
  },
};

export const useTheme = () => {
  const { isDarkMode } = useThemeStore();
  return {
    theme: defaultTheme,
    isDarkMode,
  };
};
