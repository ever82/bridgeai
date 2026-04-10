/**
 * Refresh Token Service
 * Manages refresh tokens in the database
 */

import { prisma } from '../../db/client';
import { getTokenExpirationDate } from './jwt';

// Refresh token configuration
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export interface DeviceInfo {
  deviceType?: string;
  os?: string;
  appVersion?: string;
  [key: string]: string | undefined;
}

export interface CreateRefreshTokenInput {
  userId: string;
  token: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
}

/**
 * Create a new refresh token in the database
 */
export async function createRefreshToken(
  input: CreateRefreshTokenInput
): Promise<void> {
  const expiresAt = getTokenExpirationDate(REFRESH_TOKEN_EXPIRES_IN);

  await prisma.refreshToken.create({
    data: {
      token: input.token,
      userId: input.userId,
      deviceInfo: input.deviceInfo || {},
      ipAddress: input.ipAddress,
      expiresAt,
    },
  });
}

/**
 * Find a refresh token by its token string
 */
export async function findRefreshToken(token: string) {
  return await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(
  token: string,
  revokedBy?: string
): Promise<void> {
  await prisma.refreshToken.update({
    where: { token },
    data: {
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(
  userId: string,
  revokedBy?: string
): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedBy,
    },
  });

  return result.count;
}

/**
 * Check if a refresh token is valid
 */
export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!refreshToken) {
    return false;
  }

  // Check if token is revoked
  if (refreshToken.revokedAt) {
    return false;
  }

  // Check if token is expired
  if (new Date() > refreshToken.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Clean up expired refresh tokens (for scheduled cleanup)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });

  return result.count;
}

/**
 * Get user's active refresh tokens
 */
export async function getUserActiveTokens(userId: string) {
  return await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Rotate refresh token (revoke old and create new)
 */
export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string,
  deviceInfo?: DeviceInfo,
  ipAddress?: string
): Promise<void> {
  // Revoke old token
  await revokeRefreshToken(oldToken, userId);

  // Create new token
  await createRefreshToken({
    userId,
    token: newToken,
    deviceInfo,
    ipAddress,
  });
}
