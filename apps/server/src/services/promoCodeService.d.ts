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
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
export declare function getCouponById(couponId: string): Promise<({
    merchant: {
        address: string | null;
        id: string;
        name: string;
        phone: string | null;
        logoUrl: string | null;
    } | null;
    transactions: {
        metadata: Prisma.JsonValue | null;
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        couponId: string;
        amount: number | null;
        orderId: string | null;
    }[];
    ratings: {
        id: string;
        userId: string;
        rating: number;
        createdAt: Date;
        comment: string | null;
        couponId: string;
        isUseful: boolean;
    }[];
    offer: {
        title: string;
        id: string;
        description: string | null;
    } | null;
} & {
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}) | null>;
/**
 * Get coupon by code
 */
export declare function getCouponByCode(code: string): Promise<({
    merchant: {
        address: string | null;
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.MerchantStatus;
        createdAt: Date;
        phone: string | null;
        agentId: string;
        description: string | null;
        updatedAt: Date;
        category: string | null;
        businessHours: Prisma.JsonValue | null;
        logoUrl: string | null;
    } | null;
    offer: {
        title: string;
        id: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        merchantId: string;
        type: import(".prisma/client").$Enums.OfferType;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        dailyLimit: number | null;
        validUntil: Date;
        viewCount: number;
        validFrom: Date;
        discountValue: Prisma.Decimal | null;
        minPurchaseAmount: Prisma.Decimal | null;
        maxDiscountAmount: Prisma.Decimal | null;
        applicableScope: Prisma.JsonValue | null;
        totalStock: number;
        remainingStock: number;
        stockAlertThreshold: number;
        publishType: import(".prisma/client").$Enums.OfferPublishType;
        scheduledPublishAt: Date | null;
        aiExtracted: boolean;
        aiExtractionData: Prisma.JsonValue | null;
        aiConfidence: number | null;
        usageCount: number;
    } | null;
} & {
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
    remainingCount: number;
    perUserLimit: number;
    usedCount: number;
    maxUsageCount: number;
    usedAt: Date | null;
    reminderSent: boolean;
    redeemedBy: string | null;
}) | null>;
/**
 * Get consumer's coupons
 */
export declare function getConsumerCoupons(consumerId: string, status?: CouponStatus): Promise<({
    merchant: {
        address: string | null;
        id: string;
        name: string;
        logoUrl: string | null;
    } | null;
    transactions: {
        metadata: Prisma.JsonValue | null;
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        couponId: string;
        amount: number | null;
        orderId: string | null;
    }[];
    offer: {
        title: string;
        id: string;
        description: string | null;
    } | null;
} & {
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
        title: string;
        id: string;
    } | null;
} & {
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
        code: string;
        metadata: Prisma.JsonValue | null;
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.CouponStatus;
        merchantId: string | null;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        discountPrice: number | null;
        originalPrice: number | null;
        totalCount: number;
        validUntil: Date;
        validFrom: Date;
        discountValue: number;
        maxDiscountAmount: number | null;
        offerId: string | null;
        consumerId: string | null;
        discountType: string;
        minOrderAmount: number | null;
        remainingCount: number;
        perUserLimit: number;
        usedCount: number;
        maxUsageCount: number;
        usedAt: Date | null;
        reminderSent: boolean;
        redeemedBy: string | null;
    };
    transaction: {
        metadata: Prisma.JsonValue | null;
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        couponId: string;
        amount: number | null;
        orderId: string | null;
    };
}>;
/**
 * Expire coupon
 */
export declare function expireCoupon(couponId: string): Promise<{
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
    } | null;
    offer: {
        title: string;
    } | null;
} & {
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
    code: string;
    metadata: Prisma.JsonValue | null;
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.CouponStatus;
    merchantId: string | null;
    createdAt: Date;
    description: string | null;
    updatedAt: Date;
    discountPrice: number | null;
    originalPrice: number | null;
    totalCount: number;
    validUntil: Date;
    validFrom: Date;
    discountValue: number;
    maxDiscountAmount: number | null;
    offerId: string | null;
    consumerId: string | null;
    discountType: string;
    minOrderAmount: number | null;
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
    id: string;
    userId: string;
    rating: number;
    createdAt: Date;
    comment: string | null;
    couponId: string;
    isUseful: boolean;
}>;
/**
 * Get ratings for a coupon
 */
export declare function getCouponRatings(couponId: string): Promise<{
    id: string;
    userId: string;
    rating: number;
    createdAt: Date;
    comment: string | null;
    couponId: string;
    isUseful: boolean;
}[]>;
/**
 * Get ratings by ratee
 */
export declare function getRateeRatings(userId: string): Promise<{
    id: string;
    userId: string;
    rating: number;
    createdAt: Date;
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