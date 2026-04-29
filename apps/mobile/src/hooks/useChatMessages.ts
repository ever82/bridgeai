import { useCallback, useState } from 'react';

import { getRoomMessages } from '../services/chatApi';
import { ChatMessage } from '../types/chat';

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadInitial: (conversationId: string) => Promise<void>;
  loadMore: (conversationId: string) => Promise<void>;
  prependMessages: (newMessages: ChatMessage[]) => void;
}

export function useChatMessages(): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadInitial = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getRoomMessages(conversationId);
      setMessages(result.messages);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(
    async (conversationId: string) => {
      if (isLoading || messages.length === 0) return;

      const oldestMessageId = messages[0]?.id;
      if (!oldestMessageId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await getRoomMessages(conversationId, { before: oldestMessageId });
        // Prepend older messages at the beginning
        setMessages(prev => [...result.messages, ...prev]);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const prependMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(prev => [...newMessages, ...prev]);
  }, []);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    loadInitial,
    loadMore,
    prependMessages,
  };
}
