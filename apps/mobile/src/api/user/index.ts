/**
 * User Profile API Client
 * Unified API layer for user profile management
 * Matches backend API: apps/server/src/routes/users.ts, userPrivacy.ts
 */

import { apiClient } from '../../services/api/client';

import {
  ApiError,
  ApiErrorCode,
  AvatarUploadResponse,
  BindEmailRequest,
  BindPhoneRequest,
  BlockedUser,
  ChangePasswordRequest,
  DeleteAccountRequest,
  Device,
  PrivacySettings,
  PrivacySettingsUpdate,
  SecurityInfo,
  SendCodeResponse,
  User,
} from './types';

// ============================================================================
// User Profile API
// ============================================================================

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ success: boolean; data: User }>('/api/v1/users/me');
  return response.data.data;
}

/**
 * PUT /api/v1/users/me
 * Update current user profile
 */
export async function updateUserProfile(data: {
  name?: string;
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
}): Promise<User> {
  const response = await apiClient.put<{ success: boolean; data: User }>('/api/v1/users/me', data);
  return response.data.data;
}

// ============================================================================
// Avatar API
// ============================================================================

/**
 * POST /api/v1/users/avatar
 * Upload user avatar (file or URL)
 */
export async function uploadAvatar(
  file?: { uri: string; name: string; type: string },
  avatarUrl?: string
): Promise<AvatarUploadResponse> {
  if (file) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await apiClient.post<{ success: boolean; data: AvatarUploadResponse }>(
      '/api/v1/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  const response = await apiClient.post<{ success: boolean; data: AvatarUploadResponse }>(
    '/api/v1/users/avatar',
    { avatarUrl }
  );
  return response.data.data;
}

// ============================================================================
// Account Deletion API
// ============================================================================

/**
 * DELETE /api/v1/users/me
 * Delete current user account
 */
export async function deleteAccount(data: DeleteAccountRequest): Promise<DeleteAccountResponse> {
  const response = await apiClient.delete<{ success: boolean; data: DeleteAccountResponse }>(
    '/api/v1/users/me',
    { data }
  );
  return response.data.data;
}

// ============================================================================
// Privacy Settings API
// ============================================================================

/**
 * GET /api/v1/users/me/privacy
 * Get privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  const response = await apiClient.get<{ success: boolean; data: PrivacySettings }>(
    '/api/v1/users/me/privacy'
  );
  return response.data.data;
}

/**
 * PUT /api/v1/users/me/privacy
 * Update privacy settings
 */
export async function updatePrivacySettings(
  settings: PrivacySettingsUpdate
): Promise<PrivacySettings> {
  const response = await apiClient.put<{ success: boolean; data: PrivacySettings }>(
    '/api/v1/users/me/privacy',
    settings
  );
  return response.data.data;
}

// ============================================================================
// Security API
// ============================================================================

/**
 * GET /api/v1/users/me/security
 * Get security info
 */
export async function getSecurityInfo(): Promise<SecurityInfo> {
  const response = await apiClient.get<{ success: boolean; data: SecurityInfo }>(
    '/api/v1/users/me/security'
  );
  return response.data.data;
}

/**
 * POST /api/v1/users/me/password
 * Change password
 */
export async function changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/api/v1/users/me/password',
    data
  );
  return { message: response.data.message };
}

// ============================================================================
// Phone Binding API
// ============================================================================

/**
 * POST /api/v1/users/me/phone/send-code
 * Send verification code for phone binding
 */
export async function sendPhoneVerificationCode(data: {
  phone: string;
}): Promise<SendCodeResponse> {
  const response = await apiClient.post<{ success: boolean; data: SendCodeResponse }>(
    '/api/v1/users/me/phone/send-code',
    { type: 'phone', target: data.phone }
  );
  return response.data.data;
}

/**
 * POST /api/v1/users/me/phone/bind
 * Bind phone number
 */
export async function bindPhone(data: BindPhoneRequest): Promise<{ phone: string }> {
  const response = await apiClient.post<{ success: boolean; data: { phone: string } }>(
    '/api/v1/users/me/phone/bind',
    data
  );
  return response.data.data;
}

// ============================================================================
// Email Binding API
// ============================================================================

/**
 * POST /api/v1/users/me/email/send-code
 * Send verification code for email binding
 */
export async function sendEmailVerificationCode(data: {
  email: string;
}): Promise<SendCodeResponse> {
  const response = await apiClient.post<{ success: boolean; data: SendCodeResponse }>(
    '/api/v1/users/me/email/send-code',
    { type: 'email', target: data.email }
  );
  return response.data.data;
}

/**
 * POST /api/v1/users/me/email/bind
 * Bind email address
 */
export async function bindEmail(data: BindEmailRequest): Promise<{ email: string }> {
  const response = await apiClient.post<{ success: boolean; data: { email: string } }>(
    '/api/v1/users/me/email/bind',
    data
  );
  return response.data.data;
}

// ============================================================================
// Device Management API
// ============================================================================

/**
 * GET /api/v1/users/devices
 * Get user devices
 */
export async function getDevices(): Promise<Device[]> {
  const response = await apiClient.get<{ success: boolean; data: Device[] }>(
    '/api/v1/users/devices'
  );
  return response.data.data;
}

/**
 * DELETE /api/v1/users/devices/:deviceId
 * Remove a device
 */
export async function removeDevice(deviceId: string): Promise<{ message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/api/v1/users/devices/${deviceId}`
  );
  return { message: response.data.message };
}

// ============================================================================
// Block List API
// ============================================================================

/**
 * GET /api/v1/users/blocked
 * Get blocked users list
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const response = await apiClient.get<{ success: boolean; data: BlockedUser[] }>(
    '/api/v1/users/blocked'
  );
  return response.data.data;
}

/**
 * POST /api/v1/users/block
 * Block a user
 */
export async function blockUser(userId: string, reason?: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/api/v1/users/block',
    { userId, reason }
  );
  return { message: response.data.message };
}

/**
 * POST /api/v1/users/unblock
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/api/v1/users/unblock',
    { userId }
  );
  return { message: response.data.message };
}

// ============================================================================
// Error Handler Utility
// ============================================================================

export class UserApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

export function handleUserApiError(error: unknown): UserApiError {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiError;
    return new UserApiError(
      apiError.code || ApiErrorCode.UNKNOWN_ERROR,
      apiError.message || '操作失败，请稍后重试',
      apiError.details
    );
  }
  if (error instanceof Error) {
    return new UserApiError(ApiErrorCode.UNKNOWN_ERROR, error.message || '操作失败，请稍后重试');
  }
  return new UserApiError(ApiErrorCode.UNKNOWN_ERROR, '操作失败，请稍后重试');
}

// ============================================================================
// Exports
// ============================================================================

export * from './types';
