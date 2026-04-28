/**
 * Points Transaction Detail Screen
 * Shows full transaction details including associated scene
 */

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

import { theme } from '../../theme';
import { pointsApi, TransactionDetailResponse } from '../../services/api/pointsApi';

const TYPE_LABELS: Record<string, string> = {
  earn: '获得',
  EARN: '获得',
  spend: '消费',
  SPEND: '消费',
  reward: '奖励',
  REWARD: '奖励',
  recharge: '充值',
  RECHARGE: '充值',
};

const SCENE_LABELS: Record<string, string> = {
  vision_share: 'VisionShare场景',
  agent_date: 'AI约会场景',
  agent_job: 'AI求职场景',
  agent_ad: 'AI广告场景',
};

interface RouteParams {
  transaction?: TransactionDetailResponse;
  transactionId?: string;
}

export const PointsTransactionDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { transaction: passedTransaction, transactionId } = (route.params as RouteParams) || {};

  const [detail, setDetail] = useState<TransactionDetailResponse | null>(passedTransaction ?? null);
  const [loading, setLoading] = useState(!passedTransaction);

  const fetchDetail = useCallback(async () => {
    const id = transactionId || passedTransaction?.id;
    if (!id) return;
    try {
      const data = await pointsApi.getTransaction(id);
      setDetail(data);
    } catch {
      // If API fails and we have passed data, keep it
    } finally {
      setLoading(false);
    }
  }, [transactionId, passedTransaction?.id]);

  useEffect(() => {
    if (!passedTransaction) {
      fetchDetail();
    }
  }, [passedTransaction, fetchDetail]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <Text style={styles.emptyText}>交易记录不存在</Text>
      </View>
    );
  }

  const isSpend = detail.amount < 0 || detail.type === 'spend' || detail.type === 'SPEND';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>交易详情</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text
            style={[styles.amountText, isSpend ? styles.amountNegative : styles.amountPositive]}
          >
            {isSpend ? '' : '+'}
            {detail.amount}
          </Text>
          <Text style={styles.balanceText}>
            余额: {detail.balanceAfter.toLocaleString('zh-CN')}
          </Text>
        </View>

        {/* Detail Rows */}
        <View style={styles.detailCard}>
          <DetailRow label="交易类型" value={TYPE_LABELS[detail.type] || detail.type} />
          <DetailRow label="交易编号" value={detail.id} />
          {detail.description && <DetailRow label="描述" value={detail.description} />}
          {detail.scene && (
            <DetailRow label="关联场景" value={SCENE_LABELS[detail.scene] || detail.scene} />
          )}
          {detail.referenceId && <DetailRow label="关联编号" value={detail.referenceId} />}
          <DetailRow label="创建时间" value={new Date(detail.createdAt).toLocaleString('zh-CN')} />
        </View>

        {/* Scene Info */}
        {detail.scene && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>关联场景信息</Text>
            <Text style={styles.sceneDescription}>
              {getSceneDescription(detail.scene, detail.description)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function getSceneDescription(scene: string, description?: string): string {
  switch (scene) {
    case 'vision_share':
      return description ?? 'VisionShare视觉分享场景积分交易';
    case 'agent_date':
      return description ?? 'AI约会场景积分交易';
    case 'agent_job':
      return description ?? 'AI求职场景积分交易';
    case 'agent_ad':
      return description ?? 'AI广告场景积分交易';
    default:
      return description ?? `${scene}场景积分交易`;
  }
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
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
    backgroundColor: theme.colors.background,
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
  balanceText: {
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
  sceneDescription: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
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
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textTertiary,
  },
});
