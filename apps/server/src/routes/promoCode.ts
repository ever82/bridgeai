import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CouponStatus, TransactionStatus } from '@prisma/client';

import { authenticate, requireRole } from '../middleware/auth';
import { validate as validateRequest } from '../middleware/validation';
import {
  createCoupon,
  getCouponById,
  getCouponByCode,
  getConsumerCoupons,
  getMerchantCoupons,
  validateCoupon,
  redeemCoupon,
  useCouponOnline,
  cancelCoupon,
  createRating,
  getCouponRatings,
  getRateeRatings,
  getCouponStatistics,
  verifyQRCodeData,
} from '../services/promoCodeService';
import { AppError } from '../errors/AppError';

const router: Router = Router();

// Validation schemas
const createCouponSchema = z.object({
  offerId: z.string().uuid(),
  merchantId: z.string().uuid(),
  originalPrice: z.number().positive(),
  discountPrice: z.number().positive(),
  validHours: z.number().int().min(1).max(720).optional(),
  maxUsageCount: z.number().int().min(1).max(100).optional(),
  negotiationId: z.string().uuid().optional(),
  onlineUrl: z.string().url().optional(),
});

const redeemSchema = z.object({
  qrCodeData: z.string().min(1),
});

const onlineUseSchema = z.object({
  couponId: z.string().uuid(),
  paymentMethod: z.enum(['wechat', 'alipay', 'points']),
  pointsUsed: z.number().min(0).optional(),
});

const ratingSchema = z.object({
  couponId: z.string().uuid(),
  rateeId: z.string().uuid(),
  raterType: z.enum(['CONSUMER', 'MERCHANT']),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const querySchema = z.object({
  status: z.enum(['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'DISABLED']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Create a new coupon
router.post(
  '/',
  authenticate,
  (validateRequest as any)(createCouponSchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const coupon = await createCoupon({
      ...req.body,
      consumerId: userId,
    });

    res.status(201).json({
      success: true,
      data: coupon,
    });
  }
);

// Get coupon by ID
router.get(
  '/:couponId',
  authenticate,
  async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const coupon = await getCouponById(couponId);

    if (!coupon) {
      throw new AppError('优惠码不存在', 'COUPON_NOT_FOUND', 404);
    }

    const userId = (req as any).user?.id;
    if (coupon.consumerId !== userId && coupon.merchantId !== userId) {
      throw new AppError('无权访问此优惠码', 'FORBIDDEN', 403);
    }

    res.json({
      success: true,
      data: coupon,
    });
  }
);

// Get coupon by code (public endpoint for verification)
router.get(
  '/code/:code',
  authenticate,
  async (req: Request, res: Response) => {
    const { code } = req.params;
    const coupon = await getCouponByCode(code);

    if (!coupon) {
      throw new AppError('优惠码不存在', 'COUPON_NOT_FOUND', 404);
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        status: coupon.status,
        validUntil: coupon.validUntil,
        merchant: (coupon as any).merchant,
        offer: (coupon as any).offer,
      },
    });
  }
);

// Get consumer's coupons
router.get(
  '/consumer/my-coupons',
  authenticate,
  (validateRequest as any)(querySchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const status = req.query.status as CouponStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const coupons = await getConsumerCoupons(userId, status);

    const start = (page - 1) * limit;
    const paginatedCoupons = coupons.slice(start, start + limit);

    res.json({
      success: true,
      data: {
        coupons: paginatedCoupons,
        pagination: {
          total: coupons.length,
          page,
          limit,
          pages: Math.ceil(coupons.length / limit),
        },
      },
    });
  }
);

// Get merchant's coupons
router.get(
  '/merchant/my-coupons',
  authenticate,
  (requireRole as any)('MERCHANT', 'ADMIN'),
  (validateRequest as any)(querySchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const status = req.query.status as CouponStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const coupons = await getMerchantCoupons(userId, status);

    const start = (page - 1) * limit;
    const paginatedCoupons = coupons.slice(start, start + limit);

    res.json({
      success: true,
      data: {
        coupons: paginatedCoupons,
        pagination: {
          total: coupons.length,
          page,
          limit,
          pages: Math.ceil(coupons.length / limit),
        },
      },
    });
  }
);

// Validate coupon by QR code (for merchant redemption)
router.post(
  '/validate-qr',
  authenticate,
  (requireRole as any)('MERCHANT', 'ADMIN'),
  (validateRequest as any)(redeemSchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const { qrCodeData } = req.body;
    const verification = verifyQRCodeData(qrCodeData);

    if (!verification.valid || !verification.couponId) {
      throw new AppError('无效的二维码', 'INVALID_QR_CODE', 400);
    }

    const validation = await validateCoupon(verification.couponId, userId);

    if (!validation.valid) {
      throw new AppError(validation.error || 'Invalid coupon', 'COUPON_INVALID', 400);
    }

    res.json({
      success: true,
      data: validation.coupon,
    });
  }
);

// Redeem coupon (offline mode)
router.post(
  '/redeem',
  authenticate,
  (requireRole as any)('MERCHANT', 'ADMIN'),
  (validateRequest as any)(redeemSchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const { qrCodeData } = req.body;
    const verification = verifyQRCodeData(qrCodeData);

    if (!verification.valid || !verification.couponId) {
      throw new AppError('无效的二维码', 'INVALID_QR_CODE', 400);
    }

    const coupon = await redeemCoupon(verification.couponId, userId);

    res.json({
      success: true,
      message: '核销成功',
      data: coupon,
    });
  }
);

// Use coupon online
router.post(
  '/use-online',
  authenticate,
  (validateRequest as any)(onlineUseSchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const { couponId, paymentMethod, pointsUsed } = req.body;

    const coupon = await getCouponById(couponId);
    if (!coupon || coupon.consumerId !== userId) {
      throw new AppError('无权使用此优惠码', 'FORBIDDEN', 403);
    }

    const result = await useCouponOnline(couponId, paymentMethod, pointsUsed);

    res.json({
      success: true,
      message: '支付成功',
      data: result,
    });
  }
);

// Cancel coupon
router.post(
  '/:couponId/cancel',
  authenticate,
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const { couponId } = req.params;
    const coupon = await cancelCoupon(couponId, userId);

    res.json({
      success: true,
      message: '优惠码已取消',
      data: coupon,
    });
  }
);

// Create rating
router.post(
  '/ratings',
  authenticate,
  (validateRequest as any)(ratingSchema),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const rating = await createRating({
      ...req.body,
      raterId: userId,
    });

    res.status(201).json({
      success: true,
      data: rating,
    });
  }
);

// Get ratings for a coupon
router.get(
  '/:couponId/ratings',
  authenticate,
  async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const ratings = await getCouponRatings(couponId);

    res.json({
      success: true,
      data: ratings,
    });
  }
);

// Get my ratings (as ratee)
router.get(
  '/ratings/my',
  authenticate,
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const ratings = await getRateeRatings(userId);

    res.json({
      success: true,
      data: ratings,
    });
  }
);

// Get coupon statistics
router.get(
  '/statistics',
  authenticate,
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const stats = await getCouponStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  }
);

// Get merchant coupon statistics
router.get(
  '/merchant/statistics',
  authenticate,
  (requireRole as any)('MERCHANT', 'ADMIN'),
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const stats = await getCouponStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  }
);

// Get online payment URL with coupon
router.get(
  '/:couponId/online-url',
  authenticate,
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401);
    }

    const { couponId } = req.params;
    const coupon = await getCouponById(couponId);

    if (!coupon || coupon.consumerId !== userId) {
      throw new AppError('无权访问此优惠码', 'FORBIDDEN', 403);
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new AppError('优惠码状态无效', 'COUPON_INVALID', 400);
    }

    const baseUrl = (coupon as any).onlineUrl || `/merchant/${coupon.merchantId}/pay`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const onlineUrl = `${baseUrl}${separator}couponCode=${coupon.code}`;

    res.json({
      success: true,
      data: {
        onlineUrl,
        couponCode: coupon.code,
        discountPrice: coupon.discountPrice,
        validUntil: coupon.validUntil,
      },
    });
  }
);

export default router;
