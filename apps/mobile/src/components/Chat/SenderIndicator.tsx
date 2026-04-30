import React from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import {
  SenderType,
  SENDER_TYPE_LABELS,
  SENDER_TYPE_COLORS,
  HandoffStatus,
} from '@bridgeai/shared';

import { theme } from '../../theme';
import { UserAvatar } from '../UserAvatar/UserAvatar';

export interface SenderIndicatorProps {
  /** Type of sender */
  senderType: SenderType;
  /** Current handoff status */
  handoffStatus?: HandoffStatus;
  /** Sender name (optional) */
  senderName?: string;
  /** Sender avatar URI (optional) */
  senderAvatarUrl?: string;
  /** Sender's credit score snapshot at send time (AS-PROTO-001-AC-1) */
  creditScore?: number | null;
  /** Whether this is a transition message */
  isTransition?: boolean;
  /** Show animation for sender change */
  animate?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * SenderIndicator Component
 *
 * Displays sender information with visual indicators and animations.
 * Used in chat messages to show who sent the message (Agent, Human, System, or Transition).
 */
export const SenderIndicator: React.FC<SenderIndicatorProps> = ({
  senderType,
  handoffStatus,
  senderName,
  senderAvatarUrl,
  creditScore,
  isTransition = false,
  animate = true,
  style,
  testID,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  // Entry animation
  React.useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [senderType, animate]);

  const getUserType = (): 'agent' | 'human' => {
    return senderType === SenderType.AGENT ? 'agent' : 'human';
  };

  const getSenderLabel = () => {
    if (senderName) {
      if (senderType === SenderType.AGENT) {
        return `${senderName} 的 Agent`;
      }
      return senderName;
    }
    return SENDER_TYPE_LABELS[senderType] || 'Unknown';
  };

  const getSenderColor = () => {
    return SENDER_TYPE_COLORS[senderType] || theme.colors.textSecondary;
  };

  // Transition indicator shows handoff in progress
  if (isTransition || senderType === SenderType.TRANSITION) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.transitionContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          style,
        ]}
        testID={testID}
      >
        <View style={styles.transitionLine} />
        <View style={styles.transitionContent}>
          <Text style={styles.transitionIcon}>🔄</Text>
          <Text style={styles.transitionText}>
            {handoffStatus === HandoffStatus.PENDING_TAKEOVER
              ? 'Human taking over...'
              : handoffStatus === HandoffStatus.PENDING_HANDOFF
                ? 'Handing to AI...'
                : 'Switching...'}
          </Text>
        </View>
        <View style={styles.transitionLine} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }, style]}
      testID={testID}
    >
      {/* Sender avatar/icon */}
      <UserAvatar
        uri={senderAvatarUrl}
        name={senderName || SENDER_TYPE_LABELS[senderType]}
        size="sm"
        userType={getUserType()}
        showStatus={false}
        style={styles.avatar}
        testID={testID ? `${testID}-avatar` : undefined}
      />

      {/* Sender info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{getSenderLabel()}</Text>
        <View style={[styles.typeBadge, { backgroundColor: `${getSenderColor()}20` }]}>
          <View style={[styles.typeDot, { backgroundColor: getSenderColor() }]} />
          <Text style={[styles.typeLabel, { color: getSenderColor() }]}>
            {senderType === SenderType.AGENT && senderName
              ? `${senderName} 的 Agent`
              : SENDER_TYPE_LABELS[senderType]}
          </Text>
        </View>
      </View>

      {/* Credit score corner badge (AS-PROTO-001-AC-1) */}
      {typeof creditScore === 'number' && (
        <View style={styles.creditBadge} testID={testID ? `${testID}-credit` : undefined}>
          <Text style={styles.creditBadgeText}>{creditScore}</Text>
        </View>
      )}

      {/* Status indicator */}
      <View style={[styles.statusIndicator, { backgroundColor: getSenderColor() }]} />
    </Animated.View>
  );
};

/**
 * SenderChangeIndicator - Shows when sender changes between messages
 */
export interface SenderChangeIndicatorProps {
  fromType: SenderType;
  toType: SenderType;
  style?: ViewStyle;
  testID?: string;
}

export const SenderChangeIndicator: React.FC<SenderChangeIndicatorProps> = ({
  fromType,
  toType,
  style,
  testID,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-20)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Debounce rapid identity switches to avoid UI flicker.
  // Only the final stable value is shown.
  const [debouncedToType, setDebouncedToType] = React.useState(toType);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Clear any pending update from a previous rapid switch
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedToType(toType);
    }, 150);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toType]);

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fromType, debouncedToType]);

  const fromColor = SENDER_TYPE_COLORS[fromType] || theme.colors.textSecondary;
  const toColor = SENDER_TYPE_COLORS[debouncedToType] || theme.colors.textSecondary;

  return (
    <Animated.View
      style={[
        styles.changeContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.changeDot, { backgroundColor: fromColor }]} />
      <View style={styles.changeLine} />
      <View style={styles.changeArrow}>
        <Text style={styles.changeArrowIcon}>↓</Text>
      </View>
      <View style={styles.changeLine} />
      <View style={[styles.changeDot, { backgroundColor: toColor }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Main indicator styles
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  avatar: {
    marginRight: theme.spacing.sm,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: 2,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: theme.spacing.xs,
  },
  typeLabel: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  creditBadge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
  creditBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },

  // Transition styles
  transitionContainer: {
    justifyContent: 'center',
    paddingVertical: theme.spacing.base,
  },
  transitionLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  transitionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
  },
  transitionIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  transitionText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.medium,
  },

  // Change indicator styles
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  changeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  changeLine: {
    width: 20,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  changeArrow: {
    paddingHorizontal: theme.spacing.sm,
  },
  changeArrowIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default SenderIndicator;
