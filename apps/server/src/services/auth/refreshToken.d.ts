/**
 * Refresh Token Service
 * Manages refresh tokens in the database
 */
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
export declare function createRefreshToken(input: CreateRefreshTokenInput): Promise<void>;
/**
 * Find a refresh token by its token string
 */
export declare function findRefreshToken(token: string): Promise<{
    id: string;
    token: string;
    userId: string;
    createdAt: Date;
    deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
    expiresAt: Date;
    ipAddress: string | null;
    revokedAt: Date | null;
    revokedBy: string | null;
} | null>;
/**
 * Revoke a refresh token
 */
export declare function revokeRefreshToken(token: string, revokedBy?: string): Promise<void>;
/**
 * Revoke all refresh tokens for a user
 */
export declare function revokeAllUserRefreshTokens(userId: string, revokedBy?: string): Promise<number>;
/**
 * Check if a refresh token is valid
 */
export declare function isRefreshTokenValid(token: string): Promise<boolean>;
/**
 * Clean up expired refresh tokens (for scheduled cleanup)
 */
export declare function cleanupExpiredTokens(): Promise<number>;
/**
 * Get user's active refresh tokens
 */
export declare function getUserActiveTokens(userId: string): Promise<{
    id: string;
    token: string;
    userId: string;
    createdAt: Date;
    deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
    expiresAt: Date;
    ipAddress: string | null;
    revokedAt: Date | null;
    revokedBy: string | null;
}[]>;
/**
 * Rotate refresh token (revoke old and create new)
 */
export declare function rotateRefreshToken(oldToken: string, newToken: string, userId: string, deviceInfo?: DeviceInfo, ipAddress?: string): Promise<void>;
//# sourceMappingURL=refreshToken.d.ts.map