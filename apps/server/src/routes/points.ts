/**
 * 积分 API 路由
 * 提供积分账户、交易、冻结、规则查询等 HTTP 接口
 */

import { Router } from 'express';
import { z } from 'zod';

import { pointsService } from '../services/pointsService';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router: Router = Router();

// ==================== 验证模式 ====================

const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  pageSize: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
});

const earnByRuleSchema = z.object({
  ruleCode: z.string().min(1),
  baseAmount: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const spendByRuleSchema = z.object({
  ruleCode: z.string().min(1),
  baseAmount: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const viewPhotoSchema = z.object({
  photoId: z.string().min(1),
  ownerId: z.string().min(1),
});

const freezeSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
  scene: z.enum(['vision_share', 'agent_date', 'agent_job', 'agent_ad']).optional(),
  referenceId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const transferSchema = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().positive(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const rechargeSchema = z.object({
  rmbAmount: z.number().positive(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const deductSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

const manualAddSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

const batchRewardSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(100),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

const freezeIdParamSchema = z.object({
  freezeId: z.string().min(1),
});

const transactionIdParamSchema = z.object({
  transactionId: z.string().min(1),
});

const ruleCodeParamSchema = z.object({
  ruleCode: z.string().min(1),
});

const sceneParamSchema = z.object({
  scene: z.enum(['vision_share', 'agent_date', 'agent_job', 'agent_ad']),
});

// ==================== 账户管理 ====================

/**
 * GET /api/v1/points/account
 * 获取当前用户积分账户
 */
router.get('/account', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const account = await pointsService.getOrCreateAccount(userId);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/points/balance
 * 获取可用余额
 */
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const availableBalance = await pointsService.getAvailableBalance(userId);
    res.json({ success: true, data: { availableBalance } });
  } catch (error) {
    next(error);
  }
});

// ==================== 积分获取 ====================

/**
 * POST /api/v1/points/earn
 * 按规则获取积分
 */
router.post('/earn', authenticate, validate({ body: earnByRuleSchema }), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { ruleCode, baseAmount, metadata } = req.body;
    const result = await pointsService.earnByRule({ userId, ruleCode, baseAmount, metadata });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/points/recharge
 * 充值积分
 */
router.post(
  '/recharge',
  authenticate,
  validate({ body: rechargeSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { rmbAmount, description, metadata } = req.body;
      const result = await pointsService.recharge(userId, { rmbAmount, description, metadata });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/checkin
 * 签到
 */
router.post('/checkin', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const continuousDays =
      typeof req.body?.continuousDays === 'number' ? req.body.continuousDays : 0;
    const result = await pointsService.checkIn(userId, continuousDays);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ==================== 积分消耗 ====================

/**
 * POST /api/v1/points/spend
 * 按规则消耗积分
 */
router.post(
  '/spend',
  authenticate,
  validate({ body: spendByRuleSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { ruleCode, baseAmount, metadata } = req.body;
      const result = await pointsService.spendByRule({ userId, ruleCode, baseAmount, metadata });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/view-photo
 * 查看照片（消耗积分）
 */
router.post(
  '/view-photo',
  authenticate,
  validate({ body: viewPhotoSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { photoId, ownerId } = req.body;
      const result = await pointsService.viewPhoto(userId, photoId, ownerId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 积分冻结/解冻 ====================

/**
 * POST /api/v1/points/freeze
 * 冻结积分
 */
router.post('/freeze', authenticate, validate({ body: freezeSchema }), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, reason, scene, referenceId, expiresAt } = req.body;
    const result = await pointsService.freezePoints(userId, amount, {
      amount,
      reason,
      scene,
      referenceId,
      expiresAt,
    });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/points/freeze/:freezeId/unfreeze
 * 解冻积分
 */
router.post(
  '/freeze/:freezeId/unfreeze',
  authenticate,
  validate({ params: freezeIdParamSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { freezeId } = req.params;
      const result = await pointsService.unfreezePoints(userId, freezeId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/freeze/:freezeId/confirm
 * 确认使用冻结积分
 */
router.post(
  '/freeze/:freezeId/confirm',
  authenticate,
  validate({ params: freezeIdParamSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { freezeId } = req.params;
      const result = await pointsService.confirmFreeze(userId, freezeId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/points/freezes
 * 获取冻结记录列表
 */
router.get(
  '/freezes',
  authenticate,
  validate({ query: paginationSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const result = await pointsService.getFreezeList(userId, { page, pageSize });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 积分转账 ====================

/**
 * POST /api/v1/points/transfer
 * 转账积分
 */
router.post(
  '/transfer',
  authenticate,
  validate({ body: transferSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { toUserId, amount, description, metadata } = req.body;
      const result = await pointsService.transfer(userId, toUserId, amount, {
        description,
        metadata,
      });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 交易记录查询 ====================

/**
 * GET /api/v1/points/transactions
 * 获取交易记录列表
 */
router.get(
  '/transactions',
  authenticate,
  validate({ query: paginationSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;

      const filter: Record<string, unknown> = {};
      if (req.query.type) filter.type = req.query.type;
      if (req.query.scene) filter.scene = req.query.scene;
      if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);

      const result = await pointsService.getTransactionList(userId, filter, { page, pageSize });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/points/transactions/:transactionId
 * 获取交易详情
 */
router.get(
  '/transactions/:transactionId',
  authenticate,
  validate({ params: transactionIdParamSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { transactionId } = req.params;
      const transaction = await pointsService.getTransactionDetail(userId, transactionId);
      if (!transaction) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 规则查询 ====================

/**
 * GET /api/v1/points/rules
 * 获取所有可用规则
 */
router.get('/rules', authenticate, async (_req, res, next) => {
  try {
    const rules = pointsService.getAllRules();
    res.json({ success: true, data: { rules } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/points/rules/scene/:scene
 * 获取场景规则
 */
router.get(
  '/rules/scene/:scene',
  authenticate,
  validate({ params: sceneParamSchema }),
  async (req, res, next) => {
    try {
      const { scene } = req.params;
      const rules = pointsService.getRulesByScene(
        scene as Parameters<typeof pointsService.getRulesByScene>[0]
      );
      res.json({ success: true, data: { rules } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/points/rules/:ruleCode
 * 获取规则详情
 */
router.get(
  '/rules/:ruleCode',
  authenticate,
  validate({ params: ruleCodeParamSchema }),
  async (req, res, next) => {
    try {
      const { ruleCode } = req.params;
      const rule = pointsService.getRuleDetail(ruleCode);
      if (!rule) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/rules/:ruleCode/check-limits
 * 检查规则限制
 */
router.post(
  '/rules/:ruleCode/check-limits',
  authenticate,
  validate({ params: ruleCodeParamSchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { ruleCode } = req.params;
      const result = await pointsService.checkRuleLimits(userId, ruleCode);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 配置查询 ====================

/**
 * GET /api/v1/points/config/value
 * 获取积分价值配置
 */
router.get('/config/value', authenticate, async (_req, res, next) => {
  try {
    const config = pointsService.getValueConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/points/config/limits
 * 获取积分限制配置
 */
router.get('/config/limits', authenticate, async (_req, res, next) => {
  try {
    const config = pointsService.getLimitConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

// ==================== 管理功能 ====================

/**
 * POST /api/v1/points/admin/deduct
 * 扣除积分（管理员）
 */
router.post(
  '/admin/deduct',
  authenticate,
  requireAdmin,
  validate({ body: deductSchema }),
  async (req, res, next) => {
    try {
      const { userId, amount, reason } = req.body;
      const adminId = req.user!.id;
      const result = await pointsService.deductPoints(userId, amount, reason, adminId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/admin/add
 * 手动增加积分（管理员）
 */
router.post(
  '/admin/add',
  authenticate,
  requireAdmin,
  validate({ body: manualAddSchema }),
  async (req, res, next) => {
    try {
      const { userId, amount, reason } = req.body;
      const adminId = req.user!.id;
      const result = await pointsService.manualAddPoints(userId, amount, reason, adminId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/points/admin/batch-reward
 * 批量发放积分（管理员）
 */
router.post(
  '/admin/batch-reward',
  authenticate,
  requireAdmin,
  validate({ body: batchRewardSchema }),
  async (req, res, next) => {
    try {
      const { userIds, amount, reason } = req.body;
      const result = await pointsService.batchReward(userIds, amount, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
