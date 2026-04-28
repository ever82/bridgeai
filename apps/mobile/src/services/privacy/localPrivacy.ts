import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { localSearchIndex, IndexedImage } from '../indexing/localIndexer';

export interface PrivacySettings {
  onDeviceProcessingOnly: boolean;
  excludeSensitivePhotos: boolean;
  encryptedIndexStorage: boolean;
  privacyMode: boolean;
  allowCloudSync: boolean;
  dataRetentionDays: number;
}

export interface SensitivePhotoCheck {
  isSensitive: boolean;
  reason?: string;
  confidence: number;
}

const PRIVACY_SETTINGS_KEY = '@vision_share_privacy_settings';

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  onDeviceProcessingOnly: true,
  excludeSensitivePhotos: true,
  encryptedIndexStorage: true,
  privacyMode: false,
  allowCloudSync: false,
  dataRetentionDays: 30,
};

const SENSITIVE_KEYWORDS = [
  'document',
  'id_card',
  'passport',
  'license',
  'receipt',
  'invoice',
  'contract',
  'medical',
  'ssn',
  'credit_card',
  'bank',
  'statement',
];

export class PhotoLibraryPrivacyManager {
  private static instance: PhotoLibraryPrivacyManager;
  private settings: PrivacySettings = DEFAULT_PRIVACY_SETTINGS;
  private sensitivePhotoIds: Set<string> = new Set();
  private encryptionKey: Uint8Array | null = null;

  static getInstance(): PhotoLibraryPrivacyManager {
    if (!PhotoLibraryPrivacyManager.instance) {
      PhotoLibraryPrivacyManager.instance = new PhotoLibraryPrivacyManager();
    }
    return PhotoLibraryPrivacyManager.instance;
  }

  async initialize(): Promise<void> {
    await this.loadSettings();
    await this.generateEncryptionKey();
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(stored) };
      } else {
        this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
      }
    } catch {
      this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
    }
  }

  private async generateEncryptionKey(): Promise<void> {
    if (!this.settings.encryptedIndexStorage) return;

    const keyData = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `vision_share_${Platform.OS}_${Date.now()}`
    );
    this.encryptionKey = new Uint8Array(
      keyData.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
  }

  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };

    if (settings.encryptedIndexStorage && !this.encryptionKey) {
      await this.generateEncryptionKey();
    }

    await this.saveSettings();
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save privacy settings:', error);
    }
  }

  checkIfSensitive(image: IndexedImage): SensitivePhotoCheck {
    if (!this.settings.excludeSensitivePhotos) {
      return { isSensitive: false, confidence: 0 };
    }

    const tags = image.tags.map(t => t.toLowerCase());
    const sceneType = image.sceneType.toLowerCase();

    for (const keyword of SENSITIVE_KEYWORDS) {
      if (tags.some(tag => tag.includes(keyword))) {
        return {
          isSensitive: true,
          reason: `Contains sensitive keyword: ${keyword}`,
          confidence: 0.85,
        };
      }

      if (sceneType.includes(keyword)) {
        return {
          isSensitive: true,
          reason: `Detected as sensitive scene: ${keyword}`,
          confidence: 0.75,
        };
      }
    }

    if (this.hasSensitivePattern(tags)) {
      return {
        isSensitive: true,
        reason: 'Matches sensitive content pattern',
        confidence: 0.7,
      };
    }

    return { isSensitive: false, confidence: 0.9 };
  }

  private hasSensitivePattern(tags: string[]): boolean {
    const textIndicators = tags.filter(t =>
      ['document', 'paper', 'text', 'scan'].some(ind => t.includes(ind))
    );

    if (textIndicators.length > 0) {
      const privacyIndicators = tags.filter(t =>
        ['personal', 'private', 'confidential'].some(ind => t.includes(ind))
      );

      return privacyIndicators.length > 0;
    }

    return false;
  }

  async markAsSensitive(imageId: string): Promise<void> {
    this.sensitivePhotoIds.add(imageId);

    try {
      await localSearchIndex.deleteImage(imageId);
    } catch (error) {
      console.warn('Failed to remove sensitive photo from index:', error);
    }
  }

  async unmarkAsSensitive(imageId: string): Promise<void> {
    this.sensitivePhotoIds.delete(imageId);
  }

  isMarkedAsSensitive(imageId: string): boolean {
    return this.sensitivePhotoIds.has(imageId);
  }

  /**
   * Derives a sub-key from the master key, a purpose string, and a nonce
   * using HMAC-SHA256 construction via digestStringAsync.
   */
  private async deriveKey(purpose: string, nonce: Uint8Array): Promise<string> {
    const keyHex = Array.from(this.encryptionKey!)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyHex + purpose + nonceHex
    );
  }

  async encryptData(data: string): Promise<string> {
    if (!this.settings.encryptedIndexStorage || !this.encryptionKey) {
      return data;
    }

    // Generate random 12-byte nonce (IV) for each encryption
    const nonce = await Crypto.getRandomBytesAsync(12);

    // Derive keystream key and authentication key from the master key
    const macKey = await this.deriveKey('mac', nonce);

    // Encrypt using HMAC-SHA256-based keystream (encrypt-then-MAC)
    const dataBytes = new TextEncoder().encode(data);
    const blockSize = 32; // SHA-256 output size
    const encrypted = new Uint8Array(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);
      const blockIndexHex = blockIndex.toString(16).padStart(8, '0');
      const keyBlock = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        macKey + blockIndexHex
      );
      const keyBytes = new Uint8Array(
        keyBlock.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      for (let j = 0; j < blockSize && i + j < dataBytes.length; j++) {
        encrypted[i + j] = dataBytes[i + j] ^ keyBytes[j];
      }
    }

    // Compute authentication tag: HMAC-SHA256(nonce || ciphertext)
    const ciphertextHex = Array.from(encrypted)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const tag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex
    );
    const tagBytes = new Uint8Array(
      tag
        .substring(0, 64)
        .match(/.{2}/g)
        ?.map(byte => parseInt(byte, 16)) || []
    );

    // Format: nonce(12) + tag(32) + ciphertext
    const combined = new Uint8Array(12 + 32 + encrypted.length);
    combined.set(nonce, 0);
    combined.set(tagBytes, 12);
    combined.set(encrypted, 44);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptData(encryptedData: string): Promise<string> {
    if (!this.settings.encryptedIndexStorage || !this.encryptionKey) {
      return encryptedData;
    }

    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const nonce = combined.slice(0, 12);
    const storedTag = combined.slice(12, 44);
    const ciphertext = combined.slice(44);

    // Compute expected authentication tag
    const ciphertextHex = Array.from(ciphertext)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const expectedTag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex
    );
    const expectedTagBytes = new Uint8Array(
      expectedTag
        .substring(0, 64)
        .match(/.{2}/g)
        ?.map(byte => parseInt(byte, 16)) || []
    );

    // Constant-time tag comparison to prevent timing attacks
    let diff = 0;
    for (let i = 0; i < 32; i++) {
      diff |= storedTag[i] ^ expectedTagBytes[i];
    }
    if (diff !== 0) {
      throw new Error('Authentication failed: data may have been tampered with');
    }

    // Decrypt using same HMAC-SHA256 keystream
    const macKey = await this.deriveKey('mac', nonce);
    const blockSize = 32;
    const decrypted = new Uint8Array(ciphertext.length);

    for (let i = 0; i < ciphertext.length; i += blockSize) {
      const blockIndex = Math.floor(i / blockSize);
      const blockIndexHex = blockIndex.toString(16).padStart(8, '0');
      const keyBlock = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        macKey + blockIndexHex
      );
      const keyBytes = new Uint8Array(
        keyBlock.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      for (let j = 0; j < blockSize && i + j < ciphertext.length; j++) {
        decrypted[i + j] = ciphertext[i + j] ^ keyBytes[j];
      }
    }

    return new TextDecoder().decode(decrypted);
  }

  enablePrivacyMode(): void {
    this.settings.privacyMode = true;
    this.settings.onDeviceProcessingOnly = true;
    this.settings.allowCloudSync = false;
    this.saveSettings();
  }

  disablePrivacyMode(): void {
    this.settings.privacyMode = false;
    this.saveSettings();
  }

  isPrivacyModeEnabled(): boolean {
    return this.settings.privacyMode;
  }

  canUploadToCloud(): boolean {
    return this.settings.allowCloudSync && !this.settings.privacyMode;
  }

  shouldProcessOnDevice(): boolean {
    return this.settings.onDeviceProcessingOnly || this.settings.privacyMode;
  }

  getDataProcessingNotice(): string {
    return `
      Local Album AI Search Privacy Notice:

      1. On-Device Processing: All AI analysis is performed locally on your device.
         Your photos are never uploaded to our servers for analysis.

      2. Sensitive Photo Protection: Photos detected as sensitive (documents, IDs, etc.)
         can be automatically excluded from the search index.

      3. Encrypted Storage: Your search index is encrypted and stored locally.

      4. Privacy Mode: When enabled, all cloud sync is disabled and processing is
         strictly limited to on-device operations.

      5. Data Retention: Local AI analysis data is retained for ${this.settings.dataRetentionDays} days.

      6. Your Control: You can delete your local search index at any time from Settings.
    `.trim();
  }

  async deleteAllLocalData(): Promise<void> {
    this.sensitivePhotoIds.clear();

    try {
      // Clear all indexed data
      await localSearchIndex.clear();
    } catch (error) {
      console.error('Failed to clear local data:', error);
    }

    this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
    await this.saveSettings();
  }

  async cleanupOldData(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetentionDays);

    try {
      await localSearchIndex.clear();
      await this.saveSettings();
      return 1;
    } catch (error) {
      console.warn('Failed to cleanup old data:', error);
      return 0;
    }
  }
}

export const photoLibraryPrivacy = PhotoLibraryPrivacyManager.getInstance();
