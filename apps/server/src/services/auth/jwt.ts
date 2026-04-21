/**
 * JWT Token Service
 * Handles generation and verification of JWT tokens
 */

import jwt from 'jsonwebtoken';

import { UserRole } from '../../types';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

// Decoded token interface
export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  jti: string;
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT tokens for a user
 */
export function generateTokens(
  userId: string,
  email: string,
  role: UserRole
): TokenPair {
  const jti = generateJti();

  // Generate access token
  const accessToken = jwt.sign(
    {
      userId,
      email,
      role,
      type: 'access',
      jti,
    } as TokenPayload & { jti: string },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as any
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId,
      email,
      role,
      type: 'refresh',
      jti: jti + '_refresh',
    } as TokenPayload & { jti: string },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as any
  );

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
export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
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
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Generate a unique JWT ID (jti)
 */
function generateJti(): string {
  return Date.now() + '-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Parse expiration string to seconds
 */
function parseExpirationToSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^([0-9]+)([smhd])$/);
  if (!match) {
    return 900; // Default 15 minutes
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
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
export function getTokenExpirationDate(expiresIn: string): Date {
  const seconds = parseExpirationToSeconds(expiresIn);
  return new Date(Date.now() + seconds * 1000);
}
