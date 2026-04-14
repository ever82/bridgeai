import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';

interface SearchRecommendation {
  type: 'trending' | 'personal' | 'similar' | 'discovery';
  query: string;
  score: number;
  metadata?: {
    icon?: string;
    category?: string;
    reason?: string;
    count?: number;
  };
}

interface SearchRecommendationsProps {
  onRecommendationPress: (query: string) => void;
  userId?: string;
  showTrending?: boolean;
  showPersonal?: boolean;
  showDiscovery?: boolean;
}

export const SearchRecommendations: React.FC<SearchRecommendationsProps> = ({
  onRecommendationPress,
  showTrending = true,
  showPersonal = true,
  showDiscovery = true,
}) => {
  const [recommendations, setRecommendations] = useState<SearchRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);

    // TODO: Load from API
    const mockRecommendations: SearchRecommendation[] = [
      // Trending
      ...(showTrending
        ? [
            {
              type: 'trending',
              query: 'summer vacation',
              score: 0.95,
              metadata: { icon: '🔥', category: 'Trending', count: 1247 },
            },
            {
              type: 'trending',
              query: 'family photos',
              score: 0.92,
              metadata: { icon: '🔥', category: 'Trending', count: 892 },
            },
            {
              type: 'trending',
              query: 'sunset',
              score: 0.88,
              metadata: { icon: '🔥', category: 'Trending', count: 654 },
            },
          ]
        : []),
      // Personal
      ...(showPersonal
        ? [
            {
              type: 'personal',
              query: 'beach sunset',
              score: 0.9,
              metadata: { icon: '↻', category: 'Recent', reason: 'You searched for this' },
            },
            {
              type: 'personal',
              query: 'birthday party',
              score: 0.85,
              metadata: { icon: '↻', category: 'Recent', reason: 'You searched for this' },
            },
          ]
        : []),
      // Discovery
      ...(showDiscovery
        ? [
            {
              type: 'discovery',
              query: 'hidden gems',
              score: 0.75,
              metadata: { icon: '💎', category: 'Discover', reason: 'Discover something new' },
            },
            {
              type: 'discovery',
              query: 'golden hour',
              score: 0.72,
              metadata: { icon: '🌅', category: 'Discover', reason: 'Perfect lighting' },
            },
          ]
        : []),
    ];

    // Mock search history
    const mockHistory = ['beach sunset', 'family photos', 'mountain hiking'];

    setRecommendations(mockRecommendations);
    setSearchHistory(mockHistory);
    setIsLoading(false);
  };

  const getRecommendationColor = (type: string): string => {
    switch (type) {
      case 'trending':
        return '#FF6B6B';
      case 'personal':
        return '#4ECDC4';
      case 'similar':
        return '#95E1D3';
      case 'discovery':
        return '#FFE66D';
      default:
        return theme.colors.primary;
    }
  };

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) {
      acc[rec.type] = [];
    }
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, SearchRecommendation[]>);

  const renderRecommendationChip = (rec: SearchRecommendation) => (
    <TouchableOpacity
      key={rec.query}
      style={[
        styles.chip,
        { borderColor: getRecommendationColor(rec.type) },
      ]}
      onPress={() => onRecommendationPress(rec.query)}
    >
      <Text style={styles.chipIcon}>{rec.metadata?.icon || '🔍'}</Text>
      <Text style={styles.chipText}>{rec.query}</Text>
      {rec.metadata?.count && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{rec.metadata.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search History */}
      {searchHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {searchHistory.map((query, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.chip, styles.historyChip]}
                onPress={() => onRecommendationPress(query)}
              >
                <Text style={styles.chipIcon}>🕐</Text>
                <Text style={styles.chipText}>{query}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending */}
      {showTrending && groupedRecommendations.trending && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#FF6B6B' }]}>
              <Text style={styles.sectionBadgeText}>🔥 Hot</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {groupedRecommendations.trending.map(renderRecommendationChip)}
          </ScrollView>
        </View>
      )}

      {/* Personal */}
      {showPersonal && groupedRecommendations.personal && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>For You</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#4ECDC4' }]}>
              <Text style={styles.sectionBadgeText}>⭐ Personal</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {groupedRecommendations.personal.map(renderRecommendationChip)}
          </ScrollView>
        </View>
      )}

      {/* Discovery */}
      {showDiscovery && groupedRecommendations.discovery && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Discover</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#FFE66D' }]}>
              <Text style={styles.sectionBadgeText}>💡 New</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {groupedRecommendations.discovery.map(renderRecommendationChip)}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

interface TrendingSearchesProps {
  limit?: number;
  onTrendPress: (query: string) => void;
}

export const TrendingSearches: React.FC<TrendingSearchesProps> = ({
  limit = 10,
  onTrendPress,
}) => {
  const [trends, setTrends] = useState<Array<{ query: string; count: number }>>([]);

  useEffect(() => {
    // TODO: Load from API
    const mockTrends = [
      { query: 'summer vacation', count: 1247 },
      { query: 'family photos', count: 892 },
      { query: 'sunset', count: 654 },
      { query: 'beach', count: 543 },
      { query: 'wedding', count: 432 },
      { query: 'travel', count: 387 },
      { query: 'birthday', count: 298 },
      { query: 'pets', count: 245 },
      { query: 'nature', count: 198 },
      { query: 'cityscape', count: 156 },
    ].slice(0, limit);

    setTrends(mockTrends);
  }, [limit]);

  const getTrendIcon = (index: number): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <View style={styles.trendingContainer}>
      <Text style={styles.sectionTitle}>Trending Searches</Text>
      {trends.map((trend, index) => (
        <TouchableOpacity
          key={trend.query}
          style={styles.trendItem}
          onPress={() => onTrendPress(trend.query)}
        >
          <Text style={styles.trendRank}>{getTrendIcon(index)}</Text>
          <Text style={styles.trendQuery}>{trend.query}</Text>
          <Text style={styles.trendCount}>{trend.count.toLocaleString()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  sectionBadge: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  sectionBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.base,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyChip: {
    borderColor: theme.colors.textSecondary + '40',
  },
  chipIcon: {
    marginRight: theme.spacing.xs,
    fontSize: 14,
  },
  chipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  countBadge: {
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  countText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  trendingContainer: {
    padding: theme.spacing.base,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trendRank: {
    width: 32,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  trendQuery: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  trendCount: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
});
