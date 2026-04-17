import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { theme } from '../../theme';
import { Review } from '../../types/review';
import { StarRating } from '../../components/Reviews';
import { Button } from '../../components/Button';

// Mock data
const mockReview: Review = {
  id: '1',
  matchId: 'match-1',
  raterId: 'user-1',
  rateeId: 'user-2',
  score: 5,
  comment: '非常棒的体验！对方很专业，沟通顺畅，强烈推荐！',
  createdAt: '2026-04-08T10:30:00Z',
  rater: { id: 'user-1', name: '张三', avatar: undefined },
  ratee: { id: 'user-2', name: '李四', avatar: undefined },
  match: { id: 'match-1', title: '摄影服务订单 #1234', completedAt: '2026-04-07' },
};

export const ReviewDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { reviewId } = route.params as { reviewId: string };

  const [review] = useState<Review>(mockReview);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _reviewId = reviewId; // Will be used for real API fetch
  const [reply, setReply] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReply = async () => {
    if (!reply.trim()) {
      Alert.alert('提示', '请输入回复内容');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setShowReplyInput(false);
    setReply('');
    Alert.alert('成功', '回复已提交');
  };

  const handleReport = () => {
    Alert.alert('举报评价', '您确定要举报这条评价吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认举报',
        style: 'destructive',
        onPress: () => {
          Alert.alert('已提交', '感谢您的反馈，我们会尽快处理');
        },
      },
    ]);
  };

  const user = review.rater;
  const isReceivedReview = review.rateeId === 'user-2'; // Current user ID (mock)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>评价详情</Text>
        <TouchableOpacity onPress={handleReport} style={styles.reportButton}>
          <Text style={styles.reportButtonText}>举报</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Review Card */}
        <View style={styles.reviewCard}>
          {/* User Info */}
          <View style={styles.userSection}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || '未知用户'}</Text>
              <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingSection}>
            <StarRating rating={review.score} size="lg" disabled />
            <Text style={styles.scoreText}>{review.score}.0</Text>
          </View>

          {/* Comment */}
          {review.comment && (
            <View style={styles.commentSection}>
              <Text style={styles.commentText}>{review.comment}</Text>
            </View>
          )}

          {/* Match Info */}
          {review.match && (
            <View style={styles.matchSection}>
              <Text style={styles.matchLabel}>相关订单</Text>
              <View style={styles.matchCard}>
                <Text style={styles.matchTitle}>{review.match.title}</Text>
                <Text style={styles.matchDate}>
                  完成于 {formatDate(review.match.completedAt || '')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Reply Section */}
        {isReceivedReview && (
          <View style={styles.replySection}>
            <Text style={styles.replySectionTitle}>您的回复</Text>
            {!showReplyInput ? (
              <TouchableOpacity style={styles.replyButton} onPress={() => setShowReplyInput(true)}>
                <Text style={styles.replyButtonText}>+ 添加回复</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="请输入您的回复..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  value={reply}
                  onChangeText={setReply}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{reply.length}/500</Text>
                <View style={styles.replyActions}>
                  <Button
                    title="取消"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setShowReplyInput(false);
                      setReply('');
                    }}
                  />
                  <Button title="提交回复" size="sm" onPress={handleReply} loading={isSubmitting} />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
  },
  backButtonText: {
    fontSize: theme.fonts.sizes['2xl'],
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  reportButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
  },
  reportButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.error,
  },
  content: {
    flex: 1,
  },
  reviewCard: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textInverse,
  },
  userInfo: {
    marginLeft: theme.spacing.base,
    flex: 1,
  },
  userName: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  scoreText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.warning,
  },
  commentSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  commentText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    lineHeight: 24,
  },
  matchSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  matchLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  matchCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
  },
  matchTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  matchDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  replySection: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.base,
    marginTop: 0,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  replySectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  replyButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    alignItems: 'center',
  },
  replyButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  replyInputContainer: {
    gap: theme.spacing.sm,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
