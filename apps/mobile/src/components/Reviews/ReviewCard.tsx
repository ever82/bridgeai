import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import { Review } from '../../types/review';
import { StarRating } from './StarRating';

interface ReviewCardProps {
  review: Review;
  showUser?: 'rater' | 'ratee';
  onPress?: (review: Review) => void;
  style?: ViewStyle;
  testID?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showUser = 'rater',
  onPress,
  style,
  testID,
}) => {
  const user = showUser === 'rater' ? review.rater : review.ratee;
  const displayUser = user || { name: 'Unknown User', avatar: undefined };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress(review);
    }
  };

  const CardContent = () => (
    <View style={styles.container}>
      {/* Header: User info and rating */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {displayUser.avatar ? (
            <Image source={{ uri: displayUser.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{displayUser.name}</Text>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        <StarRating rating={review.score} size="sm" disabled />
      </View>

      {/* Review content */}
      {review.comment && (
        <Text style={styles.comment} numberOfLines={3}>
          {review.comment}
        </Text>
      )}

      {/* Match info if available */}
      {review.match && (
        <View style={styles.matchInfo}>
          <Text style={styles.matchLabel}>相关订单:</Text>
          <Text style={styles.matchTitle}>{review.match.title}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[styles.card, style]}
        testID={testID}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]} testID={testID}>
      <CardContent />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.base,
    ...theme.shadows.sm,
  },
  container: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textInverse,
  },
  userDetails: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  userName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  date: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  comment: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  matchLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  matchTitle: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.text,
    flex: 1,
  },
});
