/**
 * Job List Screen
 *
 * Screen for employers to view and manage their job postings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  JobPosting,
  JobStatus,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  JOB_TYPE_LABELS,
} from '@bridgeai/shared';
import { JobStackParamList } from '../../types/navigation';

type JobListScreenNavigationProp = NativeStackNavigationProp<JobStackParamList, 'JobList'>;

interface JobCardProps {
  job: JobPosting;
  onPress: (job: JobPosting) => void;
  onEdit: (job: JobPosting) => void;
  onStatusChange: (job: JobPosting, status: JobStatus) => void;
  onViewApplications: (job: JobPosting) => void;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onEdit,
  onStatusChange,
  onViewApplications,
}) => {
  const statusColor = JOB_STATUS_COLORS[job.status];
  const statusLabel = JOB_STATUS_LABELS[job.status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(job)}>
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        {job.isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>急招</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.infoText}>{JOB_TYPE_LABELS[job.type]}</Text>
        <Text style={styles.infoSeparator}>·</Text>
        <Text style={styles.infoText}>{job.department}</Text>
        <Text style={styles.infoSeparator}>·</Text>
        <Text style={styles.infoText}>招聘{job.positions}人</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{job.viewCount}</Text>
          <Text style={styles.statLabel}>浏览</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{job.applicationCount}</Text>
          <Text style={styles.statLabel}>投递</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>发布于 {formatDate(job.publishedAt || job.createdAt)}</Text>
        <View style={styles.actions}>
          {job.status === JobStatus.DRAFT && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.publishBtn]}
              onPress={() => onStatusChange(job, JobStatus.PUBLISHED)}
            >
              <Text style={styles.publishBtnText}>发布</Text>
            </TouchableOpacity>
          )}
          {job.status === JobStatus.PUBLISHED && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.refreshBtn]}
                onPress={() => onStatusChange(job, JobStatus.PAUSED)}
              >
                <Text style={styles.refreshBtnText}>暂停</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.applicationsBtn]}
                onPress={() => onViewApplications(job)}
              >
                <Text style={styles.applicationsBtnText}>简历</Text>
              </TouchableOpacity>
            </>
          )}
          {job.status === JobStatus.PAUSED && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.publishBtn]}
              onPress={() => onStatusChange(job, JobStatus.PUBLISHED)}
            >
              <Text style={styles.publishBtnText}>重新发布</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(job)}>
            <Text style={styles.actionBtnText}>编辑</Text>
          </TouchableOpacity>
        </View>
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

export const JobListScreen: React.FC = () => {
  const navigation = useNavigation<JobListScreenNavigationProp>();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<JobStatus | 'all'>('all');

  // TODO: Fetch from API
  const fetchJobs = useCallback(async () => {
    // Mock data for now
    setJobs([
      {
        id: 'job-1',
        employerId: 'emp-1',
        employerProfileId: 'profile-1',
        agentId: 'agent-1',
        title: '高级前端工程师',
        department: '技术部',
        type: 'FULL_TIME' as JobType,
        positions: 2,
        description: {
          summary: '负责前端开发',
          responsibilities: ['前端开发'],
          requirements: ['3年以上经验'],
        },
        requirements: {
          skills: ['React', 'TypeScript'],
          experienceLevel: 'MID' as any,
          educationLevel: 'BACHELOR' as any,
        },
        salary: {
          min: 25000,
          max: 40000,
          period: 'MONTHLY' as any,
          currency: 'CNY',
          isNegotiable: false,
        },
        benefits: {
          healthInsurance: true,
          dentalInsurance: false,
          visionInsurance: false,
          lifeInsurance: false,
          retirementPlan: false,
          paidTimeOff: 10,
          flexibleSchedule: true,
          remoteWork: false,
          professionalDevelopment: true,
          gymMembership: false,
          freeMeals: false,
          transportation: false,
          stockOptions: false,
          bonus: true,
        },
        location: {
          address: '望京SOHO',
          city: '北京',
          country: 'China',
          isRemote: false,
          workMode: 'ONSITE' as any,
        },
        status: JobStatus.PUBLISHED,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stats: {
          views: 150,
          uniqueViews: 120,
          applications: 15,
          interested: 8,
          saved: 5,
          shared: 3,
          clickThroughRate: 0.1,
          conversionRate: 0.08,
        },
        isUrgent: true,
        isFeatured: false,
        viewCount: 150,
        applicationCount: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchJobs();
    setIsRefreshing(false);
  }, [fetchJobs]);

  const handleStatusChange = useCallback((job: JobPosting, status: JobStatus) => {
    Alert.alert(
      '确认操作',
      `确定要${status === JobStatus.PUBLISHED ? '发布' : status === JobStatus.PAUSED ? '暂停' : '关闭'}该职位吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            // TODO: Call API
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, status } : j))
            );
          },
        },
      ]
    );
  }, []);

  const handleViewApplications = useCallback((job: JobPosting) => {
    navigation.navigate('ReceivedResumes', { jobId: job.id });
  }, [navigation]);

  const filteredJobs = activeFilter === 'all'
    ? jobs
    : jobs.filter((job) => job.status === activeFilter);

  const jobCounts = {
    all: jobs.length,
    published: jobs.filter((j) => j.status === JobStatus.PUBLISHED).length,
    draft: jobs.filter((j) => j.status === JobStatus.DRAFT).length,
    paused: jobs.filter((j) => j.status === JobStatus.PAUSED).length,
    closed: jobs.filter((j) => j.status === JobStatus.CLOSED).length,
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💼</Text>
      <Text style={styles.emptyTitle}>暂无职位</Text>
      <Text style={styles.emptyDescription}>点击右下角按钮发布您的第一个职位</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的职位</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('JobPosting')}
        >
          <Text style={styles.createBtnText}>+ 发布职位</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: '全部', count: jobCounts.all },
            { key: JobStatus.PUBLISHED, label: '招聘中', count: jobCounts.published },
            { key: JobStatus.DRAFT, label: '草稿', count: jobCounts.draft },
            { key: JobStatus.PAUSED, label: '已暂停', count: jobCounts.paused },
            { key: JobStatus.CLOSED, label: '已关闭', count: jobCounts.closed },
          ]}
          renderItem={({ item }) => (
            <FilterTab
              label={item.label}
              count={item.count}
              isActive={activeFilter === item.key}
              onPress={() => setActiveFilter(item.key as any)}
            />
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={(job) => navigation.navigate('JobDetail', { jobId: job.id })}
            onEdit={(job) => navigation.navigate('JobPosting', { jobId: job.id })}
            onStatusChange={handleStatusChange}
            onViewApplications={handleViewApplications}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  createBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 13,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  urgentBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '500',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  infoSeparator: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 6,
  },
  cardStats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  stat: {
    marginRight: 24,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  actionBtnText: {
    fontSize: 12,
    color: '#666',
  },
  publishBtn: {
    backgroundColor: '#4CAF50',
  },
  publishBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  refreshBtn: {
    backgroundColor: '#FFC107',
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  applicationsBtn: {
    backgroundColor: '#2196F3',
  },
  applicationsBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default JobListScreen;
