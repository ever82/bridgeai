import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { MessagesStackParamList } from '../../types/navigation';
import { theme } from '../../theme';
import { type Notification, NotificationType } from '../../services/notificationApi';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotificationDetail'>;

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  system: { label: '系统通知', icon: '🔔', color: theme.colors.info },
  activity: { label: '活动通知', icon: '🎉', color: theme.colors.warning },
  match: { label: '匹配通知', icon: '💕', color: theme.colors.success },
  security: { label: '安全通知', icon: '🔒', color: theme.colors.error },
};

function getCategoryFromType(type: NotificationType): string {
  if (type.startsWith('MATCH_')) return 'match';
  if (type === 'SYSTEM_ANNOUNCEMENT' || type === 'REMINDER') return 'system';
  if (type === 'PROMOTION' || type === 'RATING_RECEIVED') return 'activity';
  if (type === 'MESSAGE_NEW') return 'system';
  return 'system';
}

export const NotificationDetailScreen: React.FC<Props> = ({ route }) => {
  const { notificationId } = route.params;
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    // In a real app, fetch notification detail from API
    // For now, we display a placeholder
    setNotification(null);
  }, [notificationId]);

  const category = notification ? getCategoryFromType(notification.type) : 'system';
  const config = categoryConfig[category];

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header title="通知详情" showBackButton />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Text style={styles.iconText}>{config.icon}</Text>
        </View>
        <Text style={styles.categoryLabel}>{config.label}</Text>
        <Text style={styles.title}>{notification?.title || '通知标题'}</Text>
        <Text style={styles.time}>
          {notification?.createdAt
            ? new Date(notification.createdAt).toLocaleString('zh-CN')
            : '刚刚'}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.body}>
          {notification?.content || `通知 ID: ${notificationId}\n\n这是通知详情内容。`}
        </Text>
        {notification?.data && Object.keys(notification.data).length > 0 && (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>查看详情</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.base,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  iconText: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  time: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.base,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.base,
  },
  body: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    width: '100%',
  },
  actionButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default NotificationDetailScreen;
