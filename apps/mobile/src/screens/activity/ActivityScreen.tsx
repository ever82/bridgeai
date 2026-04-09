import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

// Mock activities
const MOCK_ACTIVITIES = [
  {
    id: '1',
    type: 'like',
    actor: { id: '1', username: 'user1', displayName: 'User One' },
    message: '赞了你的动态',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    type: 'comment',
    actor: { id: '2', username: 'user2', displayName: 'User Two' },
    message: '评论了你的动态: "真棒！"',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const ActivityScreen = () => {
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: typeof MOCK_ACTIVITIES[0] }) => (
    <TouchableOpacity style={styles.activityItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.actor.displayName[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>
          <Text style={styles.actorName}>{item.actor.displayName}</Text>{' '}
          {item.message}
        </Text>
        <Text style={styles.time}>刚刚</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>动态</Text>
      </View>

      <FlatList
        data={MOCK_ACTIVITIES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>暂无新动态</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  listContent: {
    padding: theme.spacing.base,
  },
  activityItem: {
    flexDirection: 'row',
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  avatarText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  actorName: {
    fontWeight: theme.fonts.weights.semibold,
  },
  time: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});
