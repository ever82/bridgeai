import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

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
    // In real implementation, load from secure storage
    this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
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
    // In real implementation, save to secure storage
    console.log('Privacy settings saved:', this.settings);
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

  async encryptData(data: string): Promise<string> {
    if (!this.settings.encryptedIndexStorage || !this.encryptionKey) {
      return data;
    }

    // Generate random nonce for each encryption
    const nonce = await Crypto.getRandomBytesAsync(16);
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const keyHex = Array.from(this.encryptionKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Derive per-message key using SHA-256
    const messageKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyHex + nonceHex
    );

    const dataBytes = new TextEncoder().encode(data);
    const keyBytes = new TextEncoder().encode(messageKey);
    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    // Authentication tag
    const ciphertextHex = Array.from(encrypted)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const tag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex + keyHex
    );

    // Format: nonce(16) + tag(32) + ciphertext
    const tagBytes = new TextEncoder().encode(tag.substring(0, 32));
    const combined = new Uint8Array(16 + 32 + encrypted.length);
    combined.set(nonce, 0);
    combined.set(tagBytes, 16);
    combined.set(encrypted, 48);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptData(encryptedData: string): Promise<string> {
    if (!this.settings.encryptedIndexStorage || !this.encryptionKey) {
      return encryptedData;
    }

    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const nonce = combined.slice(0, 16);
    const storedTag = new TextDecoder().decode(combined.slice(16, 48));
    const ciphertext = combined.slice(48);

    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const keyHex = Array.from(this.encryptionKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Derive same per-message key
    const messageKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyHex + nonceHex
    );

    // Verify authentication tag
    const ciphertextHex = Array.from(ciphertext)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const expectedTag = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceHex + ciphertextHex + keyHex
    );

    if (storedTag !== expectedTag.substring(0, 32)) {
      throw new Error('Authentication failed: data may have been tampered with');
    }

    const keyBytes = new TextEncoder().encode(messageKey);
    const decrypted = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      decrypted[i] = ciphertext[i] ^ keyBytes[i % keyBytes.length];
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
      // Reset search index by re-initializing the database (deletes all data)
      await localSearchIndex.restore('');
    } catch (error) {
      console.error('Failed to clear local data:', error);
    }

    this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
    await this.saveSettings();
  }

  async cleanupOldData(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetentionDays);

    // In real implementation, query and delete old entries
    console.log(`Cleaning up data older than ${cutoffDate.toISOString()}`);

    return 0; // Return number of items cleaned up
  }
}

export const photoLibraryPrivacy = PhotoLibraryPrivacyManager.getInstance();
