/**
 * Token Blacklist Service
 * Manages blacklisted tokens using Redis
 */
/**
 * Add a token to the blacklist
 * The token will be stored with its expiration time from the token itself
 */
export declare function blacklistToken(token: string): Promise<void>;
/**
 * Check if a token is blacklisted
 */
export declare function isTokenBlacklisted(token: string): Promise<boolean>;
/**
 * Check if a token JTI is blacklisted
 */
export declare function isJtiBlacklisted(jti: string): Promise<boolean>;
/**
 * Blacklist multiple tokens (for bulk logout/revoke)
 */
export declare function blacklistTokens(tokens: string[]): Promise<void>;
/**
 * Get blacklist stats
 */
export declare function getBlacklistStats(): Promise<{
    totalKeys: number;
    pattern: string;
}>;
/**
 * Clean up expired blacklist entries (Redis handles this automatically with TTL)
 * This is a manual cleanup if needed
 */
export declare function cleanupBlacklist(): Promise<number>;
//# sourceMappingURL=blacklist.d.ts.map