/**
 * Points Wallet Screen
 * Main points wallet UI showing balance, transactions, and task list
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { PointsTransaction } from '@bridgeai/shared';

import { theme } from '../../theme';
import { pointsApi, PointsBalanceResponse } from '../../services/api/pointsApi';
import { TransactionList } from '../../components/Points/TransactionList';
import { PointsTaskList } from '../../components/Points/PointsTaskList';
import type { PointsTask } from '../../components/Points/PointsTaskList';

// Tab types for the wallet screen
type TabType = 'transactions' | 'tasks';

// Transaction filter types
type TransactionFilterType = 'all' | 'earn' | 'spend' | 'recharge';

const TRANSACTION_FILTERS: { key: TransactionFilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'earn', label: '获得' },
  { key: 'spend', label: '消耗' },
  { key: 'recharge', label: '充值' },
];

// Static task list for the "获取积分" tab (UI stub — replace with API call when available)
const DEFAULT_TASKS: PointsTask[] = [
  {
    id: 'daily-sign-in',
    name: '每日签到',
    description: '每天登录即可获得积分奖励',
    points: 10,
    icon: '✅',
    repeatable: true,
    dailyLimit: 1,
    completedCount: 0,
  },
  {
    id: 'upload-photo',
    name: '上传照片',
    description: '上传一张高质量照片获得积分',
    points: 20,
    icon: '📸',
    repeatable: true,
    dailyLimit: 5,
    completedCount: 0,
  },
  {
    id: 'share-vision',
    name: '分享视觉',
    description: '将照片分享到视觉社区获得积分',
    points: 15,
    icon: '🔗',
    repeatable: true,
    dailyLimit: 3,
    completedCount: 0,
  },
  {
    id: 'invite-friend',
    name: '邀请好友',
    description: '成功邀请一位好友注册获得积分',
    points: 50,
    icon: '👥',
    repeatable: true,
    dailyLimit: 10,
    completedCount: 0,
  },
  {
    id: 'complete-profile',
    name: '完善资料',
    description: '首次完善个人资料获得积分',
    points: 30,
    icon: '👤',
    repeatable: false,
    completedCount: 0,
  },
];

interface PointsBalanceData extends PointsBalanceResponse {
  availableBalance: number;
}

export const PointsWalletScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [balance, setBalance] = useState<PointsBalanceData | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [tasks, setTasks] = useState<PointsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [activeTransactionFilter, setActiveTransactionFilter] =
    useState<TransactionFilterType>('all');

  const loadData = useCallback(async () => {
    setError(null);
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
      // Load static task list (replace with API call when available)
      setTasks(DEFAULT_TASKS);
    } catch (_error: unknown) {
      setError('加载失败，请下拉刷新重试');
      setBalance(null);
      setTransactions([]);
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
    Alert.alert('充值积分', '积分充值功能即将上线', [{ text: '确定', style: 'default' }]);
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
        <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
          交易记录
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
        onPress={() => setActiveTab('tasks')}
      >
        <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
          获取积分
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransactionFilterRow = () => (
    <View style={styles.filterRow}>
      {TRANSACTION_FILTERS.map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterChip,
            activeTransactionFilter === filter.key && styles.filterChipActive,
          ]}
          onPress={() => setActiveTransactionFilter(filter.key)}
        >
          <Text
            style={[
              styles.filterChipText,
              activeTransactionFilter === filter.key && styles.filterChipTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const getFilteredTransactions = () => {
    if (activeTransactionFilter === 'all') {
      return transactions;
    }
    return transactions.filter(tx => tx.type === activeTransactionFilter);
  };

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

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {activeTab === 'transactions' ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {renderHeader()}
          {renderTabBar()}
          {renderTransactionFilterRow()}
          {getFilteredTransactions().length > 0 ? (
            <TransactionList
              transactions={getFilteredTransactions()}
              onTransactionPress={tx => {
                navigation.navigate('PointsTransactionDetail', { transactionId: tx.id } as never);
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无交易记录</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {renderHeader()}
          {renderTabBar()}
          {tasks.length > 0 ? (
            <PointsTaskList tasks={tasks} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无积分任务</Text>
            </View>
          )}
        </View>
      )}
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
  errorBanner: {
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#FFF3F3',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: '#D32F2F',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight || theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.fonts.weights.semibold,
  },
});
