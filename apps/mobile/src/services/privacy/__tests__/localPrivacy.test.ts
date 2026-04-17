import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocalPrivacyManager, PrivacySettings } from '../localPrivacy';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock encrypted storage
jest.mock('../../../utils/encryptedStorage', () => ({
  encryptedStorage: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('LocalPrivacyManager', () => {
  let privacyManager: LocalPrivacyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (LocalPrivacyManager as unknown as { instance: LocalPrivacyManager | null }).instance = null;
    privacyManager = LocalPrivacyManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = LocalPrivacyManager.getInstance();
      const instance2 = LocalPrivacyManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Privacy Settings', () => {
    it('loads privacy settings from storage', async () => {
      const mockSettings: PrivacySettings = {
        onDeviceProcessing: true,
        excludeSensitivePhotos: true,
        enableEncryption: true,
        privacyMode: 'strict',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      await privacyManager.initialize();
      const settings = privacyManager.getSettings();

      expect(settings.onDeviceProcessing).toBe(true);
      expect(settings.excludeSensitivePhotos).toBe(true);
    });

    it('uses default settings when none exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await privacyManager.initialize();
      const settings = privacyManager.getSettings();

      expect(settings.onDeviceProcessing).toBe(true);
      expect(settings.excludeSensitivePhotos).toBe(true);
      expect(settings.enableEncryption).toBe(true);
      expect(settings.privacyMode).toBe('standard');
    });

    it('updates settings and saves to storage', async () => {
      await privacyManager.initialize();

      await privacyManager.updateSettings({
        privacyMode: 'strict',
        excludeSensitivePhotos: true,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedSettings = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedSettings.privacyMode).toBe('strict');
    });
  });

  describe('On-device Processing', () => {
    it('enforces on-device processing by default', async () => {
      await privacyManager.initialize();

      expect(privacyManager.isOnDeviceProcessingEnabled()).toBe(true);
    });

    it('prevents disabling on-device processing', async () => {
      await privacyManager.initialize();

      await expect(
        privacyManager.updateSettings({ onDeviceProcessing: false })
      ).rejects.toThrow('On-device processing cannot be disabled');
    });

    it('ensures no network upload during processing', async () => {
      await privacyManager.initialize();

      const uploadAttempted = privacyManager.wasUploadAttempted();
      expect(uploadAttempted).toBe(false);
    });
  });

  describe('Sensitive Photo Exclusion', () => {
    it('detects sensitive photos by metadata', async () => {
      await privacyManager.initialize();

      const sensitivePhoto = {
        uri: 'file:///test.jpg',
        metadata: {
          isScreenshot: false,
          isScreenRecording: false,
          location: null,
        },
      };

      const isSensitive = await privacyManager.isPhotoSensitive(sensitivePhoto);
      expect(typeof isSensitive).toBe('boolean');
    });

    it('marks screenshots as potentially sensitive', async () => {
      await privacyManager.initialize();
      privacyManager.updateSettings({ excludeSensitivePhotos: true });

      const screenshot = {
        uri: 'file:///screenshot.jpg',
        metadata: {
          isScreenshot: true,
        },
      };

      const shouldExclude = await privacyManager.shouldExcludePhoto(screenshot);
      expect(shouldExclude).toBe(true);
    });

    it('respects user-defined exclusion patterns', async () => {
      await privacyManager.initialize();

      privacyManager.addExclusionPattern(/private/i);

      const privatePhoto = { uri: 'file:///private_photo.jpg' };
      const shouldExclude = await privacyManager.shouldExcludePhoto(privatePhoto);

      expect(shouldExclude).toBe(true);
    });

    it('allows removing exclusion patterns', async () => {
      await privacyManager.initialize();

      const pattern = /temp/i;
      privacyManager.addExclusionPattern(pattern);
      privacyManager.removeExclusionPattern(pattern);

      const tempPhoto = { uri: 'file:///temp.jpg' };
      const shouldExclude = await privacyManager.shouldExcludePhoto(tempPhoto);

      expect(shouldExclude).toBe(false);
    });
  });

  describe('Encrypted Index Storage', () => {
    it('encrypts sensitive data before storage', async () => {
      const { encryptedStorage } = require('../../../utils/encryptedStorage');
      await privacyManager.initialize();

      const sensitiveData = { tags: ['personal', 'family'] };
      await privacyManager.storeEncrypted('test-key', sensitiveData);

      expect(encryptedStorage.setItem).toHaveBeenCalled();
    });

    it('decrypts data when retrieved', async () => {
      const { encryptedStorage } = require('../../../utils/encryptedStorage');
      const mockData = JSON.stringify({ tags: ['personal'] });
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      await privacyManager.initialize();
      const data = await privacyManager.retrieveEncrypted('test-key');

      expect(data).toEqual({ tags: ['personal'] });
    });

    it('handles encryption errors gracefully', async () => {
      const { encryptedStorage } = require('../../../utils/encryptedStorage');
      (encryptedStorage.setItem as jest.Mock).mockRejectedValue(new Error('Encryption failed'));

      await privacyManager.initialize();

      await expect(
        privacyManager.storeEncrypted('key', { data: 'test' })
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('Privacy Mode', () => {
    it('supports different privacy modes', async () => {
      await privacyManager.initialize();

      expect(privacyManager.getAvailablePrivacyModes()).toContain('standard');
      expect(privacyManager.getAvailablePrivacyModes()).toContain('strict');
      expect(privacyManager.getAvailablePrivacyModes()).toContain('custom');
    });

    it('applies correct settings for strict mode', async () => {
      await privacyManager.initialize();

      await privacyManager.setPrivacyMode('strict');
      const settings = privacyManager.getSettings();

      expect(settings.privacyMode).toBe('strict');
      expect(settings.excludeSensitivePhotos).toBe(true);
      expect(settings.enableEncryption).toBe(true);
    });

    it('applies correct settings for standard mode', async () => {
      await privacyManager.initialize();

      await privacyManager.setPrivacyMode('standard');
      const settings = privacyManager.getSettings();

      expect(settings.privacyMode).toBe('standard');
      expect(settings.enableEncryption).toBe(true);
    });

    it('allows custom privacy configuration', async () => {
      await privacyManager.initialize();

      await privacyManager.setPrivacyMode('custom', {
        excludeSensitivePhotos: false,
        enableEncryption: true,
      });

      const settings = privacyManager.getSettings();
      expect(settings.privacyMode).toBe('custom');
      expect(settings.excludeSensitivePhotos).toBe(false);
    });
  });

  describe('Data Processing Transparency', () => {
    it('provides data processing information', async () => {
      await privacyManager.initialize();

      const info = privacyManager.getDataProcessingInfo();

      expect(info).toMatchObject({
        processedOnDevice: true,
        notUploadedToCloud: true,
        encryptedStorage: expect.any(Boolean),
      });
    });

    it('generates privacy report', async () => {
      await privacyManager.initialize();

      const report = await privacyManager.generatePrivacyReport();

      expect(report).toMatchObject({
        totalPhotosProcessed: expect.any(Number),
        photosExcluded: expect.any(Number),
        encryptionEnabled: expect.any(Boolean),
        lastProcessedAt: expect.any(Date),
      });
    });
  });

  describe('Privacy Controls', () => {
    it('allows clearing all local data', async () => {
      await privacyManager.initialize();

      await privacyManager.clearAllLocalData();

      const { encryptedStorage } = require('../../../utils/encryptedStorage');
      expect(encryptedStorage.removeItem).toHaveBeenCalled();
    });

    it('allows exporting privacy settings', async () => {
      await privacyManager.initialize();

      const exportData = await privacyManager.exportPrivacySettings();

      expect(exportData).toHaveProperty('settings');
      expect(exportData).toHaveProperty('exclusionPatterns');
      expect(exportData).toHaveProperty('exportDate');
    });

    it('allows importing privacy settings', async () => {
      await privacyManager.initialize();

      const importData = {
        settings: { privacyMode: 'strict' },
        exclusionPatterns: ['pattern1', 'pattern2'],
        exportDate: new Date().toISOString(),
      };

      await privacyManager.importPrivacySettings(importData);

      expect(privacyManager.getSettings().privacyMode).toBe('strict');
    });
  });
});
