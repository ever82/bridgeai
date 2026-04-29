import { renderHook, act } from '@testing-library/react-native';

import { useChatMessages } from '../useChatMessages';
import { getRoomMessages } from '../../services/chatApi';
import { ChatMessage } from '../../types/chat';

jest.mock('../../services/chatApi', () => ({
  getRoomMessages: jest.fn(),
}));

const mockedGetRoomMessages = getRoomMessages as jest.MockedFunction<typeof getRoomMessages>;

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    chatRoomId: 'room-1',
    senderId: 'user-1',
    senderType: 'USER',
    content: 'Hello',
    type: 'TEXT',
    createdAt: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

describe('useChatMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('returns empty messages array initially', () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.messages).toEqual([]);
    });

    it('returns isLoading false initially', () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.isLoading).toBe(false);
    });

    it('returns hasMore false initially', () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.hasMore).toBe(false);
    });

    it('returns null error initially', () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadInitial', () => {
    it('sets isLoading true while fetching', async () => {
      mockedGetRoomMessages.mockImplementation(() =>
        Promise.resolve({ messages: [], hasMore: false })
      );
      const { result } = renderHook(() => useChatMessages());

      let resolvePromise: () => void;
      mockedGetRoomMessages.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve;
          })
      );

      const promise = act(async () => {
        result.current.loadInitial('room-1');
      });
      expect(result.current.isLoading).toBe(true);
      await act(async () => {
        resolvePromise!({ messages: [], hasMore: false });
      });
      await promise;
    });

    it('populates messages on success', async () => {
      const messages = [makeMessage({ id: 'msg-1' }), makeMessage({ id: 'msg-2' })];
      mockedGetRoomMessages.mockResolvedValue({ messages, hasMore: true });
      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });

      expect(result.current.messages).toEqual(messages);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets error on failure', async () => {
      const err = new Error('Network error');
      mockedGetRoomMessages.mockRejectedValue(err);
      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });

      expect(result.current.error).toEqual(err);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toEqual([]);
    });

    it('passes conversationId to getRoomMessages', async () => {
      mockedGetRoomMessages.mockResolvedValue({ messages: [], hasMore: false });
      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-abc');
      });

      expect(mockedGetRoomMessages).toHaveBeenCalledWith('room-abc');
    });
  });

  describe('loadMore', () => {
    it('does nothing when already loading', async () => {
      mockedGetRoomMessages.mockResolvedValue({ messages: [], hasMore: false });
      const { result } = renderHook(() => useChatMessages());

      // Start loadInitial (which sets isLoading)
      mockedGetRoomMessages.mockImplementationOnce(() => new Promise(() => {}));
      await act(async () => {
        result.current.loadInitial('room-1');
      });
      expect(result.current.isLoading).toBe(true);

      // loadMore should not trigger another request
      await act(async () => {
        result.current.loadMore('room-1');
      });
      expect(mockedGetRoomMessages).toHaveBeenCalledTimes(1);
    });

    it('does nothing when messages array is empty', async () => {
      mockedGetRoomMessages.mockResolvedValue({ messages: [], hasMore: false });
      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        result.current.loadMore('room-1');
      });

      expect(mockedGetRoomMessages).not.toHaveBeenCalled();
    });

    it('prepends older messages and updates hasMore', async () => {
      const initialMessages = [makeMessage({ id: 'msg-2' })];
      mockedGetRoomMessages.mockResolvedValueOnce({ messages: initialMessages, hasMore: true });

      const olderMessages = [makeMessage({ id: 'msg-1' }), makeMessage({ id: 'msg-0' })];
      mockedGetRoomMessages.mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });
      await act(async () => {
        await result.current.loadMore('room-1');
      });

      expect(result.current.messages).toEqual([
        olderMessages[0],
        olderMessages[1],
        ...initialMessages,
      ]);
      expect(result.current.hasMore).toBe(false);
    });

    it('passes before option with oldest message id', async () => {
      const messages = [makeMessage({ id: 'msg-old' })];
      mockedGetRoomMessages.mockResolvedValueOnce({ messages, hasMore: true });

      const olderMessages = [makeMessage({ id: 'msg-older' })];
      mockedGetRoomMessages.mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });
      await act(async () => {
        await result.current.loadMore('room-1');
      });

      expect(mockedGetRoomMessages).toHaveBeenLastCalledWith('room-1', { before: 'msg-old' });
    });

    it('sets error on failure', async () => {
      const initialMessages = [makeMessage({ id: 'msg-2' })];
      mockedGetRoomMessages.mockResolvedValueOnce({ messages: initialMessages, hasMore: true });

      const err = new Error('Load more failed');
      mockedGetRoomMessages.mockRejectedValueOnce(err);

      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });
      await act(async () => {
        await result.current.loadMore('room-1');
      });

      expect(result.current.error).toEqual(err);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('prependMessages', () => {
    it('prepends new messages at the beginning', async () => {
      mockedGetRoomMessages.mockResolvedValue({
        messages: [makeMessage({ id: 'msg-2' })],
        hasMore: false,
      });
      const { result } = renderHook(() => useChatMessages());

      await act(async () => {
        await result.current.loadInitial('room-1');
      });

      const newMessages = [makeMessage({ id: 'msg-1' })];
      act(() => {
        result.current.prependMessages(newMessages);
      });

      expect(result.current.messages[0]).toEqual(newMessages[0]);
    });

    it('handles empty initial messages', () => {
      const { result } = renderHook(() => useChatMessages());

      act(() => {
        result.current.prependMessages([makeMessage({ id: 'msg-1' })]);
      });

      expect(result.current.messages).toHaveLength(1);
    });
  });
});
