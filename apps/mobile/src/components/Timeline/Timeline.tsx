import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';

import { theme } from '../../theme';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: 'task' | 'upload' | 'edit' | 'share';
  status?: 'completed' | 'processing' | 'failed';
}

interface TimelineProps {
  events: TimelineEvent[];
  onEventPress?: (event: TimelineEvent) => void;
  emptyText?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  onEventPress,
  emptyText = 'No events to display',
}) => {
  const getEventIcon = (type: string, status?: string): string => {
    if (status) {
      switch (status) {
        case 'completed':
          return '✅';
        case 'processing':
          return '⏳';
        case 'failed':
          return '❌';
      }
    }

    switch (type) {
      case 'task':
        return '📋';
      case 'upload':
        return '⬆️';
      case 'edit':
        return '✏️';
      case 'share':
        return '📤';
      default:
        return '•';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'task':
        return theme.colors.primary;
      case 'upload':
        return '#4CAF50';
      case 'edit':
        return '#FF9800';
      case 'share':
        return '#2196F3';
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item: event, index }: { item: TimelineEvent; index: number }) => (
    <TouchableOpacity
      style={styles.eventContainer}
      onPress={() => onEventPress?.(event)}
      disabled={!onEventPress}
    >
      <View style={styles.timelineLine}>
        <View style={[styles.timelineDot, { backgroundColor: getEventColor(event.type) }]} />
        {index < events.length - 1 && <View style={styles.timelineConnector} />}
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventIcon}>{getEventIcon(event.type, event.status)}</Text>
          <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
        </View>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription}>{event.description}</Text>
      </View>
    </TouchableOpacity>
  );

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      renderItem={renderEvent}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
};

interface TimelineDateGroupProps {
  date: Date;
  children: React.ReactNode;
}

export const TimelineDateGroup: React.FC<TimelineDateGroupProps> = ({
  date,
  children,
}) => {
  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateTime = new Date(date);
    dateTime.setHours(0, 0, 0, 0);

    if (dateTime.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateTime.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <View style={styles.dateLine} />
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.base,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.base,
  },
  timelineLine: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  eventContent: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginLeft: theme.spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  eventIcon: {
    fontSize: 16,
  },
  eventTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  eventTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  eventDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  dateGroup: {
    marginBottom: theme.spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
    marginHorizontal: theme.spacing.base,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dateText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.base,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
});
