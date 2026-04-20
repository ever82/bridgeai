/**
 * JWT Service
 *
 * Provides JWT token verification for Socket.io authentication.
 */

import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  type?: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Service singleton
 */
class JwtService {
  private secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-secret-key';
  }

  /**
   * Verify a JWT token and return the decoded payload
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Decode a JWT token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export const jwtService = new JwtService();
export default jwtService;
