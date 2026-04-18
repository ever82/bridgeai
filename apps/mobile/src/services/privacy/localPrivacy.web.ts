// Web stub for localPrivacy - native crypto/indexing not available on web

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

export class PhotoLibraryPrivacyManager {
  private static instance: PhotoLibraryPrivacyManager;

  static getInstance(): PhotoLibraryPrivacyManager {
    if (!PhotoLibraryPrivacyManager.instance) {
      PhotoLibraryPrivacyManager.instance = new PhotoLibraryPrivacyManager();
    }
    return PhotoLibraryPrivacyManager.instance;
  }

  async initialize(): Promise<void> {
    // No-op on web
  }

  getSettings(): PrivacySettings {
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }

  async updateSettings(_settings: Partial<PrivacySettings>): Promise<void> {
    // No-op on web
  }

  isMarkedAsSensitive(_imageId: string): boolean {
    return false;
  }

  async markAsSensitive(_imageId: string): Promise<void> {
    // No-op on web
  }

  async unmarkAsSensitive(_imageId: string): Promise<void> {
    // No-op on web
  }

  async encryptData(data: string): Promise<string> {
    return data;
  }

  async decryptData(data: string): Promise<string> {
    return data;
  }

  enablePrivacyMode(): void {
    // No-op on web
  }

  disablePrivacyMode(): void {
    // No-op on web
  }

  isPrivacyModeEnabled(): boolean {
    return false;
  }

  canUploadToCloud(): boolean {
    return false;
  }

  shouldProcessOnDevice(): boolean {
    return true;
  }

  getDataProcessingNotice(): string {
    return 'Web platform - local processing not available.';
  }

  async deleteAllLocalData(): Promise<void> {
    // No-op on web
  }

  async cleanupOldData(): Promise<number> {
    return 0;
  }
}

export const photoLibraryPrivacy = PhotoLibraryPrivacyManager.getInstance();
