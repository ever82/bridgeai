import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Task,
  TaskEligibilityResult,
  TaskAcceptResponse,
  GeoCoordinates,
  calculateDistance,
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
} from '@visionshare/shared';

export const AcceptTaskScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params as { taskId: string };

  const [task, setTask] = useState<Task | null>(null);
  const [eligibility, setEligibility] = useState<TaskEligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Mock user data (in production, from auth context)
  const userId = 'current-user';
  const userCreditScore = 85;
  const userPoints = 500;
  const userLocation: GeoCoordinates = {
    latitude: 22.5431,
    longitude: 114.0579,
  };

  useEffect(() => {
    loadTaskAndCheckEligibility();
  }, [taskId]);

  const loadTaskAndCheckEligibility = async () => {
    try {
      setLoading(true);

      // In production, call API
      // const [taskResponse, eligibilityResponse] = await Promise.all([
      //   api.get(`/visionShare/tasks/${taskId}`),
      //   api.get(`/visionShare/tasks/${taskId}/eligibility`),
      // ]);

      // Mock data for development
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockTask: Task = {
        id: taskId,
        title: '商业摄影拍摄',
        description: '需要专业摄影师拍摄产品照片',
        type: 'photography',
        status: 'pending',
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
        viewCount: 45,
        inquiryCount: 3,
        applicationCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const distance = calculateDistance(userLocation, mockTask.coordinates);

      const mockEligibility: TaskEligibilityResult = {
        eligible: true,
        reasons: [],
        requiredCreditScore: 60,
        currentCreditScore: userCreditScore,
        requiredPoints: 100,
        currentPoints: userPoints,
        maxDistanceKm: 50,
        currentDistanceKm: distance,
      };

      setTask(mockTask);
      setEligibility(mockEligibility);
    } catch (err) {
      Alert.alert('错误', '加载任务信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = useCallback(async () => {
    if (!eligibility?.eligible) {
      Alert.alert('无法接单', eligibility?.reasons.join('\n') || '不符合接单条件');
      return;
    }

    Alert.alert(
      '确认接单',
      '接单后请按时完成任务，如有变动请及时沟通。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认接单',
          onPress: async () => {
            try {
              setAccepting(true);

              // In production, call API
              // const response = await api.post('/visionShare/tasks/accept', {
              //   taskId,
              //   userId,
              //   userLocation,
              // });

              // Mock response
              await new Promise((resolve) => setTimeout(resolve, 1000));

              setAccepted(true);
            } catch (err) {
              Alert.alert('接单失败', '请稍后重试');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  }, [eligibility, taskId]);

  const handleNavigate = useCallback(() => {
    Alert.alert('导航', '正在打开地图导航...');
    // In production, open map app
  }, []);

  const handleViewMyTasks = useCallback(() => {
    navigation.navigate('MyTasks');
  }, [navigation]);

  const formatBudget = (min: number, max: number) => {
    if (min === max) {
      return `¥${min}`;
    }
    return `¥${min} - ¥${max}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890FF" />
      </View>
    );
  }

  if (!task || !eligibility) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>任务信息加载失败</Text>
        <TouchableOpacity onPress={loadTaskAndCheckEligibility}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state after accepting
  if (accepted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>接单成功！</Text>
        <Text style={styles.successMessage}>
          您已成功接取任务「{task.title}」，请按时完成。
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigate}
          >
            <Text style={styles.navigateButtonText}>导航到任务地点</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewTasksButton}
            onPress={handleViewMyTasks}
          >
            <Text style={styles.viewTasksButtonText}>查看我的任务</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeLabel = TASK_TYPE_LABELS[task.type]?.zh || task.type;
  const statusLabel = TASK_STATUS_LABELS[task.status]?.zh || task.status;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Task Info Card */}
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{typeLabel}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskBudget}>
            {formatBudget(task.budgetMin, task.budgetMax)}
          </Text>
          <Text style={styles.taskAddress}>{task.address}</Text>
        </View>

        {/* Eligibility Check */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>资格检查</Text>

          {/* Credit Score */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <Text style={styles.checkLabel}>信用分要求</Text>
              <Text style={styles.checkValue}>
                当前 {eligibility.currentCreditScore} / 需要 {eligibility.requiredCreditScore}
              </Text>
            </View>
            <View style={[
              styles.checkStatus,
              eligibility.currentCreditScore >= (eligibility.requiredCreditScore || 0)
                ? styles.checkStatusPass
                : styles.checkStatusFail
            ]}>
              <Text style={[
                styles.checkStatusText,
                eligibility.currentCreditScore >= (eligibility.requiredCreditScore || 0)
                  ? styles.checkStatusTextPass
                  : styles.checkStatusTextFail
              ]}>
                {eligibility.currentCreditScore >= (eligibility.requiredCreditScore || 0) ? '✓' : '✗'}
              </Text>
            </View>
          </View>

          {/* Points */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <Text style={styles.checkLabel}>积分要求</Text>
              <Text style={styles.checkValue}>
                当前 {eligibility.currentPoints} / 需要 {eligibility.requiredPoints}
              </Text>
            </View>
            <View style={[
              styles.checkStatus,
              (eligibility.currentPoints || 0) >= (eligibility.requiredPoints || 0)
                ? styles.checkStatusPass
                : styles.checkStatusFail
            ]}>
              <Text style={[
                styles.checkStatusText,
                (eligibility.currentPoints || 0) >= (eligibility.requiredPoints || 0)
                  ? styles.checkStatusTextPass
                  : styles.checkStatusTextFail
              ]}>
                {(eligibility.currentPoints || 0) >= (eligibility.requiredPoints || 0) ? '✓' : '✗'}
              </Text>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <Text style={styles.checkLabel}>距离检查</Text>
              <Text style={styles.checkValue}>
                当前 {eligibility.currentDistanceKm?.toFixed(1)}km / 最大 {eligibility.maxDistanceKm}km
              </Text>
            </View>
            <View style={[
              styles.checkStatus,
              (eligibility.currentDistanceKm || 0) <= (eligibility.maxDistanceKm || 50)
                ? styles.checkStatusPass
                : styles.checkStatusFail
            ]}>
              <Text style={[
                styles.checkStatusText,
                (eligibility.currentDistanceKm || 0) <= (eligibility.maxDistanceKm || 50)
                  ? styles.checkStatusTextPass
                  : styles.checkStatusTextFail
              ]}>
                {(eligibility.currentDistanceKm || 0) <= (eligibility.maxDistanceKm || 50) ? '✓' : '✗'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>接单须知</Text>
          <View style={styles.notesList}>
            <Text style={styles.noteItem}>• 接单后请按时到达任务地点</Text>
            <Text style={styles.noteItem}>• 如有特殊情况请及时与发布者沟通</Text>
            <Text style={styles.noteItem}>• 完成任务后请及时确认完成</Text>
            <Text style={styles.noteItem}>• 恶意取消将影响信用分</Text>
          </View>
        </View>

        {/* Error Messages */}
        {eligibility.reasons.length > 0 && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>无法接单</Text>
            {eligibility.reasons.map((reason, index) => (
              <Text key={index} style={styles.errorReason}>• {reason}</Text>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!eligibility.eligible || accepting) && styles.acceptButtonDisabled
          ]}
          onPress={handleAccept}
          disabled={!eligibility.eligible || accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptButtonText}>
              {eligibility.eligible ? '确认接单' : '不符合接单条件'}
            </Text>
          )}
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
  taskCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: '#E6F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#1890FF',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#F6FFED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#52C41A',
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  taskBudget: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF7A45',
    marginBottom: 8,
  },
  taskAddress: {
    fontSize: 14,
    color: '#8C8C8C',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkLeft: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 14,
    color: '#8C8C8C',
    marginBottom: 4,
  },
  checkValue: {
    fontSize: 15,
    color: '#262626',
  },
  checkStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkStatusPass: {
    backgroundColor: '#52C41A',
  },
  checkStatusFail: {
    backgroundColor: '#FF4D4F',
  },
  checkStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkStatusTextPass: {
    color: '#FFFFFF',
  },
  checkStatusTextFail: {
    color: '#FFFFFF',
  },
  notesList: {
    gap: 8,
  },
  noteItem: {
    fontSize: 14,
    color: '#595959',
    lineHeight: 20,
  },
  errorSection: {
    backgroundColor: '#FFF2F0',
    padding: 16,
    marginBottom: 8,
  },
  errorSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4D4F',
    marginBottom: 12,
  },
  errorReason: {
    fontSize: 14,
    color: '#FF4D4F',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 80,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  acceptButton: {
    paddingVertical: 14,
    backgroundColor: '#1890FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#BFBFBF',
  },
  acceptButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#52C41A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: '#595959',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  navigateButton: {
    paddingVertical: 14,
    backgroundColor: '#1890FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  navigateButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewTasksButton: {
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  viewTasksButtonText: {
    fontSize: 15,
    color: '#595959',
    fontWeight: '500',
  },
});
