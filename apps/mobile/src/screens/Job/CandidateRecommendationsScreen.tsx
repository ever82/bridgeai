/**
 * Candidate Recommendations Screen
 *
 * Screen for employers to view AI-recommended candidates for their job postings
 * with match score visualization and candidate management
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

// Local types
interface CandidateProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  experienceYears: number;
  education: string;
  skills: string[];
  expectedSalary: string;
  isOpenToWork: boolean;
  aiSummary?: string;
}

interface CandidateRecommendationItem {
  id: string;
  jobId: string;
  candidate: CandidateProfile;
  matchScore: number;
  matchFactors: {
    skills: number;
    experience: number;
    education: number;
    salary: number;
    location: number;
  };
  reasons: string[];
  status: 'new' | 'viewed' | 'shortlisted' | 'rejected' | 'contacted';
}

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
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
    if (s >= 90) return '强烈推荐';
    if (s >= 75) return '推荐';
    if (s >= 60) return '较适合';
    if (s >= 40) return '一般';
    return '不太适合';
  };

  const sizeMap = {
    sm: { container: 36, fontSize: 12, labelSize: 9 },
    md: { container: 48, fontSize: 16, labelSize: 11 },
    lg: { container: 64, fontSize: 22, labelSize: 13 },
  };

  const dimensions = sizeMap[size];
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <View style={styles.scoreContainer}>
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
      </View>
      <Text style={[styles.scoreLabel, { fontSize: dimensions.labelSize, color }]}>{label}</Text>
    </View>
  );
};

interface MatchFactorBarProps {
  label: string;
  score: number;
}

const MatchFactorBar: React.FC<MatchFactorBarProps> = ({ label, score }) => {
  const getBarColor = (s: number): string => {
    if (s >= 80) return theme.colors.success;
    if (s >= 60) return '#8BC34A';
    if (s >= 40) return theme.colors.warning;
    return '#FF9800';
  };

  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorName}>{label}</Text>
      <View style={styles.factorBarBg}>
        <View
          style={[
            styles.factorBarFill,
            { width: `${score}%`, backgroundColor: getBarColor(score) },
          ]}
        />
      </View>
      <Text style={styles.factorValue}>{score}%</Text>
    </View>
  );
};

interface CandidateCardProps {
  recommendation: CandidateRecommendationItem;
  onPress: (rec: CandidateRecommendationItem) => void;
  onShortlist: (rec: CandidateRecommendationItem) => void;
  onReject: (rec: CandidateRecommendationItem) => void;
  onContact: (rec: CandidateRecommendationItem) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  recommendation,
  onPress,
  onShortlist,
  onReject,
  onContact,
}) => {
  const { candidate, matchScore, matchFactors, reasons, status } = recommendation;
  const [showDetails, setShowDetails] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case 'new':
        return { text: '新推荐', color: theme.colors.info };
      case 'viewed':
        return { text: '已查看', color: theme.colors.textSecondary };
      case 'shortlisted':
        return { text: '已收藏', color: theme.colors.success };
      case 'rejected':
        return { text: '已拒绝', color: theme.colors.error };
      case 'contacted':
        return { text: '已联系', color: theme.colors.warning };
      default:
        return { text: '新推荐', color: theme.colors.info };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(recommendation)}
      activeOpacity={0.95}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{candidate.name.charAt(0)}</Text>
          </View>
          {candidate.isOpenToWork && (
            <View style={styles.openToWorkBadge}>
              <Text style={styles.openToWorkText}>求职中</Text>
            </View>
          )}
        </View>

        <View style={styles.candidateInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.candidateName}>{candidate.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}20` }]}>
              <Text style={[styles.statusText, { color: statusBadge.color }]}>
                {statusBadge.text}
              </Text>
            </View>
          </View>
          <Text style={styles.candidateTitle}>{candidate.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{candidate.experienceYears}年经验</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{candidate.education}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{candidate.location}</Text>
          </View>
        </View>

        <MatchScoreBadge score={matchScore} size="md" />
      </View>

      {candidate.aiSummary && (
        <View style={styles.aiSummaryContainer}>
          <Text style={styles.aiSummaryLabel}>AI评价</Text>
          <Text style={styles.aiSummaryText}>{candidate.aiSummary}</Text>
        </View>
      )}

      <View style={styles.reasonsSection}>
        {reasons.slice(0, 2).map((reason, index) => (
          <View key={index} style={styles.reasonRow}>
            <Text style={styles.reasonCheck}>✓</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.skillsSection}>
        <Text style={styles.skillsLabel}>技能匹配:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.skillsList}>
            {candidate.skills.slice(0, 6).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.salaryRow}>
        <Text style={styles.salaryLabel}>期望薪资:</Text>
        <Text style={styles.salaryValue}>{candidate.expectedSalary}</Text>
      </View>

      <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowDetails(!showDetails)}>
        <Text style={styles.toggleText}>{showDetails ? '收起匹配详情' : '查看匹配详情'}</Text>
        <Text style={styles.toggleIcon}>{showDetails ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.matchFactorsSection}>
          <MatchFactorBar label="技能" score={matchFactors.skills} />
          <MatchFactorBar label="经验" score={matchFactors.experience} />
          <MatchFactorBar label="学历" score={matchFactors.education} />
          <MatchFactorBar label="薪资" score={matchFactors.salary} />
          <MatchFactorBar label="地点" score={matchFactors.location} />
        </View>
      )}

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => onReject(recommendation)}
        >
          <Text style={styles.rejectBtnText}>不适合</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.shortlistBtn]}
          onPress={() => onShortlist(recommendation)}
        >
          <Text style={styles.shortlistBtnText}>收藏</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.contactBtn]}
          onPress={() => onContact(recommendation)}
        >
          <Text style={styles.contactBtnText}>联系</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

interface JobOption {
  id: string;
  title: string;
}

interface JobSelectorProps {
  jobs: JobOption[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

const JobSelector: React.FC<JobSelectorProps> = ({ jobs, selectedJobId, onSelectJob }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.jobSelector}
    contentContainerStyle={styles.jobSelectorContent}
  >
    {jobs.map(job => (
      <TouchableOpacity
        key={job.id}
        style={[styles.jobOption, selectedJobId === job.id && styles.jobOptionActive]}
        onPress={() => onSelectJob(job.id)}
      >
        <Text
          style={[styles.jobOptionText, selectedJobId === job.id && styles.jobOptionTextActive]}
          numberOfLines={1}
        >
          {job.title}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

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

export const CandidateRecommendationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState<CandidateRecommendationItem[]>([]);
  const [jobs] = useState<JobOption[]>([
    { id: 'job-1', title: '高级前端工程师' },
    { id: 'job-2', title: '全栈开发工程师' },
  ]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>('job-1');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'shortlisted' | 'contacted'>(
    'all'
  );

  const fetchData = useCallback(async () => {
    const mockRecommendations: CandidateRecommendationItem[] = [
      {
        id: 'rec-1',
        jobId: 'job-1',
        candidate: {
          id: 'cand-1',
          name: '张明',
          title: '高级前端工程师',
          location: '杭州',
          experienceYears: 5,
          education: '本科',
          skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Webpack', 'Jest'],
          expectedSalary: '30-45K/月',
          isOpenToWork: true,
          aiSummary:
            '该候选人拥有丰富的前端架构经验，React技能扎实，有带领小团队的经验，符合贵司高级工程师职位要求。',
        },
        matchScore: 95,
        matchFactors: { skills: 98, experience: 95, education: 85, salary: 90, location: 95 },
        reasons: ['React技能与职位要求高度匹配', '5年经验符合高级职位要求'],
        status: 'new',
      },
      {
        id: 'rec-2',
        jobId: 'job-1',
        candidate: {
          id: 'cand-2',
          name: '李华',
          title: '前端开发工程师',
          location: '杭州',
          experienceYears: 3,
          education: '硕士',
          skills: ['React', 'Vue.js', 'TypeScript', 'Node.js', 'CSS3'],
          expectedSalary: '25-35K/月',
          isOpenToWork: true,
          aiSummary: '技术基础扎实，学习能力强，虽然经验相对较少，但潜力巨大，薪资期望合理。',
        },
        matchScore: 82,
        matchFactors: { skills: 85, experience: 75, education: 95, salary: 95, location: 90 },
        reasons: ['React技能符合职位要求', '硕士学历，学习能力强'],
        status: 'viewed',
      },
      {
        id: 'rec-3',
        jobId: 'job-1',
        candidate: {
          id: 'cand-3',
          name: '王芳',
          title: '资深前端工程师',
          location: '上海',
          experienceYears: 7,
          education: '本科',
          skills: ['React', 'Angular', 'TypeScript', 'Node.js', 'Docker', 'AWS'],
          expectedSalary: '40-55K/月',
          isOpenToWork: false,
          aiSummary: '经验丰富，技术全面，但薪资期望较高，可能需要考虑远程工作选项。',
        },
        matchScore: 68,
        matchFactors: { skills: 80, experience: 95, education: 80, salary: 60, location: 50 },
        reasons: ['7年经验，技术全面', '有团队管理经验'],
        status: 'shortlisted',
      },
    ];

    setRecommendations(mockRecommendations);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  const handleShortlist = useCallback((rec: CandidateRecommendationItem) => {
    Alert.alert('收藏候选人', `将"${rec.candidate.name}"收藏到人才库？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: () => {
          setRecommendations(prev =>
            prev.map(r => (r.id === rec.id ? { ...r, status: 'shortlisted' } : r))
          );
        },
      },
    ]);
  }, []);

  const handleReject = useCallback((rec: CandidateRecommendationItem) => {
    Alert.alert('标记为不适合', `确定将"${rec.candidate.name}"标记为不适合？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        style: 'destructive',
        onPress: () => {
          setRecommendations(prev =>
            prev.map(r => (r.id === rec.id ? { ...r, status: 'rejected' } : r))
          );
        },
      },
    ]);
  }, []);

  const handleContact = useCallback((rec: CandidateRecommendationItem) => {
    Alert.alert('联系候选人', `即将向"${rec.candidate.name}"发送面试邀请`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: () => {
          setRecommendations(prev =>
            prev.map(r => (r.id === rec.id ? { ...r, status: 'contacted' } : r))
          );
        },
      },
    ]);
  }, []);

  const handlePressCard = useCallback((rec: CandidateRecommendationItem) => {
    if (rec.status === 'new') {
      setRecommendations(prev => prev.map(r => (r.id === rec.id ? { ...r, status: 'viewed' } : r)));
    }
  }, []);

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedJobId && rec.jobId !== selectedJobId) {
      return false;
    }
    switch (activeFilter) {
      case 'new':
        return rec.status === 'new';
      case 'shortlisted':
        return rec.status === 'shortlisted';
      case 'contacted':
        return rec.status === 'contacted';
      default:
        return rec.status !== 'rejected';
    }
  });

  const recommendationCounts = {
    all: recommendations.filter(r => r.status !== 'rejected').length,
    new: recommendations.filter(r => r.status === 'new').length,
    shortlisted: recommendations.filter(r => r.status === 'shortlisted').length,
    contacted: recommendations.filter(r => r.status === 'contacted').length,
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>暂无候选人推荐</Text>
      <Text style={styles.emptyDescription}>AI正在为您分析最适合的候选人，请稍后再来查看</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>候选人推荐</Text>
        <Text style={styles.headerSubtitle}>为您的职位精准匹配优秀人才</Text>
      </View>

      <JobSelector jobs={jobs} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} />

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: '全部', count: recommendationCounts.all },
            { key: 'new', label: '新推荐', count: recommendationCounts.new },
            { key: 'shortlisted', label: '已收藏', count: recommendationCounts.shortlisted },
            { key: 'contacted', label: '已联系', count: recommendationCounts.contacted },
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
          <CandidateCard
            recommendation={item}
            onPress={handlePressCard}
            onShortlist={handleShortlist}
            onReject={handleReject}
            onContact={handleContact}
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
  jobSelector: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 56,
  },
  jobSelectorContent: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  jobOption: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
  },
  jobOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  jobOptionText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    maxWidth: 150,
  },
  jobOptionTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.medium,
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
  openToWorkBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.md,
  },
  openToWorkText: {
    fontSize: 9,
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.medium,
  },
  candidateInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  candidateName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.fonts.weights.medium,
  },
  candidateTitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
  },
  metaDot: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  scoreContainer: {
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  scoreCircle: {
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontWeight: theme.fonts.weights.bold,
  },
  scoreLabel: {
    marginTop: 2,
    fontWeight: theme.fonts.weights.medium,
  },
  aiSummaryContainer: {
    backgroundColor: '#F3E5F5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  aiSummaryLabel: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: '#7B1FA2',
    marginBottom: theme.spacing.xs,
  },
  aiSummaryText: {
    fontSize: theme.fonts.sizes.xs,
    color: '#4A148C',
    lineHeight: 18,
  },
  reasonsSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  reasonCheck: {
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
  skillsSection: {
    marginBottom: theme.spacing.sm,
  },
  skillsLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  skillsList: {
    flexDirection: 'row',
  },
  skillTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  skillTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: '#1976D2',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  salaryLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  salaryValue: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.medium,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  toggleText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  toggleIcon: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  matchFactorsSection: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  factorName: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    width: 40,
  },
  factorBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginHorizontal: theme.spacing.sm,
  },
  factorBarFill: {
    height: 5,
    borderRadius: 3,
  },
  factorValue: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    width: 28,
    textAlign: 'right',
  },
  actionButtonsRow: {
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
  rejectBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  rejectBtnText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  shortlistBtn: {
    backgroundColor: '#FFF3E0',
  },
  shortlistBtnText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.warning,
  },
  contactBtn: {
    backgroundColor: theme.colors.success,
  },
  contactBtnText: {
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

export default CandidateRecommendationsScreen;
