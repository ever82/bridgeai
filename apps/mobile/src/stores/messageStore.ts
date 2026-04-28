import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getNotifications, getUnreadCount, type Notification } from '../services/notificationApi';
import { getUserRooms, markRoomAsRead, searchRooms, type ChatRoom } from '../services/chatApi';

export type ConversationStatus = 'human_chatting' | 'agent_negotiating' | 'waiting_reply' | 'ended';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  dndMode: boolean;
  previewEnabled: boolean;
  perTypeSettings: {
    system: boolean;
    activity: boolean;
    match: boolean;
    security: boolean;
  };
}

export interface Conversation {
  id: string;
  name: string;
  avatarUri?: string;
  sceneTag: string;
  status: ConversationStatus;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isPinned: boolean;
  isOnline: boolean;
  isArchived: boolean;
  isMuted: boolean;
}

export interface MessageSearchResult {
  contacts: Array<{
    id: string;
    name: string;
    avatarUri?: string;
    sceneTag: string;
    conversationCount: number;
  }>;
  messages: Array<{
    id: string;
    content: string;
    senderName: string;
    roomId: string;
    createdAt: string;
  }>;
}

interface MessageState {
  // State
  unreadCount: number;
  conversations: Conversation[];
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  refreshing: boolean;
  hasMore: boolean;

  // Search state
  searchQuery: string;
  searchResults: MessageSearchResult;
  recentSearches: string[];
  isSearching: boolean;

  // Selection state
  selectedIds: string[];
  isSelectionMode: boolean;

  // Notification settings state
  notificationSettings: NotificationSettings;

  // Actions
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  clearUnreadCount: () => void;
  fetchUnreadCount: () => Promise<void>;

  fetchConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;

  fetchNotifications: () => Promise<void>;
  markAllNotificationsRead: () => void;

  markConversationRead: (id: string) => Promise<void>;
  markMultipleRead: (ids: string[]) => void;
  deleteConversation: (id: string) => void;
  deleteMultiple: (ids: string[]) => void;
  pinConversation: (id: string, pinned: boolean) => void;
  archiveConversation: (id: string) => void;
  unarchiveConversation: (id: string) => void;
  muteConversation: (id: string, muted: boolean) => void;
  clearChatHistory: (id: string) => void;

  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updatePerTypeNotificationSetting: (
    type: keyof NotificationSettings['perTypeSettings'],
    enabled: boolean
  ) => void;

  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;

  toggleSelectionMode: (enabled: boolean) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

const mapChatRoomToConversation = (room: ChatRoom): Conversation => {
  const metadata = room.metadata || {};
  const statusMap: Record<string, ConversationStatus> = {
    ACTIVE: 'human_chatting',
    INACTIVE: 'waiting_reply',
    CLOSED: 'ended',
  };

  return {
    id: room.id,
    name: metadata.name || '未知会话',
    avatarUri: metadata.avatarUrl,
    sceneTag: metadata.scene || '聊天',
    status: statusMap[room.status] || 'waiting_reply',
    lastMessage: room.lastMessage?.content || '暂无消息',
    lastMessageTime: room.lastMessageAt || room.updatedAt,
    unreadCount: room.unreadCount || 0,
    isPinned: !!room.settings?.isFixed,
    isOnline: false,
    isArchived: !!room.settings?.isArchived,
    isMuted: !!room.settings?.isMuted,
  };
};

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      // Initial state
      unreadCount: 0,
      conversations: [],
      notifications: [],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      refreshing: false,
      hasMore: true,

      searchQuery: '',
      searchResults: { contacts: [], messages: [] },
      recentSearches: [],
      isSearching: false,

      selectedIds: [],
      isSelectionMode: false,

      notificationSettings: {
        enabled: true,
        sound: true,
        vibration: true,
        dndMode: false,
        previewEnabled: true,
        perTypeSettings: {
          system: true,
          activity: true,
          match: true,
          security: true,
        },
      },

      // Actions
      setUnreadCount: count => set({ unreadCount: count }),

      incrementUnreadCount: () => {
        const currentCount = get().unreadCount;
        set({ unreadCount: currentCount + 1 });
      },

      decrementUnreadCount: () => {
        const currentCount = get().unreadCount;
        set({ unreadCount: Math.max(0, currentCount - 1) });
      },

      clearUnreadCount: () => set({ unreadCount: 0 }),

      fetchUnreadCount: async () => {
        try {
          const count = await getUnreadCount();
          set({ unreadCount: count });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '获取未读消息数失败';
          set({ error: msg });
        }
      },

      fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserRooms({ limit: 20, page: 1 });
          const conversations = response.rooms.map(mapChatRoomToConversation);
          set({
            conversations,
            isLoading: false,
            hasMore: response.total > conversations.length,
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '获取会话列表失败';
          set({
            error: msg,
            isLoading: false,
          });
        }
      },

      refreshConversations: async () => {
        set({ refreshing: true, error: null });
        try {
          const [roomsResponse, unreadCount] = await Promise.all([
            getUserRooms({ limit: 20, page: 1 }),
            getUnreadCount(),
          ]);
          const conversations = roomsResponse.rooms.map(mapChatRoomToConversation);
          set({
            conversations,
            unreadCount,
            refreshing: false,
            hasMore: roomsResponse.total > conversations.length,
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '刷新会话列表失败';
          set({
            error: msg,
            refreshing: false,
          });
        }
      },

      loadMoreConversations: async () => {
        const { isLoadingMore, hasMore, conversations } = get();
        if (isLoadingMore || !hasMore) return;

        set({ isLoadingMore: true });
        try {
          const page = Math.floor(conversations.length / 20) + 1;
          const response = await getUserRooms({ limit: 20, page });
          const newConversations = response.rooms.map(mapChatRoomToConversation);
          set({
            conversations: [...conversations, ...newConversations],
            isLoadingMore: false,
            hasMore: response.total > conversations.length + newConversations.length,
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '加载更多会话失败';
          set({
            error: msg,
            isLoadingMore: false,
          });
        }
      },

      fetchNotifications: async () => {
        try {
          const response = await getNotifications({
            status: 'UNREAD',
            limit: 10,
          });
          set({ notifications: response.items });
        } catch (error: unknown) {
          console.error('Failed to fetch notifications:', error);
        }
      },

      markConversationRead: async id => {
        try {
          await markRoomAsRead(id);
          set(state => ({
            conversations: state.conversations.map(c =>
              c.id === id ? { ...c, unreadCount: 0 } : c
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (error) {
          console.error('Failed to mark conversation as read:', error);
        }
      },

      markMultipleRead: ids => {
        set(state => ({
          conversations: state.conversations.map(c =>
            ids.includes(c.id) ? { ...c, unreadCount: 0 } : c
          ),
        }));
      },

      deleteConversation: id => {
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== id),
          selectedIds: state.selectedIds.filter(sid => sid !== id),
        }));
      },

      deleteMultiple: ids => {
        set(state => ({
          conversations: state.conversations.filter(c => !ids.includes(c.id)),
          selectedIds: [],
          isSelectionMode: false,
        }));
      },

      pinConversation: (id, pinned) => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, isPinned: pinned } : c
          ),
        }));
      },

      archiveConversation: id => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, isArchived: true } : c
          ),
        }));
      },

      unarchiveConversation: id => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, isArchived: false } : c
          ),
        }));
      },

      muteConversation: (id, muted) => {
        set(state => ({
          conversations: state.conversations.map(c => (c.id === id ? { ...c, isMuted: muted } : c)),
        }));
      },

      clearChatHistory: id => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, lastMessage: '', lastMessageTime: new Date().toISOString() } : c
          ),
        }));
      },

      markAllNotificationsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, status: 'READ' as const })),
        }));
      },

      updateNotificationSettings: settings => {
        set(state => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        }));
      },

      updatePerTypeNotificationSetting: (type, enabled) => {
        set(state => ({
          notificationSettings: {
            ...state.notificationSettings,
            perTypeSettings: { ...state.notificationSettings.perTypeSettings, [type]: enabled },
          },
        }));
      },

      setSearchQuery: query => set({ searchQuery: query }),

      performSearch: async query => {
        if (!query.trim()) {
          set({ searchResults: { contacts: [], messages: [] }, isSearching: false });
          return;
        }
        set({ isSearching: true });
        try {
          const response = await searchRooms(query, { limit: 20 });
          const contacts = response.rooms.map(room => ({
            id: room.id,
            name: room.metadata?.name || '未知',
            avatarUri: room.metadata?.avatarUrl,
            sceneTag: room.metadata?.scene || '聊天',
            conversationCount: 1,
          }));

          set({
            searchResults: {
              contacts,
              messages: [],
            },
            isSearching: false,
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '搜索失败';
          set({
            error: msg,
            isSearching: false,
          });
        }
      },

      clearSearch: () =>
        set({
          searchQuery: '',
          searchResults: { contacts: [], messages: [] },
          isSearching: false,
        }),

      addRecentSearch: query => {
        if (!query.trim()) return;
        set(state => ({
          recentSearches: [query, ...state.recentSearches.filter(s => s !== query)].slice(0, 10),
        }));
      },

      removeRecentSearch: query => {
        set(state => ({
          recentSearches: state.recentSearches.filter(s => s !== query),
        }));
      },

      toggleSelectionMode: enabled =>
        set({ isSelectionMode: enabled, selectedIds: enabled ? [] : [] }),

      toggleSelection: id => {
        set(state => {
          const selectedIds = state.selectedIds.includes(id)
            ? state.selectedIds.filter(sid => sid !== id)
            : [...state.selectedIds, id];
          return { selectedIds };
        });
      },

      selectAll: ids => set({ selectedIds: ids }),

      clearSelection: () => set({ selectedIds: [], isSelectionMode: false }),
    }),
    {
      name: 'message-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        unreadCount: state.unreadCount,
        recentSearches: state.recentSearches,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
);
