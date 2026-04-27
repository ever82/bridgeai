import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { MessagesStackParamList } from '../../types/navigation';
import { ChatMessage, createSenderSnapshot } from '../../types/chat';
import { Header } from '../../components/Header';
import { MessageList } from '../../components/Chat/MessageList';
import { ChatInput } from '../../components/Chat/ChatInput';
import { QuickReply, QuickReplyItem } from '../../components/Chat/QuickReply';
import { TypingIndicator } from '../../components/TypingIndicator';
import { getRoomMessages, sendMessage } from '../../services/chatApi';
import { socketClient } from '../../services/socketClient';
import { theme } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

export const ChatScreen = ({ route }: Props) => {
  const user = useAuthStore(state => state.user);
  const currentUserId = user?.id ?? '';
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
      // Quick replies will be populated via socket events from the backend
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
      if (data.roomId === conversationId && data.userId !== currentUserId) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (data: { roomId: string; userId: string }) => {
      if (data.roomId === conversationId) {
        setIsTyping(false);
      }
    };

    const handleQuickReplies = (data: { roomId: string; replies: QuickReplyItem[] }) => {
      if (data.roomId === conversationId) {
        setQuickReplies(data.replies);
      }
    };

    // Reconnection sync: after socket reconnects, re-fetch messages to
    // pick up any missed messages and ensure sender identities are in sync.
    const handleReconnected = () => {
      loadMessages();
    };

    socketClient.on('chat:message', handleNewMessage);
    socketClient.on('chat:typing', handleTyping);
    socketClient.on('chat:stop_typing', handleStopTyping);
    socketClient.on('chat:quick_replies', handleQuickReplies);
    socketClient.on('reconnected', handleReconnected);

    return () => {
      socketClient.off('chat:message', handleNewMessage);
      socketClient.off('chat:typing', handleTyping);
      socketClient.off('chat:stop_typing', handleStopTyping);
      socketClient.off('chat:quick_replies', handleQuickReplies);
      socketClient.off('reconnected', handleReconnected);
    };
  }, [conversationId, currentUserId, loadMessages]);

  // Handle send message
  const handleSend = useCallback(
    async (text: string) => {
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatRoomId: conversationId,
        senderId: currentUserId,
        senderType: 'USER',
        senderSnapshot: createSenderSnapshot(currentUserId, 'USER', {
          id: currentUserId,
          name: user?.username,
          displayName: user?.displayName,
          avatarUrl: user?.avatar,
        }),
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
    [conversationId, currentUserId, user]
  );

  // Handle quick reply selection
  const handleQuickReply = useCallback(
    (reply: QuickReplyItem) => {
      handleSend(reply.text);
    },
    [handleSend]
  );

  // Handle attachment selection
  const handleAttachmentPress = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const attachment = {
      type: 'image' as const,
      url: asset.uri,
      name: asset.fileName || 'image.jpg',
      size: asset.fileSize,
    };

    try {
      await sendMessage(conversationId, {
        content: '',
        type: 'IMAGE',
        attachments: [attachment],
      });
    } catch {
      Alert.alert('发送失败', '图片发送失败，请重试');
    }
  }, [conversationId]);

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
          currentUserId={currentUserId}
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

      <ChatInput onSend={handleSend} onAttachmentPress={handleAttachmentPress} />
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
