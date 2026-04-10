/**
 * User Routes
 * 用户路由
 *
 * 用户资料管理 API
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import * as userService from '../services/userService';

const router = Router();

// 更新操作限流
const updateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次
  message: { error: '操作过于频繁，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 删除账号限流
const deleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次
  message: { error: '删除操作过于频繁，请稍后重试' },
});

/**
 * GET /api/v1/users/me
 * 获取当前用户信息
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证',
        },
      });
    }

    const user = await userService.getUserProfile(userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user profile failed', error as Error);

    if ((error as Error).message === '用户不存在') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取用户信息失败',
      },
    });
  }
});

/**
 * PUT /api/v1/users/me
 * 更新当前用户信息
 */
router.put('/me', authenticate, updateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证',
        },
      });
    }

    const { name, phone, email } = req.body;

    // 验证输入
    if (name !== undefined && (typeof name !== 'string' || name.length > 50)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NAME',
          message: '姓名格式无效（最多50个字符）',
        },
      });
    }

    if (phone !== undefined) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: '手机号格式无效',
          },
        });
      }
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: '邮箱格式无效',
          },
        });
      }
    }

    const updatedUser = await userService.updateUserProfile(userId, {
      name,
      phone,
      email,
    });

    res.json({
      success: true,
      data: updatedUser,
      message: '资料更新成功',
    });
  } catch (error) {
    logger.error('Update user profile failed', error as Error);

    const errorMessage = (error as Error).message;

    if (errorMessage === '用户不存在') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    if (errorMessage === '邮箱已被使用') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: '邮箱已被使用',
        },
      });
    }

    if (errorMessage === '手机号已被使用') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PHONE_EXISTS',
          message: '手机号已被使用',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新用户信息失败',
      },
    });
  }
});

/**
 * DELETE /api/v1/users/me
 * 删除当前用户账号（软删除）
 */
router.delete('/me', authenticate, deleteLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证',
        },
      });
    }

    await userService.deleteUserAccount(userId);

    res.json({
      success: true,
      message: '账号已删除',
    });
  } catch (error) {
    logger.error('Delete user account failed', error as Error);

    if ((error as Error).message === '用户不存在') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除账号失败',
      },
    });
  }
});

export default router;
