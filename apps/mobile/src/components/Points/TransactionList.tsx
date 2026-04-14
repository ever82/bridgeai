/**
 * TransactionList component
 * Displays a list of points transactions in a timeline format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { theme } from '../../theme';
import type { PointsTransaction, PointsTransactionType, SceneCode } from '@visionshare/shared';

// Transaction type display config
const TRANSACTION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; isIncome: boolean }
> = {
  EARN: { label: '获得积分', icon: '+', color: theme.colors.success, isIncome: true },
  SPEND: { label: '消耗积分', icon: '-', color: theme.colors.error, isIncome: false },
  RECHARGE: { label: '充值', icon: '+', color: theme.colors.success, isIncome: true },
  REFUND: { label: '退款', icon: '+', color: theme.colors.success, isIncome: true },
  FROZEN: { label: '冻结', icon: '-', color: theme.colors.warning, isIncome: false },
  UNFROZEN: { label: '解冻', icon: '+', color: theme.colors.success, isIncome: true },
  DEDUCT: { label: '扣除', icon: '-', color: theme.colors.error, isIncome: false },
  TRANSFER_IN: { label: '转入', icon: '+', color: theme.colors.success, isIncome: true },
  TRANSFER_OUT: { label: '转出', icon: '-', color: theme.colors.error, isIncome: false },
};

// Scene display names
const SCENE_LABELS: Record<string, string> = {
  VISION_SHARE: 'VisionShare',
  AGENT_DATE: 'Agent约会',
  AGENT_JOB: 'Agent招聘',
  AGENT_AD: 'Agent广告',
  SYSTEM: '系统',
};

interface TransactionListProps {
  transactions: PointsTransaction[];
  onTransactionPress?: (transaction: PointsTransaction) => void;
  limit?: number;
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
};

const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  return absAmount.toLocaleString('zh-CN');
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onTransactionPress,
  limit,
}) => {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  const renderItem = ({ item, index }: { item: PointsTransaction; index: number }) => {
    const config = TRANSACTION_TYPE_CONFIG[item.type] ?? {
      label: item.type,
      icon: item.amount >= 0 ? '+' : '-',
      color: theme.colors.textSecondary,
      isIncome: item.amount >= 0,
    };
    const isIncome = item.amount >= 0;

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => onTransactionPress?.(item)}
        disabled={!onTransactionPress}
        activeOpacity={0.7}
      >
        {/* Timeline dot */}
        <View style={styles.timeline}>
          <View style={[styles.dot, { backgroundColor: config.color }]} />
          {index < displayTransactions.length - 1 && <View style={styles.line} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.description} numberOfLines={1}>
              {item.description || config.label}
            </Text>
            <Text style={[styles.amount, { color: config.color }]}>
              {isIncome ? '+' : '-'}
              {formatAmount(item.amount)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.tags}>
              <View style={[styles.tag, { backgroundColor: `${config.color}15` }]}>
                <Text style={[styles.tagText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              {item.scene && (
                <View style={[styles.tag, styles.sceneTag]}>
                  <Text style={styles.sceneTagText}>
                    {SCENE_LABELS[item.scene] ?? item.scene}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>

          {item.referenceId && (
            <Text style={styles.referenceId} numberOfLines={1}>
              关联ID: {item.referenceId}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (displayTransactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无交易记录</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={displayTransactions}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
  },
  transactionItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
  },
  timeline: {
    alignItems: 'center',
    marginRight: theme.spacing.base,
    width: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
    minHeight: 20,
  },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.medium,
    marginRight: theme.spacing.sm,
  },
  amount: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  sceneTag: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  sceneTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  time: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  referenceId: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});
