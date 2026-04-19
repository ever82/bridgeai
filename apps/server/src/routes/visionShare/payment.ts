/**
 * VisionShare Payment Routes
 * API routes for credit payment and HD photo unlock
 */

import { Router, Request, Response } from 'express';

import { authenticate } from '../../middleware/auth';
import { validate as validateRequest } from '../../middleware/validation';
import { creditPaymentService } from '../../services/payment/creditPaymentService';
import { logger } from '../../utils/logger';

const router = Router();
const loggerCtx = logger.child({ module: 'VisionSharePaymentRoutes' });

/**
 * POST /api/visionshare/payment/pay
 * Process photo payment (single or batch)
 */
router.post(
  '/pay',
  authenticate,
  validateRequest({
    body: {
      photoIds: { type: 'array', required: true, items: { type: 'string' } },
      totalAmount: { type: 'number', required: true, min: 1 },
      password: { type: 'string', required: true, minLength: 4 },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { photoIds, totalAmount, password, metadata } = req.body;

      // Verify payment password
      const passwordValid = await creditPaymentService.verifyPaymentPassword(userId, password);
      if (!passwordValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: '支付密码错误' },
        });
      }

      const result = await creditPaymentService.processPayment(userId, {
        photoIds,
        totalAmount,
        password,
        metadata,
      });

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggerCtx.error('Payment failed', { error });
      res.status(500).json({ success: false, error: { code: 'PAYMENT_ERROR', message: '支付失败' } });
    }
  }
);

/**
 * GET /api/visionshare/payment/balance
 * Get current user's credit balance
 */
router.get(
  '/balance',
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const userId = _req.user!.id;
      const balance = await creditPaymentService.getBalance(userId);
      res.json({ success: true, data: balance });
    } catch (error) {
      loggerCtx.error('Get balance failed', { error });
      res.status(500).json({ success: false, error: '获取余额失败' });
    }
  }
);

/**
 * POST /api/visionshare/payment/verify-password
 * Verify payment password
 */
router.post(
  '/verify-password',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, error: '请输入支付密码' });
      }

      const valid = await creditPaymentService.verifyPaymentPassword(userId, password);
      res.json({ success: true, data: { valid } });
    } catch (error) {
      loggerCtx.error('Verify password failed', { error });
      res.status(500).json({ success: false, error: '密码验证失败' });
    }
  }
);

/**
 * GET /api/visionshare/payment/transaction/:id
 * Get payment transaction details
 */
router.get(
  '/transaction/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const transactionId = req.params.id;
      const transaction = await creditPaymentService.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({ success: false, error: '交易不存在' });
      }

      res.json({ success: true, data: transaction });
    } catch (error) {
      loggerCtx.error('Get transaction failed', { error });
      res.status(500).json({ success: false, error: '获取交易详情失败' });
    }
  }
);

/**
 * GET /api/visionshare/payment/transactions
 * Get user's payment transactions with pagination
 */
router.get(
  '/transactions',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await creditPaymentService.getUserTransactions(userId, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      loggerCtx.error('Get transactions failed', { error });
      res.status(500).json({ success: false, error: '获取交易记录失败' });
    }
  }
);

/**
 * GET /api/visionshare/payment/confirmation/:id
 * Get payment confirmation details
 */
router.get(
  '/confirmation/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const transactionId = req.params.id;
      const confirmation = await creditPaymentService.getConfirmation(transactionId);

      if (!confirmation) {
        return res.status(404).json({ success: false, error: '确认信息不存在' });
      }

      res.json({ success: true, data: confirmation });
    } catch (error) {
      loggerCtx.error('Get confirmation failed', { error });
      res.status(500).json({ success: false, error: '获取确认信息失败' });
    }
  }
);

/**
 * GET /api/visionshare/photos/:photoId/unlock-status
 * Check if a photo is unlocked for current user
 */
router.get(
  '/photos/:photoId/unlock-status',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { photoId } = req.params;

      const unlocked = await creditPaymentService.isPhotoUnlocked(photoId, userId);
      res.json({ success: true, data: { photoId, unlocked } });
    } catch (error) {
      loggerCtx.error('Check unlock status failed', { error });
      res.status(500).json({ success: false, error: '查询解锁状态失败' });
    }
  }
);

/**
 * POST /api/visionshare/photos/:photoId/download-token
 * Generate download token for an unlocked photo
 */
router.post(
  '/photos/:photoId/download-token',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { photoId } = req.params;

      const token = await creditPaymentService.generateDownloadToken(photoId, userId);
      res.json({ success: true, data: { token, photoId } });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('not unlocked')) {
        return res.status(403).json({ success: false, error: '照片未解锁' });
      }
      loggerCtx.error('Generate download token failed', { error });
      res.status(500).json({ success: false, error: '生成下载令牌失败' });
    }
  }
);

/**
 * POST /api/visionshare/photos/download/:token
 * Validate download token and record usage
 */
router.post(
  '/photos/download/:token',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { token } = req.params;

      const result = await creditPaymentService.validateAndUseDownloadToken(token, userId);

      if (result.valid) {
        res.json({ success: true, data: { photoId: result.photoId } });
      } else {
        res.status(403).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggerCtx.error('Validate download token failed', { error });
      res.status(500).json({ success: false, error: '下载验证失败' });
    }
  }
);

export default router;
