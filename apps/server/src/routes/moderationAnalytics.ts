/**
 * Moderation Analytics Routes
 * 审核数据统计分析路由
 *
 * GET /api/v1/moderation/analytics/overview      - Overview statistics (admin only)
 * GET /api/v1/moderation/analytics/trends         - Report volume trends (admin only)
 * GET /api/v1/moderation/analytics/violations     - Violation type breakdown (admin only)
 * GET /api/v1/moderation/analytics/content-types  - Content type breakdown (admin only)
 * GET /api/v1/moderation/analytics/efficiency     - Moderation efficiency metrics (admin only)
 * GET /api/v1/moderation/analytics/accuracy       - Report accuracy (admin only)
 * GET /api/v1/moderation/analytics/moderator/:id  - Moderator performance (admin only)
 */

import { Router, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as moderationAnalytics from '../services/moderationAnalytics';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate);

/**
 * Parse date range from query params
 */
function parseDateRange(query: any) {
  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : undefined;
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined;
  return { startDate, endDate };
}

/**
 * @route GET /api/v1/moderation/analytics/overview
 * @desc Get overview statistics for reports
 * @access Admin only
 */
router.get(
  '/overview',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const stats = await moderationAnalytics.getOverview(startDate, endDate);

    res.json(ApiResponse.success(stats));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/trends
 * @desc Get report volume trends over time
 * @access Admin only
 */
router.get(
  '/trends',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const granularity = (req.query.granularity as 'daily' | 'weekly' | 'monthly') || 'daily';
    const trends = await moderationAnalytics.getReportTrends(startDate, endDate, granularity);

    res.json(ApiResponse.success(trends));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/violations
 * @desc Get breakdown by violation/report reason type
 * @access Admin only
 */
router.get(
  '/violations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const breakdown = await moderationAnalytics.getViolationTypeBreakdown(startDate, endDate);

    res.json(ApiResponse.success(breakdown));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/content-types
 * @desc Get breakdown by target type (MESSAGE, USER, CONTENT)
 * @access Admin only
 */
router.get(
  '/content-types',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const breakdown = await moderationAnalytics.getContentTypeBreakdown(startDate, endDate);

    res.json(ApiResponse.success(breakdown));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/efficiency
 * @desc Get moderation efficiency metrics
 * @access Admin only
 */
router.get(
  '/efficiency',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const metrics = await moderationAnalytics.getModerationEfficiency(startDate, endDate);

    res.json(ApiResponse.success(metrics));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/accuracy
 * @desc Get report accuracy metrics
 * @access Admin only
 */
router.get(
  '/accuracy',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { startDate, endDate } = parseDateRange(req.query);
    const accuracy = await moderationAnalytics.getReportAccuracy(startDate, endDate);

    res.json(ApiResponse.success(accuracy));
  })
);

/**
 * @route GET /api/v1/moderation/analytics/moderator/:id
 * @desc Get moderator performance stats
 * @access Admin only
 */
router.get(
  '/moderator/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }

    const { id } = req.params;
    const { startDate, endDate } = parseDateRange(req.query);
    const performance = await moderationAnalytics.getModeratorPerformance(
      id,
      startDate,
      endDate
    );

    res.json(ApiResponse.success(performance));
  })
);

export default router;
