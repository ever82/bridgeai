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

import { transactionApi, RefundItem } from '../../services/api/transactionApi';
import { theme } from '../../theme';

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: theme.colors.warning,
  APPROVED: theme.colors.success,
  REJECTED: theme.colors.error,
  CANCELLED: theme.colors.textSecondary,
};

export const RefundListScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRefunds = useCallback(async (p: number, isRefresh = false) => {
    try {
      const res = await transactionApi.getRefunds({ page: p, limit: 20 });
      if (res.success) {
        const data = res.data;
        setRefunds(prev => (isRefresh ? data.refunds : [...prev, ...data.refunds]));
        setHasMore(p < data.totalPages);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds(1);
  }, [fetchRefunds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchRefunds(1, true);
    setRefreshing(false);
  }, [fetchRefunds]);

  const onLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchRefunds(next);
    }
  }, [hasMore, loading, page, fetchRefunds]);

  const renderItem = ({ item }: { item: RefundItem }) => (
    <TouchableOpacity
      style={styles.refundItem}
      onPress={() => navigation.navigate('RefundDetail', { refundId: item.id })}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemAmount}>{Number(item.refundAmount).toFixed(2)} 积分</Text>
        <Text style={styles.itemReason} numberOfLines={1}>
          {item.reason}
        </Text>
        {item.transaction && (
          <Text style={styles.itemTransaction}>
            关联交易: {Number(item.transaction.amount).toFixed(2)} - {item.transaction.type}
          </Text>
        )}
        <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text
          style={[
            styles.itemStatus,
            { color: STATUS_COLORS[item.status] || theme.colors.textSecondary },
          ]}
        >
          {STATUS_LABELS[item.status] || item.status}
        </Text>
        {item.status === 'REJECTED' && <Text style={styles.appealHint}>可申诉</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>退款记录</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading && refunds.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无退款记录</Text>
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
  refundItem: {
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
  itemAmount: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  itemReason: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemTransaction: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
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
  itemStatus: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  appealHint: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
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
