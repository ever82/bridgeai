import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

import { theme } from '../../theme';

export type TypingType = 'typing' | 'thinking';

export interface TypingIndicatorProps {
  type?: TypingType;
  userName?: string;
  visible?: boolean;
  timeout?: number;
  onTimeout?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  type = 'typing',
  userName,
  visible = true,
  timeout = 10000,
  onTimeout,
  style,
  testID,
}) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Start animation
    const animate = () => {
      const duration = 400;
      const delay = 150;

      Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration,
            delay: delay * 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration,
            delay: delay * 2,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();

    // Set timeout
    if (timeout > 0 && onTimeout) {
      timeoutRef.current = setTimeout(() => {
        onTimeout();
      }, timeout);
    }

    return () => {
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, timeout, onTimeout]);

  if (!visible) return null;

  const getLabel = () => {
    if (userName) {
      return type === 'thinking'
        ? `${userName} 正在思考...`
        : `${userName} 正在输入...`;
    }
    return type === 'thinking' ? '正在思考...' : '正在输入...';
  };

  const getAccessibilityLabel = () => {
    return type === 'thinking' ? '对方正在思考中' : '对方正在输入';
  };

  const renderDot = (anim: Animated.Value, index: number) => (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
              }),
            },
          ],
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
        },
      ]}
      testID={`${testID}-dot-${index}`}
    />
  );

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="text"
      testID={testID}
    >
      <View style={styles.dotsContainer}>
        {renderDot(dot1Anim, 1)}
        {renderDot(dot2Anim, 2)}
        {renderDot(dot3Anim, 3)}
      </View>
      <Text style={styles.text}>{getLabel()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: 2,
  },
  text: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
});

export default TypingIndicator;
