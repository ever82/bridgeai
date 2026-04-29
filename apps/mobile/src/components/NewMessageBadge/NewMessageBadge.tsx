import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import { theme } from '../../theme';

export interface NewMessageBadgeProps {
  count: number;
  onPress: () => void;
  testID?: string;
}

export const NewMessageBadge: React.FC<NewMessageBadgeProps> = ({ count, onPress, testID }) => {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (count <= 0) {
    return null;
  }

  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.badge}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${count} new messages`}
      accessibilityHint="Scroll to new messages"
    >
      <Text style={styles.text}>{displayCount}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadows.sm,
  },
  text: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    lineHeight: theme.fonts.sizes.xs * theme.fonts.lineHeights.tight,
  },
});
