import { Router, Request, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as offerService from '../services/offerService';
import { OfferStatus, OfferType } from '../types/offer.types';

const router: Router = Router();

/**
 * @route POST /api/v1/offers
 * @desc Create a new offer
 * @access Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const {
      merchantId,
      title,
      description,
      type,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableScope,
      validFrom,
      validUntil,
      totalStock,
      dailyLimit,
      stockAlertThreshold,
      publishType,
      scheduledPublishAt,
    } = req.body;

    if (!merchantId || !title || !type || !validFrom || !validUntil || !totalStock) {
      throw new AppError(
        'Merchant ID, title, type, valid dates, and stock are required',
        'MISSING_FIELDS',
        400
      );
    }

    if (!Object.values(OfferType).includes(type)) {
      throw new AppError('Invalid offer type', 'INVALID_TYPE', 400);
    }

    const offer = await offerService.createOffer({
      merchantId,
      title,
      description,
      type,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableScope,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      totalStock,
      dailyLimit,
      stockAlertThreshold,
      publishType,
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : undefined,
    });

    res.status(201).json(ApiResponse.success(offer));
  })
);

/**
 * @route GET /api/v1/offers
 * @desc List offers with filtering
 * @access Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { merchantId, status, type, activeOnly, page, limit, sortBy, sortOrder } = req.query;

    const result = await offerService.listOffers({
      merchantId: merchantId as string,
      status: status as OfferStatus,
      type: type as OfferType,
      activeOnly: activeOnly === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/offers/:id
 * @desc Get offer by ID
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
    const offer = await offerService.getOfferById(id);

    // Increment view count
    await offerService.incrementViewCount(id);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route PUT /api/v1/offers/:id
 * @desc Update offer
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
    const {
      title,
      description,
      type,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableScope,
      validFrom,
      validUntil,
      totalStock,
      dailyLimit,
      stockAlertThreshold,
      status,
      publishType,
      scheduledPublishAt,
    } = req.body;

    const offer = await offerService.updateOffer(id, {
      title,
      description,
      type,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableScope,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      totalStock,
      dailyLimit,
      stockAlertThreshold,
      status,
      publishType,
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : undefined,
    });

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route PATCH /api/v1/offers/:id/status
 * @desc Update offer status
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

    if (!status || !Object.values(OfferStatus).includes(status)) {
      throw new AppError('Valid status is required', 'INVALID_STATUS', 400);
    }

    const offer = await offerService.updateOfferStatus(id, status as OfferStatus);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route POST /api/v1/offers/:id/publish
 * @desc Publish offer
 * @access Private
 */
router.post(
  '/:id/publish',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const offer = await offerService.publishOffer(id);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route POST /api/v1/offers/:id/unpublish
 * @desc Unpublish offer
 * @access Private
 */
router.post(
  '/:id/unpublish',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const offer = await offerService.unpublishOffer(id);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route POST /api/v1/offers/:id/pause
 * @desc Pause offer
 * @access Private
 */
router.post(
  '/:id/pause',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const offer = await offerService.pauseOffer(id);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route POST /api/v1/offers/:id/resume
 * @desc Resume offer
 * @access Private
 */
router.post(
  '/:id/resume',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const offer = await offerService.resumeOffer(id);

    res.json(ApiResponse.success(offer));
  })
);

/**
 * @route GET /api/v1/offers/low-stock
 * @desc Get offers with low stock
 * @access Private
 */
router.get(
  '/low-stock/list',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { merchantId } = req.query;
    const alerts = await offerService.getLowStockOffers(merchantId as string);

    res.json(ApiResponse.success(alerts));
  })
);

/**
 * @route POST /api/v1/offers/:id/deduct-stock
 * @desc Deduct stock for an offer
 * @access Private
 */
router.post(
  '/:id/deduct-stock',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { quantity } = req.body;

    const success = await offerService.deductStock(id, quantity || 1);

    if (!success) {
      throw new AppError('Failed to deduct stock - offer may be inactive or out of stock', 'STOCK_DEDUCTION_FAILED', 400);
    }

    res.json(ApiResponse.success({ success: true }));
  })
);

/**
 * @route POST /api/v1/offers/extract-from-ai
 * @desc Create offer from AI extracted data
 * @access Private
 */
router.post(
  '/extract-from-ai',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { merchantId, extractedData } = req.body;

    if (!merchantId || !extractedData) {
      throw new AppError('Merchant ID and extracted data are required', 'MISSING_FIELDS', 400);
    }

    const offer = await offerService.createOfferFromAI(merchantId, extractedData);

    res.status(201).json(ApiResponse.success(offer));
  })
);

/**
 * @route DELETE /api/v1/offers/:id
 * @desc Delete offer
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
    await offerService.deleteOffer(id);

    res.json(ApiResponse.success({ deleted: true }));
  })
);

export default router;
