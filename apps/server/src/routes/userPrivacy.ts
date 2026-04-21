/**
 * 用户隐私和安全设置路由
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { prisma } from '../db/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../errors/AppError';
import { DEFAULT_PRIVACY_SETTINGS } from '../types/privacy';

const router = Router();

// 验证模式
const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'friends', 'private']).optional(),
  onlineStatusVisibility: z.enum(['everyone', 'friends', 'nobody']).optional(),
  phoneVisibility: z.enum(['public', 'friends', 'hidden']).optional(),
  emailVisibility: z.enum(['public', 'friends', 'hidden']).optional(),
  allowSearchByPhone: z.boolean().optional(),
  allowSearchByEmail: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(8, '新密码至少需要8个字符'),
});

const bindPhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  code: z.string().length(6, '验证码应为6位数字'),
});

const bindEmailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  code: z.string().length(6, '验证码应为6位数字'),
});

const sendCodeSchema = z.object({
  type: z.enum(['phone', 'email']),
  target: z.string().min(1, '目标不能为空'),
});

/**
 * GET /api/v1/users/me/privacy
 * 获取用户隐私设置
 */
router.get('/me/privacy', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    });

    if (!user) {
      throw new AppError('用户不存在', 'USER_NOT_FOUND', 404);
    }

    // 合并默认设置和用户设置
    const settings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...((user.privacySettings as Record<string, any>) || {}),
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/me/privacy
 * 更新用户隐私设置
 */
router.put(
  '/me/privacy',
  authenticate,
  validate({ body: privacySettingsSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;

      // 获取当前设置
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { privacySettings: true },
      });

      const currentSettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        ...((user?.privacySettings as Record<string, any>) || {}),
      };

      // 合并新设置
      const newSettings = {
        ...currentSettings,
        ...updates,
      };

      // 更新用户隐私设置
      await prisma.user.update({
        where: { id: userId },
        data: {
          privacySettings: newSettings,
        },
      });

      res.json({
        success: true,
        data: newSettings,
        message: '隐私设置已更新',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/me/security
 * 获取账号安全信息
 */
router.get('/me/security', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        updatedAt: true,
        devices: {
          orderBy: { lastActiveAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError('用户不存在', 'USER_NOT_FOUND', 404);
    }

    // 计算密码强度（基于最后修改时间）
    const daysSinceUpdate = Math.floor(
      (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    let passwordStrength: 'weak' | 'medium' | 'strong' = 'medium';
    if (daysSinceUpdate > 90) {
      passwordStrength = 'weak';
    } else if (daysSinceUpdate < 30) {
      passwordStrength = 'strong';
    }

    res.json({
      success: true,
      data: {
        email: {
          address: user.email,
          verified: user.emailVerified,
        },
        phone: {
          number: user.phone,
          verified: user.phoneVerified,
        },
        password: {
          strength: passwordStrength,
          lastChanged: user.updatedAt,
        },
        lastActiveDevice: user.devices[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/password
 * 修改密码
 */
router.post(
  '/me/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      // 获取用户当前密码
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw new AppError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 验证当前密码
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError('当前密码错误', 'INVALID_PASSWORD', 400);
      }

      // 检查新密码是否与旧密码相同
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new AppError('新密码不能与当前密码相同', 'SAME_PASSWORD', 400);
      }

      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/me/phone/send-code
 * 发送手机验证码
 */
router.post(
  '/me/phone/send-code',
  authenticate,
  validate({ body: sendCodeSchema }),
  async (req, res, next) => {
    try {
      const { target } = req.body;

      // TODO: 集成短信服务发送验证码
      // 这里模拟发送成功
      console.log(`Sending SMS code to: ${target}`);

      res.json({
        success: true,
        message: '验证码已发送',
        data: {
          expiresIn: 300, // 5分钟有效期
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/me/phone/bind
 * 绑定手机号
 */
router.post(
  '/me/phone/bind',
  authenticate,
  validate({ body: bindPhoneSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { phone, code } = req.body;

      // TODO: 验证验证码
      // 这里假设验证码正确
      console.log(`Verifying SMS code: ${code}`);

      // 检查手机号是否已被使用
      const phoneUser = await prisma.user.findMany({
        where: { phone } as any,
      });
      const existingPhoneUser = phoneUser.find(u => u.id !== userId);

      if (existingPhoneUser) {
        throw new AppError('该手机号已被其他账号绑定', 'PHONE_EXISTS', 400);
      }

      // 绑定手机号
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone,
          phoneVerified: true,
        },
      });

      res.json({
        success: true,
        message: '手机号绑定成功',
        data: { phone },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/me/email/send-code
 * 发送邮箱验证码
 */
router.post(
  '/me/email/send-code',
  authenticate,
  validate({ body: sendCodeSchema }),
  async (req, res, next) => {
    try {
      const { target } = req.body;

      // TODO: 集成邮件服务发送验证码
      // 这里模拟发送成功
      console.log(`Sending email code to: ${target}`);

      res.json({
        success: true,
        message: '验证码已发送',
        data: {
          expiresIn: 300, // 5分钟有效期
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/me/email/bind
 * 绑定邮箱
 */
router.post(
  '/me/email/bind',
  authenticate,
  validate({ body: bindEmailSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { email, code } = req.body;

      // TODO: 验证验证码
      // 这里假设验证码正确
      console.log(`Verifying email code: ${code}`);

      // 检查邮箱是否已被使用
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new AppError('该邮箱已被其他账号绑定', 'EMAIL_EXISTS', 400);
      }

      // 绑定邮箱
      await prisma.user.update({
        where: { id: userId },
        data: {
          email,
          emailVerified: true,
        },
      });

      res.json({
        success: true,
        message: '邮箱绑定成功',
        data: { email },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
