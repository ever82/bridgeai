/**
 * Send expiring coupon reminders
 * This should be called by a scheduled job (e.g., every hour)
 */
export declare function sendExpiringCouponReminders(): Promise<number>;
/**
 * Send coupon used confirmation
 */
export declare function sendCouponUsedNotification(couponId: string): Promise<void>;
/**
 * Send coupon expired notification
 */
export declare function sendCouponExpiredNotification(couponId: string): Promise<void>;
/**
 * Send coupon created notification
 */
export declare function sendCouponCreatedNotification(couponId: string): Promise<void>;
/**
 * Expire coupons that have passed their validity period
 * This should be called by a scheduled job
 */
export declare function expireOutdatedCoupons(): Promise<number>;
/**
 * Send rating reminder notification
 */
export declare function sendRatingReminderNotification(couponId: string): Promise<void>;
//# sourceMappingURL=couponNotificationService.d.ts.map