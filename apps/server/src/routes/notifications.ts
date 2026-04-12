/**
 * Notification Routes
 * 通知中心路由
 *
 * 通知列表、分类、已读/未读管理 API
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/notifications
 * 获取通知列表
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      status,
      type,
      category,
      priority,
      limit = '20',
      offset = '0',
    } = req.query;

    const notifications = await notificationService.getNotifications({
      userId,
      status: status as any,
      type: type as any,
      category: category as string,
      priority: priority as any,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('Failed to get notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category } = req.query;
    const count = await notificationService.getUnreadCount(
      userId,
      category as string
    );

    res.json({
      success: true,
      data: { count, category },
    });
  } catch (error) {
    logger.error('Failed to get unread count', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/categories
 * 获取通知分类列表
 */
router.get('/categories', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const categories = await notificationService.getCategories(userId);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Failed to get notification categories', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/stats
 * 获取通知统计
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await notificationService.getStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get notification stats', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/latest
 * 获取最新通知
 */
router.get('/latest', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = '5' } = req.query;
    const notifications = await notificationService.getLatestNotifications(
      userId,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('Failed to get latest notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/search
 * 搜索通知
 */
router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q: keyword, limit = '20', offset = '0' } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Search keyword is required',
      });
    }

    const results = await notificationService.searchNotifications(userId, keyword as string, {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Failed to search notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/notifications/:id
 * 获取通知详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const notification = await notificationService.getNotificationDetail(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Failed to get notification detail', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/:id/read
 * 标记通知为已读
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const success = await notificationService.markAsRead(id, userId);

    res.json({
      success,
    });
  } catch (error) {
    logger.error('Failed to mark notification as read', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/read-all
 * 标记所有通知为已读
 */
router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { markedCount: count },
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/batch-read
 * 批量标记为已读
 */
router.post('/batch-read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Notification IDs are required',
      });
    }

    const count = await notificationService.markMultipleAsRead(ids, userId);

    res.json({
      success: true,
      data: { markedCount: count },
    });
  } catch (error) {
    logger.error('Failed to mark notifications as read', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/:id/archive
 * 归档通知
 */
router.post('/:id/archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const success = await notificationService.archiveNotification(id, userId);

    res.json({
      success,
    });
  } catch (error) {
    logger.error('Failed to archive notification', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/batch-archive
 * 批量归档通知
 */
router.post('/batch-archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Notification IDs are required',
      });
    }

    const count = await notificationService.archiveMultiple(ids, userId);

    res.json({
      success: true,
      data: { archivedCount: count },
    });
  } catch (error) {
    logger.error('Failed to archive notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * 删除通知
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const success = await notificationService.deleteNotification(id, userId);

    res.json({
      success,
    });
  } catch (error) {
    logger.error('Failed to delete notification', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/batch-delete
 * 批量删除通知
 */
router.post('/batch-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Notification IDs are required',
      });
    }

    const count = await notificationService.deleteMultiple(ids, userId);

    res.json({
      success: true,
      data: { deletedCount: count },
    });
  } catch (error) {
    logger.error('Failed to delete notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/notifications/cleanup
 * 清理过期通知
 */
router.post('/cleanup', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type = 'expired', olderThanDays = 30 } = req.body;
    let count = 0;

    if (type === 'expired') {
      count = await notificationService.cleanupExpired(userId);
    } else if (type === 'deleted') {
      count = await notificationService.cleanupDeleted(userId, olderThanDays);
    }

    res.json({
      success: true,
      data: { cleanedCount: count },
    });
  } catch (error) {
    logger.error('Failed to cleanup notifications', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
