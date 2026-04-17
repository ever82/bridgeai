import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import {
  SenderType,
  SENDER_TYPE_LABELS,
  SENDER_TYPE_COLORS,
  HandoffStatus,
} from '@bridgeai/shared';

export interface SenderIndicatorProps {
  /** Type of sender */
  senderType: SenderType;
  /** Current handoff status */
  handoffStatus?: HandoffStatus;
  /** Sender name (optional) */
  senderName?: string;
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

  const getSenderIcon = () => {
    switch (senderType) {
      case SenderType.AGENT:
        return '🤖';
      case SenderType.HUMAN:
        return '👤';
      case SenderType.SYSTEM:
        return '⚙️';
      case SenderType.TRANSITION:
        return '⏳';
      default:
        return '❓';
    }
  };

  const getSenderLabel = () => {
    if (senderName) {
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
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        style,
      ]}
      testID={testID}
    >
      {/* Sender avatar/icon */}
      <View style={[styles.avatar, { backgroundColor: getSenderColor() }]}>
        <Text style={styles.avatarIcon}>{getSenderIcon()}</Text>
      </View>

      {/* Sender info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{getSenderLabel()}</Text>
        <View style={[styles.typeBadge, { backgroundColor: `${getSenderColor()}20` }]}>
          <View style={[styles.typeDot, { backgroundColor: getSenderColor() }]} />
          <Text style={[styles.typeLabel, { color: getSenderColor() }]}>
            {SENDER_TYPE_LABELS[senderType]}
          </Text>
        </View>
      </View>

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
}

export const SenderChangeIndicator: React.FC<SenderChangeIndicatorProps> = ({
  fromType,
  toType,
  style,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-20)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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
  }, [fromType, toType]);

  const fromColor = SENDER_TYPE_COLORS[fromType] || theme.colors.textSecondary;
  const toColor = SENDER_TYPE_COLORS[toType] || theme.colors.textSecondary;

  return (
    <Animated.View
      style={[
        styles.changeContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        style,
      ]}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarIcon: {
    fontSize: 16,
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
