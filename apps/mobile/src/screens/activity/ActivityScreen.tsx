import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
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

/** 从 user 数据派生活动概览统计 */
const getActivityStats = (
  user: ReturnType<typeof useAuthStore.getState>['user']
): ActivityStat[] => [
  { id: '1', label: '对话数', value: user?.momentsCount ?? 0, icon: '💬' },
  { id: '2', label: '匹配数', value: user?.followersCount ?? 0, icon: '🤝' },
  { id: '3', label: '发布数', value: user?.followingCount ?? 0, icon: '📝' },
];

/** 根据 user 数据计算成就徽章解锁状态 */
const getAchievementBadges = (
  user: ReturnType<typeof useAuthStore.getState>['user']
): AchievementBadge[] => [
  { id: '1', title: '首次对话', icon: '🎯', unlocked: (user?.momentsCount ?? 0) > 0 },
  { id: '2', title: '发布达人', icon: '⭐', unlocked: (user?.momentsCount ?? 0) >= 5 },
  { id: '3', title: '匹配达人', icon: '🏆', unlocked: (user?.followersCount ?? 0) >= 5 },
  { id: '4', title: '连续活跃', icon: '🔥', unlocked: (user?.followingCount ?? 0) >= 10 },
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

/** 根据近期活动 timestamp（如 "今天"/"X天前"/"刚刚"）派生有活动的日期集合（YYYY-MM-DD） */
const getActivityDates = (activities: RecentActivity[]): Set<string> => {
  const dates = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  activities.forEach(a => {
    let offset = 0;
    if (a.timestamp === '刚刚' || a.timestamp === '今天') {
      offset = 0;
    } else {
      const match = a.timestamp.match(/^(\d+)天前$/);
      if (match) {
        offset = parseInt(match[1], 10);
      } else {
        return;
      }
    }
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    dates.add(formatKey(d));
  });

  return dates;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const ActivityScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(state => state.user);
  const activityStats = getActivityStats(user);
  const achievementBadges = getAchievementBadges(user);
  const recentActivities = getRecentActivities(user);
  const activityDates = useMemo(() => getActivityDates(recentActivities), [recentActivities]);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: `pad-${i}`, day: null, dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      cells.push({ key: dateKey, day: d, dateKey });
    }
    return cells;
  }, [calendarMonth]);

  const handleShareStats = async () => {
    const statsLines = activityStats.map(s => `${s.icon} ${s.label}: ${s.value}`).join('\n');
    const unlockedCount = achievementBadges.filter(b => b.unlocked).length;
    const message = `我的活动统计\n${statsLines}\n🏅 已解锁成就: ${unlockedCount}/${achievementBadges.length}`;
    try {
      await Share.share({ message });
    } catch {
      // Silently ignore share errors (e.g. user cancelled)
    }
  };

  const goPrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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
        <TouchableOpacity
          onPress={handleShareStats}
          style={styles.shareButton}
          accessibilityRole="button"
          accessibilityLabel="分享活动统计"
        >
          <Text style={styles.shareButtonText}>分享</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Activity Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>活动概览</Text>
          <View style={styles.statsGrid}>{activityStats.map(renderStatCard)}</View>
        </View>

        {/* Achievement Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>成就徽章</Text>
          <View style={styles.badgesRow}>{achievementBadges.map(renderAchievementBadge)}</View>
        </View>

        {/* Activity Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>活动日历</Text>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={goPrevMonth} style={styles.calendarNavBtn}>
                <Text style={styles.calendarNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
              </Text>
              <TouchableOpacity onPress={goNextMonth} style={styles.calendarNavBtn}>
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>
              {WEEKDAYS.map(w => (
                <Text key={w} style={styles.calendarWeekday}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map(cell => {
                const hasActivity = cell.dateKey ? activityDates.has(cell.dateKey) : false;
                const isToday = cell.dateKey === todayKey;
                return (
                  <View key={cell.key} style={styles.calendarCell}>
                    {cell.day !== null && (
                      <View style={[styles.calendarDayWrap, isToday && styles.calendarDayToday]}>
                        <Text
                          style={[styles.calendarDayText, isToday && styles.calendarDayTextToday]}
                        >
                          {cell.day}
                        </Text>
                        {hasActivity && <View style={styles.calendarDayDot} />}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.calendarLegend}>
              <View style={styles.calendarLegendDot} />
              <Text style={styles.calendarLegendText}>有活动</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  shareButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
  },
  shareButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
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
  // Calendar
  calendarCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.base,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  calendarNavBtn: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  calendarNavText: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.bold,
  },
  calendarMonthLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayToday: {
    backgroundColor: theme.colors.primaryLight,
  },
  calendarDayText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  calendarDayTextToday: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.bold,
  },
  calendarDayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.success,
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  calendarLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: theme.spacing.xs,
  },
  calendarLegendText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
});
