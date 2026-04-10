/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extended Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        phone?: string;
        role: string;
      };
      token?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email?: string;
      phone?: string;
      role: string;
      type: string;
    };

    // Check token type
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type',
        },
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email?: string;
      phone?: string;
      role: string;
      type: string;
    };

    if (decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role,
      };
      req.token = token;
    }

    next();
  } catch {
    // Ignore errors in optional auth
    next();
  }
}

/**
 * Role-based authorization middleware factory
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require admin role middleware
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRoles('admin')(req, res, next);
}
