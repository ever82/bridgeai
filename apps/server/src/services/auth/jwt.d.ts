/**
 * JWT Token Service
 * Handles generation and verification of JWT tokens
 */
import { UserRole } from '../../types';
export declare const JWT_SECRET: string;
export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
    type: 'access' | 'refresh';
}
export interface DecodedToken extends TokenPayload {
    iat: number;
    exp: number;
    jti: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
/**
 * Generate JWT tokens for a user
 */
export declare function generateTokens(userId: string, email: string, role: UserRole): TokenPair;
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): DecodedToken;
/**
 * Decode a token without verification (for debugging/logging)
 */
export declare function decodeToken(token: string): DecodedToken | null;
/**
 * Extract token from Authorization header
 */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
/**
 * Get token expiration date
 */
export declare function getTokenExpirationDate(expiresIn: string): Date;
//# sourceMappingURL=jwt.d.ts.map