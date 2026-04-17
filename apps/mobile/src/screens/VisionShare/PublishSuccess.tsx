/**
 * VisionShare Publish Success Screen
 * 发布成功确认页面
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { visionShareApi } from '../../services/visionShareApi';

export type PublishSuccessParams = {
  taskId: string;
  shareLink: string;
  estimatedMatchTime?: number;
};

export type PublishSuccessRouteProp = RouteProp<
  { PublishSuccess: PublishSuccessParams },
  'PublishSuccess'
>;

export type PublishSuccessNavigationProp = NativeStackNavigationProp<{
  VisionShareHistory: undefined;
  Home: undefined;
}>;

export const PublishSuccessScreen: React.FC = () => {
  const navigation = useNavigation<PublishSuccessNavigationProp>();
  const route = useRoute<PublishSuccessRouteProp>();
  const { taskId, shareLink, estimatedMatchTime } = route.params;

  // 分享任务
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: '分享VisionShare任务',
        message: `我在VisionShare发布了一个任务，快来接单吧！${shareLink}`,
        url: shareLink,
      });
    } catch (error) {
      console.error('Share failed', error);
    }
  }, [shareLink]);

  // 复制链接
  const handleCopyLink = useCallback(async () => {
    // 这里应该调用剪贴板API
    // Clipboard.setString(shareLink);
    // 简化处理，实际应该使用@react-native-clipboard/clipboard
    console.log('Copy link:', shareLink);
  }, [shareLink]);

  // 查看发布历史
  const handleViewHistory = useCallback(() => {
    navigation.navigate('VisionShareHistory');
  }, [navigation]);

  // 返回首页
  const handleGoHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 成功图标 */}
        <View style={styles.iconContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
        </View>

        {/* 成功标题 */}
        <Text style={styles.title}>发布成功！</Text>
        <Text style={styles.subtitle}>
          您的VisionShare任务已成功发布，正在为您匹配合适的服务提供者
        </Text>

        {/* 预计匹配时间 */}
        {estimatedMatchTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>预计匹配时间</Text>
            <Text style={styles.timeValue}>{estimatedMatchTime}分钟</Text>
            <Text style={styles.timeDescription}>
              平均匹配时间，实际时间可能因需求而异
            </Text>
          </View>
        )}

        {/* 分享区域 */}
        <View style={styles.shareSection}>
          <Text style={styles.shareTitle}>分享任务</Text>
          <Text style={styles.shareDescription}>
            分享给朋友或社交媒体，让更多人看到您的需求
          </Text>

          {/* 分享按钮组 */}
          <View style={styles.shareButtons}>
            <TouchableOpacity
              style={[styles.shareButton, styles.shareButtonPrimary]}
              onPress={handleShare}
              testID="share-button"
            >
              <Text style={styles.shareButtonTextPrimary}>立即分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, styles.shareButtonSecondary]}
              onPress={handleCopyLink}
              testID="copy-link-button"
            >
              <Text style={styles.shareButtonTextSecondary}>复制链接</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 下一步操作 */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>接下来您可以</Text>

          <TouchableOpacity
            style={styles.nextStepItem}
            onPress={handleViewHistory}
            testID="view-history-button"
          >
            <View style={styles.nextStepIcon}>
              <Text style={styles.nextStepIconText}>📋</Text>
            </View>
            <View style={styles.nextStepContent}>
              <Text style={styles.nextStepTitle}>查看发布历史</Text>
              <Text style={styles.nextStepDescription}>
                查看所有已发布的任务状态和进展
              </Text>
            </View>
            <Text style={styles.nextStepArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextStepItem}
            onPress={handleGoHome}
            testID="go-home-button"
          >
            <View style={styles.nextStepIcon}>
              <Text style={styles.nextStepIconText}>🏠</Text>
            </View>
            <View style={styles.nextStepContent}>
              <Text style={styles.nextStepTitle}>返回首页</Text>
              <Text style={styles.nextStepDescription}>
                浏览更多功能和服务
              </Text>
            </View>
            <Text style={styles.nextStepArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 温馨提示</Text>
          <Text style={styles.tipsText}>
            • 任务发布后，服务提供者会主动联系您{'\n'}
            • 建议保持手机畅通，及时查看消息通知{'\n'}
            • 可以在"发布历史"中随时取消或编辑任务{'\n'}
            • 任务过期后会自动关闭，请注意有效期
          </Text>
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleGoHome}
          testID="done-button"
        >
          <Text style={styles.doneButtonText}>完成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  timeContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  timeLabel: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  timeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  shareSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  shareDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  shareButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shareButtonTextPrimary: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  shareButtonTextSecondary: {
    fontSize: 16,
    color: '#333',
  },
  nextSteps: {
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  nextStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStepIconText: {
    fontSize: 20,
  },
  nextStepContent: {
    flex: 1,
    marginLeft: 12,
  },
  nextStepTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  nextStepDescription: {
    fontSize: 13,
    color: '#666',
  },
  nextStepArrow: {
    fontSize: 24,
    color: '#999',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default PublishSuccessScreen;
