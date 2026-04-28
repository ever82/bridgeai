/**
 * Report Routes
 * 通用举报相关路由
 *
 * POST /api/v1/reports - 创建举报（认证用户）
 * GET /api/v1/reports - 列出举报（管理员，分页+状态筛选）
 * POST /api/v1/reports/:id/handle - 管理员处理举报（APPROVE/DISMISS/HIDE）
 * POST /api/v1/reports/:id/evidence - 上传举报证据图片
 */

import path from 'path';
import fs from 'fs';

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { reportLimiter, falseReportPenaltyCheck } from '../middleware/rateLimiter';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import { prisma } from '../db/client';
import { uploadImages, handleUploadError } from '../middleware/upload';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const reportReasonEnum = [
  'SPAM',
  'INAPPROPRIATE',
  'FALSE',
  'HARASSMENT',
  'OTHER',
] as const;

// ---------------------------------------------------------------------------
// GET /api/v1/reports - List reports (admin only)
// ---------------------------------------------------------------------------

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string | undefined;
    const targetType = req.query.targetType as string | undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (targetType) {
      where.targetType = targetType.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    res.json(
      ApiResponse.success({
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  })
);

// ---------------------------------------------------------------------------
// POST /api/v1/reports - Create a report
// ---------------------------------------------------------------------------

router.post(
  '/',
  authenticate,
  reportLimiter,
  falseReportPenaltyCheck,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { targetType, targetId, reason, description, evidence } = req.body;

    // Validate required fields
    if (!targetType || !targetId || !reason) {
      throw new AppError(
        'targetType, targetId, and reason are required',
        'INVALID_REQUEST',
        400
      );
    }

    // Validate targetType
    const validTargetTypes = ['MESSAGE', 'USER', 'CONTENT'];
    if (!validTargetTypes.includes(targetType.toUpperCase())) {
      throw new AppError(
        `Invalid targetType. Must be one of: ${validTargetTypes.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    // Validate reason
    if (!reportReasonEnum.includes(reason.toUpperCase())) {
      throw new AppError(
        `Invalid reason. Must be one of: ${reportReasonEnum.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    // Prevent duplicate reports from same user for same target
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: req.user.id,
        targetType: targetType.toUpperCase(),
        targetId,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new AppError(
        'You already have a pending report for this target',
        'DUPLICATE_REPORT',
        400
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        targetType: targetType.toUpperCase(),
        targetId,
        reason: reason.toUpperCase(),
        description: description || null,
        evidence: evidence || null,
      },
    });

    res.status(201).json(ApiResponse.success(report, 'Report submitted'));
  })
);

// ---------------------------------------------------------------------------
// POST /api/v1/reports/:id/handle - Admin handles a report
// ---------------------------------------------------------------------------

router.post(
  '/:id/handle',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { action, resolution } = req.body;

    const validActions = ['RESOLVED', 'DISMISSED'];
    if (!action || !validActions.includes(action.toUpperCase())) {
      throw new AppError(
        `Invalid action. Must be one of: ${validActions.join(', ')}`,
        'INVALID_REQUEST',
        400
      );
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new AppError('Report not found', 'NOT_FOUND', 404);
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: action.toUpperCase() as 'RESOLVED' | 'DISMISSED',
        handledBy: req.user.id,
        handledAt: new Date(),
        resolution: resolution || null,
      },
    });

    res.json(ApiResponse.success(updated, `Report ${action.toLowerCase()}`));
  })
);

// ---------------------------------------------------------------------------
// POST /api/v1/reports/:id/evidence - Upload evidence images
// ---------------------------------------------------------------------------

router.post(
  '/:id/evidence',
  authenticate,
  uploadImages('files', 5, 10 * 1024 * 1024),
  handleUploadError,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new AppError('Report not found', 'NOT_FOUND', 404);
    }

    // Only reporter can add evidence
    if (report.reporterId !== req.user.id) {
      throw new AppError(
        'Only the reporter can add evidence',
        'FORBIDDEN',
        403
      );
    }

    // Cannot add evidence to resolved/dismissed reports
    if (report.status !== 'PENDING') {
      throw new AppError(
        'Cannot add evidence to a closed report',
        'INVALID_REQUEST',
        400
      );
    }

    const files = (req as unknown as { files?: Express.Multer.File[] }).files;
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 'INVALID_REQUEST', 400);
    }

    // Save files to uploads/evidence directory
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePaths: string[] = [];
    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      filePaths.push(`/uploads/evidence/${filename}`);
    }

    // Append to existing evidence
    const existingEvidence = (report.evidence as string[] | null) || [];
    const updatedEvidence = [...existingEvidence, ...filePaths];

    const updated = await prisma.report.update({
      where: { id },
      data: { evidence: updatedEvidence },
    });

    res.status(201).json(
      ApiResponse.success(
        { filePaths, evidence: updated.evidence },
        'Evidence uploaded'
      )
    );
  })
);

export default router;
