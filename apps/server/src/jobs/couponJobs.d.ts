/**
 * Coupon scheduled jobs
 *
 * These functions should be called by a job scheduler like node-cron or Bull
 */
/**
 * Run coupon reminder job
 * Should be scheduled to run every hour
 */
export declare function runCouponReminderJob(): Promise<void>;
/**
 * Run coupon expiration job
 * Should be scheduled to run every hour
 */
export declare function runCouponExpirationJob(): Promise<void>;
/**
 * Initialize scheduled jobs
 * Call this function when the server starts
 */
export declare function initializeCouponJobs(): void;
//# sourceMappingURL=couponJobs.d.ts.map