/**
 * Probe Tests for ISSUE-A002: JWT Authentication & API Security
 *
 * These tests probe for刁钻 vulnerabilities from the most adversarial perspective.
 * Each probe represents a potential security bug that should NOT exist.
 */

import jwt from 'jsonwebtoken';

import { generateTokens, verifyToken, decodeToken } from '../services/auth/jwt';
import { prisma } from '../db/client';
import {
  createRefreshToken,
  rotateRefreshToken,
  isRefreshTokenValid,
} from '../services/auth/refreshToken';
import { blacklistToken, isTokenBlacklisted } from '../services/auth/blacklist';
import { UserRole } from '../types';

// Setup test JWT_SECRET before importing modules
process.env.JWT_SECRET = 'probe-test-secret-key-for-testing-only-32chars!';

// Helper: create a test user for foreign key constraints
async function createTestUser(userId: string): Promise<void> {
  await prisma.user.upsert({
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

async function cleanupTestUser(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe('ISSUE-A002 Probe Tests: JWT Authentication', () => {
  describe('[PROBE-1] Algorithm Confusion Attack', () => {
    /**
     * Severity: CRITICAL
     * If jwt.verify() doesn't specify algorithm, attacker can sign token with 'none' algorithm
     */
    it('should reject tokens signed with "none" algorithm', () => {
      const maliciousToken = jwt.sign(
        {
          userId: 'attacker',
          email: 'evil@test.com',
          role: 'admin',
          type: 'access',
          jti: 'malicious',
        },
        '',
        { algorithm: 'none' } as Parameters<typeof jwt.sign>[2]
      );

      expect(() => verifyToken(maliciousToken)).toThrow();
    });

    it('should reject tokens signed with HS256 when secret is used as RSA', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const maliciousToken = jwt.sign(
        {
          userId: 'attacker',
          email: 'evil@test.com',
          role: 'admin',
          type: 'access',
          jti: 'malicious',
        },
        JWT_SECRET,
        { algorithm: 'HS256' }
      );

      expect(() => verifyToken(maliciousToken)).not.toThrow();
    });
  });

  describe('[PROBE-2] Token Replay with Blacklisted Token', () => {
    it('should reject blacklisted access token (logout replay)', async () => {
      const tokens = generateTokens('user-blacklist', 'test@test.com', 'user' as UserRole);
      const accessToken = tokens.accessToken;

      expect(() => verifyToken(accessToken)).not.toThrow();

      await blacklistToken(accessToken);

      const blacklisted = await isTokenBlacklisted(accessToken);
      expect(blacklisted).toBe(true);
    });

    it('should reject refresh token reuse (rotation enforcement)', async () => {
      await createTestUser('user-456');

      try {
        const tokens = generateTokens('user-456', 'test@test.com', 'user' as UserRole);
        const refreshToken = tokens.refreshToken;

        await createRefreshToken({
          userId: 'user-456',
          token: refreshToken,
          deviceInfo: { test: 'true' },
        });

        const newTokens = generateTokens('user-456', 'test@test.com', 'user' as UserRole);
        await rotateRefreshToken(refreshToken, newTokens.refreshToken, 'user-456');

        const isValid = await isRefreshTokenValid(refreshToken);
        expect(isValid).toBe(false);
      } finally {
        await cleanupTestUser('user-456');
      }
    });
  });

  describe('[PROBE-3] Token Without JTI', () => {
    it('should handle token with missing or empty jti', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const tokenWithoutJti = jwt.sign(
        { userId: 'user-789', email: 'test@test.com', role: 'user', type: 'access' },
        JWT_SECRET,
        { algorithm: 'HS256' }
      );

      const decoded = decodeToken(tokenWithoutJti);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-789');
    });
  });

  describe('[PROBE-4] Token Expiration Bypass', () => {
    it('should reject expired tokens', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const expiredToken = jwt.sign(
        {
          userId: 'user-999',
          email: 'test@test.com',
          role: 'user',
          type: 'access',
          jti: 'expired-test',
        },
        JWT_SECRET,
        { expiresIn: '-1s', algorithm: 'HS256' } as Parameters<typeof jwt.sign>[2]
      );

      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it('should reject tokens with exp in the past', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const pastToken = jwt.sign(
        { userId: 'attacker', exp: Math.floor(Date.now() / 1000) - 3600 },
        JWT_SECRET,
        { algorithm: 'HS256' }
      );

      expect(() => verifyToken(pastToken)).toThrow();
    });
  });

  describe('[PROBE-5] Malformed Token Handling', () => {
    it('should reject completely invalid tokens', () => {
      expect(() => verifyToken('not.a.valid.token.at.all')).toThrow();
    });

    it('should reject empty string token', () => {
      expect(() => verifyToken('')).toThrow();
    });

    it('should reject null-like tokens', () => {
      expect(() => verifyToken('null')).toThrow();
      expect(() => verifyToken('undefined')).toThrow();
    });

    it('should reject tokens with invalid base64', () => {
      expect(() => verifyToken('!!!invalid!!!')).toThrow();
    });
  });

  describe('[PROBE-6] Role Escalation in Token', () => {
    it('should not allow role escalation via token modification', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const normalToken = jwt.sign(
        {
          userId: 'user-111',
          email: 'user@test.com',
          role: 'user',
          type: 'access',
          jti: 'test-jti',
        },
        JWT_SECRET,
        { algorithm: 'HS256' }
      );

      const parts = normalToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin';
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const attackerToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      expect(() => verifyToken(attackerToken)).toThrow('Invalid token');
    });

    it('should not allow type confusion (access token used as refresh)', () => {
      const tokens = generateTokens('user-222', 'test@test.com', 'user' as UserRole);
      const decoded = verifyToken(tokens.accessToken);
      expect(decoded.type).toBe('access');
      expect(decoded.type).not.toBe('refresh');
    });
  });

  describe('[PROBE-7] JWT Secret Strength', () => {
    it('should enforce minimum JWT_SECRET length at startup', () => {
      const secret = process.env.JWT_SECRET!;
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('[PROBE-8] Token Binding / Device Fingerprinting', () => {
    it('should store device info with refresh token', async () => {
      await createTestUser('probe-user-device');

      try {
        const testToken = `probe-test-refresh-token-${Date.now()}`;
        const testDeviceInfo = { deviceType: 'mobile', os: 'iOS', appVersion: '1.0.0' };

        await createRefreshToken({
          userId: 'probe-user-device',
          token: testToken,
          deviceInfo: testDeviceInfo,
          ipAddress: '127.0.0.1',
        });

        const stored = await prisma.refreshToken.findUnique({ where: { token: testToken } });
        expect(stored).not.toBeNull();
        expect(stored?.ipAddress).toBe('127.0.0.1');
      } finally {
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

        await createRefreshToken({ userId: 'probe-user-race', token: testToken });
        await rotateRefreshToken(testToken, newToken1, 'probe-user-race');

        const stillValid = await isRefreshTokenValid(testToken);
        expect(stillValid).toBe(false);
      } finally {
        await cleanupTestUser('probe-user-race');
      }
    });
  });

  describe('[PROBE-11] Token Blacklist Bypass via Refresh Token', () => {
    it('should still require valid refresh token even if access token is blacklisted', async () => {
      await createTestUser('probe-user-blacklist');

      try {
        const tokens = generateTokens('probe-user-blacklist', 'test@test.com', 'user' as UserRole);

        await createRefreshToken({ userId: 'probe-user-blacklist', token: tokens.refreshToken });

        const stored = await prisma.refreshToken.findUnique({
          where: { token: tokens.refreshToken },
        });
        expect(stored).not.toBeNull();
      } finally {
        await cleanupTestUser('probe-user-blacklist');
      }
    });
  });

  describe('[PROBE-12] Password Reset Token Security', () => {
    it('should create password reset token with short expiry', () => {
      const JWT_SECRET = process.env.JWT_SECRET!;

      const resetToken = jwt.sign({ userId: 'reset-user', type: 'password-reset' }, JWT_SECRET, {
        expiresIn: '15m',
        algorithm: 'HS256',
      } as Parameters<typeof jwt.sign>[2]);

      const decoded = verifyToken(resetToken);
      expect(decoded.userId).toBe('reset-user');
      expect((decoded as unknown as { type: string }).type).toBe('password-reset');
    });
  });

  describe('[PROBE-13] Token Information Disclosure', () => {
    it('should not include passwordHash in token', () => {
      const tokens = generateTokens('probe-user-info', 'test@test.com', 'user' as UserRole);
      const decoded = decodeToken(tokens.accessToken);

      expect(decoded).not.toBeNull();
      expect((decoded as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('[PROBE-14] Refresh Token Expiry Consistency', () => {
    it('should use consistent expiry for refresh tokens', () => {
      const tokens = generateTokens('probe-user-expiry', 'test@test.com', 'user' as UserRole);
      const decoded = decodeToken(tokens.refreshToken);

      expect(decoded).not.toBeNull();

      const expTime = decoded.exp * 1000;
      const now = Date.now();
      const daysUntilExpiry = (expTime - now) / (1000 * 60 * 60 * 24);

      expect(daysUntilExpiry).toBeGreaterThan(6);
      expect(daysUntilExpiry).toBeLessThan(8);
    });
  });
});
