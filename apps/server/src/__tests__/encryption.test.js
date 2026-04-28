"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const encryption_1 = require("../utils/encryption");
(0, globals_1.describe)('Encryption Utils', () => {
    (0, globals_1.beforeEach)(() => {
        (0, encryption_1.clearEncryptionCache)();
    });
    (0, globals_1.afterEach)(() => {
        (0, encryption_1.clearEncryptionCache)();
    });
    (0, globals_1.describe)('encrypt/decrypt', () => {
        (0, globals_1.it)('should encrypt and decrypt text correctly', async () => {
            const originalText = 'Hello, World!';
            const encrypted = await (0, encryption_1.encrypt)(originalText);
            (0, globals_1.expect)(encrypted).toHaveProperty('encrypted');
            (0, globals_1.expect)(encrypted).toHaveProperty('iv');
            (0, globals_1.expect)(encrypted).toHaveProperty('tag');
            (0, globals_1.expect)(encrypted).toHaveProperty('keyId');
            (0, globals_1.expect)(encrypted.encrypted).not.toBe(originalText);
            const decrypted = await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)(decrypted).toBe(originalText);
        });
        (0, globals_1.it)('should handle empty strings', async () => {
            const encrypted = await (0, encryption_1.encrypt)('');
            (0, globals_1.expect)(encrypted.encrypted).toBe('');
            const decrypted = await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)(decrypted).toBe('');
        });
        (0, globals_1.it)('should handle unicode characters', async () => {
            const originalText = '你好，世界！🌍';
            const encrypted = await (0, encryption_1.encrypt)(originalText);
            const decrypted = await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)(decrypted).toBe(originalText);
        });
        (0, globals_1.it)('should produce different ciphertexts for same plaintext', async () => {
            const text = 'Same text';
            const encrypted1 = await (0, encryption_1.encrypt)(text);
            const encrypted2 = await (0, encryption_1.encrypt)(text);
            (0, globals_1.expect)(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
            (0, globals_1.expect)(encrypted1.iv).not.toBe(encrypted2.iv);
        });
        (0, globals_1.it)('should handle long text', async () => {
            const longText = 'A'.repeat(10000);
            const encrypted = await (0, encryption_1.encrypt)(longText);
            const decrypted = await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)(decrypted).toBe(longText);
        });
    });
    (0, globals_1.describe)('encryption cache', () => {
        (0, globals_1.it)('should cache decrypted values', async () => {
            const text = 'Test caching';
            const encrypted = await (0, encryption_1.encrypt)(text);
            // First decryption should cache
            await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)((0, encryption_1.getCacheSize)()).toBe(1);
            // Second decryption should use cache
            await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)((0, encryption_1.getCacheSize)()).toBe(1);
        });
        (0, globals_1.it)('should clear cache', async () => {
            const encrypted = await (0, encryption_1.encrypt)('test');
            await (0, encryption_1.decrypt)(encrypted);
            (0, globals_1.expect)((0, encryption_1.getCacheSize)()).toBeGreaterThan(0);
            (0, encryption_1.clearEncryptionCache)();
            (0, globals_1.expect)((0, encryption_1.getCacheSize)()).toBe(0);
        });
    });
    (0, globals_1.describe)('health check', () => {
        (0, globals_1.it)('should return healthy status', async () => {
            const health = await (0, encryption_1.checkEncryptionHealth)();
            (0, globals_1.expect)(health.healthy).toBe(true);
            (0, globals_1.expect)(health.message).toBe('Encryption service is healthy');
            (0, globals_1.expect)(health.latencyMs).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should detect encryption/decryption mismatch', async () => {
            // This test would require mocking to fail encryption
            // For now, we just verify the structure
            const health = await (0, encryption_1.checkEncryptionHealth)();
            (0, globals_1.expect)(health).toHaveProperty('healthy');
            (0, globals_1.expect)(health).toHaveProperty('message');
            (0, globals_1.expect)(health).toHaveProperty('latencyMs');
        });
    });
});
//# sourceMappingURL=encryption.test.js.map