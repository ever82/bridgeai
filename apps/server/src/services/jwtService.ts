/**
 * JWT Service
 *
 * Provides JWT token operations for Socket.io authentication.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
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
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: TokenPayload, expiresIn: string = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Extract bearer token from auth header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiresIn(token: string): number {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded || !decoded.exp) return 0;
    return decoded.exp * 1000 - Date.now();
  } catch {
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
