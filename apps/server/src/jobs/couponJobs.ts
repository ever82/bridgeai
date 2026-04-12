import { sendExpiringCouponReminders, expireOutdatedCoupons } from '../services/couponNotificationService';

/**
 * Coupon scheduled jobs
 *
 * These functions should be called by a job scheduler like node-cron or Bull
 */

/**
 * Run coupon reminder job
 * Should be scheduled to run every hour
 */
export async function runCouponReminderJob(): Promise<void> {
  console.log('[JOB] Starting coupon reminder job...');
  const startTime = Date.now();

  try {
    const sentCount = await sendExpiringCouponReminders();
    const duration = Date.now() - startTime;
    console.log(`[JOB] Coupon reminder job completed: ${sentCount} reminders sent in ${duration}ms`);
  } catch (error) {
    console.error('[JOB] Coupon reminder job failed:', error);
    throw error;
  }
}

/**
 * Run coupon expiration job
 * Should be scheduled to run every hour
 */
export async function runCouponExpirationJob(): Promise<void> {
  console.log('[JOB] Starting coupon expiration job...');
  const startTime = Date.now();

  try {
    const expiredCount = await expireOutdatedCoupons();
    const duration = Date.now() - startTime;
    console.log(`[JOB] Coupon expiration job completed: ${expiredCount} coupons expired in ${duration}ms`);
  } catch (error) {
    console.error('[JOB] Coupon expiration job failed:', error);
    throw error;
  }
}

/**
 * Initialize scheduled jobs
 * Call this function when the server starts
 */
export function initializeCouponJobs(): void {
  console.log('[JOBS] Initializing coupon scheduled jobs...');

  // In production, use a proper job scheduler like:
  // - node-cron for simple cron-based scheduling
  // - Bull with Redis for distributed job queues
  // - AWS Lambda/EventBridge for serverless environments

  // Example with node-cron (would need to install node-cron):
  // import cron from 'node-cron';
  // cron.schedule('0 * * * *', runCouponReminderJob); // Every hour
  // cron.schedule('0 * * * *', runCouponExpirationJob); // Every hour

  console.log('[JOBS] Coupon scheduled jobs initialized');
}
