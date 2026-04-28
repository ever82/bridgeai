import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  ListRenderItemInfo,
} from 'react-native';
import { SenderType } from '@bridgeai/shared';

import { ChatMessage, MessageAttachment } from '../../types/chat';
import { theme } from '../../theme';

import { MessageBubble } from './MessageBubble';
import { SenderChangeIndicator } from './SenderIndicator';

export interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMessagePress?: (message: ChatMessage) => void;
  onMessageLongPress?: (message: ChatMessage) => void;
  onImagePress?: (attachment: MessageAttachment) => void;
  onDelete?: (message: ChatMessage) => void;
  onReport?: (message: ChatMessage) => void;
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
  style?: ViewStyle;
  testID?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  onImagePress,
  onDelete,
  onReport,
  ListHeaderComponent,
  ListFooterComponent,
  style,
  testID,
}) => {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Reverse messages so newest is first. With inverted=true, the FlatList
  // flips rendering so the newest messages appear at the visual bottom and
  // the oldest at the visual top. onEndReached then fires when the user
  // scrolls toward the older messages (visual top / data end), which is the
  // correct direction for "pull down to load history".
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        // With inverted=true the visual bottom is the data start (index 0),
        // which is the newest message after reversal. scrollToEnd scrolls to
        // the data end, so we use scrollToOffset to reach index 0 instead.
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const getSenderType = (message: ChatMessage): SenderType => {
    if (message.senderType === 'AGENT') return SenderType.AGENT;
    return SenderType.HUMAN;
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<ChatMessage>) => {
    // In the reversed array the "previous" visual message is at index+1
    const prevMessage = index < reversedMessages.length - 1 ? reversedMessages[index + 1] : null;
    const isConsecutive = prevMessage?.senderId === item.senderId;
    const showSenderChange = prevMessage && prevMessage.senderId !== item.senderId;

    return (
      <View>
        {showSenderChange && (
          <SenderChangeIndicator
            fromType={getSenderType(prevMessage)}
            toType={getSenderType(item)}
          />
        )}
        <MessageBubble
          message={item}
          currentUserId={currentUserId}
          showSenderIndicator={!isConsecutive}
          isConsecutive={isConsecutive}
          onPress={onMessagePress}
          onLongPress={onMessageLongPress}
          onImagePress={onImagePress}
          onDelete={onDelete}
          onReport={onReport}
        />
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const ESTIMATED_ITEM_HEIGHT = 80;

  const getItemLayout = useCallback(
    (_data: ArrayLike<ChatMessage> | null | undefined, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      ref={flatListRef}
      data={reversedMessages}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      getItemLayout={getItemLayout}
      windowSize={10}
      contentContainerStyle={[styles.listContent, style]}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      // With inverted=true the visual layout is flipped:
      // - ListFooterComponent renders at the visual top (where older messages load)
      // - ListHeaderComponent renders at the visual bottom (where newest messages are)
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={hasMore ? renderLoadingFooter : ListFooterComponent}
      inverted={true}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  loadingMore: {
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
  },
});

export default MessageList;
