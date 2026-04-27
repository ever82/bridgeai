/**
 * TransactionHistory Screen
 * Displays payment transaction history for VisionShare
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import type { PaymentTransaction } from '../../../shared/types/payment.types';
import { PaymentStatus } from '../../../shared/types/payment.types';
import { visionShareApi } from '../../services/api/visionShare';

interface TransactionHistoryScreenProps {
  onBack: () => void;
  onTransactionPress?: (transaction: PaymentTransaction) => void;
}

const STATUS_LABELS: Record<string, string> = {
  [PaymentStatus.PENDING]: '处理中',
  [PaymentStatus.PROCESSING]: '处理中',
  [PaymentStatus.COMPLETED]: '已完成',
  [PaymentStatus.FAILED]: '失败',
  [PaymentStatus.REFUNDED]: '已退款',
  [PaymentStatus.DISPUTED]: '争议中',
};

const STATUS_COLORS: Record<string, string> = {
  [PaymentStatus.PENDING]: '#f39c12',
  [PaymentStatus.PROCESSING]: '#3498db',
  [PaymentStatus.COMPLETED]: '#27ae60',
  [PaymentStatus.FAILED]: '#e74c3c',
  [PaymentStatus.REFUNDED]: '#9b59b6',
  [PaymentStatus.DISPUTED]: '#e67e22',
};

export const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  onBack,
  onTransactionPress,
}) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadTransactions = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const result = await visionShareApi.getTransactions(pageNum, 20);
      if (result.success && result.data) {
        if (refresh || pageNum === 1) {
          setTransactions(result.data.transactions);
        } else {
          setTransactions(prev => [...prev, ...result.data.transactions]);
        }
        setHasMore(result.data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      // silently handle
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTransactions(1, true);
  }, [loadTransactions]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadTransactions(page + 1);
    }
  }, [hasMore, isLoading, page, loadTransactions]);

  const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
    <TouchableOpacity style={styles.transactionItem} onPress={() => onTransactionPress?.(item)}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionType}>
          {item.type === 'purchase' ? '照片解锁' : item.type}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>-{item.amount} 积分</Text>
        <Text style={[styles.transactionStatus, { color: STATUS_COLORS[item.status] || '#999' }]}>
          {STATUS_LABELS[item.status] || item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无交易记录</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>交易记录</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={transactions.length === 0 ? styles.listEmpty : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#007AFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
  },
  transactionStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  listEmpty: {
    flexGrow: 1,
  },
});
