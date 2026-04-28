/**
 * Moderation Queue Routes
 * 审核队列路由
 *
 * GET  /api/v1/moderation/queue        - List queue items (admin only)
 * GET  /api/v1/moderation/queue/stats - Queue statistics (admin only)
 * GET  /api/v1/moderation/queue/:id    - Get single item (admin only)
 * POST /api/v1/moderation/queue/:id/assign    - Assign to moderator (admin only)
 * POST /api/v1/moderation/queue/:id/resolve   - Resolve with action (admin only)
 * POST /api/v1/moderation/queue/:id/escalate   - Escalate item (admin only)
 */

import { Router, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as moderationQueueService from '../services/moderationQueue';

const router: Router = Router();

/**
 * Admin authentication middleware
 */
async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: () => void
): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    throw new AppError('Admin access required', 'FORBIDDEN', 403);
  }
  next();
}

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @route GET /api/v1/moderation/queue
 * @desc List queue items with filters and pagination
 * @access Admin only
 */
router.get(
  '/queue',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const contentType = req.query.contentType as string | undefined;
    const status = req.query.status as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await moderationQueueService.getQueue({
      contentType,
      status,
      assignedTo,
      page,
      limit,
    });

    res.json(
      ApiResponse.success({
        items: result.items,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      })
    );
  })
);

/**
 * @route GET /api/v1/moderation/queue/stats
 * @desc Get queue statistics
 * @access Admin only
 */
router.get(
  '/queue/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await moderationQueueService.getStats();

    res.json(ApiResponse.success(stats));
  })
);

/**
 * @route GET /api/v1/moderation/queue/:id
 * @desc Get single queue item by ID
 * @access Admin only
 */
router.get(
  '/queue/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const item = await moderationQueueService.getItemById(id);

    if (!item) {
      throw new AppError('Queue item not found', 'NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(item));
  })
);

/**
 * @route POST /api/v1/moderation/queue/:id/assign
 * @desc Assign queue item to moderator
 * @access Admin only
 */
router.post(
  '/queue/:id/assign',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { moderatorId } = req.body;

    if (!moderatorId) {
      throw new AppError('moderatorId is required', 'INVALID_REQUEST', 400);
    }

    const item = await moderationQueueService.assignItem(id, moderatorId);

    res.json(ApiResponse.success(item, 'Item assigned successfully'));
  })
);

/**
 * @route POST /api/v1/moderation/queue/:id/resolve
 * @desc Resolve queue item with action
 * @access Admin only
 */
router.post(
  '/queue/:id/resolve',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!action || !['APPROVE', 'HIDE', 'WARN', 'BAN'].includes(action)) {
      throw new AppError(
        'Valid action is required (APPROVE, HIDE, WARN, BAN)',
        'INVALID_REQUEST',
        400
      );
    }

    const item = await moderationQueueService.resolveItem(
      id,
      action,
      note,
      req.user?.id
    );

    res.json(ApiResponse.success(item, 'Item resolved successfully'));
  })
);

/**
 * @route POST /api/v1/moderation/queue/:id/escalate
 * @desc Escalate queue item to higher-level moderator
 * @access Admin only
 */
router.post(
  '/queue/:id/escalate',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { note } = req.body;

    const item = await moderationQueueService.escalateItem(id, note, req.user?.id);

    res.json(ApiResponse.success(item, 'Item escalated successfully'));
  })
);

export default router;
