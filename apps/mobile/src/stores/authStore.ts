import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { User, AuthTokens, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../services/api/auth';
import {
  storeTokens,
  clearTokens,
  getTokens,
  updateAccessToken,
  getRefreshToken,
} from '../services/authToken';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Actions
      setUser: user => set({ user, isAuthenticated: !!user }),

      setTokens: tokens => set({ tokens }),

      login: async credentials => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          const { user, tokens } = response.data;

          // Store tokens in SecureStore
          await storeTokens(tokens);

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '登录失败';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      register: async data => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const { user, tokens } = response.data;

          // Store tokens in SecureStore
          await storeTokens(tokens);

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '注册失败';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } finally {
          // Clear tokens from SecureStore
          await clearTokens();

          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshToken: async () => {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return false;

        try {
          const response = await authApi.refreshToken(refreshToken);
          const newTokens = response.data;

          // Update tokens in SecureStore
          await updateAccessToken(newTokens.accessToken, newTokens.expiresIn);

          set({ tokens: newTokens });
          return true;
        } catch {
          // Clear tokens on refresh failure
          await clearTokens();

          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),

      initialize: async () => {
        // On web, skip token loading (SecureStore not available)
        if (Platform.OS === 'web') {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });

        // Load tokens from SecureStore
        const tokens = await getTokens();

        if (tokens.accessToken && tokens.refreshToken) {
          // Verify the token is still valid
          const { refreshToken } = get();
          const isValid = await refreshToken();
          if (!isValid) {
            set({ isLoading: false });
            return;
          }

          set({
            tokens: tokens as AuthTokens,
            isAuthenticated: true,
          });
        }

        set({ isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Note: tokens are stored in SecureStore, not AsyncStorage
      }),
    }
  )
);
