import React, { useRef, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  ListRenderItemInfo,
} from 'react-native';
import { SenderType } from '@bridgeai/shared';

import { ChatMessage } from '../../types/chat';
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
  ListHeaderComponent,
  ListFooterComponent,
  style,
  testID,
}) => {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: true });
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
    const prevMessage = index > 0 ? messages[index - 1] : null;
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

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[styles.listContent, style]}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={hasMore ? renderLoadingFooter : ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      inverted={false}
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
