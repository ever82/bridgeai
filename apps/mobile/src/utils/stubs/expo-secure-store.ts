/**
 * Web stub for expo-secure-store
 * On web, tokens are handled by the auth store via localStorage
 */
export const getItemAsync = async (key: string): Promise<string | null> => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export const isAvailableAsync = async (): Promise<boolean> => {
  return false; // Not available on web, but we use localStorage fallback
};
