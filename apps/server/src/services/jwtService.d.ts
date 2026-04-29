/**
 * Token payload interface
 */
export interface TokenPayload {
    userId: string;
    email: string;
    roles?: string[];
    permissions?: string[];
}
/**
 * Decoded token interface
 */
export interface DecodedToken extends TokenPayload {
    iat: number;
    exp: number;
    jti?: string;
}
/**
 * Verify JWT token
 */
export declare function verifyToken(token: string): Promise<DecodedToken | null>;
/**
 * Decode token without verification (for debugging)
 */
export declare function decodeToken(token: string): DecodedToken | null;
/**
 * Generate JWT token
 */
export declare function generateToken(payload: TokenPayload, expiresIn?: string): string;
/**
 * Extract bearer token from auth header
 */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
/**
 * Check if token is expired
 */
export declare function isTokenExpired(token: string): boolean;
/**
 * Get token expiration time in seconds
 */
export declare function getTokenExpiresIn(token: string): number;
export declare const jwtService: {
    verifyToken: typeof verifyToken;
    decodeToken: typeof decodeToken;
    generateToken: typeof generateToken;
    extractBearerToken: typeof extractBearerToken;
    isTokenExpired: typeof isTokenExpired;
    getTokenExpiresIn: typeof getTokenExpiresIn;
};
export default jwtService;
//# sourceMappingURL=jwtService.d.ts.map