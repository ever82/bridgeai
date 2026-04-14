/**
 * PointsTaskList component
 * Displays a list of tasks for earning points
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { theme } from '../../theme';

export interface PointsTask {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  repeatable: boolean;
  dailyLimit?: number;
  completedCount: number;
}

interface PointsTaskListProps {
  tasks: PointsTask[];
  onTaskComplete?: (taskId: string) => Promise<void>;
}

const PointsTaskList: React.FC<PointsTaskListProps> = ({ tasks, onTaskComplete }) => {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleTaskPress = async (task: PointsTask) => {
    if (completedTasks.has(task.id)) {
      Alert.alert('提示', '该任务今日已完成');
      return;
    }

    if (task.dailyLimit && task.completedCount >= task.dailyLimit) {
      Alert.alert('提示', `该任务今日已完成 ${task.dailyLimit} 次`);
      return;
    }

    if (!task.repeatable && task.completedCount > 0) {
      Alert.alert('提示', '该任务只能完成一次');
      return;
    }

    Alert.alert(
      task.name,
      `确定要完成「${task.name}」吗？完成可获得 ${task.points} 积分`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              if (onTaskComplete) {
                await onTaskComplete(task.id);
              }
              setCompletedTasks((prev) => new Set([...prev, task.id]));
              Alert.alert('恭喜', `获得 ${task.points} 积分！`);
            } catch {
              Alert.alert('错误', '任务完成失败，请稍后重试');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PointsTask }) => {
    const isCompleted = completedTasks.has(item.id) || item.completedCount > 0;
    const atLimit = item.dailyLimit ? item.completedCount >= item.dailyLimit : false;
    const isDisabled = isCompleted && !item.repeatable;

    return (
      <TouchableOpacity
        style={[styles.taskItem, isDisabled && styles.taskItemDisabled]}
        onPress={() => handleTaskPress(item)}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskName, isDisabled && styles.taskNameDisabled]}>
              {item.name}
            </Text>
            <View style={[styles.pointsBadge, isCompleted && styles.pointsBadgeCompleted]}>
              <Text style={[styles.pointsText, isCompleted && styles.pointsTextCompleted]}>
                +{item.points}
              </Text>
            </View>
          </View>
          <Text style={styles.taskDescription}>{item.description}</Text>
          <View style={styles.taskMeta}>
            {item.repeatable ? (
              <Text style={styles.repeatableBadge}>
                每日可重复 {item.dailyLimit ? `(${item.completedCount}/${item.dailyLimit})` : ''}
              </Text>
            ) : (
              <Text style={styles.oneTimeBadge}>一次性</Text>
            )}
          </View>
        </View>

        <View style={styles.chevron}>
          <Text style={styles.chevronText}>{'>'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.xl,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskItemDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  icon: {
    fontSize: 20,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  taskNameDisabled: {
    color: theme.colors.textSecondary,
  },
  pointsBadge: {
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  pointsBadgeCompleted: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  pointsText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.success,
  },
  pointsTextCompleted: {
    color: theme.colors.textSecondary,
  },
  taskDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  taskMeta: {
    marginTop: theme.spacing.xs,
  },
  repeatableBadge: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.info,
  },
  oneTimeBadge: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  chevronText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textTertiary,
  },
  separator: {
    height: theme.spacing.sm,
  },
});

export { PointsTaskList };
