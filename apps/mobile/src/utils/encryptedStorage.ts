import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_NAME = 'local_album_encryption_key';

export class EncryptedStorage {
  private static instance: EncryptedStorage;
  private encryptionKey: string | null = null;

  static getInstance(): EncryptedStorage {
    if (!EncryptedStorage.instance) {
      EncryptedStorage.instance = new EncryptedStorage();
    }
    return EncryptedStorage.instance;
  }

  async initialize(): Promise<void> {
    await this.ensureEncryptionKey();
  }

  private async ensureEncryptionKey(): Promise<void> {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);

    if (!key) {
      key = await this.generateEncryptionKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
    }

    this.encryptionKey = key;
  }

  private async generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    await SecureStore.setItemAsync(`encrypted_${key}`, encrypted);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await SecureStore.getItemAsync(`encrypted_${key}`);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }

  async deleteItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(`encrypted_${key}`);
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.ensureEncryptionKey();
    }

    // Simple XOR encryption for demonstration
    // In production, use proper encryption like AES-GCM
    const dataBytes = new TextEncoder().encode(data);
    const keyBytes = new TextEncoder().encode(this.encryptionKey!);

    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return btoa(String.fromCharCode(...encrypted));
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.ensureEncryptionKey();
    }

    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(this.encryptionKey!);

    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(decrypted);
  }
}

export const encryptedStorage = EncryptedStorage.getInstance();
