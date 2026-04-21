/**
 * User Profile API Types
 * TypeScript type definitions matching backend API interfaces
 */

// ============================================================================
// Base Types
// ============================================================================

export interface User {
  id: string;
  name?: string;
  username?: string;
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  followersCount?: number;
  followingCount?: number;
  momentsCount?: number;
  isFollowing?: boolean;
  isPrivate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  website?: string;
  location?: string;
  isPrivate: boolean;
}

// ============================================================================
// Privacy Settings Types
// ============================================================================

export type ProfileVisibility = 'public' | 'friends' | 'private';
export type OnlineStatusVisibility = 'everyone' | 'friends' | 'nobody';
export type ContactVisibility = 'public' | 'friends' | 'hidden';

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  onlineStatusVisibility: OnlineStatusVisibility;
  phoneVisibility: ContactVisibility;
  emailVisibility: ContactVisibility;
  allowSearchByPhone: boolean;
  allowSearchByEmail: boolean;
  showLastSeen: boolean;
}

export interface PrivacySettingsUpdate {
  profileVisibility?: ProfileVisibility;
  onlineStatusVisibility?: OnlineStatusVisibility;
  phoneVisibility?: ContactVisibility;
  emailVisibility?: ContactVisibility;
  allowSearchByPhone?: boolean;
  allowSearchByEmail?: boolean;
  showLastSeen?: boolean;
}

// ============================================================================
// Security Types
// ============================================================================

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface Device {
  id: string;
  deviceName?: string;
  deviceType?: string;
  lastActiveAt?: string;
  isCurrent?: boolean;
}

export interface SecurityInfo {
  email: {
    address?: string;
    verified: boolean;
  };
  phone: {
    number?: string;
    verified: boolean;
  };
  password: {
    strength: PasswordStrength;
    lastChanged?: string;
  };
  lastActiveDevice: Device | null;
}

// ============================================================================
// Account Binding Types
// ============================================================================

export interface BindPhoneRequest {
  phone: string;
  code: string;
}

export interface BindEmailRequest {
  email: string;
  code: string;
}

export interface SendCodeRequest {
  type: 'phone' | 'email';
  target: string;
}

export interface SendCodeResponse {
  expiresIn: number;
}

// ============================================================================
// Block List Types
// ============================================================================

export interface BlockedUser {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  blockedAt: string;
  reason?: string;
}

// ============================================================================
// Password Change Types
// ============================================================================

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// ============================================================================
// Avatar Upload Types
// ============================================================================

export interface AvatarUploadResponse {
  avatarUrl: string;
  message: string;
}

// ============================================================================
// Account Deletion Types
// ============================================================================

export interface DeleteAccountRequest {
  password: string;
}

export interface DeleteAccountResponse {
  message: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  PHONE_EXISTS = 'PHONE_EXISTS',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  MISSING_FIELDS = 'MISSING_FIELDS',
  NO_FILE = 'NO_FILE',
  USER_ID_REQUIRED = 'USER_ID_REQUIRED',
  SAME_PASSWORD = 'SAME_PASSWORD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error classification helper
export function isNetworkError(error: ApiError): boolean {
  return error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED';
}

export function isAuthError(error: ApiError): boolean {
  return error.code === ApiErrorCode.UNAUTHORIZED;
}

export function isValidationError(error: ApiError): boolean {
  return (
    error.code === ApiErrorCode.MISSING_FIELDS ||
    error.code === ApiErrorCode.WEAK_PASSWORD ||
    error.code === ApiErrorCode.PASSWORD_REQUIRED
  );
}

export function isNotFoundError(error: ApiError): boolean {
  return error.code === ApiErrorCode.USER_NOT_FOUND;
}

export function isServerError(error: ApiError): boolean {
  return error.code === 'SERVER_ERROR' || error.code === 'INTERNAL_SERVER_ERROR';
}
