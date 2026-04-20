import { Router, Request, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as merchantService from '../services/merchantService';
import { MerchantStatus } from '../types/merchant.types';

const router: Router = Router();

/**
 * @route POST /api/v1/merchants
 * @desc Create a new merchant
 * @access Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId, name, address, phone, businessHours, description, logoUrl, category } =
      req.body;

    if (!agentId || !name) {
      throw new AppError('Agent ID and name are required', 'MISSING_FIELDS', 400);
    }

    const merchant = await merchantService.createMerchant({
      agentId,
      name,
      address,
      phone,
      businessHours,
      description,
      logoUrl,
      category,
    });

    res.status(201).json(ApiResponse.success(merchant));
  })
);

/**
 * @route GET /api/v1/merchants
 * @desc List merchants with filtering
 * @access Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { status, category, page, limit, sortBy, sortOrder } = req.query;

    const result = await merchantService.listMerchants({
      status: status as MerchantStatus,
      category: category as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/merchants/:id
 * @desc Get merchant by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const merchant = await merchantService.getMerchantById(id);

    res.json(ApiResponse.success(merchant));
  })
);

/**
 * @route GET /api/v1/merchants/agent/:agentId
 * @desc Get merchant by agent ID
 * @access Private
 */
router.get(
  '/agent/:agentId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const merchant = await merchantService.getMerchantByAgentId(agentId);

    if (!merchant) {
      throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(merchant));
  })
);

/**
 * @route PUT /api/v1/merchants/:id
 * @desc Update merchant
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
    const { name, address, phone, businessHours, description, logoUrl, category, status } =
      req.body;

    const merchant = await merchantService.updateMerchant(id, {
      name,
      address,
      phone,
      businessHours,
      description,
      logoUrl,
      category,
      status: status as MerchantStatus,
    });

    res.json(ApiResponse.success(merchant));
  })
);

/**
 * @route PATCH /api/v1/merchants/:id/status
 * @desc Update merchant status
 * @access Private
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(MerchantStatus).includes(status)) {
      throw new AppError('Valid status is required', 'INVALID_STATUS', 400);
    }

    const merchant = await merchantService.updateMerchantStatus(id, status as MerchantStatus);

    res.json(ApiResponse.success(merchant));
  })
);

/**
 * @route GET /api/v1/merchants/:id/stats
 * @desc Get merchant statistics
 * @access Private
 */
router.get(
  '/:id/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const stats = await merchantService.getMerchantStats(id);

    res.json(ApiResponse.success(stats));
  })
);

/**
 * @route DELETE /api/v1/merchants/:id
 * @desc Delete merchant
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    await merchantService.deleteMerchant(id);

    res.json(ApiResponse.success({ deleted: true }));
  })
);

export default router;
