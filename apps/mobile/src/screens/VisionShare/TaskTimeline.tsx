import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

interface TimelineTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  photoCount: number;
  resultCount?: number;
}

interface TimelineGroup {
  date: Date;
  dateLabel: string;
  tasks: TimelineTask[];
}

export const TaskTimelineScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, [selectedStatus, selectedDate]);

  const loadTimelineData = async () => {
    setIsLoading(true);

    // TODO: Load from API
    const mockTasks: TimelineTask[] = [
      {
        id: '1',
        title: 'Photo Enhancement',
        description: 'Enhanced 24 photos with AI filters',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        completedAt: new Date(),
        photoCount: 24,
        resultCount: 24,
      },
      {
        id: '2',
        title: 'Background Removal',
        description: 'Processing portrait photos',
        status: 'processing',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        photoCount: 12,
      },
      {
        id: '3',
        title: 'Album Organization',
        description: 'Auto-clustered vacation photos',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
        photoCount: 156,
        resultCount: 8,
      },
      {
        id: '4',
        title: 'Image Restoration',
        description: 'Restored old family photos',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30),
        photoCount: 8,
        resultCount: 8,
      },
      {
        id: '5',
        title: 'Style Transfer',
        description: 'Applied artistic styles',
        status: 'failed',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        photoCount: 6,
      },
    ];

    // Group tasks by date
    const grouped = groupTasksByDate(mockTasks);
    setTimelineGroups(grouped);
    setIsLoading(false);
  };

  const groupTasksByDate = (tasks: TimelineTask[]): TimelineGroup[] => {
    const groups = new Map<string, TimelineGroup>();

    tasks.forEach(task => {
      const date = new Date(task.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString();

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date,
          dateLabel: formatDateLabel(date),
          tasks: [],
        });
      }

      groups.get(dateKey)!.tasks.push(task);
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  };

  const formatDateLabel = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      case 'pending':
        return '📋';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#2196F3';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const handleTaskPress = (task: TimelineTask) => {
    // Navigate to task detail
    console.log('Task pressed:', task.id);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(selectedDate?.getTime() === date.getTime() ? null : date);
  };

  const statusFilters = ['all', 'completed', 'processing', 'pending', 'failed'];

  const renderTimelineItem = ({ item: task }: { item: TimelineTask }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskPress(task)}
    >
      <View style={styles.taskIcon}>
        <Text style={styles.statusIcon}>{getStatusIcon(task.status)}</Text>
      </View>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
              {task.status}
            </Text>
          </View>
        </View>
        <Text style={styles.taskDescription}>{task.description}</Text>
        <View style={styles.taskMeta}>
          <Text style={styles.taskMetaText}>📷 {task.photoCount} photos</Text>
          {task.resultCount !== undefined && (
            <Text style={styles.taskMetaText}>✨ {task.resultCount} results</Text>
          )}
          <Text style={styles.taskTime}>
            {task.createdAt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderTimelineGroup = ({ item: group }: { item: TimelineGroup }) => (
    <View style={styles.groupContainer}>
      <TouchableOpacity
        style={styles.dateHeader}
        onPress={() => handleDateSelect(group.date)}
      >
        <View style={styles.dateLine} />
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{group.dateLabel}</Text>
        </View>
        <View style={styles.dateLine} />
      </TouchableOpacity>
      <View style={styles.tasksContainer}>
        {group.tasks.map(task => (
          <View key={task.id} style={styles.taskWrapper}>
            <View style={styles.timelineLine} />
            {renderTimelineItem({ item: task })}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Timeline</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {statusFilters.map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              selectedStatus === status && styles.filterChipActive,
              selectedStatus === null && status === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(status === 'all' ? null : status)}
          >
            <Text
              style={[
                styles.filterChipText,
                (selectedStatus === status ||
                  (selectedStatus === null && status === 'all')) &&
                  styles.filterChipTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={timelineGroups}
          renderItem={renderTimelineGroup}
          keyExtractor={item => item.date.toISOString()}
          contentContainerStyle={styles.timelineList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptyText}>
                Your task history will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  filterScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineList: {
    padding: theme.spacing.base,
  },
  groupContainer: {
    marginBottom: theme.spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dateBadge: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.sm,
  },
  dateText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  tasksContainer: {
    paddingLeft: theme.spacing.lg,
  },
  taskWrapper: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
    marginLeft: theme.spacing.xl,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  statusIcon: {
    fontSize: 24,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  taskTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
    textTransform: 'capitalize',
  },
  taskDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  taskMetaText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  taskTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: 'auto',
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
});
