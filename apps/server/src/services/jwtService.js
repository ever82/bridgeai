/**
 * JWT Service
 *
 * Provides JWT token operations for Socket.io authentication.
 */
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
/**
 * Verify JWT token
 */
export async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.warn('[JWT Service] Token expired');
            return null;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            console.warn('[JWT Service] Invalid token');
            return null;
        }
        console.error('[JWT Service] Token verification error:', error);
        return null;
    }
}
/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token) {
    try {
        const decoded = jwt.decode(token);
        return decoded;
    }
    catch {
        return null;
    }
}
/**
 * Generate JWT token
 */
export function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
/**
 * Extract bearer token from auth header
 */
export function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
/**
 * Check if token is expired
 */
export function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp)
            return true;
        return decoded.exp * 1000 < Date.now();
    }
    catch {
        return true;
    }
}
/**
 * Get token expiration time in seconds
 */
export function getTokenExpiresIn(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp)
            return 0;
        return decoded.exp * 1000 - Date.now();
    }
    catch {
        return 0;
    }
}
export const jwtService = {
    verifyToken,
    decodeToken,
    generateToken,
    extractBearerToken,
    isTokenExpired,
    getTokenExpiresIn,
};
export default jwtService;
//# sourceMappingURL=jwtService.js.map