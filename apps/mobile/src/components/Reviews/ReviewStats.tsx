import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import { ReviewStats as ReviewStatsType } from '../../types/review';
import { StarRating } from './StarRating';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  style?: ViewStyle;
  testID?: string;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({
  stats,
  style,
  testID,
}) => {
  const { averageScore, totalReviews, distribution } = stats;

  const getMaxCount = () => {
    return Math.max(...distribution.map((d) => d.count), 1);
  };

  const maxCount = getMaxCount();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Average score section */}
      <View style={styles.averageSection}>
        <Text style={styles.averageScore}>{averageScore.toFixed(1)}</Text>
        <StarRating rating={Math.round(averageScore)} size="md" disabled />
        <Text style={styles.totalReviews}>共 {totalReviews} 条评价</Text>
      </View>

      {/* Distribution bars */}
      <View style={styles.distributionSection}>
        {distribution
          .sort((a, b) => b.score - a.score)
          .map(({ score, count }) => {
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const actualPercentage =
              totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <View key={score} style={styles.distributionRow}>
                <Text style={styles.scoreLabel}>{score}星</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${percentage}%` },
                      count === 0 && styles.barEmpty,
                    ]}
                  />
                </View>
                <Text style={styles.countLabel}>
                  {count} ({actualPercentage.toFixed(0)}%)
                </Text>
              </View>
            );
          })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.base,
    ...theme.shadows.sm,
  },
  averageSection: {
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.lg,
  },
  averageScore: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  totalReviews: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  distributionSection: {
    gap: theme.spacing.sm,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    width: 30,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginRight: theme.spacing.sm,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.full,
  },
  barEmpty: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  countLabel: {
    width: 70,
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginLeft: theme.spacing.sm,
  },
});
