import crypto from 'crypto';

import { CouponStatus, TransactionStatus, RatingType, Prisma } from '@prisma/client';

import { prisma } from '../db/client';

/**
 * Generate a unique promo code
 * Format: AD-XXXX-XXXX (where X is alphanumeric)
 */
export function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding I, O, 0, 1 to avoid confusion
  const part1 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `AD-${part1}-${part2}`;
}

/**
 * Generate QR code data for a coupon
 */
export function generateQRCodeData(couponId: string, code: string): string {
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', process.env.QR_CODE_SECRET || 'default-secret')
    .update(`${couponId}:${code}:${timestamp}`)
    .digest('hex')
    .slice(0, 16);

  return JSON.stringify({
    type: 'AD_COUPON',
    couponId,
    code,
    timestamp,
    signature,
  });
}

/**
 * Verify QR code data
 */
export function verifyQRCodeData(qrData: string): { valid: boolean; couponId?: string; code?: string } {
  try {
    const data = JSON.parse(qrData);
    if (data.type !== 'AD_COUPON' || !data.couponId || !data.code || !data.timestamp || !data.signature) {
      return { valid: false };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QR_CODE_SECRET || 'default-secret')
      .update(`${data.couponId}:${data.code}:${data.timestamp}`)
      .digest('hex')
      .slice(0, 16);

    if (data.signature !== expectedSignature) {
      return { valid: false };
    }

    // Check if QR code is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
    if (Date.now() - data.timestamp > maxAge) {
      return { valid: false };
    }

    return { valid: true, couponId: data.couponId, code: data.code };
  } catch {
    return { valid: false };
  }
}

interface CreateCouponParams {
  offerId: string;
  merchantId: string;
  consumerId: string;
  originalPrice: number;
  discountPrice: number;
  validHours?: number;
  maxUsageCount?: number;
  negotiationId?: string;
  onlineUrl?: string;
}

/**
 * Create a new coupon
 */
export async function createCoupon(params: CreateCouponParams) {
  const code = generatePromoCode();
  const validFrom = new Date();
  const validUntil = new Date(validFrom.getTime() + (params.validHours || 24) * 60 * 60 * 1000);
  const discountAmount = params.originalPrice - params.discountPrice;

  const qrCodeData = generateQRCodeData('', code); // Will update with ID after creation

  const coupon = await prisma.coupon.create({
    data: {
      code,
      offerId: params.offerId,
      merchantId: params.merchantId,
      consumerId: params.consumerId,
      originalPrice: params.originalPrice,
      discountPrice: params.discountPrice,
      discountAmount,
      validFrom,
      validUntil,
      maxUsageCount: params.maxUsageCount || 1,
      usedCount: 0,
      negotiationId: params.negotiationId,
      onlineUrl: params.onlineUrl,
      qrCodeData,
      status: CouponStatus.ACTIVE,
    },
  });

  // Update QR code data with the actual coupon ID
  const updatedQRCodeData = generateQRCodeData(coupon.id, code);
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { qrCodeData: updatedQRCodeData },
  });

  return {
    ...coupon,
    qrCodeData: updatedQRCodeData,
  };
}

/**
 * Get coupon by ID
 */
export async function getCouponById(couponId: string) {
  return prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      offer: {
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          address: true,
          phone: true,
        },
      },
      transaction: true,
      ratings: true,
    },
  });
}

/**
 * Get coupon by code
 */
export async function getCouponByCode(code: string) {
  return prisma.coupon.findUnique({
    where: { code },
    include: {
      offer: true,
      merchant: true,
    },
  });
}

/**
 * Get consumer's coupons
 */
export async function getConsumerCoupons(consumerId: string, status?: CouponStatus) {
  const where: Prisma.CouponWhereInput = { consumerId };
  if (status) {
    where.status = status;
  }

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      offer: {
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          address: true,
        },
      },
      transaction: true,
    },
  });
}

/**
 * Get merchant's coupons
 */
export async function getMerchantCoupons(merchantId: string, status?: CouponStatus) {
  const where: Prisma.CouponWhereInput = { merchantId };
  if (status) {
    where.status = status;
  }

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      offer: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Validate coupon for redemption
 */
export async function validateCoupon(couponId: string, merchantId: string): Promise<{
  valid: boolean;
  error?: string;
  coupon?: Awaited<ReturnType<typeof getCouponById>>;
}> {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    return { valid: false, error: '优惠码不存在' };
  }

  if (coupon.merchantId !== merchantId && coupon.redeemedBy !== merchantId) {
    return { valid: false, error: '您无权核销此优惠码' };
  }

  if (coupon.status === CouponStatus.USED) {
    return { valid: false, error: '优惠码已被使用' };
  }

  if (coupon.status === CouponStatus.EXPIRED) {
    return { valid: false, error: '优惠码已过期' };
  }

  if (coupon.status === CouponStatus.CANCELLED) {
    return { valid: false, error: '优惠码已取消' };
  }

  if (coupon.status === CouponStatus.DISABLED) {
    return { valid: false, error: '优惠码已禁用' };
  }

  if (new Date() > coupon.validUntil) {
    await expireCoupon(couponId);
    return { valid: false, error: '优惠码已过期' };
  }

  if (coupon.usedCount >= coupon.maxUsageCount) {
    return { valid: false, error: '优惠码使用次数已达上限' };
  }

  return { valid: true, coupon };
}

/**
 * Redeem coupon (offline mode)
 */
export async function redeemCoupon(couponId: string, merchantId: string) {
  const validation = await validateCoupon(couponId, merchantId);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date();

  // Update coupon status
  const updatedCoupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      status: CouponStatus.USED,
      usedCount: { increment: 1 },
      usedAt: now,
      redeemedBy: merchantId,
      updatedAt: now,
    },
  });

  // Create transaction record
  await prisma.couponTransaction.create({
    data: {
      couponId,
      consumerId: updatedCoupon.consumerId,
      merchantId: updatedCoupon.merchantId,
      amount: updatedCoupon.discountPrice,
      pointsUsed: 0,
      paymentMethod: 'offline',
      status: TransactionStatus.COMPLETED,
      completedAt: now,
    },
  });

  return updatedCoupon;
}

/**
 * Use coupon for online purchase
 */
export async function useCouponOnline(couponId: string, paymentMethod: string, pointsUsed: number = 0) {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    throw new Error('优惠码不存在');
  }

  if (coupon.status !== CouponStatus.ACTIVE) {
    throw new Error('优惠码状态无效');
  }

  if (new Date() > coupon.validUntil) {
    await expireCoupon(couponId);
    throw new Error('优惠码已过期');
  }

  const now = new Date();

  // Update coupon status
  const updatedCoupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      status: CouponStatus.USED,
      usedCount: { increment: 1 },
      usedAt: now,
      updatedAt: now,
    },
  });

  // Create transaction record
  const transaction = await prisma.couponTransaction.create({
    data: {
      couponId,
      consumerId: coupon.consumerId,
      merchantId: coupon.merchantId,
      amount: coupon.discountPrice,
      pointsUsed,
      paymentMethod,
      status: TransactionStatus.COMPLETED,
      completedAt: now,
    },
  });

  return { coupon: updatedCoupon, transaction };
}

/**
 * Expire coupon
 */
export async function expireCoupon(couponId: string) {
  return prisma.coupon.update({
    where: { id: couponId },
    data: {
      status: CouponStatus.EXPIRED,
      updatedAt: new Date(),
    },
  });
}

/**
 * Cancel coupon
 */
export async function cancelCoupon(couponId: string, consumerId: string) {
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, consumerId },
  });

  if (!coupon) {
    throw new Error('优惠码不存在或无权限');
  }

  if (coupon.status !== CouponStatus.ACTIVE) {
    throw new Error('只能取消未使用的优惠码');
  }

  return prisma.coupon.update({
    where: { id: couponId },
    data: {
      status: CouponStatus.CANCELLED,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get expiring coupons (for reminder notifications)
 */
export async function getExpiringCoupons(hoursBeforeExpiry: number = 24) {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + hoursBeforeExpiry * 60 * 60 * 1000);

  return prisma.coupon.findMany({
    where: {
      status: CouponStatus.ACTIVE,
      reminderSent: false,
      validUntil: {
        lte: expiryThreshold,
        gt: now,
      },
    },
    include: {
      consumer: {
        select: {
          id: true,
          email: true,
          phone: true,
        },
      },
      offer: {
        select: {
          title: true,
        },
      },
    },
  });
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(couponId: string) {
  return prisma.coupon.update({
    where: { id: couponId },
    data: { reminderSent: true },
  });
}

interface CreateRatingParams {
  couponId: string;
  raterId: string;
  rateeId: string;
  raterType: RatingType;
  score: number;
  comment?: string;
}

/**
 * Create rating for a coupon transaction
 */
export async function createRating(params: CreateRatingParams) {
  const coupon = await getCouponById(params.couponId);

  if (!coupon) {
    throw new Error('优惠码不存在');
  }

  if (coupon.status !== CouponStatus.USED) {
    throw new Error('只能评价已完成的交易');
  }

  // Check if already rated
  const existingRating = await prisma.couponRating.findFirst({
    where: {
      couponId: params.couponId,
      raterId: params.raterId,
    },
  });

  if (existingRating) {
    throw new Error('您已经评价过此交易');
  }

  const rating = await prisma.couponRating.create({
    data: {
      couponId: params.couponId,
      raterId: params.raterId,
      rateeId: params.rateeId,
      raterType: params.raterType,
      score: params.score,
      comment: params.comment,
    },
  });

  // Update merchant credit score
  await updateMerchantCreditScore(coupon.merchantId);

  return rating;
}

/**
 * Get ratings for a coupon
 */
export async function getCouponRatings(couponId: string) {
  return prisma.couponRating.findMany({
    where: { couponId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get ratings by ratee
 */
export async function getRateeRatings(rateeId: string) {
  return prisma.couponRating.findMany({
    where: { rateeId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update merchant credit score based on ratings
 */
async function updateMerchantCreditScore(merchantId: string) {
  const ratings = await prisma.couponRating.findMany({
    where: {
      rateeId: merchantId,
      raterType: RatingType.CONSUMER,
    },
  });

  if (ratings.length === 0) return;

  const averageScore = ratings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / ratings.length;

  // Map 1-5 rating to credit score adjustment
  let creditAdjustment = 0;
  if (averageScore >= 4.5) creditAdjustment = 10;
  else if (averageScore >= 4) creditAdjustment = 5;
  else if (averageScore >= 3) creditAdjustment = 0;
  else if (averageScore >= 2) creditAdjustment = -5;
  else creditAdjustment = -10;

  await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      creditScore: {
        increment: creditAdjustment,
      },
    },
  });
}

/**
 * Get coupon statistics
 */
export async function getCouponStatistics(merchantId?: string) {
  const where: Prisma.CouponWhereInput = {};
  if (merchantId) {
    where.merchantId = merchantId;
  }

  const [
    totalCoupons,
    activeCoupons,
    usedCoupons,
    expiredCoupons,
    totalDiscount,
    totalTransactions,
  ] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.count({ where: { ...where, status: CouponStatus.ACTIVE } }),
    prisma.coupon.count({ where: { ...where, status: CouponStatus.USED } }),
    prisma.coupon.count({ where: { ...where, status: CouponStatus.EXPIRED } }),
    prisma.coupon.aggregate({
      where: { ...where, status: CouponStatus.USED },
      _sum: { discountAmount: true },
    }),
    prisma.couponTransaction.count({
      where: merchantId ? { merchantId } : {},
    }),
  ]);

  return {
    totalCoupons,
    activeCoupons,
    usedCoupons,
    expiredCoupons,
    totalDiscount: totalDiscount._sum.discountAmount || 0,
    totalTransactions,
    conversionRate: totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0,
  };
}
