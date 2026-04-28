/**
 * Appeal Routes
 * General appeal system for moderation, violations, and warnings.
 *
 * GET  /api/v1/appeals           - List appeals (admin only, with filters)
 * GET  /api/v1/appeals/:id       - Get single appeal (admin only)
 * POST /api/v1/appeals           - Submit appeal (auth required)
 * POST /api/v1/appeals/:id/review - Admin reviews (admin only)
 * POST /api/v1/appeals/:id/withdraw - Withdraw appeal (owner only)
 */

import { Router, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import { appealService } from '../services/appealService';

const router: Router = Router();

/**
 * Admin authentication middleware
 */
function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: () => void
): void {
  if (!req.user) {
    throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    throw new AppError('Admin access required', 'FORBIDDEN', 403);
  }
  next();
}

/**
 * @route GET /api/v1/appeals
 * @desc List appeals (admin only, with filters)
 * @access Admin
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;
    const appealType = req.query.appealType as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await appealService.getAppeals({ status, userId, appealType, page, limit });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/appeals/:id
 * @desc Get single appeal (admin only)
 * @access Admin
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const appeal = await appealService.getAppealById(id);

    if (!appeal) {
      throw new AppError('Appeal not found', 'APPEAL_NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(appeal));
  })
);

/**
 * @route POST /api/v1/appeals
 * @desc Submit a new appeal (auth required)
 * @access Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { appealType, targetId, targetType, reason, evidence } = req.body;

    if (!appealType || !targetId || !targetType || !reason) {
      throw new AppError(
        'appealType, targetId, targetType, and reason are required',
        'INVALID_REQUEST',
        400
      );
    }

    const validTypes = ['MODERATION', 'VIOLATION', 'WARNING', 'OTHER'];
    if (!validTypes.includes(appealType)) {
      throw new AppError(
        `appealType must be one of: ${validTypes.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    const validTargetTypes = ['report', 'violation', 'warning'];
    if (!validTargetTypes.includes(targetType)) {
      throw new AppError(
        `targetType must be one of: ${validTargetTypes.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    const appeal = await appealService.submitAppeal({
      appealType,
      userId: req.user.id,
      targetId,
      targetType,
      reason,
      evidence,
    });

    res.status(201).json(ApiResponse.success(appeal, 'Appeal submitted successfully'));
  })
);

/**
 * @route POST /api/v1/appeals/:id/review
 * @desc Admin reviews an appeal
 * @access Admin
 */
router.post(
  '/:id/review',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { status, reviewNote, resolution } = req.body;

    if (!status) {
      throw new AppError('status is required', 'INVALID_REQUEST', 400);
    }

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        `status must be one of: ${validStatuses.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    const appeal = await appealService.reviewAppeal(id, {
      reviewedBy: req.user.id,
      status,
      reviewNote,
      resolution,
    });

    res.json(ApiResponse.success(appeal, `Appeal ${status.toLowerCase()}`));
  })
);

/**
 * @route POST /api/v1/appeals/:id/withdraw
 * @desc Withdraw a pending appeal (owner only)
 * @access Private
 */
router.post(
  '/:id/withdraw',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;

    const appeal = await appealService.withdrawAppeal(id, req.user.id);

    res.json(ApiResponse.success(appeal, 'Appeal withdrawn successfully'));
  })
);

export default router;