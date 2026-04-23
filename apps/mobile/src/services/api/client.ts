import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

import { API_BASE_URL } from '../../constants/config';
import { ApiResponse, ApiError } from '../../types';
import { getAccessToken, getRefreshToken, updateAccessToken, clearTokens } from '../authToken';

// Global lock to prevent concurrent token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async config => {
    // Get token from SecureStore
    const accessToken = await getAccessToken();
    if (accessToken) {
      config.headers.Authorization = 'Bearer ' + accessToken;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = await getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(API_BASE_URL + '/auth/refresh', { refreshToken });
            const authData = response.data?.data || response.data;
            const newAccessToken = authData.accessToken;
            const newRefreshToken = authData.refreshToken;
            const expiresIn = authData.expiresIn;

            if (!newAccessToken) throw new Error('No access token in refresh response');

            await updateAccessToken(newAccessToken, expiresIn, newRefreshToken);
            onTokenRefreshed(newAccessToken);
          }
        } catch {
          await clearTokens();
        } finally {
          isRefreshing = false;
        }
      } else {
        // Queue request until token is refreshed
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = 'Bearer ' + token;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      if (originalRequest.headers) {
        const token = await getAccessToken();
        if (token) {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return apiClient(originalRequest);
        }
      }
    }

    // Format error - handle non-JSON responses
    let code = 'UNKNOWN_ERROR';
    let message = '请求失败，请稍后重试';
    let details: Record<string, string[]> | undefined;

    if (error.response?.data) {
      if (typeof error.response.data === 'object' && 'code' in error.response.data) {
        code = (error.response.data as ApiError).code || 'UNKNOWN_ERROR';
        message = (error.response.data as ApiError).message || '请求失败，请稍后重试';
        details = (error.response.data as ApiError).details;
      } else if (typeof error.response.data === 'string' && error.response.data.trim()) {
        // Non-JSON response (e.g. HTML error page)
        code = 'SERVER_ERROR';
        message = '服务器错误，请稍后重试';
      }
    }

    const apiError: ApiError = { code, message, details };
    return Promise.reject(apiError);
  }
);

// API helper functions
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.get(url, config),

  post: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> => apiClient.post(url, data, config),

  put: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> => apiClient.put(url, data, config),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> => apiClient.patch(url, data, config),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.delete(url, config),
};

export default apiClient;
