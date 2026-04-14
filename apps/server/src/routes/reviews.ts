/**
 * Review Routes
 * 评价相关路由
 *
 * POST /api/v1/reviews - 提交评价
 * GET /api/v1/reviews/received - 获取收到的评价
 * GET /api/v1/reviews/given - 获取发出的评价
 * GET /api/v1/reviews/stats - 获取用户评价统计
 * GET /api/v1/reviews/:id - 获取评价详情
 * PUT /api/v1/reviews/:id - 更新评价
 * DELETE /api/v1/reviews/:id - 删除评价
 * PUT /api/v1/reviews/:id/reply - 回复评价
 * DELETE /api/v1/reviews/reply/:replyId - 删除评价回复
 * POST /api/v1/reviews/:id/report - 举报评价
 */

import { Router, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as reviewService from '../services/reviewService';
import * as moderationService from '../services/reviewModerationService';
import * as antiCheatService from '../services/reviewAntiCheatService';

const router: Router = Router();

/**
 * @route POST /api/v1/reviews
 * @desc 提交评价
 * @access Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { matchId, revieweeId, sceneType, rating, title, content, tags } = req.body;

    if (!matchId || !revieweeId || !rating || !content) {
      throw new AppError('缺少必要参数', 'INVALID_REQUEST', 400);
    }

    // 反作弊检查
    const antiCheatResult = await antiCheatService.performAntiCheatCheck(
      matchId,
      req.user.id,
      revieweeId,
      content
    );

    if (!antiCheatResult.passed) {
      throw new AppError(antiCheatResult.reasons.join('; '), 'ANTI_CHEAT_BLOCKED', 400);
    }

    // 内容审核
    const moderationResult = await moderationService.moderateContent(content, title);
    if (moderationResult.blocked) {
      throw new AppError(moderationResult.reason || '内容违规', 'CONTENT_BLOCKED', 400);
    }

    const review = await reviewService.createReview({
      matchId,
      reviewerId: req.user.id,
      revieweeId,
      sceneType,
      rating,
      title,
      content,
      tags,
    });

    res.status(201).json(
      ApiResponse.success({
        review,
        moderationStatus: moderationResult.flagged ? 'FLAGGED' : 'PASSED',
      })
    );
  })
);

/**
 * @route GET /api/v1/reviews/received
 * @desc 获取收到的评价
 * @access Private
 */
router.get(
  '/received',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const sceneType = req.query.sceneType as string;

    const result = await reviewService.getReceivedReviews(req.user.id, {
      page,
      limit,
      status,
      sceneType,
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/reviews/given
 * @desc 获取发出的评价
 * @access Private
 */
router.get(
  '/given',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const sceneType = req.query.sceneType as string;

    const result = await reviewService.getGivenReviews(req.user.id, {
      page,
      limit,
      status,
      sceneType,
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/reviews/stats
 * @desc 获取用户评价统计
 * @access Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const stats = await reviewService.getUserReviewStats(req.user.id);

    res.json(
      ApiResponse.success(
        stats || {
          userId: req.user.id,
          totalReviews: 0,
          avgRating: 0,
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
          responseRate: 0,
        }
      )
    );
  })
);

/**
 * @route GET /api/v1/reviews/:id
 * @desc 获取评价详情
 * @access Public (任何人都可以查看评价)
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const review = await reviewService.getReviewById(id);

    if (!review) {
      throw new AppError('评价不存在', 'REVIEW_NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(review));
  })
);

/**
 * @route PUT /api/v1/reviews/:id
 * @desc 更新评价
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { rating, title, content, tags } = req.body;

    // 如果修改了内容，进行审核
    if (content) {
      const moderationResult = await moderationService.moderateContent(content, title);
      if (moderationResult.blocked) {
        throw new AppError(moderationResult.reason || '内容违规', 'CONTENT_BLOCKED', 400);
      }
    }

    const review = await reviewService.updateReview(id, req.user.id, {
      rating,
      title,
      content,
      tags,
    });

    res.json(ApiResponse.success(review, '评价已更新'));
  })
);

/**
 * @route DELETE /api/v1/reviews/:id
 * @desc 删除评价（软删除）
 * @access Private (评价者本人或管理员)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin';

    await reviewService.deleteReview(id, req.user.id, isAdmin);

    res.json(ApiResponse.success(null, '评价已删除'));
  })
);

/**
 * @route PUT /api/v1/reviews/:id/reply
 * @desc 回复评价
 * @access Private
 */
router.put(
  '/:id/reply',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id: reviewId } = req.params;
    const { content } = req.body;

    if (!content) {
      throw new AppError('回复内容不能为空', 'INVALID_REQUEST', 400);
    }

    const isOfficial = req.user?.role === 'admin';

    const reply = await reviewService.replyToReview({
      reviewId,
      authorId: req.user.id,
      content,
      isOfficial,
    });

    res.status(201).json(ApiResponse.success(reply, '回复成功'));
  })
);

/**
 * @route DELETE /api/v1/reviews/reply/:replyId
 * @desc 删除评价回复
 * @access Private
 */
router.delete(
  '/reply/:replyId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { replyId } = req.params;
    const isAdmin = req.user?.role === 'admin';

    await reviewService.deleteReply(replyId, req.user.id, isAdmin);

    res.json(ApiResponse.success(null, '回复已删除'));
  })
);

/**
 * @route POST /api/v1/reviews/:id/report
 * @desc 举报评价
 * @access Private
 */
router.post(
  '/:id/report',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id: reviewId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      throw new AppError('举报原因不能为空', 'INVALID_REQUEST', 400);
    }

    await reviewService.reportReview(reviewId, req.user.id, reason, description);

    res.json(ApiResponse.success(null, '举报已提交'));
  })
);

export default router;
