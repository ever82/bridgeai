import { prisma } from '../db/client';
import {
  getExpiringCoupons,
  markReminderSent,
  getCouponById,
} from './promoCodeService';
import { CouponStatus } from '@prisma/client';

/**
 * Notification service for coupon-related notifications
 */

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send notification to user
 * This is a placeholder that should be integrated with the actual notification system
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  // TODO: Integrate with actual notification service (FCM, APNS, etc.)
  console.log(`[NOTIFICATION] ${payload.type}: ${payload.title} - ${payload.body}`);

  // For now, just log the notification
  // In production, this would:
  // 1. Send push notification via FCM/APNS
  // 2. Create in-app notification record
  // 3. Send SMS if enabled
  // 4. Send email if enabled
}

/**
 * Send expiring coupon reminders
 * This should be called by a scheduled job (e.g., every hour)
 */
export async function sendExpiringCouponReminders(): Promise<number> {
  const expiringCoupons = await getExpiringCoupons(24); // 24 hours before expiry

  let sentCount = 0;

  for (const coupon of expiringCoupons) {
    try {
      const hoursUntilExpiry = Math.ceil(
        (coupon.validUntil.getTime() - Date.now()) / (1000 * 60 * 60)
      );

      await sendNotification({
        userId: coupon.consumerId,
        type: 'COUPON_EXPIRING_SOON',
        title: '优惠码即将过期',
        body: `您的"${coupon.offer.title}"优惠码将在${hoursUntilExpiry}小时后过期，请及时使用。`,
        data: {
          couponId: coupon.id,
          code: coupon.code,
          type: 'expiring_soon',
        },
      });

      // Mark reminder as sent
      await markReminderSent(coupon.id);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send reminder for coupon ${coupon.id}:`, error);
    }
  }

  return sentCount;
}

/**
 * Send coupon used confirmation
 */
export async function sendCouponUsedNotification(couponId: string): Promise<void> {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  // Send to consumer
  await sendNotification({
    userId: coupon.consumerId,
    type: 'COUPON_USED',
    title: '优惠码已使用',
    body: `您在${coupon.merchant.name}的优惠码已成功核销，感谢您的使用！`,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      merchantId: coupon.merchantId,
      type: 'used',
    },
  });

  // Send to merchant
  await sendNotification({
    userId: coupon.merchantId,
    type: 'COUPON_REDEEMED',
    title: '优惠码已核销',
    body: `用户已使用优惠码 ${coupon.code} 完成消费。`,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      consumerId: coupon.consumerId,
      type: 'redeemed',
    },
  });
}

/**
 * Send coupon expired notification
 */
export async function sendCouponExpiredNotification(couponId: string): Promise<void> {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  await sendNotification({
    userId: coupon.consumerId,
    type: 'COUPON_EXPIRED',
    title: '优惠码已过期',
    body: `您的"${coupon.offer.title}"优惠码已过期，下次记得及时使用哦。`,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      type: 'expired',
    },
  });
}

/**
 * Send coupon created notification
 */
export async function sendCouponCreatedNotification(couponId: string): Promise<void> {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  await sendNotification({
    userId: coupon.consumerId,
    type: 'COUPON_CREATED',
    title: '优惠码已生成',
    body: `您在${coupon.merchant.name}的优惠码已生成，有效期至${coupon.validUntil.toLocaleDateString()}。`,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      merchantId: coupon.merchantId,
      type: 'created',
    },
  });
}

/**
 * Expire coupons that have passed their validity period
 * This should be called by a scheduled job
 */
export async function expireOutdatedCoupons(): Promise<number> {
  const now = new Date();

  const outdatedCoupons = await prisma.coupon.findMany({
    where: {
      status: CouponStatus.ACTIVE,
      validUntil: {
        lt: now,
      },
    },
  });

  let expiredCount = 0;

  for (const coupon of outdatedCoupons) {
    try {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          status: CouponStatus.EXPIRED,
          updatedAt: now,
        },
      });

      await sendCouponExpiredNotification(coupon.id);
      expiredCount++;
    } catch (error) {
      console.error(`Failed to expire coupon ${coupon.id}:`, error);
    }
  }

  return expiredCount;
}

/**
 * Send rating reminder notification
 */
export async function sendRatingReminderNotification(couponId: string): Promise<void> {
  const coupon = await getCouponById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  // Send to consumer
  await sendNotification({
    userId: coupon.consumerId,
    type: 'RATE_TRANSACTION',
    title: '请评价本次消费',
    body: `您在${coupon.merchant.name}的消费已完成，快来评价一下吧！`,
    data: {
      couponId: coupon.id,
      type: 'rate_consumer',
    },
  });

  // Send to merchant
  await sendNotification({
    userId: coupon.merchantId,
    type: 'RATE_TRANSACTION',
    title: '请评价本次交易',
    body: '有新的消费已完成，请对顾客进行评价。',
    data: {
      couponId: coupon.id,
      type: 'rate_merchant',
    },
  });
}
