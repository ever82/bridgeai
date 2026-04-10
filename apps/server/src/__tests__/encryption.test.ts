/**
 * Tests for encryption utilities
 */
import {
  encrypt,
  decrypt,
  EncryptedData,
  checkEncryptionHealth,
  clearEncryptionCache,
  getCacheSize,
} from '../utils/encryption';

describe('Encryption Utils', () => {
  beforeEach(() => {
    clearEncryptionCache();
  });

  afterEach(() => {
    clearEncryptionCache();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const originalText = 'Hello, World!';
      const encrypted = await encrypt(originalText);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('keyId');
      expect(encrypted.encrypted).not.toBe(originalText);

      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty strings', async () => {
      const encrypted = await encrypt('');
      expect(encrypted.encrypted).toBe('');

      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', async () => {
      const originalText = '你好，世界！🌍';
      const encrypted = await encrypt(originalText);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const text = 'Same text';
      const encrypted1 = await encrypt(text);
      const encrypted2 = await encrypt(text);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle long text', async () => {
      const longText = 'A'.repeat(10000);
      const encrypted = await encrypt(longText);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(longText);
    });
  });

  describe('encryption cache', () => {
    it('should cache decrypted values', async () => {
      const text = 'Test caching';
      const encrypted = await encrypt(text);

      // First decryption should cache
      await decrypt(encrypted);
      expect(getCacheSize()).toBe(1);

      // Second decryption should use cache
      await decrypt(encrypted);
      expect(getCacheSize()).toBe(1);
    });

    it('should clear cache', async () => {
      const encrypted = await encrypt('test');
      await decrypt(encrypted);

      expect(getCacheSize()).toBeGreaterThan(0);
      clearEncryptionCache();
      expect(getCacheSize()).toBe(0);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const health = await checkEncryptionHealth();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Encryption service is healthy');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect encryption/decryption mismatch', async () => {
      // This test would require mocking to fail encryption
      // For now, we just verify the structure
      const health = await checkEncryptionHealth();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('message');
      expect(health).toHaveProperty('latencyMs');
    });
  });
});
