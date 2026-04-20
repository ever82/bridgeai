import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

import { prisma } from '../../db/client';
import { verifyToken } from '../../services/auth/jwt';
import { createRefreshToken, findRefreshToken, revokeRefreshToken, isRefreshTokenValid, rotateRefreshToken } from '../../services/auth/refreshToken';
import { blacklistToken } from '../../services/auth/blacklist';
import { authenticate } from '../../middleware/auth';
import { ApiResponse } from '../../utils/response';
import { UnauthorizedError, ValidationError, ConflictError } from '../../errors/AppError';
import { UserRole } from '../../types';
import { registerUser, loginUser, requestPasswordReset, resetPassword } from '../../services/authService';

const router = Router();

// POST /api/v1/auth/login - Login with email and password
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, verificationCode } = req.body;

    if (!email && !phone) {
      throw new ValidationError('Email or phone is required');
    }

    if (!password && !verificationCode) {
      throw new ValidationError('Password or verification code is required');
    }

    const result = await loginUser({ email, phone, password, verificationCode });

    await createRefreshToken({
      userId: result.user.id,
      token: result.refreshToken,
      deviceInfo: req.body.deviceInfo,
      ipAddress: req.ip,
    });

    res.json(ApiResponse.success({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes('不存在')) {
      next(new UnauthorizedError('Invalid credentials'));
    } else if (error instanceof Error && error.message.includes('锁定')) {
      next(new UnauthorizedError(error.message));
    } else {
      next(error);
    }
  }
});

// POST /api/v1/auth/register - Register a new user
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, name, verificationCode } = req.body;

    if (!email && !phone) {
      throw new ValidationError('Email or phone is required');
    }

    if (!password) {
      throw new ValidationError('Password is required');
    }

    if (!name) {
      throw new ValidationError('Name is required');
    }

    const result = await registerUser({ email, phone, password, name, verificationCode });

    res.status(201).json(ApiResponse.success(result.user, 'User registered successfully'));
  } catch (error) {
    if (error instanceof Error && error.message === '用户已存在') {
      next(new ConflictError('User already exists'));
    } else {
      next(error);
    }
  }
});

// POST /api/v1/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      throw new ValidationError('Email or phone is required');
    }

    await requestPasswordReset(email, phone);

    // Always return success to prevent user enumeration
    res.json(ApiResponse.success({ message: 'Password reset instructions sent' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/reset-password - Reset password with token
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken) {
      throw new ValidationError('Reset token is required');
    }

    if (!newPassword) {
      throw new ValidationError('New password is required');
    }

    await resetPassword(resetToken, newPassword);

    res.json(ApiResponse.success({ message: 'Password reset successfully' }));
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
