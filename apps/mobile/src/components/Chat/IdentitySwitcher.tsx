import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert, ViewStyle } from 'react-native';

import { theme } from '../../theme';

export interface IdentitySwitcherProps {
  /** Current active identity */
  currentIdentity: 'USER' | 'AGENT';
  /** Callback fired when identity is switched (after confirmation) */
  onSwitch: (newIdentity: 'USER' | 'AGENT') => void;
  /** Disable the switcher */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

interface IdentityVisual {
  label: string;
  color: string;
  background: string;
}

const IDENTITY_VISUALS: Record<'USER' | 'AGENT', IdentityVisual> = {
  USER: {
    label: '👤 用户',
    color: '#2563EB', // blue
    background: '#DBEAFE',
  },
  AGENT: {
    label: '🤖 智能体',
    color: '#7C3AED', // purple
    background: '#EDE9FE',
  },
};

/**
 * IdentitySwitcher Component
 *
 * Persistent identity indicator with switch button. Shows the current
 * identity (USER or AGENT) and allows the user to switch between them
 * with a confirmation dialog and animated fade transition.
 *
 * Implements ISSUE-UI004 AC5: Human-AI switching UI.
 */
export const IdentitySwitcher: React.FC<IdentitySwitcherProps> = ({
  currentIdentity,
  onSwitch,
  disabled = false,
  testID,
}) => {
  const opacityAnim = React.useRef(new Animated.Value(1)).current;
  const [displayIdentity, setDisplayIdentity] = React.useState<'USER' | 'AGENT'>(currentIdentity);

  // Animate fade-out / fade-in when identity changes
  React.useEffect(() => {
    if (displayIdentity === currentIdentity) {
      return;
    }
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDisplayIdentity(currentIdentity);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [currentIdentity, displayIdentity, opacityAnim]);

  const handlePress = () => {
    if (disabled) {
      return;
    }
    const target: 'USER' | 'AGENT' = currentIdentity === 'USER' ? 'AGENT' : 'USER';
    const targetVisual = IDENTITY_VISUALS[target];

    Alert.alert(
      '切换身份',
      `确定要切换到 ${targetVisual.label} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'default',
          onPress: () => onSwitch(target),
        },
      ],
      { cancelable: true }
    );
  };

  const visual = IDENTITY_VISUALS[displayIdentity];

  const containerStyle: ViewStyle[] = [styles.container];
  if (disabled) {
    containerStyle.push(styles.disabled);
  }

  return (
    <View style={containerStyle} testID={testID}>
      <Animated.View
        style={[styles.badge, { backgroundColor: visual.background, opacity: opacityAnim }]}
        testID={testID ? `${testID}-badge` : undefined}
      >
        <View style={[styles.dot, { backgroundColor: visual.color }]} />
        <Text style={[styles.badgeLabel, { color: visual.color }]}>{visual.label}</Text>
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.switchButton,
          { borderColor: visual.color },
          disabled && styles.switchButtonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="切换身份"
        accessibilityState={{ disabled }}
        testID={testID ? `${testID}-switch-button` : undefined}
      >
        <Text style={[styles.switchButtonText, { color: visual.color }]}>切换身份</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: theme.spacing.xs,
  },
  badgeLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
  switchButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  switchButtonDisabled: {
    opacity: 0.6,
  },
  switchButtonText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
});

export default IdentitySwitcher;
