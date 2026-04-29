import crypto from 'crypto';
import { securityConfig } from '../config/security';
import { secureLogger } from '../middleware/logging';
class KeyManagementService {
    masterKey = null;
    dataEncryptionKey = null;
    keyMetadata = { createdAt: new Date(), version: 1 };
    // In-memory buffer for recent entries; full audit trail is persisted via secureLogger
    recentAuditLog = [];
    maxRecentEntries = 1000;
    constructor() {
        this.initializeKeys();
    }
    initializeKeys() {
        const masterKeyHex = securityConfig.ENCRYPTION_MASTER_KEY;
        if (!masterKeyHex) {
            console.warn('ENCRYPTION_MASTER_KEY not set, generating temporary key');
            this.masterKey = crypto.randomBytes(32);
        }
        else {
            this.masterKey = Buffer.from(masterKeyHex, 'hex');
            if (this.masterKey.length !== 32) {
                throw new Error('Master key must be 32 bytes (64 hex characters)');
            }
        }
        this.dataEncryptionKey = this.deriveDataEncryptionKey();
        this.logAudit('KEY_INITIALIZE', 'Master and DEK keys initialized');
    }
    deriveDataEncryptionKey() {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }
        return crypto.createHmac('sha256', this.masterKey).update('DEK_DERIVATION').digest();
    }
    async getDataEncryptionKey() {
        if (!this.dataEncryptionKey) {
            throw new Error('Data encryption key not initialized');
        }
        return this.dataEncryptionKey;
    }
    async rotateKeys() {
        const oldVersion = this.keyMetadata.version;
        this.masterKey = crypto.randomBytes(32);
        this.dataEncryptionKey = this.deriveDataEncryptionKey();
        this.keyMetadata.rotatedAt = new Date();
        this.keyMetadata.version = oldVersion + 1;
        this.logAudit('KEY_ROTATE', `Keys rotated from version ${oldVersion} to ${this.keyMetadata.version}`);
    }
    getKeyMetadata() {
        return { ...this.keyMetadata };
    }
    logAudit(action, details) {
        const entry = { action, timestamp: new Date(), details };
        // Persist via secureLogger (writes to console/log service)
        secureLogger.audit(`key_management.${action}`, { details, version: this.keyMetadata.version });
        // Keep recent buffer for in-process queries
        this.recentAuditLog.push(entry);
        if (this.recentAuditLog.length > this.maxRecentEntries) {
            this.recentAuditLog.shift();
        }
    }
    getAuditLog() {
        return [...this.recentAuditLog];
    }
    async checkKeyHealth() {
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
const keyManagementService = new KeyManagementService();
export const getDataEncryptionKey = () => keyManagementService.getDataEncryptionKey();
export const rotateKeys = () => keyManagementService.rotateKeys();
export const getKeyMetadata = () => keyManagementService.getKeyMetadata();
export const getKeyAuditLog = () => keyManagementService.getAuditLog();
export const checkKeyHealth = () => keyManagementService.checkKeyHealth();
//# sourceMappingURL=keyManagement.js.map