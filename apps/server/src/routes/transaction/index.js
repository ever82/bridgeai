/**
 * Transaction Routes
 * 交易记录与退款申诉路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { transactionService } from '../../services/transactionService';
import { logger } from '../../utils/logger';
const router = Router();
const log = logger.child({ module: 'TransactionRoutes' });
// Query schemas
const listQuerySchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    type: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
const refundListQuerySchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    status: z.string().optional(),
});
// Body schemas
const createRefundSchema = z.object({
    transactionId: z.string().uuid(),
    reason: z.string().min(1).max(200),
    details: z.string().max(1000).optional(),
    evidence: z.array(z.string()).max(5).optional(),
});
const createAppealSchema = z.object({
    reason: z.string().min(1).max(500),
    evidence: z.array(z.string()).max(5).optional(),
});
// ========================================
// Transaction Records (c1)
// ========================================
/**
 * GET /api/v1/transactions
 * 获取交易历史列表
 */
router.get('/', authenticate, validate({ query: listQuerySchema }), async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, type, status, startDate, endDate } = req.query;
        const result = await transactionService.getUserTransactions(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            type,
            status,
            startDate,
            endDate,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        log.error('Get transactions failed', { error });
        res.status(500).json({ success: false, error: '获取交易记录失败' });
    }
});
/**
 * GET /api/v1/transactions/stats
 * 获取收支统计
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await transactionService.getTransactionStats(userId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        log.error('Get transaction stats failed', { error });
        res.status(500).json({ success: false, error: '获取统计信息失败' });
    }
});
/**
 * GET /api/v1/transactions/export
 * 导出交易记录
 */
router.get('/export', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, startDate, endDate } = req.query;
        const transactions = await transactionService.exportTransactions(userId, {
            type,
            startDate,
            endDate,
        });
        // Return as JSON; client can convert to CSV
        res.json({ success: true, data: { transactions } });
    }
    catch (error) {
        log.error('Export transactions failed', { error });
        res.status(500).json({ success: false, error: '导出交易记录失败' });
    }
});
/**
 * GET /api/v1/transactions/:id
 * 获取交易详情
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const transaction = await transactionService.getTransactionDetail(userId, id);
        if (!transaction) {
            return res.status(404).json({ success: false, error: '交易记录不存在' });
        }
        res.json({ success: true, data: transaction });
    }
    catch (error) {
        log.error('Get transaction detail failed', { error });
        res.status(500).json({ success: false, error: '获取交易详情失败' });
    }
});
// ========================================
// Refund & Appeal (c2)
// ========================================
/**
 * POST /api/v1/transactions/refunds
 * 创建退款申请
 */
router.post('/refunds', authenticate, validate({ body: createRefundSchema }), async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId, reason, details, evidence } = req.body;
        const refund = await transactionService.createRefund(userId, transactionId, reason, details, evidence);
        res.json({ success: true, data: refund });
    }
    catch (error) {
        const msg = error.message;
        if (msg.includes('不能') || msg.includes('已有') || msg.includes('不存在')) {
            return res.status(400).json({ success: false, error: msg });
        }
        log.error('Create refund failed', { error });
        res.status(500).json({ success: false, error: '创建退款申请失败' });
    }
});
/**
 * GET /api/v1/transactions/refunds
 * 获取退款列表
 */
router.get('/refunds', authenticate, validate({ query: refundListQuerySchema }), async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, status } = req.query;
        const result = await transactionService.getUserRefunds(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            status,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        log.error('Get refunds failed', { error });
        res.status(500).json({ success: false, error: '获取退款列表失败' });
    }
});
/**
 * GET /api/v1/transactions/refunds/:refundId
 * 获取退款详情（含申诉记录）
 */
router.get('/refunds/:refundId', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { refundId } = req.params;
        const refund = await transactionService.getRefundDetail(userId, refundId);
        if (!refund) {
            return res.status(404).json({ success: false, error: '退款记录不存在' });
        }
        res.json({ success: true, data: refund });
    }
    catch (error) {
        log.error('Get refund detail failed', { error });
        res.status(500).json({ success: false, error: '获取退款详情失败' });
    }
});
/**
 * POST /api/v1/transactions/refunds/:refundId/cancel
 * 取消退款申请
 */
router.post('/refunds/:refundId/cancel', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { refundId } = req.params;
        const result = await transactionService.cancelRefund(userId, refundId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        const msg = error.message;
        if (msg.includes('不能') || msg.includes('不存在')) {
            return res.status(400).json({ success: false, error: msg });
        }
        log.error('Cancel refund failed', { error });
        res.status(500).json({ success: false, error: '取消退款失败' });
    }
});
/**
 * POST /api/v1/transactions/refunds/:refundId/appeals
 * 创建申诉
 */
router.post('/refunds/:refundId/appeals', authenticate, validate({ body: createAppealSchema }), async (req, res) => {
    try {
        const userId = req.user.id;
        const { refundId } = req.params;
        const { reason, evidence } = req.body;
        const appeal = await transactionService.createAppeal(userId, refundId, reason, evidence);
        res.json({ success: true, data: appeal });
    }
    catch (error) {
        const msg = error.message;
        if (msg.includes('不能') || msg.includes('不存在')) {
            return res.status(400).json({ success: false, error: msg });
        }
        log.error('Create appeal failed', { error });
        res.status(500).json({ success: false, error: '创建申诉失败' });
    }
});
export default router;
//# sourceMappingURL=index.js.map