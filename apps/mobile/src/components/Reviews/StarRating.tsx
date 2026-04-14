import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  maxStars?: number;
  allowHalf?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const StarIcon: React.FC<{ filled: boolean; half?: boolean; size: number }> = ({
  filled,
  half,
  size,
}) => {
  // Simple star shape using text for now - can be replaced with SVG
  return (
    <View style={[styles.starContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.star,
          {
            width: size,
            height: size,
            backgroundColor: filled
              ? theme.colors.warning
              : half
              ? theme.colors.warning
              : theme.colors.backgroundTertiary,
          },
        ]}
      >
        {half && (
          <View
            style={[
              styles.starHalf,
              {
                width: size / 2,
                height: size,
                backgroundColor: theme.colors.backgroundTertiary,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 'md',
  maxStars = 5,
  allowHalf = false,
  disabled = false,
  style,
  testID,
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const starSize = sizeMap[size];

  const handlePress = (index: number) => {
    if (disabled || !onRatingChange) return;

    const newRating = allowHalf
      ? rating === index + 0.5
        ? index + 1
        : index + 0.5
      : index + 1;

    onRatingChange(newRating);
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const isFilled = rating >= starValue;
    const isHalf = allowHalf && rating >= index + 0.5 && rating < starValue;

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handlePress(index)}
        disabled={disabled || !onRatingChange}
        activeOpacity={0.7}
        testID={`${testID}-star-${index}`}
      >
        <StarIcon filled={isFilled} half={isHalf} size={starSize} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {Array.from({ length: maxStars }, (_, index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  star: {
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  starHalf: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
