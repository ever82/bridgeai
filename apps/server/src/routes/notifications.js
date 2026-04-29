/**
 * Notification Routes
 * 通知中心路由
 *
 * 通知列表、分类、已读/未读管理 API
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';
const router = Router();
/**
 * GET /api/v1/notifications
 * 获取通知列表
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { status, type, category, priority, limit = '20', offset = '0' } = req.query;
        const notifications = await notificationService.getNotifications({
            userId,
            status: status,
            type: type,
            category: category,
            priority: priority,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        });
        res.json({
            success: true,
            data: notifications,
        });
    }
    catch (error) {
        logger.error('Failed to get notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { category } = req.query;
        const count = await notificationService.getUnreadCount(userId, category);
        res.json({
            success: true,
            data: { count, category },
        });
    }
    catch (error) {
        logger.error('Failed to get unread count', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/categories
 * 获取通知分类列表
 */
router.get('/categories', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get notification categories', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/stats
 * 获取通知统计
 */
router.get('/stats', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get notification stats', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/latest
 * 获取最新通知
 */
router.get('/latest', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { limit = '5' } = req.query;
        const notifications = await notificationService.getLatestNotifications(userId, parseInt(limit, 10));
        res.json({
            success: true,
            data: notifications,
        });
    }
    catch (error) {
        logger.error('Failed to get latest notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/search
 * 搜索通知
 */
router.get('/search', authenticate, async (req, res) => {
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
        const results = await notificationService.searchNotifications(userId, keyword, {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        });
        res.json({
            success: true,
            data: results,
        });
    }
    catch (error) {
        logger.error('Failed to search notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/:id
 * 获取通知详情
 */
router.get('/:id', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get notification detail', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/:id/read
 * 标记通知为已读
 */
router.post('/:id/read', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to mark notification as read', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/read-all
 * 标记所有通知为已读
 */
router.post('/read-all', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to mark all notifications as read', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/batch-read
 * 批量标记为已读
 */
router.post('/batch-read', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to mark notifications as read', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/:id/archive
 * 归档通知
 */
router.post('/:id/archive', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to archive notification', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/batch-archive
 * 批量归档通知
 */
router.post('/batch-archive', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to archive notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * DELETE /api/v1/notifications/:id
 * 删除通知
 */
router.delete('/:id', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to delete notification', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/batch-delete
 * 批量删除通知
 */
router.post('/batch-delete', authenticate, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to delete notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/cleanup
 * 清理过期通知
 */
router.post('/cleanup', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { type = 'expired', olderThanDays = 30 } = req.body;
        let count = 0;
        if (type === 'expired') {
            count = await notificationService.cleanupExpired(userId);
        }
        else if (type === 'deleted') {
            count = await notificationService.cleanupDeleted(userId, olderThanDays);
        }
        res.json({
            success: true,
            data: { cleanedCount: count },
        });
    }
    catch (error) {
        logger.error('Failed to cleanup notifications', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/v1/notifications/analytics
 * 获取推送分析数据
 */
router.get('/analytics', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { startDate, endDate } = req.query;
        const analytics = await notificationService.getPushAnalytics(userId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        logger.error('Failed to get push analytics', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/v1/notifications/retry-failed
 * 重试失败的推送通知 (admin only)
 */
router.post('/retry-failed', authenticate, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: admin access required',
            });
        }
        const { maxRetries = 3 } = req.body;
        const count = await notificationService.retryFailedDeliveries(maxRetries);
        res.json({
            success: true,
            data: { retriedCount: count },
        });
    }
    catch (error) {
        logger.error('Failed to retry failed deliveries', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
export default router;
//# sourceMappingURL=notifications.js.map