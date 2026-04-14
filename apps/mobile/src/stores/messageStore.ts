import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MessageState {
  // State
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  clearUnreadCount: () => void;
  fetchUnreadCount: () => Promise<void>;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      // Initial state
      unreadCount: 0,
      isLoading: false,
      error: null,

      // Actions
      setUnreadCount: (count) => set({ unreadCount: count }),

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
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call when API is ready
          // const response = await messageApi.getUnreadCount();
          // set({ unreadCount: response.data.count, isLoading: false });

          // Mock implementation - simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || '获取未读消息数失败',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'message-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
