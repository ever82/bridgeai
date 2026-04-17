import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Task,
  TaskStatus,
  TASK_STATUS_COLORS,
  TASK_TYPE_LABELS,
} from '@bridgeai/shared';

interface TaskMarkerProps {
  task: Task;
  isSelected?: boolean;
  onPress?: () => void;
  showInfo?: boolean;
}

export const TaskMarker: React.FC<TaskMarkerProps> = ({
  task,
  isSelected = false,
  onPress,
  showInfo = true,
}) => {
  const statusColor = TASK_STATUS_COLORS[task.status] || '#8C8C8C';
  const typeLabel = TASK_TYPE_LABELS[task.type]?.zh || task.type;

  const formatBudget = (min: number, max: number) => {
    if (min === max) {
      return `¥${min}`;
    }
    return `¥${min}-${max}`;
  };

  if (isSelected) {
    return (
      <TouchableOpacity
        style={[styles.selectedContainer, { borderColor: statusColor }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[styles.selectedArrow, { borderTopColor: statusColor }]} />
        <View style={styles.selectedContent}>
          <View style={[styles.typeBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.typeText, { color: statusColor }]}>
              {typeLabel}
            </Text>
          </View>
          <Text style={styles.selectedTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.selectedBudget}>
            {formatBudget(task.budgetMin, task.budgetMax)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.markerContainer, { backgroundColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.markerText} numberOfLines={1}>
        ¥{task.budgetMin}
      </Text>
      <View style={[styles.markerArrow, { borderTopColor: statusColor }]} />
    </TouchableOpacity>
  );
};

interface TaskMarkerClusterProps {
  count: number;
  onPress?: () => void;
}

export const TaskMarkerCluster: React.FC<TaskMarkerClusterProps> = ({
  count,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.clusterContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.clusterText}>{count}</Text>
      <View style={styles.clusterArrow} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    minWidth: 60,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  markerArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  selectedContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedArrow: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  selectedContent: {
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedBudget: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7A45',
  },
  clusterContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1890FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  clusterArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1890FF',
    backgroundColor: 'transparent',
  },
});
