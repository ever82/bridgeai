/**
 * Web-safe storage adapter for Expo mobile apps.
 * Uses localStorage on web, and native storage on mobile.
 */
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      // Defensive check: prevent storing invalid values
      if (value === 'undefined' || value === 'null') {
        console.warn(`[webStorage] Refusing to store invalid value for key "${key}":`, value);
        return;
      }
      localStorage.setItem(key, value);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};
