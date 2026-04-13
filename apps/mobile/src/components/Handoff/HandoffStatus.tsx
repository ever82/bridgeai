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
  HandoffStatus,
  SenderType,
  HANDOFF_STATUS_LABELS,
  SENDER_TYPE_COLORS,
  SENDER_TYPE_LABELS,
  isHandoffPending,
} from '@visionshare/shared';

export interface HandoffStatusProps {
  /** Current handoff status */
  status: HandoffStatus;
  /** Current handler type (AGENT, HUMAN, etc.) */
  handlerType: SenderType;
  /** Current handler name/ID (optional) */
  handlerName?: string;
  /** Whether there's an active pending request */
  hasPendingRequest?: boolean;
  /** Timeout countdown in seconds (for pending states) */
  timeoutSeconds?: number;
  /** Custom styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * HandoffStatus Component
 *
 * Displays the current handoff status with visual indicators.
 * Shows:
 * - Current handler (Agent or Human)
 * - Status label
 * - Pending countdown timer
 * - Color-coded status indicator
 */
export const HandoffStatus: React.FC<HandoffStatusProps> = ({
  status,
  handlerType,
  handlerName,
  hasPendingRequest = false,
  timeoutSeconds,
  style,
  testID,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for pending states
  React.useEffect(() => {
    if (isHandoffPending(status) || hasPendingRequest) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, hasPendingRequest]);

  const getStatusColor = () => {
    switch (status) {
      case HandoffStatus.AGENT_ACTIVE:
        return SENDER_TYPE_COLORS[SenderType.AGENT];
      case HandoffStatus.HUMAN_ACTIVE:
        return SENDER_TYPE_COLORS[SenderType.HUMAN];
      case HandoffStatus.PENDING_TAKEOVER:
      case HandoffStatus.PENDING_HANDOFF:
        return theme.colors.warning;
      case HandoffStatus.TIMEOUT:
        return theme.colors.error;
      case HandoffStatus.CANCELLED:
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getHandlerIcon = () => {
    switch (handlerType) {
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

  const getHandlerLabel = () => {
    if (handlerName) {
      return handlerName;
    }
    return SENDER_TYPE_LABELS[handlerType] || 'Unknown';
  };

  const formatTimeout = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPending = isHandoffPending(status) || hasPendingRequest;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Status indicator dot */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: getStatusColor() },
          isPending && { transform: [{ scale: pulseAnim }] },
        ]}
      />

      {/* Handler info */}
      <View style={styles.handlerContainer}>
        <Text style={styles.handlerIcon}>{getHandlerIcon()}</Text>
        <Text style={styles.handlerLabel}>{getHandlerLabel()}</Text>
      </View>

      {/* Status label */}
      <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
        {HANDOFF_STATUS_LABELS[status] || status}
      </Text>

      {/* Timeout countdown for pending states */}
      {isPending && timeoutSeconds !== undefined && timeoutSeconds > 0 && (
        <View style={styles.timeoutContainer}>
          <Text style={styles.timeoutLabel}>Timeout in:</Text>
          <Text style={styles.timeoutValue}>{formatTimeout(timeoutSeconds)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  handlerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  handlerIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  handlerLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  statusLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    flex: 1,
  },
  timeoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeoutLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  timeoutValue: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.warning,
    fontVariant: ['tabular-nums'],
  },
});

export default HandoffStatus;
