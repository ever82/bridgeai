import React, { useState, useCallback, useEffect } from 'react';
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

import { theme } from '../../theme';
import { Review, ReviewTab, ReviewStats as ReviewStatsType } from '../../types/review';
import { ReviewCard, ReviewStats } from '../../components/Reviews';
import { getReceivedReviews, getGivenReviews, getReviewStats } from '../../services/api/reviewApi';

export const ReviewListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ReviewTab>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStatsType | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getReviewStats();
      const data = res.data.data;
      // Convert backend stats to frontend ReviewStatsType format
      const statsData: ReviewStatsType = {
        averageScore: data.avgRating,
        totalReviews:
          data.fiveStarCount +
          data.fourStarCount +
          data.threeStarCount +
          data.twoStarCount +
          data.oneStarCount,
        distribution: [
          { score: 5, count: data.fiveStarCount },
          { score: 4, count: data.fourStarCount },
          { score: 3, count: data.threeStarCount },
          { score: 2, count: data.twoStarCount },
          { score: 1, count: data.oneStarCount },
        ],
      };
      setStats(statsData);
    } catch {
      // Stats are non-critical, silently fail
    }
  }, []);

  const fetchReviews = useCallback(async (tab: ReviewTab) => {
    setLoading(true);
    setError(null);
    try {
      const apiCall = tab === 'received' ? getReceivedReviews : getGivenReviews;
      const res = await apiCall();
      setReviews(res.data.data.reviews);
    } catch (err) {
      setError('加载评价失败，请稍后重试');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(activeTab);
  }, [activeTab, fetchReviews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchReviews(activeTab), fetchStats()]);
    setRefreshing(false);
  }, [activeTab, fetchReviews, fetchStats]);

  const handleReviewPress = (review: Review) => {
    navigation.navigate('ReviewDetail', { reviewId: review.id });
  };

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
      {stats && <ReviewStats stats={stats} />}

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
        data={reviews}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            showUser={activeTab === 'received' ? 'reviewer' : 'reviewee'}
            onPress={handleReviewPress}
            testID={`review-card-${item.id}`}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && !error ? renderEmptyState : null}
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

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchReviews(activeTab)}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  errorBanner: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    flex: 1,
  },
  retryText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    marginLeft: theme.spacing.base,
  },
});
