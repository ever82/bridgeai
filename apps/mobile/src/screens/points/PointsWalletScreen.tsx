/**
 * Points Wallet Screen
 * Main points wallet UI showing balance, transactions, and task list
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { pointsApi, PointsBalanceResponse } from '../../services/api/pointsApi';
import { TransactionList } from '../../components/Points/TransactionList';
import { PointsTaskList } from '../../components/Points/PointsTaskList';
import type { PointsTransaction } from '@visionshare/shared';

// Tab types for the wallet screen
type TabType = 'transactions' | 'tasks';

const MOCK_RECENT_TRANSACTIONS: PointsTransaction[] = [
  {
    id: '1',
    accountId: 'a1',
    userId: 'u1',
    type: 'EARN' as any,
    amount: 100,
    balanceAfter: 1000,
    description: '每日签到奖励',
    scene: 'VISION_SHARE' as any,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    accountId: 'a1',
    userId: 'u1',
    type: 'SPEND' as any,
    amount: -50,
    balanceAfter: 950,
    description: '查看照片',
    scene: 'VISION_SHARE' as any,
    referenceId: 'photo-123',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const POINTS_TASKS = [
  {
    id: 'task-1',
    name: '每日签到',
    description: '每日签到可获得积分奖励',
    points: 10,
    icon: '📅',
    repeatable: true,
    dailyLimit: 1,
    completedCount: 0,
  },
  {
    id: 'task-2',
    name: '完善个人资料',
    description: '完善个人资料可获得积分',
    points: 50,
    icon: '👤',
    repeatable: false,
    completedCount: 0,
  },
  {
    id: 'task-3',
    name: '上传头像',
    description: '上传头像可获得积分',
    points: 20,
    icon: '📷',
    repeatable: false,
    completedCount: 0,
  },
  {
    id: 'task-4',
    name: '邀请好友',
    description: '每成功邀请一位好友可获得积分',
    points: 100,
    icon: '👥',
    repeatable: true,
    dailyLimit: 3,
    completedCount: 0,
  },
  {
    id: 'task-5',
    name: '分享应用',
    description: '分享应用到社交媒体可获得积分',
    points: 5,
    icon: '📤',
    repeatable: true,
    dailyLimit: 5,
    completedCount: 0,
  },
];

interface PointsBalanceData extends PointsBalanceResponse {
  availableBalance: number;
}

export const PointsWalletScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [balance, setBalance] = useState<PointsBalanceData | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  const loadData = useCallback(async () => {
    try {
      const [balanceData, txData] = await Promise.all([
        pointsApi.getBalance(),
        pointsApi.getTransactions({ page: 1, pageSize: 20 }),
      ]);

      setBalance({
        ...balanceData,
        availableBalance: balanceData.balance,
      });
      setTransactions(txData.transactions ?? []);
    } catch (error: any) {
      // Use mock data when API is unavailable
      setBalance({
        balance: 1000,
        totalEarned: 1500,
        totalSpent: 500,
        lastUpdatedAt: new Date().toISOString(),
        availableBalance: 1000,
      });
      setTransactions(MOCK_RECENT_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRecharge = useCallback(() => {
    Alert.alert(
      '充值积分',
      '积分充值功能即将上线',
      [{ text: '确定', style: 'default' }]
    );
  }, []);

  const formatBalance = (value: number) => {
    return value.toLocaleString('zh-CN');
  };

  const renderHeader = () => (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>我的积分</Text>
      <Text style={styles.balanceValue}>{balance ? formatBalance(balance.balance) : '--'}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            +{balance ? formatBalance(balance.totalEarned) : '--'}
          </Text>
          <Text style={styles.statLabel}>累计获得</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            -{balance ? formatBalance(balance.totalSpent) : '--'}
          </Text>
          <Text style={styles.statLabel}>累计消耗</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.rechargeButton} onPress={handleRecharge}>
        <Text style={styles.rechargeButtonText}>充值积分</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
        onPress={() => setActiveTab('transactions')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'transactions' && styles.tabTextActive,
          ]}
        >
          交易记录
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
        onPress={() => setActiveTab('tasks')}
      >
        <Text
          style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}
        >
          获取积分
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>积分钱包</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={activeTab === 'transactions' ? transactions : POINTS_TASKS}
        keyExtractor={(item) => ('id' in item ? item.id : String(item))}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderTabBar()}
          </>
        }
        renderItem={
          activeTab === 'transactions'
            ? ({ item }) => (
                <TransactionList
                  transactions={[item]}
                  onTransactionPress={(tx) => {
                    // Navigate to transaction detail
                    Alert.alert('交易详情', `交易ID: ${tx.id}`);
                  }}
                />
              )
            : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'transactions' ? '暂无交易记录' : '暂无积分任务'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  backText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  headerRight: {
    width: 60,
  },
  balanceCard: {
    margin: theme.spacing.base,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  balanceLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: theme.fonts.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rechargeButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: '#FFFFFF',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  rechargeButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.medium,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    padding: theme.spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});
