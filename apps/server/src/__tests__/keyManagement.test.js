"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const keyManagement_1 = require("../services/keyManagement");
(0, globals_1.describe)('Key Management Service', () => {
    (0, globals_1.beforeEach)(() => {
        // Reset any state if needed
    });
    (0, globals_1.describe)('getDataEncryptionKey', () => {
        (0, globals_1.it)('should return a valid 32-byte key', async () => {
            const key = await (0, keyManagement_1.getDataEncryptionKey)();
            (0, globals_1.expect)(key).toBeInstanceOf(Buffer);
            (0, globals_1.expect)(key.length).toBe(32);
        });
        (0, globals_1.it)('should return consistent key within same session', async () => {
            const key1 = await (0, keyManagement_1.getDataEncryptionKey)();
            const key2 = await (0, keyManagement_1.getDataEncryptionKey)();
            (0, globals_1.expect)(key1.equals(key2)).toBe(true);
        });
    });
    (0, globals_1.describe)('rotateKeys', () => {
        (0, globals_1.it)('should increment key version after rotation', async () => {
            const metadataBefore = (0, keyManagement_1.getKeyMetadata)();
            const versionBefore = metadataBefore.version;
            await (0, keyManagement_1.rotateKeys)();
            const metadataAfter = (0, keyManagement_1.getKeyMetadata)();
            (0, globals_1.expect)(metadataAfter.version).toBe(versionBefore + 1);
            (0, globals_1.expect)(metadataAfter.rotatedAt).toBeDefined();
        });
        (0, globals_1.it)('should add rotation to audit log', async () => {
            const auditLogBefore = (0, keyManagement_1.getKeyAuditLog)().length;
            await (0, keyManagement_1.rotateKeys)();
            const auditLogAfter = (0, keyManagement_1.getKeyAuditLog)().length;
            (0, globals_1.expect)(auditLogAfter).toBeGreaterThan(auditLogBefore);
        });
    });
    (0, globals_1.describe)('getKeyMetadata', () => {
        (0, globals_1.it)('should return key metadata', () => {
            const metadata = (0, keyManagement_1.getKeyMetadata)();
            (0, globals_1.expect)(metadata).toHaveProperty('createdAt');
            (0, globals_1.expect)(metadata).toHaveProperty('version');
            (0, globals_1.expect)(metadata.version).toBeGreaterThanOrEqual(1);
        });
    });
    (0, globals_1.describe)('getKeyAuditLog', () => {
        (0, globals_1.it)('should return audit log array', () => {
            const auditLog = (0, keyManagement_1.getKeyAuditLog)();
            (0, globals_1.expect)(Array.isArray(auditLog)).toBe(true);
        });
        (0, globals_1.it)('should log key initialization', () => {
            const auditLog = (0, keyManagement_1.getKeyAuditLog)();
            const initLog = auditLog.find(log => log.action === 'KEY_INITIALIZE');
            (0, globals_1.expect)(initLog).toBeDefined();
        });
    });
    (0, globals_1.describe)('checkKeyHealth', () => {
        (0, globals_1.it)('should return health status', async () => {
            const health = await (0, keyManagement_1.checkKeyHealth)();
            (0, globals_1.expect)(health).toHaveProperty('healthy');
            (0, globals_1.expect)(health).toHaveProperty('message');
            (0, globals_1.expect)(health).toHaveProperty('keyAge');
            (0, globals_1.expect)(health).toHaveProperty('shouldRotate');
            (0, globals_1.expect)(typeof health.healthy).toBe('boolean');
        });
        (0, globals_1.it)('should detect healthy keys', async () => {
            const health = await (0, keyManagement_1.checkKeyHealth)();
            (0, globals_1.expect)(health.healthy).toBe(true);
        });
    });
});
//# sourceMappingURL=keyManagement.test.js.map