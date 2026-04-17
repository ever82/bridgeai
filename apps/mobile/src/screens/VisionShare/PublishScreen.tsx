/**
 * VisionShare Publish Screen
 * VisionShare任务发布主界面
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  VisionSharePublishFormData,
  PublishValidationResult,
} from '@packages/shared/types/visionShare';

import { PublishForm } from '../../components/VisionShare/PublishForm';
import { visionShareApi } from '../../services/api/visionShare';

export type PublishScreenNavigationProp = NativeStackNavigationProp<{
  PublishSuccess: { taskId: string; shareLink: string; estimatedMatchTime?: number };
  VisionShareHistory: undefined;
}>;

export const PublishScreen: React.FC = () => {
  const navigation = useNavigation<PublishScreenNavigationProp>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [publishLimits, setPublishLimits] = useState<{
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    canPublish: boolean;
  } | null>(null);

  // 加载发布限制
  useEffect(() => {
    loadPublishLimits();
  }, []);

  const loadPublishLimits = async () => {
    try {
      const limits = await visionShareApi.getPublishLimits();
      setPublishLimits(limits);
    } catch (error) {
      console.error('Failed to load publish limits', error);
    }
  };

  // 验证发布资格
  const validatePublish = async (
    data: VisionSharePublishFormData
  ): Promise<PublishValidationResult | null> => {
    try {
      setIsValidating(true);
      const result = await visionShareApi.validatePublish({
        budgetAmount: data.budgetAmount,
        budgetType: data.budgetType,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      return result;
    } catch (error) {
      console.error('Validation failed', error);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  // 处理表单提交
  const handleSubmit = useCallback(async (data: VisionSharePublishFormData) => {
    // 检查发布限制
    if (publishLimits && !publishLimits.canPublish) {
      Alert.alert(
        '发布限制',
        `今日发布数量已达上限(${publishLimits.dailyLimit}个)，请明天再试`,
        [{ text: '确定' }]
      );
      return;
    }

    // 执行验证
    const validation = await validatePublish(data);

    if (validation && !validation.valid) {
      const errors: string[] = [];
      if (!validation.creditCheck.passed) {
        errors.push(`信用分不足（当前${validation.creditCheck.score}分，需要${validation.creditCheck.requiredScore}分）`);
      }
      if (!validation.balanceCheck.passed) {
        errors.push(`积分余额不足（当前${validation.balanceCheck.balance}，需要${validation.balanceCheck.required}）`);
      }
      if (!validation.limitCheck.passed) {
        errors.push(`今日发布数量已达上限`);
      }
      if (!validation.contentCheck.passed) {
        errors.push(...validation.contentCheck.issues);
      }
      if (!validation.locationCheck.passed) {
        errors.push(validation.locationCheck.reason || '位置信息有误');
      }

      if (errors.length > 0) {
        Alert.alert('发布验证失败', errors.join('\n'), [{ text: '确定' }]);
        return;
      }
    }

    // 确认发布
    Alert.alert(
      '确认发布',
      '确定要发布这个VisionShare任务吗？发布后将在平台上展示并寻找匹配的服务提供者。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认发布',
          style: 'default',
          onPress: async () => {
            await submitTask(data);
          },
        },
      ]
    );
  }, [publishLimits]);

  // 提交任务
  const submitTask = async (data: VisionSharePublishFormData) => {
    setIsSubmitting(true);
    try {
      // 1. 创建草稿
      const { task } = await visionShareApi.createTask({
        title: data.title,
        description: data.description,
        budgetType: data.budgetType,
        budgetAmount: data.budgetAmount,
        budgetCurrency: data.budgetCurrency,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        startTime: data.startTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
        timeType: data.timeType,
        validHours: data.validHours,
        category: data.category,
        tags: data.tags,
      });

      // 2. 发布任务
      const publishResult = await visionShareApi.publishTask(task.id);

      if (publishResult.success) {
        // 跳转到成功页面
        navigation.navigate('PublishSuccess', {
          taskId: task.id,
          shareLink: publishResult.shareLink || '',
          estimatedMatchTime: publishResult.estimatedMatchTime,
        });
      } else {
        Alert.alert('发布失败', publishResult.errors?.join('\n') || '请稍后重试');
      }
    } catch (error) {
      console.error('Submit task failed', error);
      Alert.alert('发布失败', '网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理保存草稿
  const handleSaveDraft = useCallback(async (data: VisionSharePublishFormData) => {
    setIsSubmitting(true);
    try {
      await visionShareApi.createTask({
        title: data.title,
        description: data.description,
        budgetType: data.budgetType,
        budgetAmount: data.budgetAmount,
        budgetCurrency: data.budgetCurrency,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        startTime: data.startTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
        timeType: data.timeType,
        validHours: data.validHours,
        category: data.category,
        tags: data.tags,
      });

      Alert.alert('保存成功', '任务已保存为草稿', [{ text: '确定' }]);
    } catch (error) {
      console.error('Save draft failed', error);
      Alert.alert('保存失败', '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* 头部信息 */}
      <View style={styles.header}>
        <Text style={styles.title}>发布VisionShare需求</Text>
        {publishLimits && (
          <Text style={styles.limitText}>
            今日可发布: {publishLimits.dailyRemaining}/{publishLimits.dailyLimit}
          </Text>
        )}
      </View>

      {/* 验证中提示 */}
      {isValidating && (
        <View style={styles.validationBanner}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.validationText}>正在验证发布资格...</Text>
        </View>
      )}

      {/* 表单 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <PublishForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          isLoading={isSubmitting}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  limitText: {
    fontSize: 14,
    color: '#666',
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#E3F2FD',
  },
  validationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
  },
  scrollView: {
    flex: 1,
  },
});

export default PublishScreen;
