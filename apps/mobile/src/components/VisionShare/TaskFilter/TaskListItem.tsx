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

interface TaskListItemProps {
  task: Task;
  userLocation: GeoCoordinates;
  onPress: () => void;
  isSelected?: boolean;
}

export const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  userLocation,
  onPress,
  isSelected = false,
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

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return '刚刚';
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.containerSelected]}
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
        <Text style={styles.timeText}>{formatTime(task.publishTime)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {task.description}
      </Text>

      {/* Budget & Distance */}
      <View style={styles.infoRow}>
        <Text style={styles.budgetText}>
          {formatBudget(task.budgetMin, task.budgetMax)}
        </Text>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>{formatDistance(distanceKm * 1000)}</Text>
        </View>
      </View>

      {/* Publisher */}
      <View style={styles.publisherRow}>
        <View style={styles.publisherInfo}>
          <Text style={styles.publisherName}>{task.publisherName}</Text>
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>信用 {task.publisherCreditScore}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {task.applicationCount}人申请
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 4,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: '#1890FF',
  },
  header: {
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
  timeText: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 6,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#595959',
    marginBottom: 12,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7A45',
  },
  distanceContainer: {
    backgroundColor: '#F6FFED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#52C41A',
    fontWeight: '500',
  },
  publisherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  publisherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publisherName: {
    fontSize: 13,
    color: '#262626',
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#8C8C8C',
  },
});
