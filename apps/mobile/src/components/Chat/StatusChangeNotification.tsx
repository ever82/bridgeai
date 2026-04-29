/**
 * StatusChangeNotification Component
 *
 * System notification shown when a participant switches between
 * Agent and Human mode. Auto-fades after a configurable duration.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle, TouchableOpacity } from 'react-native';

import { ParticipantIdentity } from '../../types/chat';
import { theme } from '../../theme';

export interface StatusChangeNotificationProps {
  /** Display name of the user who switched */
  userName: string;
  /** Identity the user switched TO */
  toIdentity: ParticipantIdentity;
  /** Auto-dismiss duration in ms (default 3000) */
  duration?: number;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
  /** Custom styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const IDENTITY_ICONS: Record<ParticipantIdentity, string> = {
  agent: '🤖',
  human: '👤',
};

const IDENTITY_LABELS: Record<ParticipantIdentity, string> = {
  agent: 'Agent 模式',
  human: '亲自聊天模式',
};

export const StatusChangeNotification: React.FC<StatusChangeNotificationProps> = ({
  userName,
  toIdentity,
  duration = 3000,
  onDismiss,
  style,
  testID,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDismiss?.();
        }
      });
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onDismiss, fadeAnim]);

  const message = `${userName}已切换到 ${IDENTITY_ICONS[toIdentity]} ${IDENTITY_LABELS[toIdentity]}`;
  const subMessage =
    toIdentity === 'agent' ? `现在与 ${userName} 的 Agent 对话中` : '对方用户正在亲自回复你';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]} testID={testID}>
      <TouchableOpacity onPress={onDismiss} activeOpacity={0.8} style={styles.inner}>
        <View style={styles.iconWrapper}>
          <Text style={styles.bellIcon}>🔔</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>系统提示</Text>
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.subMessage}>{subMessage}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.xs,
  },
  inner: {
    backgroundColor: theme.colors.notificationBg,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.notificationBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  bellIcon: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.notificationText,
    marginBottom: 2,
  },
  message: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.notificationText,
  },
  subMessage: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.notificationText,
    opacity: 0.8,
    marginTop: 2,
  },
});

export default StatusChangeNotification;
