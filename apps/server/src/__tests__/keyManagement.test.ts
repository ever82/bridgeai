import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getDataEncryptionKey,
  rotateKeys,
  getKeyMetadata,
  getKeyAuditLog,
  checkKeyHealth,
} from '../services/keyManagement';

describe('Key Management Service', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('getDataEncryptionKey', () => {
    it('should return a valid 32-byte key', async () => {
      const key = await getDataEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should return consistent key within same session', async () => {
      const key1 = await getDataEncryptionKey();
      const key2 = await getDataEncryptionKey();
      expect(key1.equals(key2)).toBe(true);
    });
  });

  describe('rotateKeys', () => {
    it('should increment key version after rotation', async () => {
      const metadataBefore = getKeyMetadata();
      const versionBefore = metadataBefore.version;

      await rotateKeys();

      const metadataAfter = getKeyMetadata();
      expect(metadataAfter.version).toBe(versionBefore + 1);
      expect(metadataAfter.rotatedAt).toBeDefined();
    });

    it('should add rotation to audit log', async () => {
      const auditLogBefore = getKeyAuditLog().length;
      await rotateKeys();
      const auditLogAfter = getKeyAuditLog().length;
      expect(auditLogAfter).toBeGreaterThan(auditLogBefore);
    });
  });

  describe('getKeyMetadata', () => {
    it('should return key metadata', () => {
      const metadata = getKeyMetadata();
      expect(metadata).toHaveProperty('createdAt');
      expect(metadata).toHaveProperty('version');
      expect(metadata.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getKeyAuditLog', () => {
    it('should return audit log array', () => {
      const auditLog = getKeyAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);
    });

    it('should log key initialization', () => {
      const auditLog = getKeyAuditLog();
      const initLog = auditLog.find(log => log.action === 'KEY_INITIALIZE');
      expect(initLog).toBeDefined();
    });
  });

  describe('checkKeyHealth', () => {
    it('should return health status', async () => {
      const health = await checkKeyHealth();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('message');
      expect(health).toHaveProperty('keyAge');
      expect(health).toHaveProperty('shouldRotate');
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should detect healthy keys', async () => {
      const health = await checkKeyHealth();
      expect(health.healthy).toBe(true);
    });
  });
});
