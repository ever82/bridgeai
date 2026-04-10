export const lightTheme = {
  colors: {
    // Primary colors
    primary: '#007AFF',
    primaryDark: '#0056CC',
    primaryLight: '#4DA3FF',

    // Secondary colors
    secondary: '#5856D6',
    secondaryDark: '#3D3BB0',
    secondaryLight: '#7A79E0',

    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',

    // Neutral colors
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundTertiary: '#E5E5EA',

    // Text colors
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    textInverse: '#FFFFFF',

    // Border colors
    border: '#E5E5EA',
    borderLight: '#F2F2F7',

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.25)',
  },

  fonts: {
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      md: 18,
      lg: 20,
      xl: 24,
      '2xl': 30,
      '3xl': 36,
      '4xl': 48,
    },
    weights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },

  spacing: {
    '0': 0,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
  },

  borders: {
    none: 0,
    thin: 1,
    normal: 2,
    thick: 4,
  },
};

export const darkTheme = {
  colors: {
    // Primary colors
    primary: '#0A84FF',
    primaryDark: '#0056CC',
    primaryLight: '#4DA3FF',

    // Secondary colors
    secondary: '#5856D6',
    secondaryDark: '#3D3BB0',
    secondaryLight: '#7A79E0',

    // Semantic colors
    success: '#32D74B',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',

    // Neutral colors
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    textInverse: '#000000',

    // Border colors
    border: '#38383A',
    borderLight: '#2C2C2E',

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.75)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },

  fonts: lightTheme.fonts,
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  shadows: lightTheme.shadows,
  borders: lightTheme.borders,
};

export type Theme = typeof lightTheme;

// Default theme export (light)
export const theme = lightTheme;

// Design tokens for easy access
export const tokens = {
  colors: lightTheme.colors,
  fonts: lightTheme.fonts,
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  shadows: lightTheme.shadows,
  borders: lightTheme.borders,
};

// Theme helper functions
export const createTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
