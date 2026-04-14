/**
 * Candidate Recommendations Screen
 * 候选人推荐列表页面 - 为招聘方推荐匹配的候选人
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface CandidateRecommendation {
  seekerId: string;
  seekerName?: string;
  matchScore: number;
  skillScore: number;
  expScore: number;
  screeningLevel: string;
  reason: string;
  isNew: boolean;
}

const MOCK_CANDIDATES: CandidateRecommendation[] = [
  {
    seekerId: '1',
    seekerName: '张三',
    matchScore: 88,
    skillScore: 92,
    expScore: 85,
    screeningLevel: 'A',
    reason: '技能高度匹配；经验符合要求；文化契合度高',
    isNew: true,
  },
  {
    seekerId: '2',
    seekerName: '李四',
    matchScore: 76,
    skillScore: 70,
    expScore: 82,
    screeningLevel: 'B',
    reason: '技能部分匹配；经验完全符合',
    isNew: true,
  },
  {
    seekerId: '3',
    seekerName: '王五',
    matchScore: 65,
    skillScore: 60,
    expScore: 72,
    screeningLevel: 'B',
    reason: '经验基本符合；薪资期望合理',
    isNew: false,
  },
];

export const CandidateRecommendationsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [candidates, setCandidates] = useState<CandidateRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const jobId = route?.params?.jobId;

  const fetchCandidates = useCallback(async () => {
    try {
      // In production: const response = await api.get(`/api/v1/job/candidates?jobId=${jobId}`);
      setCandidates(MOCK_CANDIDATES);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCandidates();
  }, [fetchCandidates]);

  const handleCandidatePress = useCallback((candidate: CandidateRecommendation) => {
    navigation?.navigate('MatchDetail', {
      matchId: candidate.seekerId,
      type: 'candidate',
      title: candidate.seekerName,
    });
  }, [navigation]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A': return theme.colors.success;
      case 'B': return theme.colors.primary;
      case 'C': return theme.colors.warning;
      case 'D': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'A': return '强烈推荐';
      case 'B': return '推荐';
      case 'C': return '可考虑';
      case 'D': return '不推荐';
      default: return level;
    }
  };

  const renderItem = ({ item }: { item: CandidateRecommendation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleCandidatePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.seekerName || '?').charAt(0)}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.seekerName}>{item.seekerName || '未知候选人'}</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
        <View style={styles.scoreColumn}>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.screeningLevel) }]}>
            <Text style={styles.levelText}>{item.screeningLevel}</Text>
          </View>
          <Text style={styles.matchScore}>{item.matchScore}%</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>技能</Text>
          <View style={styles.miniScoreBar}>
            <View style={[styles.miniScoreFill, { width: `${item.skillScore}%` }]} />
          </View>
          <Text style={styles.scoreItemValue}>{item.skillScore}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>经验</Text>
          <View style={styles.miniScoreBar}>
            <View style={[styles.miniScoreFill, { width: `${item.expScore}%` }]} />
          </View>
          <Text style={styles.scoreItemValue}>{item.expScore}</Text>
        </View>
      </View>

      {item.isNew && (
        <View style={styles.newTag}>
          <Text style={styles.newTagText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>正在为您匹配候选人...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>推荐候选人</Text>
        <Text style={styles.headerSubtitle}>
          共 {candidates.length} 位候选人推荐
        </Text>
      </View>

      <FlatList
        data={candidates}
        renderItem={renderItem}
        keyExtractor={item => item.seekerId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无推荐候选人</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.base,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
  cardInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  seekerName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  reasonText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  scoreColumn: {
    alignItems: 'center',
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  levelText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textInverse,
  },
  matchScore: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
  },
  scoreRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.base,
  },
  scoreItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scoreItemLabel: {
    width: 24,
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  miniScoreBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  miniScoreFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  scoreItemValue: {
    width: 20,
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  newTag: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textInverse,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});

export default CandidateRecommendationsScreen;
