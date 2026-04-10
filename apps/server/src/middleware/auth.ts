import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractBearerToken } from '../services/auth/jwt';
import { isTokenBlacklisted } from '../services/auth/blacklist';
import { UnauthorizedError } from '../errors/AppError';
import { UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
      token?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        next(new UnauthorizedError('Token has expired', { code: 'TOKEN_EXPIRED' }));
        return;
      }
      if (error.message === 'Invalid token') {
        next(new UnauthorizedError('Invalid token'));
        return;
      }
    }
    next(new UnauthorizedError('Authentication failed'));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new UnauthorizedError('Insufficient permissions'));
      return;
    }
    next();
  };
}
