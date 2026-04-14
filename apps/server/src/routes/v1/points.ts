/**
 * 积分交易记录 API 路由
 * 提供余额查询、交易记录、积分统计等功能
 */

import { Router } from 'express';
import { z } from 'zod';
import { pointsService } from '../../services/pointsService';
import { visionSharePaymentService } from '../../services/visionSharePaymentService';
import { photoUnlockService } from '../../services/photoUnlockService';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { Response } from 'express';

const router = Router();

// ==================== 验证模式 ====================

const transactionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum([
    'EARN',
    'SPEND',
    'RECHARGE',
    'REFUND',
    'FROZEN',
    'UNFROZEN',
    'DEDUCT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
  ]).optional(),
  scene: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const transactionIdSchema = z.object({
  id: z.string().uuid(),
});

const exportQuerySchema = z.object({
  type: z.enum([
    'EARN',
    'SPEND',
    'RECHARGE',
    'REFUND',
    'FROZEN',
    'UNFROZEN',
    'DEDUCT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
  ]).optional(),
  scene: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

// ==================== API 端点 ====================

/**
 * GET /api/v1/points/balance
 * 获取当前用户积分余额
 */
router.get('/balance', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const balance = await pointsService.getBalance(userId);

    res.json({
      success: true,
      data: {
        balance: balance.balance,
        totalEarned: balance.totalEarned,
        totalSpent: balance.totalSpent,
        lastUpdatedAt: balance.lastUpdatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/points/transactions
 * 获取交易记录列表（支持筛选和分页）
 */
router.get(
  '/transactions',
  authenticate,
  validateRequest({ query: transactionFiltersSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { page, pageSize, type, scene, startDate, endDate } = req.query as any;

      const filters: any = {};
      if (type) filters.type = type;
      if (scene) filters.scene = scene;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const result = await pointsService.getTransactions(
        userId,
        filters,
        { page, pageSize }
      );

      res.json({
        success: true,
        data: {
          transactions: result.data.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            balanceAfter: t.balanceAfter,
            description: t.description,
            scene: t.scene,
            referenceId: t.referenceId,
            createdAt: t.createdAt,
          })),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/points/transactions/:id
 * 获取单笔交易详情
 */
router.get(
  '/transactions/:id',
  authenticate,
  validateRequest({ params: transactionIdSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await pointsService.getTransactionDetail(id, userId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
          description: transaction.description,
          scene: transaction.scene,
          referenceId: transaction.referenceId,
          metadata: transaction.metadata,
          createdAt: transaction.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/points/stats
 * 获取积分统计（收入/支出分类）
 */
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const stats = await pointsService.getStats(userId);

    res.json({
      success: true,
      data: {
        totalTransactions: stats.totalTransactions,
        totalEarned: stats.totalEarned,
        totalSpent: stats.totalSpent,
        byType: stats.byType,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/points/export
 * 导出交易记录
 */
router.get(
  '/export',
  authenticate,
  validateRequest({ query: exportQuerySchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { type, scene, startDate, endDate, format } = req.query as any;

      const filters: any = {};
      if (type) filters.type = type;
      if (scene) filters.scene = scene;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      if (format === 'csv') {
        const csv = await pointsService.exportTransactions(userId, filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="points-transactions-${Date.now()}.csv"`
        );
        res.send(csv);
        return;
      }

      // JSON format (default)
      const result = await pointsService.getTransactions(userId, filters, {
        page: 1,
        pageSize: 10000,
      });

      res.json({
        success: true,
        data: {
          exportedAt: new Date().toISOString(),
          totalRecords: result.pagination.total,
          transactions: result.data,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== VisionShare Payment Endpoints ====================

/**
 * GET /api/v1/points/vs/balance-check
 * Check if user has sufficient balance for viewing a photo
 */
router.get(
  '/vs/balance-check',
  authenticate,
  validateRequest({
    query: z.object({
      photoId: z.string().uuid(),
    }),
  }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { photoId } = req.query as any;

      const result = await visionSharePaymentService.checkBalance(userId, photoId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/vs/pay-photo
 * Pay for a photo using points
 */
router.post(
  '/vs/pay-photo',
  authenticate,
  validateRequest({
    body: z.object({
      photoId: z.string().uuid(),
      photographerUserId: z.string().uuid(),
      points: z.number().int().positive().optional(),
    }),
  }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { photoId, photographerUserId } = req.body as any;

      const result = await visionSharePaymentService.processPayment({
        buyerUserId: userId,
        photoId,
        photographerUserId,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          transactionId: result.transactionId,
          pointsCharged: result.pointsCharged,
          photographerPoints: result.photographerPoints,
          platformCommission: result.platformCommission,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/vs/unlock-photo
 * Unlock a photo (handles payment + unlock)
 */
router.post(
  '/vs/unlock-photo',
  authenticate,
  validateRequest({
    body: z.object({
      photoId: z.string().uuid(),
      photographerUserId: z.string().uuid(),
    }),
  }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { photoId, photographerUserId } = req.body as any;

      const result = await photoUnlockService.unlockPhoto({
        userId,
        photoId,
        photographerUserId,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          photoUrl: result.photoUrl,
          unlockToken: result.unlockToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
