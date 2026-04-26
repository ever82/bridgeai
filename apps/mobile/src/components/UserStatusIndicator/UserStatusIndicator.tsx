/**
 * UserStatusIndicator Component
 *
 * Unified status indicator showing Agent/Human identity, online presence,
 * typing state, and handoff status. Used in chat list items and message headers.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle, Easing } from 'react-native';
import {
  SenderType,
  SENDER_TYPE_LABELS,
  SENDER_TYPE_COLORS,
  HandoffStatus,
} from '@bridgeai/shared';

import { theme } from '../../theme';
import { socketClient } from '../../services/socketClient';

// Use string constants to avoid babel enum compilation issues
const _SenderType = {
  AGENT: 'AGENT' as SenderType,
  HUMAN: 'HUMAN' as SenderType,
  SYSTEM: 'SYSTEM' as SenderType,
  TRANSITION: 'TRANSITION' as SenderType,
};

const _HandoffStatus = {
  AGENT_ACTIVE: 'AGENT_ACTIVE' as HandoffStatus,
  HUMAN_ACTIVE: 'HUMAN_ACTIVE' as HandoffStatus,
  PENDING_TAKEOVER: 'PENDING_TAKEOVER' as HandoffStatus,
  PENDING_HANDOFF: 'PENDING_HANDOFF' as HandoffStatus,
  TIMEOUT: 'TIMEOUT' as HandoffStatus,
  CANCELLED: 'CANCELLED' as HandoffStatus,
};

// Fallback labels/colors in case shared package enums are not resolved by babel
const SENDER_LABELS: Record<string, string> = SENDER_TYPE_LABELS || {
  AGENT: 'AI Agent',
  HUMAN: 'Human',
  SYSTEM: 'System',
  TRANSITION: 'Transition',
};

const SENDER_COLORS: Record<string, string> = SENDER_TYPE_COLORS || {
  AGENT: '#4CAF50',
  HUMAN: '#2196F3',
  SYSTEM: '#757575',
  TRANSITION: '#FF9800',
};

// ── Types ───────────────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
export type IndicatorVariant = 'compact' | 'full' | 'minimal';

export interface UserStatusIndicatorProps {
  /** User ID for presence tracking */
  userId: string;
  /** Whether this is an Agent or Human */
  senderType: SenderType;
  /** Display name */
  displayName?: string;
  /** Current handoff status (if in a handoff-eligible conversation) */
  handoffStatus?: HandoffStatus;
  /** Chat room ID for typing detection */
  roomId?: string;
  /** Visual variant */
  variant?: IndicatorVariant;
  /** Show online status dot */
  showPresence?: boolean;
  /** Show typing indicator */
  showTyping?: boolean;
  /** Show identity badge (Agent/Human label) */
  showIdentity?: boolean;
  /** Show handoff status text */
  showHandoffStatus?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: theme.colors.success,
  offline: theme.colors.textTertiary,
  away: theme.colors.warning,
  busy: theme.colors.error,
};

const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: '在线',
  offline: '离线',
  away: '离开',
  busy: '忙碌',
};

const HANDOFF_STATUS_SHORT: Record<string, string> = {
  [_HandoffStatus.AGENT_ACTIVE]: 'AI处理中',
  [_HandoffStatus.HUMAN_ACTIVE]: '人工服务中',
  [_HandoffStatus.PENDING_TAKEOVER]: '正在转接人工...',
  [_HandoffStatus.PENDING_HANDOFF]: '正在转交AI...',
  [_HandoffStatus.TIMEOUT]: '转接超时',
  [_HandoffStatus.CANCELLED]: '已取消',
};

// ── Component ───────────────────────────────────────────────────────────────

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  userId,
  senderType,
  displayName,
  handoffStatus,
  roomId,
  variant = 'full',
  showPresence = true,
  showTyping = true,
  showIdentity = true,
  showHandoffStatus = true,
  style,
  testID,
}) => {
  const [presence, setPresence] = useState<PresenceStatus>('offline');
  const [isTyping, setIsTyping] = useState(false);

  // Pulse animation for typing dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Presence subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!showPresence || !userId) return;

    socketClient.subscribeToUser(userId);

    const fetchInitial = async () => {
      try {
        const data = await socketClient.getPresence([userId]);
        if (data && data.length > 0) {
          setPresence(data[0].online ? 'online' : 'offline');
        }
      } catch {
        // silently ignore
      }
    };
    fetchInitial();

    const handleStatusUpdate = (data: { userId: string; status: PresenceStatus }) => {
      if (data.userId === userId) {
        setPresence(data.status);
      }
    };
    socketClient.on('user:status_update', handleStatusUpdate);

    return () => {
      socketClient.off('user:status_update', handleStatusUpdate);
      socketClient.unsubscribeFromUser(userId);
    };
  }, [userId, showPresence]);

  // ── Typing detection ────────────────────────────────────────────────────

  useEffect(() => {
    if (!showTyping || !roomId || !userId) return;

    const typingTimeoutRef = { current: ReturnType<typeof setTimeout> | null };

    const handleTyping = (data: { userId: string; roomId: string; isTyping: boolean }) => {
      if (data.userId === userId && data.roomId === roomId) {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 5000);
        }
      }
    };
    socketClient.on('user:typing', handleTyping);

    return () => {
      socketClient.off('user:typing', handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [userId, roomId, showTyping]);

  // ── Pulse animation ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isTyping) {
      pulseAnim.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isTyping, pulseAnim]);

  // ── Render helpers ──────────────────────────────────────────────────────

  const senderColor = SENDER_COLORS[senderType] || theme.colors.textSecondary;
  const isAgent = senderType === _SenderType.AGENT;

  const renderPresenceDot = () => {
    if (!showPresence) return null;
    const dotColor = isTyping ? senderColor : PRESENCE_COLORS[presence];
    return (
      <Animated.View
        style={[
          styles.presenceDot,
          {
            backgroundColor: dotColor,
            transform: [{ scale: isTyping ? pulseAnim : 1 }],
          },
        ]}
        testID={`${testID}-presence`}
      />
    );
  };

  const renderIdentityBadge = () => {
    if (!showIdentity) return null;
    return (
      <View
        style={[styles.identityBadge, { backgroundColor: `${senderColor}20` }]}
        testID={`${testID}-identity`}
      >
        <Text style={styles.identityIcon}>{isAgent ? '🤖' : '👤'}</Text>
        <Text style={[styles.identityLabel, { color: senderColor }]}>
          {SENDER_LABELS[senderType]}
        </Text>
      </View>
    );
  };

  const renderTypingText = () => {
    if (!showTyping || !isTyping) return null;
    return (
      <Text style={styles.typingText} testID={`${testID}-typing`}>
        {isAgent ? '正在思考...' : '正在输入...'}
      </Text>
    );
  };

  const renderHandoffLabel = () => {
    if (!showHandoffStatus || !handoffStatus) return null;
    const label = HANDOFF_STATUS_SHORT[handoffStatus];
    if (!label) return null;
    const isActive =
      handoffStatus === _HandoffStatus.AGENT_ACTIVE ||
      handoffStatus === _HandoffStatus.HUMAN_ACTIVE;
    return (
      <Text
        style={[styles.handoffLabel, isActive && { color: senderColor }]}
        testID={`${testID}-handoff`}
      >
        {label}
      </Text>
    );
  };

  // ── Variant rendering ───────────────────────────────────────────────────

  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalContainer, style]} testID={testID}>
        {renderPresenceDot()}
        {renderIdentityBadge()}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]} testID={testID}>
        {renderPresenceDot()}
        {displayName && (
          <Text style={styles.compactName} numberOfLines={1}>
            {displayName}
          </Text>
        )}
        {renderIdentityBadge()}
        {renderTypingText()}
      </View>
    );
  }

  // variant === 'full'
  return (
    <View style={[styles.fullContainer, style]} testID={testID}>
      <View style={styles.fullTopRow}>
        {renderPresenceDot()}
        {displayName && (
          <Text style={styles.fullName} numberOfLines={1}>
            {displayName}
          </Text>
        )}
        {renderIdentityBadge()}
      </View>
      <View style={styles.fullBottomRow}>
        {renderTypingText()}
        {!isTyping && renderHandoffLabel()}
        {!isTyping && !handoffStatus && showPresence && presence !== 'online' && (
          <Text style={styles.presenceLabel}>{PRESENCE_LABELS[presence]}</Text>
        )}
      </View>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Minimal variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactName: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flexShrink: 1,
  },

  // Full variant
  fullContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  fullTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flexShrink: 1,
  },
  fullBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 2,
  },

  // Shared elements
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.sm,
    gap: 2,
  },
  identityIcon: {
    fontSize: 10,
  },
  identityLabel: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  typingText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  handoffLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  presenceLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
  },
});

export default UserStatusIndicator;
