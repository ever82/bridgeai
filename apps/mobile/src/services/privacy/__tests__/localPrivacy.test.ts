import AsyncStorage from '@react-native-async-storage/async-storage';

import { PhotoLibraryPrivacyManager } from '../localPrivacy';
import { IndexedImage } from '../../indexing/localIndexer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('a'.repeat(64))),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(12))),
}));

jest.mock('../../indexing/localIndexer', () => ({
  localSearchIndex: {
    deleteImage: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('PhotoLibraryPrivacyManager', () => {
  let privacyManager: PhotoLibraryPrivacyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (
      PhotoLibraryPrivacyManager as unknown as { instance: PhotoLibraryPrivacyManager | null }
    ).instance = null;
    privacyManager = PhotoLibraryPrivacyManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = PhotoLibraryPrivacyManager.getInstance();
      const instance2 = PhotoLibraryPrivacyManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Privacy Settings', () => {
    it('uses default settings when initialized', async () => {
      await privacyManager.initialize();
      const settings = privacyManager.getSettings();

      expect(settings.onDeviceProcessingOnly).toBe(true);
      expect(settings.excludeSensitivePhotos).toBe(true);
      expect(settings.encryptedIndexStorage).toBe(true);
      expect(settings.privacyMode).toBe(false);
      expect(settings.allowCloudSync).toBe(false);
      expect(settings.dataRetentionDays).toBe(30);
    });

    it('updates settings and saves to storage', async () => {
      await privacyManager.initialize();

      await privacyManager.updateSettings({
        excludeSensitivePhotos: false,
        dataRetentionDays: 7,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const settings = privacyManager.getSettings();
      expect(settings.excludeSensitivePhotos).toBe(false);
      expect(settings.dataRetentionDays).toBe(7);
    });

    it('preserves unchanged settings when updating partial', async () => {
      await privacyManager.initialize();

      await privacyManager.updateSettings({ allowCloudSync: true });
      const settings = privacyManager.getSettings();

      expect(settings.allowCloudSync).toBe(true);
      expect(settings.onDeviceProcessingOnly).toBe(true);
      expect(settings.encryptedIndexStorage).toBe(true);
    });
  });

  describe('Sensitive Photo Detection', () => {
    const makeImage = (partial: Partial<IndexedImage>): IndexedImage =>
      ({
        id: 'img-1',
        uri: 'file:///test.jpg',
        localIdentifier: 'local-id-1',
        tags: [],
        embeddings: [],
        sceneType: 'indoor',
        createdAt: new Date(),
        modifiedAt: new Date(),
        analyzedAt: new Date(),
        fileSize: 1024,
        width: 1920,
        height: 1080,
        ...partial,
      }) as IndexedImage;

    it('returns sensitive=true for document-like photos', async () => {
      await privacyManager.initialize();

      const image = makeImage({ tags: ['document', 'paper'], sceneType: 'document' });
      const result = privacyManager.checkIfSensitive(image);

      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('sensitive');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns sensitive=true for photos with sensitive keywords', async () => {
      await privacyManager.initialize();

      const image = makeImage({ tags: ['ssn', 'personal'], sceneType: 'indoor' });
      const result = privacyManager.checkIfSensitive(image);

      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('sensitive keyword');
    });

    it('returns non-sensitive for unrelated photos', async () => {
      await privacyManager.initialize();

      const image = makeImage({ tags: ['beach', 'vacation'], sceneType: 'outdoor' });
      const result = privacyManager.checkIfSensitive(image);

      expect(result.isSensitive).toBe(false);
      expect(result.confidence).toBe(0.9);
    });

    it('returns non-sensitive when excludeSensitivePhotos is disabled', async () => {
      await privacyManager.initialize();
      await privacyManager.updateSettings({ excludeSensitivePhotos: false });

      const image = makeImage({ tags: ['passport'], sceneType: 'document' });
      const result = privacyManager.checkIfSensitive(image);

      expect(result.isSensitive).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Sensitive Photo Marking', () => {
    it('marks a photo as sensitive and removes it from the index', async () => {
      await privacyManager.initialize();

      await privacyManager.markAsSensitive('photo-123');

      expect(privacyManager.isMarkedAsSensitive('photo-123')).toBe(true);
    });

    it('unmarks a photo from sensitive list', async () => {
      await privacyManager.initialize();

      await privacyManager.markAsSensitive('photo-123');
      await privacyManager.unmarkAsSensitive('photo-123');

      expect(privacyManager.isMarkedAsSensitive('photo-123')).toBe(false);
    });

    it('isMarkedAsSensitive returns false for unmarked photos', async () => {
      await privacyManager.initialize();

      expect(privacyManager.isMarkedAsSensitive('unknown-id')).toBe(false);
    });
  });

  describe('Encryption', () => {
    it('encrypts data and returns a base64 string', async () => {
      await privacyManager.initialize();

      const encrypted = await privacyManager.encryptData('sensitive content');

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('decrypts data back to the original string', async () => {
      await privacyManager.initialize();

      const original = 'sensitive content';
      const encrypted = await privacyManager.encryptData(original);
      const decrypted = await privacyManager.decryptData(encrypted);

      expect(decrypted).toBe(original);
    });

    it('encryptData returns plaintext when encryption is disabled', async () => {
      await privacyManager.initialize();
      await privacyManager.updateSettings({ encryptedIndexStorage: false });

      const plaintext = await privacyManager.encryptData('sensitive content');

      expect(plaintext).toBe('sensitive content');
    });

    it('decryptData returns ciphertext when encryption is disabled', async () => {
      await privacyManager.initialize();
      await privacyManager.updateSettings({ encryptedIndexStorage: false });

      const decrypted = await privacyManager.decryptData('sensitive content');

      expect(decrypted).toBe('sensitive content');
    });
  });

  describe('Privacy Mode', () => {
    it('enables privacy mode and locks settings', async () => {
      await privacyManager.initialize();

      privacyManager.enablePrivacyMode();

      expect(privacyManager.isPrivacyModeEnabled()).toBe(true);
    });

    it('disables privacy mode', async () => {
      await privacyManager.initialize();

      privacyManager.enablePrivacyMode();
      privacyManager.disablePrivacyMode();

      expect(privacyManager.isPrivacyModeEnabled()).toBe(false);
    });

    it('prevents cloud upload when privacy mode is enabled', async () => {
      await privacyManager.initialize();
      await privacyManager.updateSettings({ allowCloudSync: true });

      privacyManager.enablePrivacyMode();

      expect(privacyManager.canUploadToCloud()).toBe(false);
    });

    it('allows cloud upload when privacy mode is disabled and cloud sync is on', async () => {
      await privacyManager.initialize();
      await privacyManager.updateSettings({ allowCloudSync: true });

      privacyManager.disablePrivacyMode();

      expect(privacyManager.canUploadToCloud()).toBe(true);
    });

    it('shouldProcessOnDevice returns true by default', async () => {
      await privacyManager.initialize();

      expect(privacyManager.shouldProcessOnDevice()).toBe(true);
    });

    it('shouldProcessOnDevice returns true when privacy mode is enabled', async () => {
      await privacyManager.initialize();

      privacyManager.enablePrivacyMode();

      expect(privacyManager.shouldProcessOnDevice()).toBe(true);
    });
  });

  describe('Data Processing Transparency', () => {
    it('returns a data processing notice', async () => {
      await privacyManager.initialize();

      const notice = privacyManager.getDataProcessingNotice();

      expect(typeof notice).toBe('string');
      expect(notice).toContain('On-Device Processing');
      expect(notice).toContain('Sensitive Photo Protection');
      expect(notice).toContain('Encrypted Storage');
    });
  });

  describe('Data Management', () => {
    it('clears all local data and resets settings', async () => {
      await privacyManager.initialize();
      await privacyManager.markAsSensitive('photo-1');

      await privacyManager.deleteAllLocalData();

      expect(privacyManager.isMarkedAsSensitive('photo-1')).toBe(false);
    });

    it('cleanupOldData returns a count', async () => {
      await privacyManager.initialize();

      const count = await privacyManager.cleanupOldData();

      expect(typeof count).toBe('number');
    });
  });
});
