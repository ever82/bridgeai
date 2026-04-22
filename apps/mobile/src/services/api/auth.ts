import { User, AuthTokens, LoginCredentials, RegisterData } from '../../types';

import { api } from './client';

// Server returns flat tokens: { user, accessToken, refreshToken, expiresIn }
interface ServerAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Client-facing response with tokens wrapped
interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

function wrapServerResponse(data: ServerAuthResponse): AuthResponse {
  return {
    user: data.user,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    },
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<ServerAuthResponse>('/auth/login', credentials);
    return { ...response, data: wrapServerResponse(response.data) };
  },

  register: async (data: RegisterData) => {
    const response = await api.post<ServerAuthResponse>('/auth/register', data);
    return { ...response, data: wrapServerResponse(response.data) };
  },

  logout: () => api.post<void>('/auth/logout'),

  refreshToken: (refreshToken: string) => api.post<AuthTokens>('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<void>('/auth/reset-password', { resetToken: token, newPassword }),

  verifyEmail: (token: string) => api.post<void>('/auth/verify-email', { token }),

  resendVerification: (email: string) => api.post<void>('/auth/resend-verification', { email }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { oldPassword, newPassword }),
};
