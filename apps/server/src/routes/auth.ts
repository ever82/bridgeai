/**
 * Auth Routes
 * 认证路由
 *
 * 用户注册、登录、密码重置等 API
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { logger } from '../utils/logger';
import { getRequestContext } from '../middleware/requestContext';
import { validate } from '../middleware/validation';
import * as authService from '../services/authService';
import * as oauthService from '../services/oauthService';
import * as blacklistService from '../services/auth/blacklist';
import { authenticate } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  oauthBindSchema,
} from '../schemas/authSchemas';

const router: Router = Router();

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次
  message: { error: '登录尝试次数过多，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册限流
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次
  message: { error: '注册尝试次数过多，请稍后重试' },
});

// 密码重置限流
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次
  message: { error: '密码重置尝试次数过多，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/v1/auth/register
 * 用户注册
 */
router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, phone, password, name, verificationCode } = req.body;

      // 验证输入
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: '姓名不能为空' });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: '密码不能为空' });
      }

      if (!email && !phone) {
        return res.status(400).json({ error: '邮箱或手机号至少需要一个' });
      }

      // 执行注册
      const result = await authService.registerUser({
        email,
        phone,
        password,
        name,
        verificationCode,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Registration failed', error as Error, {
        path: req.path,
      });

      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, phone, password, verificationCode } = req.body;

      // 执行登录
      const result = await authService.loginUser({
        email,
        phone,
        password,
        verificationCode,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Login failed', error as Error, {
        path: req.path,
      });

      res.status(401).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * 刷新访问令牌
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh failed', error as Error);

      res.status(401).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * 用户登出 - 撤销当前token
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Blacklist the current token
    if (req.token) {
      await blacklistService.blacklistToken(req.token);
    }

    const context = getRequestContext();
    if (context?.userId) {
      logger.info('User logged out', { userId: context.userId });
    }

    res.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/auth/logout-all
 * 从所有设备登出
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未认证',
      });
    }

    // Blacklist current token
    if (req.token) {
      await blacklistService.blacklistToken(req.token);
    }

    // TODO: Implement revoke all user tokens from database
    // This would require storing all active tokens in database

    logger.info('User logged out from all devices', { userId });

    res.json({
      success: true,
      message: '已从所有设备登出',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * 申请密码重置
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, phone } = req.body;

      const resetToken = await authService.requestPasswordReset(email, phone);

      // 实际应该发送邮件或短信
      res.json({
        success: true,
        message: '密码重置链接已发送',
        // 开发环境返回令牌（生产环境不应该返回）
        ...(process.env.NODE_ENV === 'development' && { resetToken }),
      });
    } catch (error) {
      logger.error('Password reset request failed', error as Error);

      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/auth/reset-password
 * 重置密码
 */
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  async (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body;

      await authService.resetPassword(resetToken, newPassword);

      res.json({
        success: true,
        message: '密码重置成功',
      });
    } catch (error) {
      logger.error('Password reset failed', error as Error);

      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/auth/change-password
 * 修改密码（需要登录）
 */
router.post('/change-password', validate({ body: changePasswordSchema }), async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const context = getRequestContext();

    if (!context?.userId) {
      return res.status(401).json({ error: '未登录' });
    }

    await authService.changePassword(context.userId, oldPassword, newPassword);

    res.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    logger.error('Password change failed', error as Error);

    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const context = getRequestContext();

    if (!context?.userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await authService.getCurrentUser(context.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get current user failed', error as Error);

    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/auth/oauth/:provider
 * 获取 OAuth 授权 URL
 */
router.get('/oauth/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { state } = req.query;

    if (!['wechat', 'google'].includes(provider)) {
      return res.status(400).json({ error: '不支持的 OAuth 提供商' });
    }

    const authUrl = oauthService.getOAuthAuthorizationUrl(
      provider as 'wechat' | 'google',
      state as string
    );

    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    logger.error('Get OAuth URL failed', error as Error);

    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/auth/oauth/:provider/callback
 * OAuth 回调处理
 */
router.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.status(400).json({
        success: false,
        error: `OAuth 授权失败: ${oauthError}`,
      });
    }

    if (!code) {
      return res.status(400).json({ error: '授权码不能为空' });
    }

    const result = await oauthService.handleOAuthCallback(
      provider as 'wechat' | 'google',
      code as string
    );

    // 如果有 state，重定向回前端
    if (state) {
      const redirectUrl = `${state}?token=${result.accessToken}`;
      return res.redirect(redirectUrl);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('OAuth callback failed', error as Error);

    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/auth/oauth/:provider/bind
 * 绑定 OAuth 账户
 */
router.post(
  '/oauth/:provider/bind',
  validate({ body: oauthBindSchema }),
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { code } = req.body;
      const context = getRequestContext();

      if (!context?.userId) {
        return res.status(401).json({ error: '未登录' });
      }

      await oauthService.bindOAuthAccount(
        context.userId,
        provider as 'wechat' | 'google',
        code
      );

      res.json({
        success: true,
        message: 'OAuth 账户绑定成功',
      });
    } catch (error) {
      logger.error('OAuth bind failed', error as Error);

      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/v1/auth/oauth/:provider
 * 解绑 OAuth 账户
 */
router.delete('/oauth/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const context = getRequestContext();

    if (!context?.userId) {
      return res.status(401).json({ error: '未登录' });
    }

    await oauthService.unbindOAuthAccount(context.userId, provider as 'wechat' | 'google');

    res.json({
      success: true,
      message: 'OAuth 账户解绑成功',
    });
  } catch (error) {
    logger.error('OAuth unbind failed', error as Error);

    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/auth/oauth/connections
 * 获取 OAuth 绑定列表
 */
router.get('/oauth/connections', async (req: Request, res: Response) => {
  try {
    const context = getRequestContext();

    if (!context?.userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const connections = await oauthService.getUserOAuthConnections(context.userId);

    res.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    logger.error('Get OAuth connections failed', error as Error);

    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
