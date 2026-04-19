import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MessagesStackParamList } from '../../types/navigation';
import { ChatMessage } from '../../types/chat';
import { Header } from '../../components/Header';
import { MessageList } from '../../components/Chat/MessageList';
import { ChatInput } from '../../components/Chat/ChatInput';
import { QuickReply, QuickReplyItem } from '../../components/Chat/QuickReply';
import { TypingIndicator } from '../../components/TypingIndicator';
import { getRoomMessages, sendMessage } from '../../services/chatApi';
import { socketClient } from '../../services/socketClient';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

// Mock current user ID - will be replaced with auth store
const MOCK_USER_ID = 'current-user';

const MOCK_QUICK_REPLIES: QuickReplyItem[] = [
  { id: '1', text: '好的' },
  { id: '2', text: '谢谢' },
  { id: '3', text: '稍等一下' },
  { id: '4', text: '了解更多' },
];

export const ChatScreen = ({ route }: Props) => {
  const { conversationId, userName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>([]);

  // Load messages
  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getRoomMessages(conversationId);
      setMessages(result.messages);
      setHasMore(result.hasMore);
      // Show quick replies when conversation starts or AI suggests them
      if (result.messages.length === 0) {
        setQuickReplies(MOCK_QUICK_REPLIES);
      }
    } catch {
      // Silently handle - will show empty state
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Socket listeners for real-time messages
  useEffect(() => {
    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data.message.chatRoomId === conversationId) {
        setMessages(prev => [...prev, data.message]);
        setIsTyping(false);
        setQuickReplies([]);
      }
    };

    const handleTyping = (data: { roomId: string; userId: string }) => {
      if (data.roomId === conversationId && data.userId !== MOCK_USER_ID) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (data: { roomId: string; userId: string }) => {
      if (data.roomId === conversationId) {
        setIsTyping(false);
      }
    };

    socketClient.on('chat:message', handleNewMessage);
    socketClient.on('chat:typing', handleTyping);
    socketClient.on('chat:stop_typing', handleStopTyping);

    return () => {
      socketClient.off('chat:message', handleNewMessage);
      socketClient.off('chat:typing', handleTyping);
      socketClient.off('chat:stop_typing', handleStopTyping);
    };
  }, [conversationId]);

  // Handle send message
  const handleSend = useCallback(
    async (text: string) => {
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatRoomId: conversationId,
        senderId: MOCK_USER_ID,
        senderType: 'USER',
        content: text,
        type: 'TEXT',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, tempMessage]);
      setQuickReplies([]);

      try {
        const sent = await sendMessage(conversationId, { content: text });
        setMessages(prev => prev.map(m => (m.id === tempMessage.id ? sent : m)));
      } catch {
        // Keep temp message showing, could add retry logic
      }
    },
    [conversationId]
  );

  // Handle quick reply selection
  const handleQuickReply = useCallback(
    (reply: QuickReplyItem) => {
      handleSend(reply.text);
    },
    [handleSend]
  );

  // Load more messages (pagination)
  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || messages.length === 0) return;
    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const result = await getRoomMessages(conversationId, {
        before: oldestMessage?.id,
      });
      setMessages(prev => [...result.messages, ...prev]);
      setHasMore(result.hasMore);
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, messages, conversationId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={userName} showBackButton />

      <View style={styles.messageListContainer}>
        <MessageList
          messages={messages}
          currentUserId={MOCK_USER_ID}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />

        {isTyping && (
          <View style={styles.typingContainer}>
            <TypingIndicator />
          </View>
        )}

        <QuickReply replies={quickReplies} onSelect={handleQuickReply} />
      </View>

      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  messageListContainer: {
    flex: 1,
  },
  typingContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
});
