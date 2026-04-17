/**
 * Received Resumes Screen
 *
 * Screen for viewing and managing received job applications/resumes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  JobApplication,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@bridgeai/shared';

import { JobStackParamList } from '../../types/navigation';

type ReceivedResumesScreenNavigationProp = NativeStackNavigationProp<JobStackParamList, 'ReceivedResumes'>;

interface ApplicationCardProps {
  application: JobApplication;
  onPress: (application: JobApplication) => void;
  onStatusChange: (application: JobApplication, status: ApplicationStatus) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onPress,
  onStatusChange,
}) => {
  const statusColor = APPLICATION_STATUS_COLORS[application.status];
  const statusLabel = APPLICATION_STATUS_LABELS[application.status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(application)}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.dateText}>投递时间: {formatDate(application.createdAt)}</Text>
      </View>

      <Text style={styles.applicantName}>候选人 #{application.applicantId.slice(-6)}</Text>

      {application.coverLetter && (
        <Text style={styles.coverLetter} numberOfLines={2}>
          {application.coverLetter}
        </Text>
      )}

      <View style={styles.cardActions}>
        {application.status === ApplicationStatus.PENDING && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.shortlistBtn]}
              onPress={() => onStatusChange(application, ApplicationStatus.SHORTLISTED)}
            >
              <Text style={styles.shortlistBtnText}>通过初筛</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onStatusChange(application, ApplicationStatus.REJECTED)}
            >
              <Text style={styles.rejectBtnText}>不合适</Text>
            </TouchableOpacity>
          </>
        )}
        {application.status === ApplicationStatus.SHORTLISTED && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.interviewBtn]}
            onPress={() => onStatusChange(application, ApplicationStatus.INTERVIEWING)}
          >
            <Text style={styles.interviewBtnText}>发起面试</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedStatus: ApplicationStatus | null;
  onSelectStatus: (status: ApplicationStatus | null) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  selectedStatus,
  onSelectStatus,
}) => {
  const statuses = Object.values(ApplicationStatus);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>筛选状态</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.filterOption, selectedStatus === null && styles.filterOptionActive]}
            onPress={() => onSelectStatus(null)}
          >
            <Text style={[styles.filterOptionText, selectedStatus === null && styles.filterOptionTextActive]}>
              全部
            </Text>
          </TouchableOpacity>

          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterOption, selectedStatus === status && styles.filterOptionActive]}
              onPress={() => onSelectStatus(status)}
            >
              <Text style={[styles.filterOptionText, selectedStatus === status && styles.filterOptionTextActive]}>
                {APPLICATION_STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

export const ReceivedResumesScreen: React.FC = () => {
  const navigation = useNavigation<ReceivedResumesScreenNavigationProp>();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // TODO: Get jobId from route params
  const jobId = 'temp-job-id';

  const fetchApplications = useCallback(async () => {
    // TODO: Call API
    // const response = await api.get(`/jobs/${jobId}/applications`, {
    //   params: { status: filterStatus }
    // });
    // setApplications(response.data.data);

    // Mock data for now
    setApplications([
      {
        id: 'app-1',
        jobId,
        applicantId: 'user-1',
        applicantAgentId: 'agent-1',
        status: ApplicationStatus.PENDING,
        coverLetter: '您好，我对这个职位非常感兴趣，希望能有机会面试...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'app-2',
        jobId,
        applicantId: 'user-2',
        applicantAgentId: 'agent-2',
        status: ApplicationStatus.SHORTLISTED,
        coverLetter: '我有5年相关经验，希望能加入贵公司...',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  }, [filterStatus, jobId]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchApplications();
    setIsRefreshing(false);
  }, [fetchApplications]);

  const handleStatusChange = useCallback((application: JobApplication, status: ApplicationStatus) => {
    Alert.alert(
      '确认操作',
      `确定要将该候选人标记为"${APPLICATION_STATUS_LABELS[status]}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              // TODO: Call API
              // await api.patch(`/jobs/${jobId}/applications/${application.id}`, { status });

              // Update local state
              setApplications((prev) =>
                prev.map((app) =>
                  app.id === application.id ? { ...app, status } : app
                )
              );
            } catch (error) {
              Alert.alert('错误', '操作失败，请重试');
            }
          },
        },
      ]
    );
  }, [jobId]);

  const handleApplicationPress = useCallback((application: JobApplication) => {
    // TODO: Navigate to application detail
    Alert.alert('详情', '查看候选人详情功能开发中...');
  }, []);

  const filteredApplications = filterStatus
    ? applications.filter((app) => app.status === filterStatus)
    : applications;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={styles.emptyTitle}>暂无简历</Text>
      <Text style={styles.emptyDescription}>
        {filterStatus
          ? '该筛选条件下暂无简历，试试其他筛选条件'
          : '该职位暂时还没有收到简历投递'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>收到的简历</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>筛选</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{applications.length}</Text>
          <Text style={styles.statLabel}>总计</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {applications.filter((a) => a.status === ApplicationStatus.PENDING).length}
          </Text>
          <Text style={styles.statLabel}>待处理</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {applications.filter((a) => a.status === ApplicationStatus.SHORTLISTED).length}
          </Text>
          <Text style={styles.statLabel}>初筛通过</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {applications.filter((a) => a.status === ApplicationStatus.INTERVIEWING).length}
          </Text>
          <Text style={styles.statLabel}>面试中</Text>
        </View>
      </View>

      {/* Filter indicator */}
      {filterStatus && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterIndicatorText}>
            筛选: {APPLICATION_STATUS_LABELS[filterStatus]}
          </Text>
          <TouchableOpacity onPress={() => setFilterStatus(null)}>
            <Text style={styles.filterClear}>清除</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            onPress={handleApplicationPress}
            onStatusChange={handleStatusChange}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedStatus={filterStatus}
        onSelectStatus={(status) => {
          setFilterStatus(status);
          setShowFilterModal(false);
        }}
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#2196F3',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
  },
  filterIndicatorText: {
    fontSize: 13,
    color: '#2196F3',
  },
  filterClear: {
    fontSize: 13,
    color: '#F44336',
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
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  coverLetter: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  shortlistBtn: {
    backgroundColor: '#E3F2FD',
  },
  shortlistBtnText: {
    color: '#2196F3',
    fontSize: 13,
    fontWeight: '500',
  },
  rejectBtn: {
    backgroundColor: '#FFEBEE',
  },
  rejectBtnText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '500',
  },
  interviewBtn: {
    backgroundColor: '#4CAF50',
  },
  interviewBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#333',
  },
  filterOptionTextActive: {
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default ReceivedResumesScreen;
