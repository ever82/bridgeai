import { create } from 'zustand';
import { Moment } from '../types';
import { momentsApi } from '../services/api/moments';

interface MomentsState {
  // State
  moments: Moment[];
  selectedMoment: Moment | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  fetchMoments: (refresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  getMoment: (id: string) => Promise<void>;
  createMoment: (data: FormData) => Promise<Moment>;
  updateMoment: (id: string, data: Partial<Moment>) => Promise<void>;
  deleteMoment: (id: string) => Promise<void>;
  likeMoment: (id: string) => Promise<void>;
  unlikeMoment: (id: string) => Promise<void>;
  setSelectedMoment: (moment: Moment | null) => void;
  clearError: () => void;
}

const PAGE_SIZE = 20;

export const useMomentsStore = create<MomentsState>((set, get) => ({
  // Initial state
  moments: [],
  selectedMoment: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  page: 1,

  // Actions
  fetchMoments: async (refresh = false) => {
    const page = refresh ? 1 : get().page;
    set({ isLoading: refresh, error: null });

    try {
      const response = await momentsApi.getMoments({ page, limit: PAGE_SIZE });
      set({
        moments: refresh ? response.data : [...get().moments, ...response.data],
        hasMore: response.pagination.hasMore,
        page: page + 1,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取动态失败',
        isLoading: false,
      });
    }
  },

  loadMore: async () => {
    const { isLoadingMore, hasMore } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });
    await get().fetchMoments(false);
    set({ isLoadingMore: false });
  },

  getMoment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await momentsApi.getMoment(id);
      set({
        selectedMoment: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取动态详情失败',
        isLoading: false,
      });
    }
  },

  createMoment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await momentsApi.createMoment(data);
      set({
        moments: [response.data, ...get().moments],
        isLoading: false,
      });
      return response.data;
    } catch (error: any) {
      set({
        error: error.message || '创建动态失败',
        isLoading: false,
      });
      throw error;
    }
  },

  updateMoment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await momentsApi.updateMoment(id, data);
      set({
        moments: get().moments.map((m) =>
          m.id === id ? response.data : m
        ),
        selectedMoment:
          get().selectedMoment?.id === id ? response.data : get().selectedMoment,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '更新动态失败',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteMoment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await momentsApi.deleteMoment(id);
      set({
        moments: get().moments.filter((m) => m.id !== id),
        selectedMoment: get().selectedMoment?.id === id ? null : get().selectedMoment,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '删除动态失败',
        isLoading: false,
      });
      throw error;
    }
  },

  likeMoment: async (id) => {
    try {
      await momentsApi.likeMoment(id);
      set({
        moments: get().moments.map((m) =>
          m.id === id
            ? { ...m, isLiked: true, likesCount: m.likesCount + 1 }
            : m
        ),
        selectedMoment:
          get().selectedMoment?.id === id
            ? {
                ...get().selectedMoment!,
                isLiked: true,
                likesCount: get().selectedMoment!.likesCount + 1,
              }
            : get().selectedMoment,
      });
    } catch (error: any) {
      set({ error: error.message || '点赞失败' });
    }
  },

  unlikeMoment: async (id) => {
    try {
      await momentsApi.unlikeMoment(id);
      set({
        moments: get().moments.map((m) =>
          m.id === id
            ? { ...m, isLiked: false, likesCount: m.likesCount - 1 }
            : m
        ),
        selectedMoment:
          get().selectedMoment?.id === id
            ? {
                ...get().selectedMoment!,
                isLiked: false,
                likesCount: get().selectedMoment!.likesCount - 1,
              }
            : get().selectedMoment,
      });
    } catch (error: any) {
      set({ error: error.message || '取消点赞失败' });
    }
  },

  setSelectedMoment: (moment) => set({ selectedMoment: moment }),
  clearError: () => set({ error: null }),
}));
