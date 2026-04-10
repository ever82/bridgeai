/**
 * Token Blacklist Service
 * Manages blacklisted tokens for logout and token revocation
 * Uses in-memory Map (replace with Redis for production)
 */

import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

// In-memory blacklist storage
// Structure: token -> { blacklistedAt: Date, expiresAt: Date }
const blacklist = new Map<string, { blacklistedAt: Date; expiresAt: Date }>();

// Cleanup interval (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Add a token to the blacklist
 * @param token JWT token to blacklist
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    // Decode token to get expiration
    const decoded = jwt.decode(token) as { exp?: number } | null;

    if (!decoded?.exp) {
      logger.warn('Cannot blacklist token: no expiration found');
      return;
    }

    const expiresAt = new Date(decoded.exp * 1000);

    // Don't blacklist already expired tokens
    if (expiresAt < new Date()) {
      return;
    }

    blacklist.set(token, {
      blacklistedAt: new Date(),
      expiresAt,
    });

    logger.debug('Token blacklisted');
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    throw error;
  }
}

/**
 * Check if a token is blacklisted
 * @param token JWT token to check
 * @returns true if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const entry = blacklist.get(token);

  if (!entry) {
    return false;
  }

  // If token has expired, remove from blacklist
  if (new Date() > entry.expiresAt) {
    blacklist.delete(token);
    return false;
  }

  return true;
}

/**
 * Blacklist multiple tokens
 * @param tokens Array of JWT tokens to blacklist
 */
export async function blacklistTokens(tokens: string[]): Promise<void> {
  for (const token of tokens) {
    await blacklistToken(token);
  }
}

/**
 * Clean up expired tokens from blacklist
 * Should be called periodically
 */
export function cleanupBlacklist(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [token, data] of blacklist.entries()) {
    if (now > data.expiresAt) {
      blacklist.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired tokens from blacklist`);
  }

  return cleaned;
}

/**
 * Get blacklist statistics
 */
export function getBlacklistStats(): {
  totalTokens: number;
  validTokens: number;
  expiredTokens: number;
} {
  const now = new Date();
  let expiredCount = 0;

  for (const [, data] of blacklist.entries()) {
    if (now > data.expiresAt) {
      expiredCount++;
    }
  }

  return {
    totalTokens: blacklist.size,
    validTokens: blacklist.size - expiredCount,
    expiredTokens: expiredCount,
  };
}

// Start periodic cleanup
setInterval(() => {
  cleanupBlacklist();
}, CLEANUP_INTERVAL_MS);

// Initial cleanup
cleanupBlacklist();
