/**
 * Match Notifications Screen
 * 匹配通知列表页面
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface MatchNotification {
  id: string;
  type: 'NEW_MATCH' | 'HIGH_MATCH_JOB' | 'RESUME_VIEWED' | 'MATCH_STATUS_CHANGED' | 'RECOMMENDATION_AVAILABLE';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: MatchNotification[] = [
  {
    id: '1',
    type: 'HIGH_MATCH_JOB',
    priority: 'high',
    title: '发现高匹配度职位！',
    body: '有一个高级前端工程师职位与您高度匹配(92%)，建议尽快查看！',
    read: false,
    createdAt: '2分钟前',
  },
  {
    id: '2',
    type: 'NEW_MATCH',
    priority: 'normal',
    title: '新的候选人匹配',
    body: '有一位新候选人张三与您的职位匹配度88%',
    read: false,
    createdAt: '15分钟前',
  },
  {
    id: '3',
    type: 'RESUME_VIEWED',
    priority: 'low',
    title: '您的简历被查看了',
    body: '某科技公司HR查看了您的简历（职位：高级前端工程师）',
    read: true,
    createdAt: '1小时前',
  },
  {
    id: '4',
    type: 'MATCH_STATUS_CHANGED',
    priority: 'high',
    title: '匹配状态更新',
    body: '张三已接受您的匹配邀请',
    read: false,
    createdAt: '3小时前',
  },
  {
    id: '5',
    type: 'RECOMMENDATION_AVAILABLE',
    priority: 'normal',
    title: '每日推荐摘要',
    body: '您有5个新职位推荐和3个新候选人推荐，最高匹配度95%',
    read: true,
    createdAt: '昨天',
  },
];

export const MatchNotificationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications(MOCK_NOTIFICATIONS);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback((notification: MatchNotification) => {
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'HIGH_MATCH_JOB': return '🔥';
      case 'NEW_MATCH': return '🤝';
      case 'RESUME_VIEWED': return '👁';
      case 'MATCH_STATUS_CHANGED': return '📋';
      case 'RECOMMENDATION_AVAILABLE': return '📬';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return theme.colors.error;
      case 'high': return theme.colors.warning;
      case 'normal': return theme.colors.primary;
      default: return theme.colors.textTertiary;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: MatchNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>
        <Text style={styles.cardTime}>{item.createdAt}</Text>
      </View>
      {item.priority === 'high' || item.priority === 'urgent' ? (
        <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
      ) : null}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>匹配通知</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无通知</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  unreadBadge: {
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textInverse,
  },
  listContent: {
    padding: theme.spacing.base,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  cardLeft: {
    marginRight: theme.spacing.md,
    alignItems: 'center',
  },
  icon: {
    fontSize: theme.fonts.sizes.xl,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardBody: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  priorityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});

export default MatchNotificationsScreen;
