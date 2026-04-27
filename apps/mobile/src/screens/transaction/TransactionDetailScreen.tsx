import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { transactionApi, TransactionDetail as TDetail } from '../../services/api/transactionApi';
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

const REFUND_STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

export const TransactionDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionId } = route.params as { transactionId: string };

  const [detail, setDetail] = useState<TDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await transactionApi.getDetail(transactionId);
      if (res.success) setDetail(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.loadingContainer]}>
        <Text style={styles.emptyText}>交易记录不存在</Text>
      </View>
    );
  }

  const canRefund = detail.status === 'SUCCESS' && detail.type !== 'REFUND' && !detail.refund;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>交易详情</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Amount & Status */}
        <View style={styles.amountCard}>
          <Text
            style={[
              styles.amountText,
              detail.type === 'DEDUCT' ? styles.amountNegative : styles.amountPositive,
            ]}
          >
            {detail.type === 'DEDUCT' ? '-' : '+'}
            {detail.amount.toFixed(2)}
          </Text>
          <Text style={styles.statusText}>{STATUS_LABELS[detail.status] || detail.status}</Text>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <DetailRow label="交易类型" value={TYPE_LABELS[detail.type] || detail.type} />
          <DetailRow label="交易编号" value={detail.id} />
          {detail.description && <DetailRow label="描述" value={detail.description} />}
          {detail.referenceId && <DetailRow label="关联编号" value={detail.referenceId} />}
          <DetailRow label="创建时间" value={new Date(detail.createdAt).toLocaleString('zh-CN')} />
          <DetailRow label="更新时间" value={new Date(detail.updatedAt).toLocaleString('zh-CN')} />
        </View>

        {/* Existing refund info */}
        {detail.refund && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>退款信息</Text>
            <DetailRow
              label="退款状态"
              value={REFUND_STATUS_LABELS[detail.refund.status] || detail.refund.status}
            />
            <DetailRow label="退款金额" value={detail.refund.refundAmount.toFixed(2)} />
            <DetailRow label="退款原因" value={detail.refund.reason} />
            <DetailRow
              label="申请时间"
              value={new Date(detail.refund.createdAt).toLocaleString('zh-CN')}
            />
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.navigate('RefundDetail', { refundId: detail.refund!.id })}
            >
              <Text style={styles.linkText}>查看退款详情 ›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Refund button */}
        {canRefund && (
          <TouchableOpacity
            style={styles.refundButton}
            onPress={() => navigation.navigate('CreateRefund', { transactionId: detail.id })}
          >
            <Text style={styles.refundButtonText}>申请退款</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  amountCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.base,
    ...theme.shadows.sm,
  },
  amountText: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    marginBottom: theme.spacing.sm,
  },
  amountPositive: {
    color: theme.colors.success,
  },
  amountNegative: {
    color: theme.colors.error,
  },
  statusText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  detailCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  detailLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.base,
  },
  linkBtn: {
    marginTop: theme.spacing.base,
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
  },
  refundButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.xl,
  },
  refundButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textTertiary,
  },
});
