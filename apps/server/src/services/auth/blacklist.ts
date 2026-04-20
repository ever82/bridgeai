/**
 * Token Blacklist Service
 * Manages blacklisted tokens using Redis
 */

import { redis } from '../redis';

import { DecodedToken, decodeToken } from './jwt';

// Key prefix for blacklisted tokens
const BLACKLIST_PREFIX = 'token:blacklist:';
const BLACKLIST_JTI_PREFIX = 'token:jti:';

/**
 * Add a token to the blacklist
 * The token will be stored with its expiration time from the token itself
 */
export async function blacklistToken(token: string): Promise<void> {
  const decoded = decodeToken(token);
  if (!decoded) {
    throw new Error('Invalid token');
  }

  // Calculate TTL based on token expiration
  const now = Date.now();
  const exp = decoded.exp * 1000; // Convert to milliseconds
  const ttl = Math.max(0, Math.ceil((exp - now) / 1000)); // Convert to seconds

  if (ttl <= 0) {
    // Token already expired, no need to blacklist
    return;
  }

  // Store token jti in blacklist with TTL
  const key = BLACKLIST_PREFIX + decoded.jti;
  await redis.setex(key, ttl, '1');

  // Also store jti mapping for quick lookup
  await redis.setex(BLACKLIST_JTI_PREFIX + decoded.jti, ttl, '1');
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const decoded = decodeToken(token);
  if (!decoded) {
    return true; // Invalid tokens are considered blacklisted
  }

  const key = BLACKLIST_PREFIX + decoded.jti;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Check if a token JTI is blacklisted
 */
export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const key = BLACKLIST_PREFIX + jti;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Blacklist multiple tokens (for bulk logout/revoke)
 */
export async function blacklistTokens(tokens: string[]): Promise<void> {
  const pipeline = redis.pipeline();

  for (const token of tokens) {
    const decoded = decodeToken(token);
    if (decoded) {
      const now = Date.now();
      const exp = decoded.exp * 1000;
      const ttl = Math.max(0, Math.ceil((exp - now) / 1000));

      if (ttl > 0) {
        const key = BLACKLIST_PREFIX + decoded.jti;
        pipeline.setex(key, ttl, '1');
      }
    }
  }

  await pipeline.exec();
}

/**
 * Get blacklist stats
 */
export async function getBlacklistStats(): Promise<{
  totalKeys: number;
  pattern: string;
}> {
  const keys = await redis.keys(BLACKLIST_PREFIX + '*');
  return {
    totalKeys: keys.length,
    pattern: BLACKLIST_PREFIX + '*',
  };
}

/**
 * Clean up expired blacklist entries (Redis handles this automatically with TTL)
 * This is a manual cleanup if needed
 */
export async function cleanupBlacklist(): Promise<number> {
  const keys = await redis.keys(BLACKLIST_PREFIX + '*');
  let cleaned = 0;

  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl < 0) {
      await redis.del(key);
      cleaned++;
    }
  }

  return cleaned;
}
