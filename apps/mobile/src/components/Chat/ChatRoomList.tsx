import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ChatRoom, ChatRoomListProps, ChatRoomListItemProps } from '../../types/chat';
import { formatDistanceToNow } from '../../utils/date';

/**
 * ChatRoomListItem Component
 * 单个聊天房间列表项
 */
const ChatRoomListItem: React.FC<ChatRoomListItemProps> = ({
  room,
  onPress,
  onLongPress,
  selected = false,
}) => {
  // 获取房间显示名称
  const getRoomName = (): string => {
    if (room.metadata?.name) {
      return room.metadata.name;
    }
    if (room.type === 'PRIVATE' && room.participants) {
      const otherParticipant = room.participants.find(
        (p) => p.userId !== room.participantIds[0]
      );
      return otherParticipant?.user?.displayName || otherParticipant?.user?.name || '私聊';
    }
    return '群聊';
  };

  // 获取房间头像
  const getRoomAvatar = (): string | undefined => {
    if (room.metadata?.avatarUrl) {
      return room.metadata.avatarUrl;
    }
    if (room.type === 'PRIVATE' && room.participants) {
      const otherParticipant = room.participants.find(
        (p) => p.userId !== room.participantIds[0]
      );
      return otherParticipant?.user?.avatarUrl;
    }
    return undefined;
  };

  // 格式化最后消息时间
  const getLastMessageTime = (): string => {
    if (!room.lastMessageAt) return '';
    try {
      return formatDistanceToNow(new Date(room.lastMessageAt));
    } catch {
      return '';
    }
  };

  // 截断消息预览
  const truncateMessage = (content: string, maxLength: number = 40): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const roomName = getRoomName();
  const avatarUrl = getRoomAvatar();
  const lastMessageTime = getLastMessageTime();
  const hasUnread = (room.unreadCount || 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer]}
      onPress={() => onPress?.(room)}
      onLongPress={() => onLongPress?.(room)}
      activeOpacity={0.7}
    >
      {/* 房间头像 */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {room.type === 'PRIVATE' ? '私' : '群'}
            </Text>
          </View>
        )}
        {/* 在线状态指示器（可以扩展） */}
        {room.type === 'PRIVATE' && <View style={styles.onlineIndicator} />}
      </View>

      {/* 房间信息 */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.roomName} numberOfLines={1}>
            {roomName}
          </Text>
          {lastMessageTime && (
            <Text style={styles.timeText}>{lastMessageTime}</Text>
          )}
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
            numberOfLines={1}
          >
            {room.lastMessage ? (
              <>
                {room.lastMessage.senderName && (
                  <Text style={styles.senderName}>
                    {room.lastMessage.senderName}:{' '}
                  </Text>
                )}
                {truncateMessage(room.lastMessage.content)}
              </>
            ) : (
              '暂无消息'
            )}
          </Text>

          {/* 未读数徽章 */}
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {room.unreadCount! > 99 ? '99+' : room.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * ChatRoomList Component
 * 聊天房间列表组件
 */
const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  onRoomPress,
  onRoomLongPress,
  onRefresh,
  refreshing = false,
  onLoadMore,
  hasMore = false,
  selectedRoomId,
  emptyComponent,
}) => {
  const renderItem = ({ item }: { item: ChatRoom }) => (
    <ChatRoomListItem
      room={item}
      onPress={onRoomPress}
      onLongPress={onRoomLongPress}
      selected={item.id === selectedRoomId}
    />
  );

  const renderEmptyComponent = () => {
    if (emptyComponent) return <>{emptyComponent}</>;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无聊天房间</Text>
        <Text style={styles.emptySubText}>开始一个新的对话吧</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const keyExtractor = (item: ChatRoom) => item.id;

  return (
    <FlatList
      data={rooms}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyComponent}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedContainer: {
    backgroundColor: '#F5F5F5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8E8E8',
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
  },
  unreadMessage: {
    color: '#000000',
    fontWeight: '500',
  },
  senderName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default ChatRoomList;
export { ChatRoomListItem };
