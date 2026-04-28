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

  private async hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    // Convert message to hex for digestStringAsync
    const messageHex = Array.from(message)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Convert key to hex
    let keyHex = Array.from(key)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // If key is longer than block size (64 bytes for SHA-256 = 128 hex chars), hash it first
    if (keyHex.length > 128) {
      keyHex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, keyHex);
    }

    // Pad key to 64 bytes (128 hex chars)
    while (keyHex.length < 128) {
      keyHex += '00';
    }

    // Compute inner hash: H((K ^ ipad) || message)
    let innerHex = '';
    for (let i = 0; i < 128; i += 2) {
      const k = parseInt(keyHex.substring(i, i + 2), 16);
      innerHex += (k ^ 0x36).toString(16).padStart(2, '0');
    }
    innerHex += messageHex;

    const innerHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, innerHex);

    // Compute outer hash: H((K ^ opad) || innerHash)
    let outerHex = '';
    for (let i = 0; i < 128; i += 2) {
      const k = parseInt(keyHex.substring(i, i + 2), 16);
      outerHex += (k ^ 0x5c).toString(16).padStart(2, '0');
    }
    outerHex += innerHash;

    const outerHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, outerHex);

    // Convert the 64-char hex result to bytes
    const hmacBytes = new Uint8Array(32);
    for (let i = 0; i < 64; i += 2) {
      hmacBytes[i / 2] = parseInt(outerHash.substring(i, i + 2), 16);
    }

    return hmacBytes;
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.ensureEncryptionKey();
    }

    // Derive encryption key and MAC key from the master key using HMAC-SHA256
    const keyBytes = new TextEncoder().encode(this.encryptionKey!);
    const encKey = await this.hmacSha256(keyBytes, new TextEncoder().encode('enc'));
    const macKey = await this.hmacSha256(keyBytes, new TextEncoder().encode('mac'));

    // Generate random 16-byte nonce for each encryption
    const nonce = await Crypto.getRandomBytesAsync(16);

    const dataBytes = new TextEncoder().encode(data);
    const blockSize = 32;
    const encrypted = new Uint8Array(dataBytes.length);

    // Generate keystream using HMAC-SHA256: HMAC(encKey, nonce || blockIndex)
    for (let i = 0; i < dataBytes.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);

      // Build nonce || blockIndex as bytes for HMAC input
      const nonceIndexBytes = new Uint8Array(16 + 4);
      nonceIndexBytes.set(nonce, 0);
      // Write block index as 4-byte big-endian
      nonceIndexBytes[16] = (blockIndex >> 24) & 0xff;
      nonceIndexBytes[17] = (blockIndex >> 16) & 0xff;
      nonceIndexBytes[18] = (blockIndex >> 8) & 0xff;
      nonceIndexBytes[19] = blockIndex & 0xff;

      const keyBlock = await this.hmacSha256(encKey, nonceIndexBytes);

      for (let j = 0; j < blockSize && i + j < dataBytes.length; j++) {
        encrypted[i + j] = dataBytes[i + j] ^ keyBlock[j];
      }
    }

    // Compute authentication tag: HMAC(macKey, nonce || ciphertext)
    const authData = new Uint8Array(16 + encrypted.length);
    authData.set(nonce, 0);
    authData.set(encrypted, 16);

    const tag = await this.hmacSha256(macKey, authData);

    // Format: nonce(16 bytes) + tag(32 bytes) + ciphertext
    const combined = new Uint8Array(16 + 32 + encrypted.length);
    combined.set(nonce, 0);
    combined.set(tag, 16);
    combined.set(encrypted, 48);

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.ensureEncryptionKey();
    }

    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const nonce = combined.slice(0, 16);
    const storedTag = combined.slice(16, 48);
    const ciphertext = combined.slice(48);

    // Derive the same encryption key and MAC key
    const keyBytes = new TextEncoder().encode(this.encryptionKey!);
    const encKey = await this.hmacSha256(keyBytes, new TextEncoder().encode('enc'));
    const macKey = await this.hmacSha256(keyBytes, new TextEncoder().encode('mac'));

    // Verify authentication tag: HMAC(macKey, nonce || ciphertext)
    const authData = new Uint8Array(16 + ciphertext.length);
    authData.set(nonce, 0);
    authData.set(ciphertext, 16);

    const expectedTag = await this.hmacSha256(macKey, authData);

    // Constant-time comparison to prevent timing attacks
    let diff = 0;
    for (let i = 0; i < 32; i++) {
      diff |= storedTag[i] ^ expectedTag[i];
    }

    if (diff !== 0) {
      throw new Error('Authentication failed: data may have been tampered with');
    }

    // Decrypt using same HMAC-SHA256 keystream
    const blockSize = 32;
    const decrypted = new Uint8Array(ciphertext.length);

    for (let i = 0; i < ciphertext.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);

      // Build nonce || blockIndex as bytes for HMAC input (same as encrypt)
      const nonceIndexBytes = new Uint8Array(16 + 4);
      nonceIndexBytes.set(nonce, 0);
      nonceIndexBytes[16] = (blockIndex >> 24) & 0xff;
      nonceIndexBytes[17] = (blockIndex >> 16) & 0xff;
      nonceIndexBytes[18] = (blockIndex >> 8) & 0xff;
      nonceIndexBytes[19] = blockIndex & 0xff;

      const keyBlock = await this.hmacSha256(encKey, nonceIndexBytes);

      for (let j = 0; j < blockSize && i + j < ciphertext.length; j++) {
        decrypted[i + j] = ciphertext[i + j] ^ keyBlock[j];
      }
    }

    return new TextDecoder().decode(decrypted);
  }
}

export const encryptedStorage = EncryptedStorage.getInstance();
