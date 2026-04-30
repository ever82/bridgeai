import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AgentCreditInfo } from '@bridgeai/shared';

import { useAuthStore } from '../../stores/authStore';
import { creditApi } from '../../services/api/credit';
import { theme } from '../../theme';
import { CreditBadge } from '../../components/Credit';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const [creditInfo, setCreditInfo] = useState<AgentCreditInfo | null>(null);

  useEffect(() => {
    creditApi
      .getCreditScore()
      .then(data => {
        // Map CreditLevel to AgentCreditInfo level (1-5)
        const levelMap: Record<string, number> = {
          excellent: 5,
          good: 4,
          general: 3,
          poor: 2,
        };
        setCreditInfo({
          score: data.score,
          level: levelMap[data.level] ?? 1,
          trend: 'stable',
          history: data.history ?? [],
          description: data.levelDescription ?? '',
        });
      })
      .catch(() => {
        // Fallback to default on error
        setCreditInfo({
          score: 0,
          level: 1,
          trend: 'stable',
          history: [],
          description: '',
        });
      });
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const menuItems: { icon: string; title: string; onPress: () => void; testID?: string }[] = [
    { icon: '📝', title: '我的动态', onPress: () => navigation.navigate('MyMoments') },
    { icon: '⭐', title: '我的评价', onPress: () => navigation.navigate('ReviewList') },
    { icon: '💰', title: '交易记录', onPress: () => navigation.navigate('TransactionList') },
    { icon: '💎', title: '积分账户', onPress: () => navigation.navigate('PointsWallet') },
    { icon: '📊', title: '我的活动', onPress: () => navigation.navigate('Activity') },
    { icon: '❤️', title: '赞过的', onPress: () => navigation.navigate('LikedMoments') },
    {
      icon: '🤖',
      title: '我的 Agent',
      onPress: () => navigation.navigate('AgentList'),
      testID: 'profile-agent-list-button',
    },
    { icon: '⚙️', title: '设置', onPress: () => navigation.navigate('Settings') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="profile-header">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || '未登录用户'}</Text>
            <Text style={styles.userHandle}>@{user?.username || 'unknown'}</Text>
            <Text style={styles.userId}>ID: {user?.id || '-'}</Text>
            <Text style={styles.userMeta}>
              注册于 {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
            </Text>
            {user?.bio && <Text style={styles.userBio}>{user.bio}</Text>}
            {user?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>已认证</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>编辑资料</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.momentsCount || 0}</Text>
            <Text style={styles.statLabel}>动态</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </View>
        </View>

        <View style={styles.creditSection}>
          <View style={styles.creditSectionHeader}>
            <Text style={styles.creditSectionLabel}>信用分</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreditDetail')}>
              <Text style={styles.creditDetailLink}>信用详情 ›</Text>
            </TouchableOpacity>
          </View>
          {creditInfo && (
            <CreditBadge
              credit={creditInfo}
              size="medium"
              showTrend={true}
              showLevel={true}
              onPress={() => navigation.navigate('CreditDetail')}
            />
          )}
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
              onPress={item.onPress}
              testID={item.testID}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="profile-logout-button"
        >
          <Text style={styles.logoutButtonText}>退出登录</Text>
        </TouchableOpacity>

        <Text style={styles.version}>BridgeAI v1.0.0</Text>
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
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  avatarText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userHandle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  userId: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  userMeta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  userBio: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  verifiedBadge: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  verifiedText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.semibold,
  },
  editButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  editButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  creditSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  creditSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  creditSectionLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  creditDetailLink: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
  },
  menuSection: {
    marginTop: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: theme.spacing.base,
  },
  menuTitle: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  menuArrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textSecondary,
  },
  logoutButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing['2xl'],
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  version: {
    textAlign: 'center',
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing['2xl'],
    marginBottom: theme.spacing.lg,
  },
});
