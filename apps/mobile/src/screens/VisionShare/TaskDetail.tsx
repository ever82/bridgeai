import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Task,
  TaskReview,
  GeoCoordinates,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  calculateDistance,
} from '@bridgeai/shared';

// Mock reviews data
const mockReviews: TaskReview[] = [
  {
    id: 'review-001',
    taskId: 'task-001',
    reviewerId: 'user-010',
    reviewerName: '用户A',
    rating: 5,
    content: '非常专业的摄影师，作品质量很高，沟通顺畅！',
    createdAt: new Date('2026-03-15'),
  },
  {
    id: 'review-002',
    taskId: 'task-001',
    reviewerId: 'user-011',
    reviewerName: '用户B',
    rating: 4,
    content: '拍摄效果不错，就是时间稍微晚了一点。',
    createdAt: new Date('2026-03-10'),
  },
];

export const TaskDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params as { taskId: string };

  const [task, setTask] = useState<Task | null>(null);
  const [reviews, setReviews] = useState<TaskReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user location (in production, use GPS)
  const userLocation: GeoCoordinates = {
    latitude: 22.5431,
    longitude: 114.0579,
  };

  useEffect(() => {
    loadTaskDetail();
  }, [taskId]);

  const loadTaskDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, call API
      // const response = await api.get(`/visionShare/tasks/${taskId}`);

      // Mock data for development
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockTask: Task = {
        id: taskId,
        title: '商业摄影拍摄',
        description: '需要专业摄影师拍摄产品照片，约50张。要求有商业摄影经验，能够熟练使用灯光设备。拍摄内容包括产品白底图、场景图等。预计拍摄时间为3小时。',
        type: 'photography',
        status: 'pending',
        priority: 'high',
        publisherId: 'user-001',
        publisherName: '张三',
        publisherAvatar: '',
        publisherCreditScore: 85,
        location: {
          province: '440000',
          provinceName: '广东省',
          city: '440300',
          cityName: '深圳市',
          district: '440305',
          districtName: '南山区',
        },
        coordinates: { latitude: 22.5431, longitude: 114.0579 },
        address: '深圳市南山区科技园南区A栋1001室',
        budgetMin: 1000,
        budgetMax: 2000,
        currency: 'CNY',
        publishTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedDuration: 180,
        images: [],
        tags: ['商业摄影', '产品拍摄', '白底图'],
        viewCount: 45,
        inquiryCount: 3,
        applicationCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setTask(mockTask);
      setReviews(mockReviews);
    } catch (err) {
      setError('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = useCallback(() => {
    Alert.alert(
      '确认接单',
      '您确定要接这个任务吗？接单后请按时完成。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => {
            // In production, call API to accept task
            navigation.navigate('AcceptTask', { taskId });
          },
        },
      ]
    );
  }, [taskId, navigation]);

  const handleNavigate = useCallback(() => {
    // In production, open map navigation
    Alert.alert('导航', '打开地图导航到任务地点');
  }, []);

  const formatBudget = (min: number, max: number) => {
    if (min === max) {
      return `¥${min}`;
    }
    return `¥${min} - ¥${max}`;
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890FF" />
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || '任务不存在'}</Text>
        <TouchableOpacity onPress={loadTaskDetail}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { distanceKm } = calculateDistance(userLocation, task.coordinates);
  const typeLabel = TASK_TYPE_LABELS[task.type]?.zh || task.type;
  const priorityStyle = TASK_PRIORITY_LABELS[task.priority];
  const statusLabel = TASK_STATUS_LABELS[task.status]?.zh || task.status;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Task Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={[styles.typeBadge, { backgroundColor: priorityStyle.color + '20' }]}>
              <Text style={[styles.typeText, { color: priorityStyle.color }]}>
                {typeLabel}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#52C41A20' }]}>
              <Text style={[styles.statusText, { color: '#52C41A' }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{task.viewCount} 浏览</Text>
            <Text style={styles.statsDot}>·</Text>
            <Text style={styles.statsText}>{task.applicationCount} 人申请</Text>
          </View>
        </View>

        {/* Budget Section */}
        <View style={styles.section}>
          <Text style={styles.budgetLabel}>任务预算</Text>
          <Text style={styles.budgetValue}>
            {formatBudget(task.budgetMin, task.budgetMax)}
          </Text>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>任务描述</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>任务地点</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.address}>{task.address}</Text>
            <View style={styles.distanceRow}>
              <Text style={styles.distanceText}>
                距您 {formatDistance(distanceKm * 1000)}
              </Text>
              <TouchableOpacity onPress={handleNavigate}>
                <Text style={styles.navigateText}>导航</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>时间安排</Text>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>发布时间</Text>
            <Text style={styles.timeValue}>{formatDate(task.publishTime)}</Text>
          </View>
          {task.deadline && (
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>截止时间</Text>
              <Text style={styles.timeValue}>{formatDate(task.deadline)}</Text>
            </View>
          )}
          {task.estimatedDuration && (
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>预计时长</Text>
              <Text style={styles.timeValue}>{task.estimatedDuration} 分钟</Text>
            </View>
          )}
        </View>

        {/* Tags Section */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>标签</Text>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Publisher Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>发布者</Text>
          <View style={styles.publisherContainer}>
            <View style={styles.publisherAvatar}>
              <Text style={styles.publisherAvatarText}>
                {task.publisherName.charAt(0)}
              </Text>
            </View>
            <View style={styles.publisherInfo}>
              <Text style={styles.publisherName}>{task.publisherName}</Text>
              <View style={styles.creditBadge}>
                <Text style={styles.creditText}>信用分 {task.publisherCreditScore}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>历史评价</Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                  <Text style={styles.rating}>{renderStars(review.rating)}</Text>
                </View>
                <Text style={styles.reviewContent}>{review.content}</Text>
                <Text style={styles.reviewDate}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noReviewsText}>暂无评价</Text>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.contactButton}>
          <Text style={styles.contactButtonText}>咨询</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
        >
          <Text style={styles.acceptButtonText}>立即接单</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4D4F',
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#1890FF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
    lineHeight: 28,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 13,
    color: '#8C8C8C',
  },
  statsDot: {
    fontSize: 13,
    color: '#8C8C8C',
    marginHorizontal: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#8C8C8C',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF7A45',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#595959',
    lineHeight: 22,
  },
  locationContainer: {
    backgroundColor: '#F6FFED',
    padding: 12,
    borderRadius: 8,
  },
  address: {
    fontSize: 14,
    color: '#262626',
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#52C41A',
    fontWeight: '500',
  },
  navigateText: {
    fontSize: 13,
    color: '#1890FF',
    fontWeight: '500',
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeLabel: {
    fontSize: 14,
    color: '#8C8C8C',
  },
  timeValue: {
    fontSize: 14,
    color: '#262626',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#595959',
  },
  publisherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publisherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1890FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publisherAvatarText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  publisherInfo: {
    marginLeft: 12,
  },
  publisherName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 4,
  },
  creditBadge: {
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  creditText: {
    fontSize: 12,
    color: '#FA8C16',
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
  },
  rating: {
    fontSize: 14,
    color: '#FAAD14',
  },
  reviewContent: {
    fontSize: 14,
    color: '#595959',
    lineHeight: 20,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 80,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 15,
    color: '#595959',
    fontWeight: '500',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#1890FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
