import { CouponStatus, Prisma } from '@prisma/client';
/**
 * Generate a unique promo code
 * Format: AD-XXXX-XXXX (where X is alphanumeric)
 */
export declare function generatePromoCode(): string;
/**
 * Generate QR code data for a coupon
 */
export declare function generateQRCodeData(couponId: string, code: string): string;
/**
 * Verify QR code data
 */
export declare function verifyQRCodeData(qrData: string): {
    valid: boolean;
    couponId?: string;
    code?: string;
};
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
export declare function createCoupon(params: CreateCouponParams): Promise<{
    qrCodeData: string;
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Get coupon by ID
 */
export declare function getCouponById(couponId: string): Promise<{
    transactions: {
        userId: string;
        amount: number | null;
        id: string;
        type: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        couponId: string;
        orderId: string | null;
    }[];
    merchant: {
        id: string;
        name: string;
        phone: string;
        address: string;
        logoUrl: string;
    };
    offer: {
        id: string;
        description: string;
        title: string;
    };
    ratings: {
        userId: string;
        id: string;
        createdAt: Date;
        rating: number;
        comment: string | null;
        couponId: string;
        isUseful: boolean;
    }[];
} & {
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Get coupon by code
 */
export declare function getCouponByCode(code: string): Promise<{
    merchant: {
        id: string;
        description: string | null;
        createdAt: Date;
        name: string;
        category: string | null;
        updatedAt: Date;
        phone: string | null;
        status: import(".prisma/client").$Enums.MerchantStatus;
        agentId: string;
        address: string | null;
        businessHours: Prisma.JsonValue | null;
        logoUrl: string | null;
    };
    offer: {
        id: string;
        type: import(".prisma/client").$Enums.OfferType;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OfferStatus;
        dailyLimit: number | null;
        title: string;
        merchantId: string;
        discountValue: Prisma.Decimal | null;
        minPurchaseAmount: Prisma.Decimal | null;
        maxDiscountAmount: Prisma.Decimal | null;
        applicableScope: Prisma.JsonValue | null;
        validFrom: Date;
        validUntil: Date;
        totalStock: number;
        remainingStock: number;
        stockAlertThreshold: number;
        publishType: import(".prisma/client").$Enums.OfferPublishType;
        scheduledPublishAt: Date | null;
        aiExtracted: boolean;
        aiExtractionData: Prisma.JsonValue | null;
        aiConfidence: number | null;
        usageCount: number;
        viewCount: number;
    };
} & {
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Get consumer's coupons
 */
export declare function getConsumerCoupons(consumerId: string, status?: CouponStatus): Promise<({
    transactions: {
        userId: string;
        amount: number | null;
        id: string;
        type: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        couponId: string;
        orderId: string | null;
    }[];
    merchant: {
        id: string;
        name: string;
        address: string;
        logoUrl: string;
    };
    offer: {
        id: string;
        description: string;
        title: string;
    };
} & {
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
})[]>;
/**
 * Get merchant's coupons
 */
export declare function getMerchantCoupons(merchantId: string, status?: CouponStatus): Promise<({
    offer: {
        id: string;
        title: string;
    };
} & {
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
})[]>;
/**
 * Validate coupon for redemption
 */
export declare function validateCoupon(couponId: string, merchantId: string): Promise<{
    valid: boolean;
    error?: string;
    coupon?: Awaited<ReturnType<typeof getCouponById>>;
}>;
/**
 * Redeem coupon (offline mode)
 */
export declare function redeemCoupon(couponId: string, merchantId: string): Promise<{
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Use coupon for online purchase
 */
export declare function useCouponOnline(couponId: string, paymentMethod: string, pointsUsed?: number): Promise<{
    coupon: {
        id: string;
        description: string | null;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.CouponStatus;
        code: string;
        merchantId: string | null;
        discountValue: number;
        maxDiscountAmount: number | null;
        validFrom: Date;
        validUntil: Date;
        offerId: string | null;
        consumerId: string | null;
        originalPrice: number | null;
        discountPrice: number | null;
        discountType: string;
        minOrderAmount: number | null;
        totalCount: number;
        remainingCount: number;
        perUserLimit: number;
        usedCount: number;
        maxUsageCount: number;
        usedAt: Date | null;
        reminderSent: boolean;
        redeemedBy: string | null;
    };
    transaction: {
        userId: string;
        amount: number | null;
        id: string;
        type: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        couponId: string;
        orderId: string | null;
    };
}>;
/**
 * Expire coupon
 */
export declare function expireCoupon(couponId: string): Promise<{
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Cancel coupon
 */
export declare function cancelCoupon(couponId: string, consumerId: string): Promise<{
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
/**
 * Get expiring coupons (for reminder notifications)
 */
export declare function getExpiringCoupons(hoursBeforeExpiry?: number): Promise<({
    merchant: {
        id: string;
        name: string;
    };
    offer: {
        title: string;
    };
} & {
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
})[]>;
/**
 * Mark reminder as sent
 */
export declare function markReminderSent(couponId: string): Promise<{
    id: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.CouponStatus;
    code: string;
    merchantId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    validFrom: Date;
    validUntil: Date;
    offerId: string | null;
    consumerId: string | null;
    originalPrice: number | null;
    discountPrice: number | null;
    discountType: string;
    minOrderAmount: number | null;
    totalCount: number;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}>;
interface CreateRatingParams {
    couponId: string;
    raterId: string;
    rateeId: string;
    raterType: string;
    score: number;
    comment?: string;
}
/**
 * Create rating for a coupon transaction
 */
export declare function createRating(params: CreateRatingParams): Promise<{
    userId: string;
    id: string;
    createdAt: Date;
    rating: number;
    comment: string | null;
    couponId: string;
    isUseful: boolean;
}>;
/**
 * Get ratings for a coupon
 */
export declare function getCouponRatings(couponId: string): Promise<{
    userId: string;
    id: string;
    createdAt: Date;
    rating: number;
    comment: string | null;
    couponId: string;
    isUseful: boolean;
}[]>;
/**
 * Get ratings by ratee
 */
export declare function getRateeRatings(userId: string): Promise<{
    userId: string;
    id: string;
    createdAt: Date;
    rating: number;
    comment: string | null;
    couponId: string;
    isUseful: boolean;
}[]>;
/**
 * Get coupon statistics
 */
export declare function getCouponStatistics(merchantId?: string): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    usedCoupons: number;
    expiredCoupons: number;
    totalDiscount: number;
    totalTransactions: number;
    conversionRate: number;
}>;
export {};
//# sourceMappingURL=promoCodeService.d.ts.map