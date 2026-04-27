import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { ChatRoom, ChatRoomListProps, ChatRoomListItemProps } from '../../types/chat';
import { ConversationItem } from '../ConversationItem/ConversationItem';

/**
 * Resolve room display name from metadata or participants.
 */
const getRoomName = (room: ChatRoom): string => {
  if (room.metadata?.name) {
    return room.metadata.name;
  }
  if (room.type === 'PRIVATE' && room.participants) {
    const otherParticipant = room.participants.find(p => p.userId !== room.participantIds[0]);
    return otherParticipant?.user?.displayName || otherParticipant?.user?.name || '私聊';
  }
  return '群聊';
};

/**
 * Resolve room avatar from metadata or participants.
 */
const getRoomAvatar = (room: ChatRoom): string | undefined => {
  if (room.metadata?.avatarUrl) {
    return room.metadata.avatarUrl;
  }
  if (room.type === 'PRIVATE' && room.participants) {
    const otherParticipant = room.participants.find(p => p.userId !== room.participantIds[0]);
    return otherParticipant?.user?.avatarUrl;
  }
  return undefined;
};

/**
 * Build last message preview text with optional sender prefix.
 */
const getLastMessagePreview = (room: ChatRoom): string => {
  if (!room.lastMessage) return '暂无消息';
  const prefix = room.lastMessage.senderName ? `${room.lastMessage.senderName}: ` : '';
  return `${prefix}${room.lastMessage.content}`;
};

/**
 * ChatRoomListItem Component
 * Wraps ConversationItem for use in ChatRoomList.
 */
const ChatRoomListItem: React.FC<ChatRoomListItemProps> = ({
  room,
  onPress,
  onLongPress,
  selected = false,
}) => (
  <ConversationItem
    id={room.id}
    avatarUri={getRoomAvatar(room)}
    name={getRoomName(room)}
    lastMessage={getLastMessagePreview(room)}
    lastMessageTime={room.lastMessageAt ?? room.updatedAt}
    unreadCount={room.unreadCount}
    userType={room.type === 'PRIVATE' ? 'agent' : 'human'}
    onPress={() => onPress?.(room)}
    onLongPress={() => onLongPress?.(room)}
    style={selected ? styles.selectedContainer : undefined}
    testID={`room-${room.id}`}
  />
);

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
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyComponent}
    />
  );
};

const styles = StyleSheet.create({
  selectedContainer: {
    backgroundColor: '#F5F5F5',
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
