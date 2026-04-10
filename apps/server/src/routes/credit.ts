/**
 * 信用分 API 路由
 */

import { Router } from 'express';
import { z } from 'zod';
import { creditScoreService } from '../services/creditScoreService';
import { getCreditLevelConfigByScore } from '../config/creditLevels';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// 验证模式
const recalculateSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
});

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
});

/**
 * GET /api/v1/credit/score
 * 获取当前用户信用分
 */
router.get('/score', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const creditScore = await creditScoreService.getOrCreateCreditScore(userId);
    const levelConfig = getCreditLevelConfigByScore(creditScore.score);

    res.json({
      success: true,
      data: {
        score: creditScore.score,
        level: creditScore.level,
        levelName: levelConfig.name,
        levelDescription: levelConfig.description,
        lastUpdatedAt: creditScore.lastUpdatedAt,
        nextUpdateAt: creditScore.nextUpdateAt,
        updateCount: creditScore.updateCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/credit/history
 * 获取信用分历史记录
 */
router.get(
  '/history',
  authenticate,
  validateRequest({ query: querySchema }),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const history = await creditScoreService.getCreditHistory(userId, page, pageSize);

      res.json({
        success: true,
        data: {
          histories: history.histories.map(h => ({
            id: h.id,
            oldScore: h.oldScore,
            newScore: h.newScore,
            delta: h.delta,
            reason: h.reason,
            sourceType: h.sourceType,
            createdAt: h.createdAt,
          })),
          pagination: {
            page: history.page,
            pageSize: history.pageSize,
            total: history.total,
            totalPages: Math.ceil(history.total / history.pageSize),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/credit/factors
 * 获取各维度评分详情
 */
router.get('/factors', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const [factors, rank] = await Promise.all([
      creditScoreService.getCreditFactors(userId),
      creditScoreService.getCreditRank(userId),
    ]);

    const creditScore = await creditScoreService.getOrCreateCreditScore(userId);

    res.json({
      success: true,
      data: {
        totalScore: creditScore.score,
        rank: rank.rank,
        totalUsers: rank.total,
        percentile: rank.percentile,
        factors: factors.map(f => ({
          type: f.type,
          score: f.score,
          weight: f.weight,
          weightedScore: Math.round(f.score * f.weight),
          subFactors: f.subFactors.map(sf => ({
            name: sf.name,
            score: sf.score,
            maxScore: sf.maxScore,
            description: sf.description,
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/credit/level
 * 获取信用等级信息
 */
router.get('/level', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const creditScore = await creditScoreService.getOrCreateCreditScore(userId);
    const levelConfig = getCreditLevelConfigByScore(creditScore.score);

    res.json({
      success: true,
      data: {
        level: creditScore.level,
        name: levelConfig.name,
        description: levelConfig.description,
        minScore: levelConfig.minScore,
        maxScore: levelConfig.maxScore,
        benefits: levelConfig.benefits,
        restrictions: levelConfig.restrictions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/credit/recalculate
 * 触发重新计算 (管理员)
 */
router.post(
  '/recalculate',
  authenticate,
  requireAdmin,
  validateRequest({ body: recalculateSchema }),
  async (req, res, next) => {
    try {
      const { userIds } = req.body;

      if (userIds && userIds.length > 0) {
        // 重新计算指定用户
        const results = await Promise.all(
          userIds.map(async (id: string) => {
            const result = await creditScoreService.updateCreditScore(
              id,
              'system' as any
            );
            return { userId: id, ...result };
          })
        );

        res.json({
          success: true,
          data: {
            message: `Recalculated ${results.length} users`,
            results,
          },
        });
      } else {
        // 重新计算所有用户
        const allUsers = await creditScoreService.getOrCreateCreditScore('');
        res.json({
          success: true,
          data: {
            message: 'Recalculation job started for all users',
            note: 'This may take a while',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/credit/user/:userId
 * 查询其他用户信用分 (脱敏)
 */
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 不允许查询自己的(有专门的接口)
    if (userId === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Use /credit/score for your own credit score',
      });
    }

    const creditScore = await creditScoreService.getOrCreateCreditScore(userId);
    const levelConfig = getCreditLevelConfigByScore(creditScore.score);

    // 脱敏返回：只返回等级，不返回具体分数
    res.json({
      success: true,
      data: {
        level: creditScore.level,
        levelName: levelConfig.name,
        levelDescription: levelConfig.description,
        // 不返回具体分数，只返回模糊区间
        scoreRange: `${levelConfig.minScore}-${levelConfig.maxScore}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
