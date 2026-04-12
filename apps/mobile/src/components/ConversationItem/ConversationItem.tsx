import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { formatRelativeTime } from '../LastSeen/LastSeen';

export type ConversationPriority = 'normal' | 'high' | 'urgent';

export interface ConversationItemProps {
  id: string;
  avatarUri?: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date | number | string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  priority?: ConversationPriority;
  isOnline?: boolean;
  userType?: 'human' | 'agent';
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  id,
  avatarUri,
  name,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
  priority = 'normal',
  isOnline = false,
  userType = 'human',
  onPress,
  onLongPress,
  style,
  testID,
}) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent':
        return theme.colors.error;
      case 'high':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const handlePress = () => {
    onPress?.(id);
  };

  const handleLongPress = () => {
    onLongPress?.(id);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPinned && styles.pinnedContainer,
        style,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`会话: ${name}`}
      testID={testID}
    >
      {/* Left: Avatar */}
      <View style={styles.avatarContainer}>
        <UserAvatar
          uri={avatarUri}
          name={name}
          size="md"
          status={isOnline ? 'online' : 'offline'}
          userType={userType}
          showStatus={isOnline}
          testID={`${testID}-avatar`}
        />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge} testID={`${testID}-unread`}>
            <Text style={styles.unreadText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Middle: Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, isPinned && styles.pinnedName]} numberOfLines={1}>
            {isPinned && '📌 '}
            {name}
            {isMuted && ' 🔇'}
          </Text>
          <Text style={[styles.time, { color: getPriorityColor() }]}>
            {formatRelativeTime(lastMessageTime)}
          </Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {truncateMessage(lastMessage)}
        </Text>
      </View>

      {/* Right: Priority indicator */}
      {priority !== 'normal' && (
        <View
          style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]}
          testID={`${testID}-priority`}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pinnedContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.base,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  pinnedName: {
    color: theme.colors.primary,
  },
  time: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  message: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.fonts.sizes.sm * 1.4,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: theme.spacing.sm,
  },
});

export default ConversationItem;
