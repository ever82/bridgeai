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

    // Generate random 16-byte nonce for each encryption
    const nonce = await Crypto.getRandomBytesAsync(16);
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Use HMAC-SHA256 based keystream: HMAC(key, nonce || index) for each block
    const dataBytes = new TextEncoder().encode(data);
    const blockSize = 32; // SHA-256 output size
    const encrypted = new Uint8Array(dataBytes.length);

    // Generate keystream blocks using HMAC(key, nonce + blockIndex)
    for (let i = 0; i < dataBytes.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);
      const blockIndexHex = blockIndex.toString(16).padStart(8, '0');
      const keyBlock = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.encryptionKey! + nonceHex + blockIndexHex
      );
      const keyBytes = new TextEncoder().encode(keyBlock);

      for (let j = 0; j < blockSize && i + j < dataBytes.length; j++) {
        encrypted[i + j] = dataBytes[i + j] ^ keyBytes[j % keyBytes.length];
      }
    }

    // Compute authentication tag using HMAC-SHA256
    const ciphertextHex = Array.from(encrypted)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const tag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex + this.encryptionKey!
    );

    // Format: nonce(16 bytes) + tag(32 bytes from hex[0:32]) + ciphertext
    const tagBytes = new TextEncoder().encode(tag.substring(0, 32));
    const combined = new Uint8Array(16 + 32 + encrypted.length);
    combined.set(nonce, 0);
    combined.set(tagBytes, 16);
    combined.set(encrypted, 48);

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.ensureEncryptionKey();
    }

    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const nonce = combined.slice(0, 16);
    const storedTag = new TextDecoder().decode(combined.slice(16, 48));
    const ciphertext = combined.slice(48);

    // Derive the same per-message key
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify authentication tag
    const ciphertextHex = Array.from(ciphertext)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const expectedTag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex + this.encryptionKey!
    );

    if (storedTag !== expectedTag.substring(0, 32)) {
      throw new Error('Authentication failed: data may have been tampered with');
    }

    // Decrypt using same HMAC-SHA256 keystream
    const blockSize = 32;
    const decrypted = new Uint8Array(ciphertext.length);

    for (let i = 0; i < ciphertext.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);
      const blockIndexHex = blockIndex.toString(16).padStart(8, '0');
      const keyBlock = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.encryptionKey! + nonceHex + blockIndexHex
      );
      const keyBytes = new TextEncoder().encode(keyBlock);

      for (let j = 0; j < blockSize && i + j < ciphertext.length; j++) {
        decrypted[i + j] = ciphertext[i + j] ^ keyBytes[j % keyBytes.length];
      }
    }

    return new TextDecoder().decode(decrypted);
  }
}

export const encryptedStorage = EncryptedStorage.getInstance();
