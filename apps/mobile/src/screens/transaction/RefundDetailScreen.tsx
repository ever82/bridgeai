import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { transactionApi, RefundDetail as RDetail } from '../../services/api/transactionApi';
import { theme } from '../../theme';

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

const APPEAL_STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

export const RefundDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { refundId } = route.params as { refundId: string };

  const [detail, setDetail] = useState<RDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await transactionApi.getRefundDetail(refundId);
      if (res.success) setDetail(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = useCallback(() => {
    Alert.alert('取消退款', '确定要取消该退款申请吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            await transactionApi.cancelRefund(refundId);
            fetchDetail();
          } catch {
            Alert.alert('错误', '取消退款失败');
          }
        },
      },
    ]);
  }, [refundId, fetchDetail]);

  const handleAppeal = useCallback(() => {
    navigation.navigate('CreateAppeal', { refundId });
  }, [navigation, refundId]);

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
        <Text style={styles.emptyText}>退款记录不存在</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>退款详情</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status & Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountText}>{Number(detail.refundAmount).toFixed(2)} 积分</Text>
          <Text style={styles.statusText}>{STATUS_LABELS[detail.status] || detail.status}</Text>
        </View>

        {/* Refund info */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>退款信息</Text>
          <DetailRow label="退款原因" value={detail.reason} />
          {detail.details && <DetailRow label="详细说明" value={detail.details} />}
          <DetailRow label="积分退回" value={detail.pointsRefunded ? '已退回' : '未退回'} />
          {detail.reviewNote && <DetailRow label="审核备注" value={detail.reviewNote} />}
          <DetailRow label="申请时间" value={new Date(detail.createdAt).toLocaleString('zh-CN')} />
        </View>

        {/* Original transaction */}
        {detail.transaction && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>关联交易</Text>
            <DetailRow label="交易金额" value={Number(detail.transaction.amount).toFixed(2)} />
            <DetailRow label="交易类型" value={detail.transaction.type} />
            {detail.transaction.description && (
              <DetailRow label="描述" value={detail.transaction.description} />
            )}
          </View>
        )}

        {/* Appeals */}
        {detail.appeals.length > 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>申诉记录 ({detail.appeals.length})</Text>
            {detail.appeals.map((appeal, idx) => (
              <View key={appeal.id} style={styles.appealItem}>
                <View style={styles.appealHeader}>
                  <Text style={styles.appealIndex}>申诉 #{idx + 1}</Text>
                  <Text style={styles.appealStatus}>
                    {APPEAL_STATUS_LABELS[appeal.status] || appeal.status}
                  </Text>
                </View>
                <Text style={styles.appealReason}>{appeal.reason}</Text>
                {appeal.reviewNote && (
                  <Text style={styles.appealNote}>审核备注: {appeal.reviewNote}</Text>
                )}
                <Text style={styles.appealDate}>
                  {new Date(appeal.createdAt).toLocaleString('zh-CN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {detail.status === 'PENDING' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>取消退款申请</Text>
          </TouchableOpacity>
        )}

        {detail.status === 'REJECTED' && (
          <TouchableOpacity style={styles.appealButton} onPress={handleAppeal}>
            <Text style={styles.appealButtonText}>发起申诉</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
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
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
  appealItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appealIndex: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  appealStatus: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
  },
  appealReason: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  appealNote: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  appealDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fonts.sizes.base,
  },
  appealButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  appealButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textTertiary,
  },
});
