import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';
import { Review, ReviewTab, ReviewStats as ReviewStatsType } from '../../types/review';
import { ReviewCard, ReviewStats } from '../../components/Reviews';

// Mock data for demonstration
const mockReviews: Review[] = [
  {
    id: '1',
    matchId: 'match-1',
    raterId: 'user-1',
    rateeId: 'user-2',
    score: 5,
    comment: '非常棒的体验！对方很专业，沟通顺畅，强烈推荐！',
    createdAt: '2026-04-08T10:30:00Z',
    rater: { id: 'user-1', name: '张三', avatar: undefined },
    match: { id: 'match-1', title: '摄影服务订单 #1234', completedAt: '2026-04-07' },
  },
  {
    id: '2',
    matchId: 'match-2',
    raterId: 'user-3',
    rateeId: 'user-2',
    score: 4,
    comment: '整体不错，就是时间安排有点紧张。',
    createdAt: '2026-04-05T14:20:00Z',
    rater: { id: 'user-3', name: '李四', avatar: undefined },
    match: { id: 'match-2', title: '翻译服务订单 #1235', completedAt: '2026-04-04' },
  },
  {
    id: '3',
    matchId: 'match-3',
    raterId: 'user-2',
    rateeId: 'user-4',
    score: 5,
    comment: '合作愉快，期待下次！',
    createdAt: '2026-04-01T09:00:00Z',
    ratee: { id: 'user-4', name: '王五', avatar: undefined },
    match: { id: 'match-3', title: '设计服务订单 #1236', completedAt: '2026-03-31' },
  },
];

const mockStats: ReviewStatsType = {
  averageScore: 4.5,
  totalReviews: 12,
  distribution: [
    { score: 5, count: 7 },
    { score: 4, count: 3 },
    { score: 3, count: 1 },
    { score: 2, count: 1 },
    { score: 1, count: 0 },
  ],
};

export const ReviewListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ReviewTab>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [reviews] = useState<Review[]>(mockReviews);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleReviewPress = (review: Review) => {
    navigation.navigate('ReviewDetail', { reviewId: review.id });
  };

  const filteredReviews = reviews.filter(review =>
    activeTab === 'received'
      ? review.rateeId === 'user-2' // Current user ID (mock)
      : review.raterId === 'user-2'
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'received' ? '暂无收到的评价' : '暂无发出的评价'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'received' ? '完成订单后，对方可以为您评价' : '完成订单后，您可以为对方评价'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Stats section */}
      <ReviewStats stats={mockStats} />

      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
          testID="tab-received"
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            收到的评价
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'given' && styles.tabActive]}
          onPress={() => setActiveTab('given')}
          testID="tab-given"
        >
          <Text style={[styles.tabText, activeTab === 'given' && styles.tabTextActive]}>
            发出的评价
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的评价</Text>
      </View>

      <FlatList
        data={filteredReviews}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            showUser={activeTab === 'received' ? 'rater' : 'ratee'}
            onPress={handleReviewPress}
            testID={`review-card-${item.id}`}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  listContent: {
    paddingBottom: theme.spacing['2xl'],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textInverse,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
    marginHorizontal: theme.spacing.base,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
