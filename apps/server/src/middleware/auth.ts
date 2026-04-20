import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  token?: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    // Store token for blacklisting in logout
    req.token = token;

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, status: true },
    });

    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 'ACCOUNT_INACTIVE', 403);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired', 'TOKEN_EXPIRED', 401));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 'INVALID_TOKEN', 401));
      return;
    }

    next(new AppError('Authentication failed', 'AUTH_FAILED', 401));
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, status: true },
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 'UNAUTHORIZED', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role || 'user')) {
      next(new AppError('Insufficient permissions', 'FORBIDDEN', 403));
      return;
    }

    next();
  };
}

/**
 * Admin authorization middleware
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AppError('Authentication required', 'UNAUTHORIZED', 401));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new AppError('Admin access required', 'FORBIDDEN', 403));
    return;
  }

  next();
}

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
};
