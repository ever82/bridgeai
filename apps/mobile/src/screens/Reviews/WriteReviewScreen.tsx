import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { theme } from '../../theme';
import { StarRating } from '../../components/Reviews';
import { Button } from '../../components/Button';

interface RouteParams {
  matchId: string;
  rateeId: string;
  rateeName: string;
  matchTitle: string;
}

export const WriteReviewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId, rateeId, rateeName, matchTitle } = route.params as RouteParams;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _matchId = matchId; // Will be used for real API submission
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _rateeId = rateeId; // Will be used for real API submission

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState(false);

  const handleRatingChange = (value: number) => {
    setRating(value);
    setRatingError(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setRatingError(true);
      Alert.alert('提示', '请选择评分星级');
      return;
    }

    if (comment.trim().length < 5) {
      Alert.alert('提示', '评价内容至少需要5个字符');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert('提交成功', '感谢您的评价！', [
        {
          text: '确定',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('提交失败', '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (score: number): string => {
    const texts: Record<number, string> = {
      1: '非常不满意',
      2: '不满意',
      3: '一般',
      4: '满意',
      5: '非常满意',
    };
    return texts[score] || '';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>写评价</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Match Info Card */}
        <View style={styles.matchCard}>
          <Text style={styles.matchLabel}>评价订单</Text>
          <Text style={styles.matchTitle}>{matchTitle}</Text>
          <Text style={styles.rateeInfo}>服务提供者: {rateeName}</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>评分</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={rating}
              onRatingChange={handleRatingChange}
              size="lg"
              testID="rating-input"
            />
            {rating > 0 && <Text style={styles.ratingText}>{getRatingText(rating)}</Text>}
          </View>
          {ratingError && <Text style={styles.errorText}>请选择评分</Text>}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>评价内容</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="分享您的体验，帮助其他人更好地了解这位服务提供者..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={6}
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesSection}>
          <Text style={styles.guidelinesTitle}>评价须知</Text>
          <Text style={styles.guidelineItem}>• 请基于真实交易体验进行评价</Text>
          <Text style={styles.guidelineItem}>• 禁止发布虚假、辱骂或违法内容</Text>
          <Text style={styles.guidelineItem}>• 评价提交后将无法修改</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title="提交评价"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={rating === 0 || comment.trim().length < 5}
          size="lg"
        />
      </View>
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
  },
  placeholder: {
    minWidth: 44,
  },
  content: {
    flex: 1,
  },
  matchCard: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  matchLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  matchTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  rateeInfo: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  ratingSection: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.base,
    marginTop: 0,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  ratingText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  commentSection: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.base,
    marginTop: 0,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    minHeight: 120,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  charCount: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
  },
  guidelinesSection: {
    margin: theme.spacing.base,
    marginTop: 0,
    padding: theme.spacing.base,
  },
  guidelinesTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  guidelineItem: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  footer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
