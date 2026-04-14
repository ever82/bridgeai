/**
 * Job Recommendations Screen
 * 职位推荐列表页面 - 为求职者推荐匹配的职位
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

interface JobRecommendation {
  jobId: string;
  jobTitle: string;
  companyName?: string;
  matchScore: number;
  skillScore: number;
  expScore: number;
  salaryScore: number;
  locationScore: number;
  cultureScore: number;
  reason: string;
  isNew: boolean;
}

const MOCK_RECOMMENDATIONS: JobRecommendation[] = [
  {
    jobId: '1',
    jobTitle: '高级前端工程师',
    companyName: '某科技公司',
    matchScore: 92,
    skillScore: 95,
    expScore: 88,
    salaryScore: 90,
    locationScore: 95,
    cultureScore: 85,
    reason: '技能高度匹配；经验符合要求；薪资期望相符',
    isNew: true,
  },
  {
    jobId: '2',
    jobTitle: '全栈开发工程师',
    companyName: '某互联网公司',
    matchScore: 85,
    skillScore: 80,
    expScore: 90,
    salaryScore: 82,
    locationScore: 88,
    cultureScore: 80,
    reason: '技能部分匹配；经验完全符合；工作地点匹配',
    isNew: true,
  },
  {
    jobId: '3',
    jobTitle: 'React Native开发',
    companyName: '某创业公司',
    matchScore: 78,
    skillScore: 72,
    expScore: 85,
    salaryScore: 70,
    locationScore: 90,
    cultureScore: 75,
    reason: '技能匹配度好；经验相关性强',
    isNew: false,
  },
];

export const JobRecommendationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      // In production, this would call the API
      // const response = await api.get('/api/v1/job/recommendations');
      setRecommendations(MOCK_RECOMMENDATIONS);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleJobPress = useCallback((job: JobRecommendation) => {
    navigation?.navigate('MatchDetail', {
      matchId: job.jobId,
      type: 'job',
      title: job.jobTitle,
    });
  }, [navigation]);

  const handleInterested = useCallback((jobId: string) => {
    // In production, call API: POST /api/v1/job/feedback
    setRecommendations(prev =>
      prev.filter(r => r.jobId !== jobId)
    );
  }, []);

  const handleSkip = useCallback((jobId: string) => {
    setRecommendations(prev =>
      prev.filter(r => r.jobId !== jobId)
    );
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.primary;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderScoreBar = (score: number, label: string) => (
    <View style={styles.scoreBarItem}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${score}%`,
              backgroundColor: getScoreColor(score),
            },
          ]}
        />
      </View>
      <Text style={[styles.scoreBarValue, { color: getScoreColor(score) }]}>
        {score}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: JobRecommendation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleJobPress(item)}
      activeOpacity={0.7}
    >
      {item.isNew && <View style={styles.newBadge} />}

      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.jobTitle}>{item.jobTitle}</Text>
          {item.companyName && (
            <Text style={styles.companyName}>{item.companyName}</Text>
          )}
        </View>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(item.matchScore) }]}>
          <Text style={[styles.scoreNumber, { color: getScoreColor(item.matchScore) }]}>
            {item.matchScore}
          </Text>
          <Text style={styles.scoreLabel}>匹配</Text>
        </View>
      </View>

      <Text style={styles.reasonText}>{item.reason}</Text>

      <View style={styles.scoreBars}>
        {renderScoreBar(item.skillScore, '技能')}
        {renderScoreBar(item.expScore, '经验')}
        {renderScoreBar(item.salaryScore, '薪资')}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.skipButton]}
          onPress={() => handleSkip(item.jobId)}
        >
          <Text style={styles.skipButtonText}>跳过</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.interestedButton]}
          onPress={() => handleInterested(item.jobId)}
        >
          <Text style={styles.interestedButtonText}>感兴趣</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>正在为您匹配最佳职位...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>推荐职位</Text>
        <Text style={styles.headerSubtitle}>
          为您精选 {recommendations.length} 个匹配职位
        </Text>
      </View>

      <FlatList
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={item => item.jobId}
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
            <Text style={styles.emptyText}>暂无推荐职位</Text>
            <Text style={styles.emptySubtext}>完善您的简历以获得更精准的推荐</Text>
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
  newBadge: {
    position: 'absolute',
    top: theme.spacing.base,
    right: theme.spacing.base,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  jobTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  companyName: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  reasonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  scoreBars: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  scoreBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scoreBarLabel: {
    width: 28,
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  scoreBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  scoreBarValue: {
    width: 24,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
    textAlign: 'right',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  skipButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.medium,
  },
  interestedButton: {
    backgroundColor: theme.colors.primary,
  },
  interestedButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
});

export default JobRecommendationsScreen;
