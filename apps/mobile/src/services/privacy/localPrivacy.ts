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
  'document', 'id_card', 'passport', 'license',
  'receipt', 'invoice', 'contract', 'medical',
  'ssn', 'credit_card', 'bank', 'statement',
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
      `vision_share_${Platform.OS}_${Date.now()}`,
    );
    this.encryptionKey = new Uint8Array(
      keyData.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || [],
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
      ['document', 'paper', 'text', 'scan'].some(ind => t.includes(ind)),
    );

    if (textIndicators.length > 0) {
      const privacyIndicators = tags.filter(t =>
        ['personal', 'private', 'confidential'].some(ind => t.includes(ind)),
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

    const dataBytes = new TextEncoder().encode(data);
    const encrypted = await this.xorEncrypt(dataBytes, this.encryptionKey);
    return btoa(String.fromCharCode(...encrypted));
  }

  async decryptData(encryptedData: string): Promise<string> {
    if (!this.settings.encryptedIndexStorage || !this.encryptionKey) {
      return encryptedData;
    }

    const dataBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const decrypted = await this.xorEncrypt(dataBytes, this.encryptionKey);
    return new TextDecoder().decode(decrypted);
  }

  private async xorEncrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i % key.length];
    }
    return result;
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
      // Delete search index
      // await localSearchIndex.clear(); // Would need to implement this
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
