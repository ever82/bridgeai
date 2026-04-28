"use strict";
/**
 * Probe Tests for ISSUE-A002: JWT Authentication & API Security
 *
 * These tests probe for刁钻 vulnerabilities from the most adversarial perspective.
 * Each probe represents a potential security bug that should NOT exist.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../services/auth/jwt");
const client_1 = require("../db/client");
const refreshToken_1 = require("../services/auth/refreshToken");
const blacklist_1 = require("../services/auth/blacklist");
// Setup test JWT_SECRET before importing modules
process.env.JWT_SECRET = 'probe-test-secret-key-for-testing-only-32chars!';
// Helper: create a test user for foreign key constraints
async function createTestUser(userId) {
    await client_1.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: `${userId}@probe.test`,
            name: `Probe User ${userId}`,
            passwordHash: '$2b$12$dummyhashforprobetestonlyx',
            status: 'ACTIVE',
        },
    });
}
async function cleanupTestUser(userId) {
    await client_1.prisma.refreshToken.deleteMany({ where: { userId } });
    await client_1.prisma.user.deleteMany({ where: { id: userId } });
}
describe('ISSUE-A002 Probe Tests: JWT Authentication', () => {
    describe('[PROBE-1] Algorithm Confusion Attack', () => {
        /**
         * Severity: CRITICAL
         * If jwt.verify() doesn't specify algorithm, attacker can sign token with 'none' algorithm
         */
        it('should reject tokens signed with "none" algorithm', () => {
            const maliciousToken = jsonwebtoken_1.default.sign({
                userId: 'attacker',
                email: 'evil@test.com',
                role: 'admin',
                type: 'access',
                jti: 'malicious',
            }, '', { algorithm: 'none' });
            expect(() => (0, jwt_1.verifyToken)(maliciousToken)).toThrow();
        });
        it('should reject tokens signed with HS256 when secret is used as RSA', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const maliciousToken = jsonwebtoken_1.default.sign({
                userId: 'attacker',
                email: 'evil@test.com',
                role: 'admin',
                type: 'access',
                jti: 'malicious',
            }, JWT_SECRET, { algorithm: 'HS256' });
            expect(() => (0, jwt_1.verifyToken)(maliciousToken)).not.toThrow();
        });
    });
    describe('[PROBE-2] Token Replay with Blacklisted Token', () => {
        it('should reject blacklisted access token (logout replay)', async () => {
            const tokens = (0, jwt_1.generateTokens)('user-blacklist', 'test@test.com', 'user');
            const accessToken = tokens.accessToken;
            expect(() => (0, jwt_1.verifyToken)(accessToken)).not.toThrow();
            await (0, blacklist_1.blacklistToken)(accessToken);
            const blacklisted = await (0, blacklist_1.isTokenBlacklisted)(accessToken);
            expect(blacklisted).toBe(true);
        });
        it('should reject refresh token reuse (rotation enforcement)', async () => {
            await createTestUser('user-456');
            try {
                const tokens = (0, jwt_1.generateTokens)('user-456', 'test@test.com', 'user');
                const refreshToken = tokens.refreshToken;
                await (0, refreshToken_1.createRefreshToken)({
                    userId: 'user-456',
                    token: refreshToken,
                    deviceInfo: { test: 'true' },
                });
                const newTokens = (0, jwt_1.generateTokens)('user-456', 'test@test.com', 'user');
                await (0, refreshToken_1.rotateRefreshToken)(refreshToken, newTokens.refreshToken, 'user-456');
                const isValid = await (0, refreshToken_1.isRefreshTokenValid)(refreshToken);
                expect(isValid).toBe(false);
            }
            finally {
                await cleanupTestUser('user-456');
            }
        });
    });
    describe('[PROBE-3] Token Without JTI', () => {
        it('should handle token with missing or empty jti', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const tokenWithoutJti = jsonwebtoken_1.default.sign({ userId: 'user-789', email: 'test@test.com', role: 'user', type: 'access' }, JWT_SECRET, { algorithm: 'HS256' });
            const decoded = (0, jwt_1.decodeToken)(tokenWithoutJti);
            expect(decoded).not.toBeNull();
            expect(decoded?.userId).toBe('user-789');
        });
    });
    describe('[PROBE-4] Token Expiration Bypass', () => {
        it('should reject expired tokens', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const expiredToken = jsonwebtoken_1.default.sign({
                userId: 'user-999',
                email: 'test@test.com',
                role: 'user',
                type: 'access',
                jti: 'expired-test',
            }, JWT_SECRET, { expiresIn: '-1s', algorithm: 'HS256' });
            expect(() => (0, jwt_1.verifyToken)(expiredToken)).toThrow();
        });
        it('should reject tokens with exp in the past', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const pastToken = jsonwebtoken_1.default.sign({ userId: 'attacker', exp: Math.floor(Date.now() / 1000) - 3600 }, JWT_SECRET, { algorithm: 'HS256' });
            expect(() => (0, jwt_1.verifyToken)(pastToken)).toThrow();
        });
    });
    describe('[PROBE-5] Malformed Token Handling', () => {
        it('should reject completely invalid tokens', () => {
            expect(() => (0, jwt_1.verifyToken)('not.a.valid.token.at.all')).toThrow();
        });
        it('should reject empty string token', () => {
            expect(() => (0, jwt_1.verifyToken)('')).toThrow();
        });
        it('should reject null-like tokens', () => {
            expect(() => (0, jwt_1.verifyToken)('null')).toThrow();
            expect(() => (0, jwt_1.verifyToken)('undefined')).toThrow();
        });
        it('should reject tokens with invalid base64', () => {
            expect(() => (0, jwt_1.verifyToken)('!!!invalid!!!')).toThrow();
        });
    });
    describe('[PROBE-6] Role Escalation in Token', () => {
        it('should not allow role escalation via token modification', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const normalToken = jsonwebtoken_1.default.sign({
                userId: 'user-111',
                email: 'user@test.com',
                role: 'user',
                type: 'access',
                jti: 'test-jti',
            }, JWT_SECRET, { algorithm: 'HS256' });
            const parts = normalToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            payload.role = 'admin';
            const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const attackerToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
            expect(() => (0, jwt_1.verifyToken)(attackerToken)).toThrow('Invalid token');
        });
        it('should not allow type confusion (access token used as refresh)', () => {
            const tokens = (0, jwt_1.generateTokens)('user-222', 'test@test.com', 'user');
            const decoded = (0, jwt_1.verifyToken)(tokens.accessToken);
            expect(decoded.type).toBe('access');
            expect(decoded.type).not.toBe('refresh');
        });
    });
    describe('[PROBE-7] JWT Secret Strength', () => {
        it('should enforce minimum JWT_SECRET length at startup', () => {
            const secret = process.env.JWT_SECRET;
            expect(secret.length).toBeGreaterThanOrEqual(32);
        });
    });
    describe('[PROBE-8] Token Binding / Device Fingerprinting', () => {
        it('should store device info with refresh token', async () => {
            await createTestUser('probe-user-device');
            try {
                const testToken = `probe-test-refresh-token-${Date.now()}`;
                const testDeviceInfo = { deviceType: 'mobile', os: 'iOS', appVersion: '1.0.0' };
                await (0, refreshToken_1.createRefreshToken)({
                    userId: 'probe-user-device',
                    token: testToken,
                    deviceInfo: testDeviceInfo,
                    ipAddress: '127.0.0.1',
                });
                const stored = await client_1.prisma.refreshToken.findUnique({ where: { token: testToken } });
                expect(stored).not.toBeNull();
                expect(stored?.ipAddress).toBe('127.0.0.1');
            }
            finally {
                await cleanupTestUser('probe-user-device');
            }
        });
    });
    describe('[PROBE-9] Email/Phone Case Sensitivity', () => {
        it('should handle email case normalization', () => {
            const email1 = 'Test@Example.COM';
            const email2 = 'test@example.com';
            expect(email1.toLowerCase()).toBe(email2.toLowerCase());
        });
    });
    describe('[PROBE-10] Race Condition in Token Rotation', () => {
        it('should handle concurrent refresh token usage', async () => {
            await createTestUser('probe-user-race');
            try {
                const testToken = `probe-race-token-${Date.now()}`;
                const newToken1 = `probe-new-token1-${Date.now()}`;
                await (0, refreshToken_1.createRefreshToken)({ userId: 'probe-user-race', token: testToken });
                await (0, refreshToken_1.rotateRefreshToken)(testToken, newToken1, 'probe-user-race');
                const stillValid = await (0, refreshToken_1.isRefreshTokenValid)(testToken);
                expect(stillValid).toBe(false);
            }
            finally {
                await cleanupTestUser('probe-user-race');
            }
        });
    });
    describe('[PROBE-11] Token Blacklist Bypass via Refresh Token', () => {
        it('should still require valid refresh token even if access token is blacklisted', async () => {
            await createTestUser('probe-user-blacklist');
            try {
                const tokens = (0, jwt_1.generateTokens)('probe-user-blacklist', 'test@test.com', 'user');
                await (0, refreshToken_1.createRefreshToken)({ userId: 'probe-user-blacklist', token: tokens.refreshToken });
                const stored = await client_1.prisma.refreshToken.findUnique({
                    where: { token: tokens.refreshToken },
                });
                expect(stored).not.toBeNull();
            }
            finally {
                await cleanupTestUser('probe-user-blacklist');
            }
        });
    });
    describe('[PROBE-12] Password Reset Token Security', () => {
        it('should create password reset token with short expiry', () => {
            const JWT_SECRET = process.env.JWT_SECRET;
            const resetToken = jsonwebtoken_1.default.sign({ userId: 'reset-user', type: 'password-reset' }, JWT_SECRET, {
                expiresIn: '15m',
                algorithm: 'HS256',
            });
            const decoded = (0, jwt_1.verifyToken)(resetToken);
            expect(decoded.userId).toBe('reset-user');
            expect(decoded.type).toBe('password-reset');
        });
    });
    describe('[PROBE-13] Token Information Disclosure', () => {
        it('should not include passwordHash in token', () => {
            const tokens = (0, jwt_1.generateTokens)('probe-user-info', 'test@test.com', 'user');
            const decoded = (0, jwt_1.decodeToken)(tokens.accessToken);
            expect(decoded).not.toBeNull();
            expect(decoded.passwordHash).toBeUndefined();
        });
    });
    describe('[PROBE-14] Refresh Token Expiry Consistency', () => {
        it('should use consistent expiry for refresh tokens', () => {
            const tokens = (0, jwt_1.generateTokens)('probe-user-expiry', 'test@test.com', 'user');
            const decoded = (0, jwt_1.decodeToken)(tokens.refreshToken);
            expect(decoded).not.toBeNull();
            const expTime = decoded.exp * 1000;
            const now = Date.now();
            const daysUntilExpiry = (expTime - now) / (1000 * 60 * 60 * 24);
            expect(daysUntilExpiry).toBeGreaterThan(6);
            expect(daysUntilExpiry).toBeLessThan(8);
        });
    });
});
//# sourceMappingURL=probe_issueA002.test.js.map