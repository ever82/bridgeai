import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import {
  HandoffStatus,
  HANDOFF_STATUS_LABELS,
  type SenderType,
} from '@visionshare/shared';

export interface HandoffButtonProps {
  /** Current handoff status */
  status: HandoffStatus;
  /** Current handler type */
  handlerType: SenderType;
  /** Whether there's an active pending request */
  hasPendingRequest?: boolean;
  /** Whether the user can perform takeover */
  canTakeover?: boolean;
  /** Whether the user can perform handoff */
  canHandoff?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Called when takeover is requested */
  onTakeover?: () => void;
  /** Called when handoff is requested */
  onHandoff?: () => void;
  /** Called when pending request is cancelled */
  onCancel?: () => void;
  /** Custom styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * HandoffButton Component
 *
 * Displays takeover/handoff buttons based on current status.
 * Shows different states:
 * - AGENT_ACTIVE: Shows "Take Over" button if user has permission
 * - HUMAN_ACTIVE: Shows "Hand to AI" button if user has permission
 * - PENDING_*: Shows "Cancel Request" button
 * - TIMEOUT/CANCELLED: Shows retry button
 */
export const HandoffButton: React.FC<HandoffButtonProps> = ({
  status,
  handlerType,
  hasPendingRequest = false,
  canTakeover = true,
  canHandoff = true,
  loading = false,
  onTakeover,
  onHandoff,
  onCancel,
  style,
  testID,
}) => {
  const handlePress = () => {
    if (loading) return;

    if (hasPendingRequest || status === HandoffStatus.PENDING_TAKEOVER || status === HandoffStatus.PENDING_HANDOFF) {
      onCancel?.();
    } else if (status === HandoffStatus.AGENT_ACTIVE) {
      onTakeover?.();
    } else if (status === HandoffStatus.HUMAN_ACTIVE) {
      onHandoff?.();
    }
  };

  const getButtonConfig = () => {
    // Pending state
    if (hasPendingRequest || status === HandoffStatus.PENDING_TAKEOVER || status === HandoffStatus.PENDING_HANDOFF) {
      return {
        title: 'Cancel Request',
        variant: 'cancel' as const,
        icon: '✕',
        disabled: false,
      };
    }

    // Timeout or cancelled - allow retry
    if (status === HandoffStatus.TIMEOUT || status === HandoffStatus.CANCELLED) {
      return {
        title: 'Retry',
        variant: 'retry' as const,
        icon: '↻',
        disabled: false,
      };
    }

    // Agent is active - show takeover button
    if (status === HandoffStatus.AGENT_ACTIVE) {
      if (!canTakeover) {
        return {
          title: 'AI Agent Active',
          variant: 'disabled' as const,
          icon: '🤖',
          disabled: true,
        };
      }
      return {
        title: 'Take Over',
        variant: 'takeover' as const,
        icon: '👤',
        disabled: false,
      };
    }

    // Human is active - show handoff button
    if (status === HandoffStatus.HUMAN_ACTIVE) {
      if (!canHandoff) {
        return {
          title: 'Human Support',
          variant: 'disabled' as const,
          icon: '👤',
          disabled: true,
        };
      }
      return {
        title: 'Hand to AI',
        variant: 'handoff' as const,
        icon: '🤖',
        disabled: false,
      };
    }

    return {
      title: 'Unknown',
      variant: 'disabled' as const,
      icon: '?',
      disabled: true,
    };
  };

  const config = getButtonConfig();

  const getButtonStyles = () => {
    switch (config.variant) {
      case 'takeover':
        return styles.takeoverButton;
      case 'handoff':
        return styles.handoffButton;
      case 'cancel':
        return styles.cancelButton;
      case 'retry':
        return styles.retryButton;
      case 'disabled':
      default:
        return styles.disabledButton;
    }
  };

  const getTextStyles = () => {
    switch (config.variant) {
      case 'takeover':
        return styles.takeoverText;
      case 'handoff':
        return styles.handoffText;
      case 'cancel':
        return styles.cancelText;
      case 'retry':
        return styles.retryText;
      case 'disabled':
      default:
        return styles.disabledText;
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={config.disabled || loading}
      style={[styles.button, getButtonStyles(), style]}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={config.title}
      accessibilityState={{ disabled: config.disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textInverse} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.icon}>{config.icon}</Text>
          <Text style={[styles.text, getTextStyles()]}>{config.title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  text: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },

  // Takeover button (blue)
  takeoverButton: {
    backgroundColor: theme.colors.info,
  },
  takeoverText: {
    color: theme.colors.textInverse,
  },

  // Handoff button (green)
  handoffButton: {
    backgroundColor: theme.colors.success,
  },
  handoffText: {
    color: theme.colors.textInverse,
  },

  // Cancel button (red)
  cancelButton: {
    backgroundColor: theme.colors.error,
  },
  cancelText: {
    color: theme.colors.textInverse,
  },

  // Retry button (orange)
  retryButton: {
    backgroundColor: theme.colors.warning,
  },
  retryText: {
    color: theme.colors.textInverse,
  },

  // Disabled button
  disabledButton: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
});

export default HandoffButton;
