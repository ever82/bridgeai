import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Task,
  GeoCoordinates,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  calculateDistance,
} from '@visionshare/shared';

interface TaskInfoCardProps {
  task: Task;
  userLocation: GeoCoordinates;
  onPress?: () => void;
  compact?: boolean;
}

export const TaskInfoCard: React.FC<TaskInfoCardProps> = ({
  task,
  userLocation,
  onPress,
  compact = false,
}) => {
  const { distanceKm } = calculateDistance(userLocation, task.coordinates);
  const typeLabel = TASK_TYPE_LABELS[task.type]?.zh || task.type;
  const priorityStyle = TASK_PRIORITY_LABELS[task.priority];

  const formatBudget = (min: number, max: number) => {
    if (min === max) {
      return `¥${min}`;
    }
    return `¥${min} - ¥${max}`;
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: priorityStyle.color + '20' }]}>
            <Text style={[styles.typeText, { color: priorityStyle.color }]}>
              {typeLabel}
            </Text>
          </View>
        </View>
        <View style={styles.compactFooter}>
          <Text style={styles.compactBudget}>
            {formatBudget(task.budgetMin, task.budgetMax)}
          </Text>
          <Text style={styles.compactDistance}>{formatDistance(distanceKm * 1000)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: priorityStyle.color + '20' }]}>
          <Text style={[styles.typeText, { color: priorityStyle.color }]}>
            {typeLabel}
          </Text>
        </View>
        <Text style={styles.distanceBadge}>{formatDistance(distanceKm * 1000)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {task.description}
      </Text>

      {/* Budget */}
      <Text style={styles.budget}>
        {formatBudget(task.budgetMin, task.budgetMax)}
      </Text>

      {/* Publisher */}
      <View style={styles.publisherRow}>
        <Text style={styles.publisherName}>{task.publisherName}</Text>
        <View style={styles.creditBadge}>
          <Text style={styles.creditText}>信用 {task.publisherCreditScore}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{task.viewCount} 浏览</Text>
        <Text style={styles.statsDot}>·</Text>
        <Text style={styles.statsText}>{task.applicationCount} 人申请</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  distanceBadge: {
    fontSize: 12,
    color: '#52C41A',
    fontWeight: '500',
    backgroundColor: '#F6FFED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
    lineHeight: 22,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 12,
    lineHeight: 20,
  },
  budget: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF7A45',
    marginBottom: 12,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7A45',
  },
  compactDistance: {
    fontSize: 12,
    color: '#52C41A',
    fontWeight: '500',
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  publisherName: {
    fontSize: 14,
    color: '#262626',
    marginRight: 8,
  },
  creditBadge: {
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creditText: {
    fontSize: 11,
    color: '#FA8C16',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsText: {
    fontSize: 13,
    color: '#8C8C8C',
  },
  statsDot: {
    fontSize: 13,
    color: '#8C8C8C',
    marginHorizontal: 6,
  },
});
