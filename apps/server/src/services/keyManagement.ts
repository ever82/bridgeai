import crypto from 'crypto';

import { securityConfig } from '../config/security';

interface KeyMetadata {
  createdAt: Date;
  rotatedAt?: Date;
  version: number;
}

class KeyManagementService {
  private masterKey: Buffer | null = null;
  private dataEncryptionKey: Buffer | null = null;
  private keyMetadata: KeyMetadata = { createdAt: new Date(), version: 1 };
  private auditLog: Array<{ action: string; timestamp: Date; details: string }> = [];

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    // Master key should be stored securely (e.g., AWS KMS, HashiCorp Vault)
    // For local development, derive from environment variable
    const masterKeyHex = securityConfig.ENCRYPTION_MASTER_KEY;

    if (!masterKeyHex) {
      // Generate a temporary key for development (not for production)
      console.warn('ENCRYPTION_MASTER_KEY not set, generating temporary key');
      this.masterKey = crypto.randomBytes(32);
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 32 bytes (64 hex characters)');
      }
    }

    // Derive DEK from master key
    this.dataEncryptionKey = this.deriveDataEncryptionKey();
    this.logAudit('KEY_INITIALIZE', 'Master and DEK keys initialized');
  }

  private deriveDataEncryptionKey(): Buffer {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    return crypto.createHmac('sha256', this.masterKey).update('DEK_DERIVATION').digest();
  }

  async getDataEncryptionKey(): Promise<Buffer> {
    if (!this.dataEncryptionKey) {
      throw new Error('Data encryption key not initialized');
    }
    return this.dataEncryptionKey;
  }

  async rotateKeys(): Promise<void> {
    const oldVersion = this.keyMetadata.version;

    // Generate new master key
    this.masterKey = crypto.randomBytes(32);
    this.dataEncryptionKey = this.deriveDataEncryptionKey();

    this.keyMetadata.rotatedAt = new Date();
    this.keyMetadata.version = oldVersion + 1;

    this.logAudit('KEY_ROTATE', `Keys rotated from version ${oldVersion} to ${this.keyMetadata.version}`);
  }

  getKeyMetadata(): KeyMetadata {
    return { ...this.keyMetadata };
  }

  private logAudit(action: string, details: string): void {
    this.auditLog.push({
      action,
      timestamp: new Date(),
      details,
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  getAuditLog(): Array<{ action: string; timestamp: Date; details: string }> {
    return [...this.auditLog];
  }

  async checkKeyHealth(): Promise<{
    healthy: boolean;
    message: string;
    keyAge: number;
    shouldRotate: boolean;
  }> {
    const now = new Date();
    const keyAge = Math.floor((now.getTime() - this.keyMetadata.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceRotation = this.keyMetadata.rotatedAt
      ? Math.floor((now.getTime() - this.keyMetadata.rotatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : keyAge;

    const shouldRotate = daysSinceRotation >= securityConfig.KEY_ROTATION_DAYS;

    return {
      healthy: !!this.masterKey && !!this.dataEncryptionKey,
      message: shouldRotate ? 'Keys should be rotated' : 'Keys are healthy',
      keyAge,
      shouldRotate,
    };
  }
}

// Singleton instance
const keyManagementService = new KeyManagementService();

export const getDataEncryptionKey = () => keyManagementService.getDataEncryptionKey();
export const rotateKeys = () => keyManagementService.rotateKeys();
export const getKeyMetadata = () => keyManagementService.getKeyMetadata();
export const getKeyAuditLog = () => keyManagementService.getAuditLog();
export const checkKeyHealth = () => keyManagementService.checkKeyHealth();
