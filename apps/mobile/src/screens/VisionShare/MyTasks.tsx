import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Task,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  calculateDistance,
  GeoCoordinates,
} from '@visionshare/shared';

interface TaskSection {
  title: string;
  status: TaskStatus;
  data: Task[];
}

const TABS: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'accepted', label: '已接单' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

// Mock user location
const userLocation: GeoCoordinates = {
  latitude: 22.5431,
  longitude: 114.0579,
};

export const MyTasksScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [stats, setStats] = useState({
    totalAccepted: 0,
    totalCompleted: 0,
    totalEarned: 0,
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      // In production, call API
      // const response = await api.get('/visionShare/tasks/my-tasks');

      // Mock data for development
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockTasks: Task[] = [
        {
          id: 'task-101',
          title: '商业摄影拍摄',
          description: '需要专业摄影师拍摄产品照片',
          type: 'photography',
          status: 'accepted',
          priority: 'high',
          publisherId: 'user-001',
          publisherName: '张三',
          publisherCreditScore: 85,
          location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
          },
          coordinates: { latitude: 22.5431, longitude: 114.0579 },
          address: '深圳市南山区科技园',
          budgetMin: 1000,
          budgetMax: 2000,
          currency: 'CNY',
          publishTime: new Date(),
          acceptedAt: new Date(),
          viewCount: 45,
          inquiryCount: 3,
          applicationCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-102',
          title: '短视频拍摄剪辑',
          description: '需要拍摄并剪辑宣传短视频',
          type: 'video',
          status: 'in_progress',
          priority: 'urgent',
          publisherId: 'user-002',
          publisherName: '李四',
          publisherCreditScore: 92,
          location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
          },
          coordinates: { latitude: 22.5485, longitude: 114.1315 },
          address: '深圳市罗湖区万象城',
          budgetMin: 3000,
          budgetMax: 5000,
          currency: 'CNY',
          publishTime: new Date(),
          acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          startedAt: new Date(),
          viewCount: 28,
          inquiryCount: 5,
          applicationCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-103',
          title: 'Logo设计',
          description: '为新创公司设计Logo',
          type: 'design',
          status: 'completed',
          priority: 'normal',
          publisherId: 'user-003',
          publisherName: '王五',
          publisherCreditScore: 78,
          location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
          },
          coordinates: { latitude: 22.5431, longitude: 114.0579 },
          address: '深圳市福田区CBD',
          budgetMin: 800,
          budgetMax: 1500,
          currency: 'CNY',
          publishTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          acceptedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          viewCount: 67,
          inquiryCount: 8,
          applicationCount: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setTasks(mockTasks);
      setStats({
        totalAccepted: 3,
        totalCompleted: 1,
        totalEarned: 1500,
      });
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskPress = useCallback((taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
  }, [navigation]);

  const handleStartTask = useCallback((taskId: string) => {
    // In production, call API to start task
    console.log('Start task:', taskId);
  }, []);

  const handleCompleteTask = useCallback((taskId: string) => {
    // In production, call API to complete task
    console.log('Complete task:', taskId);
  }, []);

  const filteredTasks = activeTab === 'all'
    ? tasks
    : tasks.filter((task) => task.status === activeTab);

  const renderTaskItem = useCallback(({ item }: { item: Task }) => {
    const distance = calculateDistance(userLocation, item.coordinates);
    const typeLabel = TASK_TYPE_LABELS[item.type]?.zh || item.type;
    const statusLabel = TASK_STATUS_LABELS[item.status]?.zh || item.status;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => handleTaskPress(item.id)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.taskHeader}>
          <View style={styles.taskTypeBadge}>
            <Text style={styles.taskTypeText}>{typeLabel}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.taskTitle}>{item.title}</Text>

        {/* Info */}
        <View style={styles.taskInfo}>
          <Text style={styles.taskBudget}>¥{item.budgetMax}</Text>
          <Text style={styles.taskDistance}>{distance.toFixed(1)}km</Text>
        </View>

        {/* Publisher */}
        <View style={styles.publisherRow}>
          <Text style={styles.publisherName}>{item.publisherName}</Text>
          <Text style={styles.publisherCredit}>信用 {item.publisherCreditScore}</Text>
        </View>

        {/* Action Buttons */}
        {item.status === 'accepted' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleStartTask(item.id)}
          >
            <Text style={styles.actionButtonText}>开始任务</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleCompleteTask(item.id)}
          >
            <Text style={styles.actionButtonText}>完成任务</Text>
          </TouchableOpacity>
        )}

        {item.status === 'completed' && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>已完成</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleTaskPress, handleStartTask, handleCompleteTask]);

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'accepted':
        return '#1890FF';
      case 'in_progress':
        return '#FAAD14';
      case 'completed':
        return '#52C41A';
      case 'cancelled':
        return '#FF4D4F';
      case 'disputed':
        return '#722ED1';
      default:
        return '#8C8C8C';
    }
  };

  return (
    <View style={styles.container}>
      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalAccepted}</Text>
          <Text style={styles.statLabel}>已接单</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalCompleted}</Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>¥{stats.totalEarned}</Text>
          <Text style={styles.statLabel}>已赚取</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890FF" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无任务</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E8E8',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8C8C8C',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  tabActive: {
    backgroundColor: '#E6F7FF',
  },
  tabText: {
    fontSize: 14,
    color: '#595959',
  },
  tabTextActive: {
    color: '#1890FF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskTypeBadge: {
    backgroundColor: '#E6F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskTypeText: {
    fontSize: 12,
    color: '#1890FF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 10,
  },
  taskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskBudget: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF7A45',
  },
  taskDistance: {
    fontSize: 14,
    color: '#52C41A',
  },
  publisherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 12,
  },
  publisherName: {
    fontSize: 14,
    color: '#262626',
  },
  publisherCredit: {
    fontSize: 12,
    color: '#FA8C16',
  },
  actionButton: {
    backgroundColor: '#1890FF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#52C41A',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#F6FFED',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 14,
    color: '#52C41A',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#8C8C8C',
  },
});
