import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  transactionApi,
  TransactionItem,
  TransactionStats,
} from '../../services/api/transactionApi';
import { theme } from '../../theme';

const TYPE_LABELS: Record<string, string> = {
  RECHARGE: '充值',
  REWARD: '奖励',
  DEDUCT: '消费',
  REFUND: '退款',
  TRANSFER: '转账',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '处理中',
  SUCCESS: '成功',
  FAILED: '失败',
  CANCELLED: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: theme.colors.warning,
  SUCCESS: theme.colors.success,
  FAILED: theme.colors.error,
  CANCELLED: theme.colors.textSecondary,
};

export const TransactionListScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    try {
      const res = await transactionApi.getStats();
      if (res.success) setStats(res.data);
    } catch {
      // silent
    }
  }, []);

  const fetchTransactions = useCallback(async (p: number, type: string, isRefresh = false) => {
    try {
      const res = await transactionApi.getTransactions({
        page: p,
        limit: 20,
        type: type === 'all' ? undefined : type.toLowerCase(),
      });
      if (res.success) {
        const data = res.data;
        setTransactions(prev => (isRefresh ? data.transactions : [...prev, ...data.transactions]));
        setHasMore(p < data.totalPages);
      }
    } catch {
      // silent
    }
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      const p = isRefresh ? 1 : page;
      setLoading(!isRefresh && p === 1);
      await Promise.all([fetchStats(), fetchTransactions(p, activeType, isRefresh)]);
      setLoading(false);
    },
    [page, activeType, fetchStats, fetchTransactions]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const onLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
    }
  }, [hasMore, loading]);

  const onTypeFilter = useCallback(
    (type: string) => {
      setActiveType(type);
      setTransactions([]);
      setPage(1);
      fetchTransactions(1, type, true);
    },
    [fetchTransactions]
  );

  const renderItem = ({ item }: { item: TransactionItem }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemType}>{TYPE_LABELS[item.type] || item.type}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text
          style={[
            styles.itemAmount,
            item.type === 'DEDUCT' ? styles.amountNegative : styles.amountPositive,
          ]}
        >
          {item.type === 'DEDUCT' ? '-' : '+'}
          {item.amount.toFixed(2)}
        </Text>
        <Text
          style={[
            styles.itemStatus,
            { color: STATUS_COLORS[item.status] || theme.colors.textSecondary },
          ]}
        >
          {STATUS_LABELS[item.status] || item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const typeFilters = [
    { key: 'all', label: '全部' },
    { key: 'recharge', label: '充值' },
    { key: 'deduct', label: '消费' },
    { key: 'refund', label: '退款' },
    { key: 'reward', label: '奖励' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>交易记录</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RefundList')}>
          <Text style={styles.refundBtn}>退款</Text>
        </TouchableOpacity>
      </View>

      {/* Stats summary */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>+{stats.thisMonthIncome.toFixed(2)}</Text>
            <Text style={styles.statLabel}>本月收入</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>-{stats.thisMonthExpense.toFixed(2)}</Text>
            <Text style={styles.statLabel}>本月支出</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCount}</Text>
            <Text style={styles.statLabel}>总交易数</Text>
          </View>
        </View>
      )}

      {/* Type filter */}
      <View style={styles.filterRow}>
        {typeFilters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, activeType === f.key && styles.filterBtnActive]}
            onPress={() => onTypeFilter(f.key)}
          >
            <Text style={[styles.filterText, activeType === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无交易记录</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    fontSize: 28,
    color: theme.colors.primary,
    width: 32,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  refundBtn: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    marginTop: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterBtn: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.semibold,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  itemLeft: {
    flex: 1,
  },
  itemType: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  itemDesc: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  amountPositive: {
    color: theme.colors.success,
  },
  amountNegative: {
    color: theme.colors.error,
  },
  itemStatus: {
    fontSize: theme.fonts.sizes.xs,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing['4xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textTertiary,
  },
});
