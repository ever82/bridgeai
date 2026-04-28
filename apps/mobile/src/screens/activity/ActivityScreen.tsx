import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

// Types
interface ActivityStat {
  id: string;
  label: string;
  value: number;
  icon: string;
}

interface AchievementBadge {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'match' | 'publish' | 'review';
  title: string;
  description: string;
  timestamp: string;
}

// Mock data
const ACTIVITY_STATS: ActivityStat[] = [
  { id: '1', label: '对话数', value: 42, icon: '💬' },
  { id: '2', label: '匹配数', value: 18, icon: '🤝' },
  { id: '3', label: '发布数', value: 7, icon: '📝' },
];

const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  { id: '1', title: '首次对话', icon: '🎯', unlocked: true },
  { id: '2', title: '发布达人', icon: '⭐', unlocked: true },
  { id: '3', title: '匹配达人', icon: '🏆', unlocked: true },
  { id: '4', title: '连续活跃', icon: '🔥', unlocked: false },
];

const getActivityIcon = (type: RecentActivity['type']): string => {
  const icons: Record<RecentActivity['type'], string> = {
    conversation: '💬',
    match: '🤝',
    publish: '📝',
    review: '⭐',
  };
  return icons[type];
};

/** Derive recent activities from user data in authStore */
const getRecentActivities = (
  user: ReturnType<typeof useAuthStore.getState>['user']
): RecentActivity[] => {
  if (!user) {
    return [];
  }
  const activities: RecentActivity[] = [];

  // Conversation activity from moments count (indicates user engagement)
  if (user.momentsCount > 0) {
    activities.push({
      id: 'conv-1',
      type: 'conversation',
      title: '完成对话',
      description: `${user.displayName} 的对话已结束`,
      timestamp: '刚刚',
    });
  }

  // Publish activity from moments
  if (user.momentsCount > 0) {
    activities.push({
      id: 'pub-1',
      type: 'publish',
      title: '发布动态',
      description: `已发布 ${user.momentsCount} 条动态`,
      timestamp: user.momentsCount > 1 ? `${user.momentsCount}天前` : '今天',
    });
  }

  // Followers activity
  if (user.followersCount > 0) {
    activities.push({
      id: 'match-1',
      type: 'match',
      title: '新匹配',
      description: `已有 ${user.followersCount} 位关注者`,
      timestamp: '1天前',
    });
  }

  // Following activity
  if (user.followingCount > 0) {
    activities.push({
      id: 'review-1',
      type: 'review',
      title: '关注更新',
      description: `已关注 ${user.followingCount} 位用户`,
      timestamp: '2天前',
    });
  }

  return activities;
};

export const ActivityScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(state => state.user);
  const recentActivities = getRecentActivities(user);

  const renderStatCard = (stat: ActivityStat) => (
    <View key={stat.id} style={styles.statCard}>
      <Text style={styles.statIcon}>{stat.icon}</Text>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );

  const renderAchievementBadge = (badge: AchievementBadge) => (
    <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.badgeLocked]}>
      <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
        {badge.icon}
      </Text>
      <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]}>
        {badge.title}
      </Text>
      {badge.unlocked && <View style={styles.badgeUnlockedDot} />}
    </View>
  );

  const renderRecentActivity = (activity: RecentActivity) => (
    <View key={activity.id} style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDescription}>{activity.description}</Text>
      </View>
      <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>活动中心</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Activity Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>活动概览</Text>
          <View style={styles.statsGrid}>{ACTIVITY_STATS.map(renderStatCard)}</View>
        </View>

        {/* Achievement Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>成就徽章</Text>
          <View style={styles.badgesRow}>{ACHIEVEMENT_BADGES.map(renderAchievementBadge)}</View>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>近期活动</Text>
          <View style={styles.activitiesList}>
            {recentActivities.length > 0 ? (
              recentActivities.map(renderRecentActivity)
            ) : (
              <View style={styles.emptyActivities}>
                <Text style={styles.emptyActivitiesText}>暂无近期活动</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.base,
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.fonts.sizes.xxl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  // Achievement Badges
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '23%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeTitle: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.text,
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: theme.colors.textSecondary,
  },
  badgeUnlockedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  // Recent Activities
  activitiesList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  activityDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activityTimestamp: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  emptyActivities: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivitiesText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
