/**
 * JWT Token Service
 * Handles generation and verification of JWT tokens
 */
import jwt from 'jsonwebtoken';
// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
/**
 * Generate JWT tokens for a user
 */
export function generateTokens(userId, email, role) {
    const jti = generateJti();
    // Generate access token
    const accessToken = jwt.sign({
        userId,
        email,
        role,
        type: 'access',
        jti,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });
    // Generate refresh token
    const refreshToken = jwt.sign({
        userId,
        email,
        role,
        type: 'refresh',
        jti: jti + '_refresh',
    }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN, algorithm: 'HS256' });
    // Calculate expiration time in seconds
    const expiresIn = parseExpirationToSeconds(JWT_EXPIRES_IN);
    return {
        accessToken,
        refreshToken,
        expiresIn,
    };
}
/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
}
/**
 * Decode a token without verification (for debugging/logging)
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
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
/**
 * Generate a unique JWT ID (jti)
 */
function generateJti() {
    return Date.now() + '-' + Math.random().toString(36).substring(2, 15);
}
/**
 * Parse expiration string to seconds
 */
function parseExpirationToSeconds(expiresIn) {
    const match = expiresIn.match(/^([0-9]+)([smhd])$/);
    if (!match) {
        return 900; // Default 15 minutes
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };
    return value * (multipliers[unit] || 60);
}
/**
 * Get token expiration date
 */
export function getTokenExpirationDate(expiresIn) {
    const seconds = parseExpirationToSeconds(expiresIn);
    return new Date(Date.now() + seconds * 1000);
}
//# sourceMappingURL=jwt.js.map