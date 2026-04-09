import { api } from './client';
import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  ApiResponse,
} from '../../types';

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', credentials),

  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),

  logout: () => api.post<void>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<void>('/auth/reset-password', { token, newPassword }),

  verifyEmail: (token: string) =>
    api.post<void>('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    api.post<void>('/auth/resend-verification', { email }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { oldPassword, newPassword }),
};
