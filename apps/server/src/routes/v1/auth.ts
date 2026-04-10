import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/client';
import { generateTokens, verifyToken } from '../../services/auth/jwt';
import { createRefreshToken, findRefreshToken, revokeRefreshToken, isRefreshTokenValid, rotateRefreshToken } from '../../services/auth/refreshToken';
import { blacklistToken } from '../../services/auth/blacklist';
import { authenticate } from '../../middleware/auth';
import { ApiResponse } from '../../utils/response';
import { UnauthorizedError, ValidationError } from '../../errors/AppError';
import { UserRole } from '../../types';

const router = Router();

// POST /api/v1/auth/login - Login with email and password
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = generateTokens(user.id, user.email, user.role as UserRole);

    await createRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      deviceInfo: req.body.deviceInfo,
      ipAddress: req.ip,
    });

    res.json(ApiResponse.success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    }));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const storedToken = await findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const isValid = await isRefreshTokenValid(refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token has been revoked or expired');
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      await revokeRefreshToken(refreshToken);
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const tokens = generateTokens(decoded.userId, decoded.email, decoded.role);

    await rotateRefreshToken(
      refreshToken,
      tokens.refreshToken,
      decoded.userId,
      req.body.deviceInfo,
      req.ip
    );

    res.json(ApiResponse.success({
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    }));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout - Logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.token) {
      await blacklistToken(req.token);
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken, req.user?.userId);
    }

    res.json(ApiResponse.success({ message: 'Logged out successfully' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout-all - Logout from all devices
router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.token) {
      await blacklistToken(req.token);
    }

    const { revokeAllUserRefreshTokens } = await import('../../services/auth/refreshToken');
    const count = await revokeAllUserRefreshTokens(req.user!.userId, req.user!.userId);

    res.json(ApiResponse.success({
      message: 'Logged out from all devices',
      revokedTokens: count,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me - Get current user info
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json(ApiResponse.success({ user }));
  } catch (error) {
    next(error);
  }
});

export default router;
