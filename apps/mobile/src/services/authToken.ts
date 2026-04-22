/**
 * Auth Token Storage
 * Securely stores and retrieves authentication tokens using encrypted storage.
 */

import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Store authentication tokens securely
 */
export async function storeTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  const expiryTime = Date.now() + tokens.expiresIn * 1000;
  await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiryTime));
}

/**
 * Clear all stored authentication tokens
 */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}

/**
 * Get all stored tokens
 */
export async function getTokens(): Promise<StoredTokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: expiryStr ? Math.max(0, Math.floor((Number(expiryStr) - Date.now()) / 1000)) : 0,
  };
}

/**
 * Get the stored access token
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * Get the stored refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Update only the access token (used during token refresh)
 */
export async function updateAccessToken(
  accessToken: string,
  expiresIn: number,
  refreshToken?: string
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  const expiryTime = Date.now() + expiresIn * 1000;
  await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiryTime));
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}
