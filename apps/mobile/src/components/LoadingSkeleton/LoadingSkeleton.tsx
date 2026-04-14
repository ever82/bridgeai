import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    />
  );
};

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'text' | 'avatar' | 'custom';
  count?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  style,
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <View style={styles.cardContainer}>
            <Skeleton width="100%" height={180} borderRadius={theme.borderRadius.lg} />
            <View style={styles.cardContent}>
              <Skeleton width="70%" height={20} style={styles.cardTitle} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        );
      case 'list':
        return (
          <View style={styles.listItem}>
            <Skeleton width={48} height={48} borderRadius={theme.borderRadius.full} />
            <View style={styles.listContent}>
              <Skeleton width="60%" height={16} style={styles.listTitle} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        );
      case 'text':
        return (
          <View style={styles.textContainer}>
            <Skeleton width="100%" height={14} />
            <Skeleton width="90%" height={14} style={styles.textLine} />
            <Skeleton width="95%" height={14} style={styles.textLine} />
            <Skeleton width="60%" height={14} style={styles.textLine} />
          </View>
        );
      case 'avatar':
        return (
          <View style={styles.avatarContainer}>
            <Skeleton width={80} height={80} borderRadius={theme.borderRadius.full} />
            <Skeleton width={120} height={16} style={styles.avatarName} />
            <Skeleton width={80} height={12} />
          </View>
        );
      default:
        return <Skeleton width="100%" height={100} />;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={index > 0 ? styles.itemSpacing : undefined}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  skeleton: {
    backgroundColor: theme.colors.backgroundTertiary,
    overflow: 'hidden',
  },
  itemSpacing: {
    marginTop: theme.spacing.base,
  },
  // Card styles
  cardContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  cardContent: {
    padding: theme.spacing.base,
  },
  cardTitle: {
    marginBottom: theme.spacing.sm,
  },
  // List styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    flex: 1,
    marginLeft: theme.spacing.base,
  },
  listTitle: {
    marginBottom: theme.spacing.xs,
  },
  // Text styles
  textContainer: {
    padding: theme.spacing.base,
  },
  textLine: {
    marginTop: theme.spacing.sm,
  },
  // Avatar styles
  avatarContainer: {
    alignItems: 'center',
    padding: theme.spacing.base,
  },
  avatarName: {
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.xs,
  },
});
