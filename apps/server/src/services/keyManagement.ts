import crypto from 'crypto';

import { securityConfig } from '../config/security';
import { secureLogger } from '../middleware/logging';

interface KeyMetadata {
  createdAt: Date;
  rotatedAt?: Date;
  version: number;
}

interface AuditEntry {
  action: string;
  timestamp: Date;
  details: string;
}

class KeyManagementService {
  private masterKey: Buffer | null = null;
  private dataEncryptionKey: Buffer | null = null;
  private keyMetadata: KeyMetadata = { createdAt: new Date(), version: 1 };
  // In-memory buffer for recent entries; full audit trail is persisted via secureLogger
  private recentAuditLog: AuditEntry[] = [];
  private readonly maxRecentEntries = 1000;

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    const masterKeyHex = securityConfig.ENCRYPTION_MASTER_KEY;

    if (!masterKeyHex) {
      console.warn('ENCRYPTION_MASTER_KEY not set, generating temporary key');
      this.masterKey = crypto.randomBytes(32);
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 32 bytes (64 hex characters)');
      }
    }

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

    this.masterKey = crypto.randomBytes(32);
    this.dataEncryptionKey = this.deriveDataEncryptionKey();

    this.keyMetadata.rotatedAt = new Date();
    this.keyMetadata.version = oldVersion + 1;

    this.logAudit(
      'KEY_ROTATE',
      `Keys rotated from version ${oldVersion} to ${this.keyMetadata.version}`
    );
  }

  getKeyMetadata(): KeyMetadata {
    return { ...this.keyMetadata };
  }

  private logAudit(action: string, details: string): void {
    const entry: AuditEntry = { action, timestamp: new Date(), details };

    // Persist via secureLogger (writes to console/log service)
    secureLogger.audit(`key_management.${action}`, { details, version: this.keyMetadata.version });

    // Keep recent buffer for in-process queries
    this.recentAuditLog.push(entry);
    if (this.recentAuditLog.length > this.maxRecentEntries) {
      this.recentAuditLog.shift();
    }
  }

  getAuditLog(): AuditEntry[] {
    return [...this.recentAuditLog];
  }

  async checkKeyHealth(): Promise<{
    healthy: boolean;
    message: string;
    keyAge: number;
    shouldRotate: boolean;
  }> {
    const now = new Date();
    const keyAge = Math.floor(
      (now.getTime() - this.keyMetadata.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
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

const keyManagementService = new KeyManagementService();

export const getDataEncryptionKey = () => keyManagementService.getDataEncryptionKey();
export const rotateKeys = () => keyManagementService.rotateKeys();
export const getKeyMetadata = () => keyManagementService.getKeyMetadata();
export const getKeyAuditLog = () => keyManagementService.getAuditLog();
export const checkKeyHealth = () => keyManagementService.checkKeyHealth();
