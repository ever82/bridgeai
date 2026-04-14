/**
 * Job Recommendations Screen
 *
 * Screen for job seekers to view AI-recommended job positions
 * with match score visualization and quick actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../theme';

// Local types for job recommendations
interface JobRecommendationItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  experience: string;
  isUrgent: boolean;
  matchScore: number;
  matchFactors: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
  };
  reasons: string[];
  skills: string[];
  isInterested: boolean | null;
}

type MatchScoreBadgeSize = 'sm' | 'md' | 'lg';

interface MatchScoreBadgeProps {
  score: number;
  size?: MatchScoreBadgeSize;
}

const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ score, size = 'md' }) => {
  const getScoreColor = (s: number): string => {
    if (s >= 90) return theme.colors.success;
    if (s >= 75) return '#8BC34A';
    if (s >= 60) return theme.colors.warning;
    if (s >= 40) return '#FF9800';
    return theme.colors.error;
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 90) return '极匹配';
    if (s >= 75) return '很匹配';
    if (s >= 60) return '较匹配';
    if (s >= 40) return '一般';
    return '不太匹配';
  };

  const sizeMap = {
    sm: { container: 40, fontSize: 14, labelSize: 10 },
    md: { container: 56, fontSize: 20, labelSize: 12 },
    lg: { container: 72, fontSize: 28, labelSize: 14 },
  };

  const dimensions = sizeMap[size];
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <View style={[styles.scoreContainer, { width: dimensions.container }]}>
      <View
        style={[
          styles.scoreCircle,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderColor: color,
            backgroundColor: `${color}15`,
          },
        ]}
      >
        <Text style={[styles.scoreValue, { fontSize: dimensions.fontSize, color }]}>
          {Math.round(score)}
        </Text>
        <Text style={styles.scorePercent}>%</Text>
      </View>
      <Text style={[styles.scoreLabel, { fontSize: dimensions.labelSize, color }]}>{label}</Text>
    </View>
  );
};

interface MatchFactorProps {
  label: string;
  score: number;
}

const MatchFactor: React.FC<MatchFactorProps> = ({ label, score }) => {
  const getBarColor = (s: number): string => {
    if (s >= 80) return theme.colors.success;
    if (s >= 60) return '#8BC34A';
    if (s >= 40) return theme.colors.warning;
    return '#FF9800';
  };

  return (
    <View style={styles.factorItem}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorBarContainer}>
        <View
          style={[styles.factorBar, { width: `${score}%`, backgroundColor: getBarColor(score) }]}
        />
      </View>
      <Text style={styles.factorScore}>{score}%</Text>
    </View>
  );
};

interface JobCardProps {
  recommendation: JobRecommendationItem;
  onPress: (rec: JobRecommendationItem) => void;
  onInterested: (rec: JobRecommendationItem) => void;
  onSkip: (rec: JobRecommendationItem) => void;
}

const JobCard: React.FC<JobCardProps> = ({ recommendation, onPress, onInterested, onSkip }) => {
  const { matchScore, matchFactors, reasons } = recommendation;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(recommendation)}
      activeOpacity={0.95}
    >
      <View style={styles.cardHeader}>
        <MatchScoreBadge score={matchScore} size="md" />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{recommendation.title}</Text>
          <Text style={styles.companyName}>{recommendation.company}</Text>
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{recommendation.jobType}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{recommendation.experience}</Text>
            </View>
            {recommendation.isUrgent && (
              <View style={[styles.tag, styles.urgentTag]}>
                <Text style={[styles.tagText, styles.urgentText]}>急招</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.reasonsContainer}>
        {reasons.slice(0, 2).map((reason, index) => (
          <View key={index} style={styles.reasonItem}>
            <Text style={styles.reasonIcon}>✓</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>💰</Text>
          <Text style={styles.detailText}>{recommendation.salary}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{recommendation.location}</Text>
        </View>
      </View>

      <View style={styles.skillsContainer}>
        <Text style={styles.skillsLabel}>匹配技能:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.skillsRow}>
            {recommendation.skills.slice(0, 5).map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.detailsToggle} onPress={() => setShowDetails(!showDetails)}>
        <Text style={styles.detailsToggleText}>
          {showDetails ? '收起匹配详情' : '查看匹配详情'}
        </Text>
        <Text style={styles.detailsToggleIcon}>{showDetails ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.matchDetails}>
          <MatchFactor label="技能匹配" score={matchFactors.skills} />
          <MatchFactor label="经验匹配" score={matchFactors.experience} />
          <MatchFactor label="地点匹配" score={matchFactors.location} />
          <MatchFactor label="薪资匹配" score={matchFactors.salary} />
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.skipBtn]}
          onPress={() => onSkip(recommendation)}
        >
          <Text style={styles.skipBtnText}>跳过</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.interestedBtn]}
          onPress={() => onInterested(recommendation)}
        >
          <Text style={styles.interestedBtnText}>感兴趣</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

interface FilterTabProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, count, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
      {label} ({count})
    </Text>
  </TouchableOpacity>
);

export const JobRecommendationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState<JobRecommendationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'saved'>('all');

  const fetchRecommendations = useCallback(async () => {
    const mockRecommendations: JobRecommendationItem[] = [
      {
        id: 'rec-1',
        title: '高级前端工程师',
        company: '阿里巴巴',
        location: '杭州',
        salary: '30-50K/月',
        jobType: '全职',
        experience: '5年以上',
        isUrgent: true,
        matchScore: 92,
        matchFactors: { skills: 95, experience: 90, location: 85, salary: 95 },
        reasons: ['您的React技能与职位要求高度匹配', '您的前端架构经验符合高级职位要求'],
        skills: ['React', 'TypeScript', 'Node.js', 'Webpack', 'CSS3'],
        isInterested: null,
      },
      {
        id: 'rec-2',
        title: '全栈开发工程师',
        company: '字节跳动',
        location: '北京',
        salary: '25-40K/月',
        jobType: '全职',
        experience: '3年以上',
        isUrgent: false,
        matchScore: 78,
        matchFactors: { skills: 85, experience: 80, location: 70, salary: 85 },
        reasons: ['您的全栈开发经验与该职位匹配', 'Node.js和React技能符合职位要求'],
        skills: ['React', 'Node.js', 'TypeScript', 'MySQL', 'Redis'],
        isInterested: null,
      },
      {
        id: 'rec-3',
        title: 'React Native开发工程师',
        company: '腾讯',
        location: '深圳',
        salary: '20-35K/月',
        jobType: '全职',
        experience: '2年以上',
        isUrgent: false,
        matchScore: 65,
        matchFactors: { skills: 70, experience: 60, location: 65, salary: 70 },
        reasons: ['您的React经验可迁移至React Native', '移动端开发经验是加分项'],
        skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux'],
        isInterested: null,
      },
    ];

    setRecommendations(mockRecommendations);
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
    setIsRefreshing(false);
  }, [fetchRecommendations]);

  const handleInterested = useCallback((rec: JobRecommendationItem) => {
    Alert.alert('确认感兴趣', `您对"${rec.title}"感兴趣吗？这将通知招聘方。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: () => {
          setRecommendations(prev =>
            prev.map(r => (r.id === rec.id ? { ...r, isInterested: true } : r))
          );
        },
      },
    ]);
  }, []);

  const handleSkip = useCallback((rec: JobRecommendationItem) => {
    Alert.alert('跳过此职位', '跳过此职位后，它将不再出现在您的推荐列表中。', [
      { text: '取消', style: 'cancel' },
      {
        text: '跳过',
        style: 'destructive',
        onPress: () => {
          setRecommendations(prev => prev.filter(r => r.id !== rec.id));
        },
      },
    ]);
  }, []);

  const handlePressCard = useCallback((_rec: JobRecommendationItem) => {
    // TODO: Navigate to job detail
  }, []);

  const filteredRecommendations = recommendations.filter(rec => {
    switch (activeFilter) {
      case 'high':
        return rec.matchScore >= 80;
      case 'medium':
        return rec.matchScore >= 60 && rec.matchScore < 80;
      case 'saved':
        return rec.isInterested === true;
      default:
        return true;
    }
  });

  const recommendationCounts = {
    all: recommendations.length,
    high: recommendations.filter(r => r.matchScore >= 80).length,
    medium: recommendations.filter(r => r.matchScore >= 60 && r.matchScore < 80).length,
    saved: recommendations.filter(r => r.isInterested === true).length,
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💼</Text>
      <Text style={styles.emptyTitle}>暂无推荐职位</Text>
      <Text style={styles.emptyDescription}>
        {activeFilter === 'saved'
          ? '您还没有收藏任何职位'
          : 'AI正在为您分析最适合的职位，请稍后再来查看'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>职位推荐</Text>
        <Text style={styles.headerSubtitle}>根据您的简历为您精准匹配</Text>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: '全部推荐', count: recommendationCounts.all },
            { key: 'high', label: '高度匹配', count: recommendationCounts.high },
            { key: 'medium', label: '较匹配', count: recommendationCounts.medium },
            { key: 'saved', label: '已收藏', count: recommendationCounts.saved },
          ]}
          renderItem={({ item }) => (
            <FilterTab
              label={item.label}
              count={item.count}
              isActive={activeFilter === item.key}
              onPress={() => setActiveFilter(item.key as typeof activeFilter)}
            />
          )}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filterList}
        />
      </View>

      <FlatList
        data={filteredRecommendations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <JobCard
            recommendation={item}
            onPress={handlePressCard}
            onInterested={handleInterested}
            onSkip={handleSkip}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
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
  filterContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterList: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.medium,
  },
  listContent: {
    padding: theme.spacing.base,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  scoreCircle: {
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontWeight: theme.fonts.weights.bold,
  },
  scorePercent: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  scoreLabel: {
    marginTop: theme.spacing.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  companyName: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  urgentTag: {
    backgroundColor: '#FFEBEE',
  },
  urgentText: {
    color: theme.colors.error,
  },
  reasonsContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  reasonIcon: {
    fontSize: 12,
    color: theme.colors.success,
    marginRight: theme.spacing.xs,
    fontWeight: theme.fonts.weights.semibold,
  },
  reasonText: {
    fontSize: theme.fonts.sizes.xs,
    color: '#2E7D32',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  detailText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  skillsContainer: {
    marginBottom: theme.spacing.sm,
  },
  skillsLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  skillText: {
    fontSize: theme.fonts.sizes.xs,
    color: '#1976D2',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailsToggleText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  detailsToggleIcon: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  matchDetails: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  factorLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    width: 70,
  },
  factorBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginRight: theme.spacing.xs,
  },
  factorBar: {
    height: 6,
    borderRadius: 3,
  },
  factorScore: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  skipBtnText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.medium,
  },
  interestedBtn: {
    backgroundColor: theme.colors.primary,
  },
  interestedBtnText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing['3xl'],
  },
});

export default JobRecommendationsScreen;
