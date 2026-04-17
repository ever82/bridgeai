import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { theme } from '../../theme';

export type CreditLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface CreditScoreProps {
  score: number;
  showLabel?: boolean;
  showStars?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const getCreditLevel = (score: number): CreditLevel => {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
};

const getCreditColor = (score: number): string => {
  const level = getCreditLevel(score);
  switch (level) {
    case 'excellent':
      return theme.colors.success;
    case 'good':
      return theme.colors.info;
    case 'fair':
      return theme.colors.warning;
    case 'poor':
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
};

const getCreditLabel = (score: number): string => {
  const level = getCreditLevel(score);
  switch (level) {
    case 'excellent':
      return '信用优秀';
    case 'good':
      return '信用良好';
    case 'fair':
      return '信用一般';
    case 'poor':
      return '信用较差';
    default:
      return '未知';
  }
};

const calculateStars = (score: number): number => {
  if (score >= 95) return 5;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
};

const sizeMap = {
  sm: {
    container: { paddingHorizontal: 8, paddingVertical: 4 },
    score: { fontSize: 14 },
    label: { fontSize: 10 },
    star: { fontSize: 10 },
    badge: { width: 16, height: 16 },
  },
  md: {
    container: { paddingHorizontal: 12, paddingVertical: 6 },
    score: { fontSize: 18 },
    label: { fontSize: 12 },
    star: { fontSize: 12 },
    badge: { width: 20, height: 20 },
  },
  lg: {
    container: { paddingHorizontal: 16, paddingVertical: 8 },
    score: { fontSize: 24 },
    label: { fontSize: 14 },
    star: { fontSize: 14 },
    badge: { width: 24, height: 24 },
  },
};

export const CreditScore: React.FC<CreditScoreProps> = ({
  score,
  showLabel = true,
  showStars = true,
  size = 'md',
  onPress,
  style,
  testID,
}) => {
  const creditColor = getCreditColor(score);
  const creditLabel = getCreditLabel(score);
  const creditLevel = getCreditLevel(score);
  const starCount = calculateStars(score);
  const dimensions = sizeMap[size];

  const renderStars = () => {
    if (!showStars) return null;
    return (
      <View style={styles.starsContainer} testID={`${testID}-stars`}>
        {[1, 2, 3, 4, 5].map((index) => (
          <Text
            key={index}
            style={[
              styles.star,
              dimensions.star,
              { color: index <= starCount ? creditColor : theme.colors.textTertiary },
            ]}
          >
            ★
          </Text>
        ))}
      </View>
    );
  };

  const renderBadge = () => (
    <View
      style={[
        styles.badge,
        dimensions.badge,
        { backgroundColor: creditColor },
      ]}
      testID={`${testID}-badge`}
    >
      <Text style={styles.badgeText}>{Math.round(score)}</Text>
    </View>
  );

  const content = (
    <View
      style={[
        styles.container,
        dimensions.container,
        { borderColor: creditColor },
        style,
      ]}
      testID={testID}
    >
      {renderBadge()}
      <View style={styles.content}>
        {showStars && renderStars()}
        {showLabel && (
          <Text
            style={[styles.label, dimensions.label, { color: creditColor }]}
            testID={`${testID}-label`}
          >
            {creditLabel}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`信用分: ${score}, ${creditLabel}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessibilityLabel={`信用分: ${score}, ${creditLabel}`}
      accessibilityRole="text"
    >
      {content}
    </View>
  );
};

export const TrustBadge: React.FC<Omit<CreditScoreProps, 'showLabel' | 'showStars'>> = ({
  score,
  size = 'md',
  onPress,
  style,
  testID,
}) => {
  const creditLevel = getCreditLevel(score);
  const creditColor = getCreditColor(score);
  const dimensions = sizeMap[size];

  const getTrustIcon = () => {
    switch (creditLevel) {
      case 'excellent':
        return '🏆';
      case 'good':
        return '✓';
      case 'fair':
        return '⚠';
      case 'poor':
        return '✗';
      default:
        return '?';
    }
  };

  const getTrustLabel = () => {
    switch (creditLevel) {
      case 'excellent':
        return '高信用';
      case 'good':
        return '可信';
      case 'fair':
        return '一般';
      case 'poor':
        return '低信用';
      default:
        return '未知';
    }
  };

  const content = (
    <View
      style={[
        styles.trustContainer,
        dimensions.container,
        { backgroundColor: `${creditColor}20`, borderColor: creditColor },
        style,
      ]}
      testID={testID}
    >
      <Text style={styles.trustIcon}>{getTrustIcon()}</Text>
      <Text style={[styles.trustLabel, dimensions.label, { color: creditColor }]}>
        {getTrustLabel()}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`信用等级: ${getTrustLabel()}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessibilityLabel={`信用等级: ${getTrustLabel()}`}
      accessibilityRole="text"
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
  },
  badge: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: theme.fonts.weights.bold,
  },
  content: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs / 2,
  },
  star: {
    marginRight: 1,
  },
  label: {
    fontWeight: theme.fonts.weights.medium,
  },
  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
  },
  trustIcon: {
    marginRight: theme.spacing.xs,
    fontSize: 12,
  },
  trustLabel: {
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default CreditScore;
