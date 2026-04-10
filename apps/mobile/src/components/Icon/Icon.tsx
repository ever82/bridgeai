import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

export type IconName =
  // Navigation
  | 'home' | 'back' | 'forward' | 'menu' | 'close' | 'search' | 'settings'
  // Actions
  | 'add' | 'edit' | 'delete' | 'check' | 'clear' | 'refresh' | 'share'
  // Status
  | 'success' | 'warning' | 'error' | 'info' | 'loading'
  // Content
  | 'user' | 'email' | 'phone' | 'lock' | 'star' | 'heart' | 'bookmark';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// Unicode symbols for icons (cross-platform compatible)
const iconSymbols: Record<IconName, string> = {
  // Navigation
  home: '⌂',
  back: '‹',
  forward: '›',
  menu: '☰',
  close: '×',
  search: '🔍',
  settings: '⚙',
  // Actions
  add: '+',
  edit: '✎',
  delete: '🗑',
  check: '✓',
  clear: '✕',
  refresh: '↻',
  share: '⇪',
  // Status
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
  loading: '◐',
  // Content
  user: '👤',
  email: '✉',
  phone: '📞',
  lock: '🔒',
  star: '★',
  heart: '♥',
  bookmark: '🔖',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = theme.colors.text,
  style,
}) => {
  const symbol = iconSymbols[name] || '?';

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text
        style={[
          styles.icon,
          {
            fontSize: size,
            color,
            lineHeight: size,
          },
        ]}
      >
        {symbol}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});

export default Icon;
