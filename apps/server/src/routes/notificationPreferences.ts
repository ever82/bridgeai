/**
 * Notification Preferences Routes
 * 通知偏好设置路由
 *
 * 推送开关、频率控制、免打扰设置 API
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/notification-preferences
 * 获取用户通知偏好设置
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // 创建默认偏好
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to get notification preferences', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PUT /api/v1/notification-preferences
 * 更新通知偏好设置
 */
router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      pushEnabled,
      emailEnabled,
      smsEnabled,
      inAppEnabled,
      matchNotifications,
      messageNotifications,
      ratingNotifications,
      systemNotifications,
      promotionNotifications,
      dailyLimit,
      quietHoursStart,
      quietHoursEnd,
      quietHoursEnabled,
    } = req.body;

    // 确保偏好记录存在
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    let preferences;
    if (existing) {
      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: {
          ...(pushEnabled !== undefined && { pushEnabled }),
          ...(emailEnabled !== undefined && { emailEnabled }),
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(inAppEnabled !== undefined && { inAppEnabled }),
          ...(matchNotifications !== undefined && { matchNotifications }),
          ...(messageNotifications !== undefined && { messageNotifications }),
          ...(ratingNotifications !== undefined && { ratingNotifications }),
          ...(systemNotifications !== undefined && { systemNotifications }),
          ...(promotionNotifications !== undefined && { promotionNotifications }),
          ...(dailyLimit !== undefined && { dailyLimit }),
          ...(quietHoursStart !== undefined && { quietHoursStart }),
          ...(quietHoursEnd !== undefined && { quietHoursEnd }),
          ...(quietHoursEnabled !== undefined && { quietHoursEnabled }),
        },
      });
    } else {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          pushEnabled: pushEnabled ?? true,
          emailEnabled: emailEnabled ?? true,
          smsEnabled: smsEnabled ?? false,
          inAppEnabled: inAppEnabled ?? true,
          matchNotifications: matchNotifications ?? true,
          messageNotifications: messageNotifications ?? true,
          ratingNotifications: ratingNotifications ?? true,
          systemNotifications: systemNotifications ?? true,
          promotionNotifications: promotionNotifications ?? false,
          dailyLimit: dailyLimit ?? 100,
          quietHoursStart: quietHoursStart ?? null,
          quietHoursEnd: quietHoursEnd ?? null,
          quietHoursEnabled: quietHoursEnabled ?? false,
        },
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PATCH /api/v1/notification-preferences/channels
 * 批量更新渠道开关
 */
router.patch('/channels', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      pushEnabled,
      emailEnabled,
      smsEnabled,
      inAppEnabled,
    } = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(smsEnabled !== undefined && { smsEnabled }),
        ...(inAppEnabled !== undefined && { inAppEnabled }),
      },
      create: {
        userId,
        pushEnabled: pushEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
        inAppEnabled: inAppEnabled ?? true,
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update notification channels', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PATCH /api/v1/notification-preferences/types
 * 批量更新通知类型偏好
 */
router.patch('/types', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      matchNotifications,
      messageNotifications,
      ratingNotifications,
      systemNotifications,
      promotionNotifications,
    } = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(matchNotifications !== undefined && { matchNotifications }),
        ...(messageNotifications !== undefined && { messageNotifications }),
        ...(ratingNotifications !== undefined && { ratingNotifications }),
        ...(systemNotifications !== undefined && { systemNotifications }),
        ...(promotionNotifications !== undefined && { promotionNotifications }),
      },
      create: {
        userId,
        matchNotifications: matchNotifications ?? true,
        messageNotifications: messageNotifications ?? true,
        ratingNotifications: ratingNotifications ?? true,
        systemNotifications: systemNotifications ?? true,
        promotionNotifications: promotionNotifications ?? false,
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update notification types', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PATCH /api/v1/notification-preferences/quiet-hours
 * 更新免打扰设置
 */
router.patch('/quiet-hours', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { enabled, start, end } = req.body;

    // 验证时间格式
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (start && !timeRegex.test(start)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start time format. Use HH:mm',
      });
    }
    if (end && !timeRegex.test(end)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end time format. Use HH:mm',
      });
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(enabled !== undefined && { quietHoursEnabled: enabled }),
        ...(start !== undefined && { quietHoursStart: start }),
        ...(end !== undefined && { quietHoursEnd: end }),
      },
      create: {
        userId,
        quietHoursEnabled: enabled ?? false,
        quietHoursStart: start ?? null,
        quietHoursEnd: end ?? null,
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update quiet hours', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notification-preferences/reset
 * 重置为默认设置
 */
router.post('/reset', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        matchNotifications: true,
        messageNotifications: true,
        ratingNotifications: true,
        systemNotifications: true,
        promotionNotifications: false,
        dailyLimit: 100,
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursEnabled: false,
      },
      create: {
        userId,
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to reset notification preferences', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notification-preferences/push-tokens
 * 获取用户的推送令牌列表
 */
router.get('/push-tokens', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceType: true,
        appVersion: true,
        osVersion: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    logger.error('Failed to get push tokens', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notification-preferences/push-tokens
 * 注册推送令牌
 */
router.post('/push-tokens', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      token,
      deviceId,
      deviceType,
      appVersion,
      osVersion,
    } = req.body;

    // 验证必需字段
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Push token is required',
      });
    }

    if (!deviceType || !['ios', 'android'].includes(deviceType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device type (ios/android) is required',
      });
    }

    // 检查令牌是否已存在
    const existingToken = await prisma.pushToken.findUnique({
      where: { token },
    });

    let pushToken;
    if (existingToken) {
      // 更新现有令牌
      pushToken = await prisma.pushToken.update({
        where: { token },
        data: {
          userId,
          deviceId: deviceId || existingToken.deviceId,
          deviceType,
          appVersion: appVersion || existingToken.appVersion,
          osVersion: osVersion || existingToken.osVersion,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // 创建新令牌
      pushToken = await prisma.pushToken.create({
        data: {
          userId,
          token,
          deviceId,
          deviceType,
          appVersion,
          osVersion,
          isActive: true,
        },
      });
    }

    res.json({
      success: true,
      data: pushToken,
    });
  } catch (error) {
    logger.error('Failed to register push token', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/v1/notification-preferences/push-tokens/:id
 * 删除推送令牌
 */
router.delete('/push-tokens/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // 验证令牌属于当前用户
    const token = await prisma.pushToken.findFirst({
      where: { id, userId },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Push token not found',
      });
    }

    await prisma.pushToken.delete({
      where: { id },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to delete push token', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notification-preferences/push-tokens/:id/deactivate
 * 停用推送令牌
 */
router.post('/push-tokens/:id/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const token = await prisma.pushToken.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (token.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Push token not found',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to deactivate push token', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
