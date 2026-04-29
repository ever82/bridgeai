import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View, Easing } from 'react-native';

import { theme } from '../../theme';

export interface ScrollToBottomProps {
  visible?: boolean;
  onPress: () => void;
  unreadCount?: number;
  testID?: string;
}

const BUTTON_SIZE = 44;
const BADGE_SIZE = 20;

export const ScrollToBottom: React.FC<ScrollToBottomProps> = ({
  visible = false,
  onPress,
  unreadCount = 0,
  testID,
}) => {
  const opacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]} testID={testID}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.button}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Scroll to bottom"
        accessibilityHint="Scrolls the content to the bottom"
      >
        <View style={styles.arrowDown} />
      </TouchableOpacity>
      {unreadCount > 0 && (
        <View style={styles.badge} testID={testID ? `${testID}-badge` : undefined}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: theme.spacing.base,
    right: theme.spacing.base,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.textInverse,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    lineHeight: BADGE_SIZE - 2,
    textAlign: 'center',
  },
});
