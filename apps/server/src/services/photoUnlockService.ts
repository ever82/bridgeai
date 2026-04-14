/**
 * Photo Unlock Service
 * Handles photo unlocking after successful points payment
 * Manages unlock tokens, access control, and photo URL generation
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../db/client';
import { visionSharePaymentService } from './visionSharePaymentService';
import { AppError } from '../errors/AppError';

// Photo unlock token configuration
const UNLOCK_CONFIG = {
  tokenExpiryHours: 24,
  maxDailyUnlocks: 100,
};

export interface UnlockToken {
  id: string;
  userId: string;
  photoId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedCount: number;
}

export interface PhotoUnlockRequest {
  userId: string;
  photoId: string;
  photographerUserId: string;
}

export interface PhotoUnlockResult {
  success: boolean;
  photoUrl?: string;
  unlockToken?: string;
  expiresAt?: string;
  error?: string;
}

export interface PhotoAccessResult {
  hasAccess: boolean;
  unlockToken?: string;
  paymentRequired: boolean;
  cost?: number;
}

export class PhotoUnlockService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  // ==================== Access Check ====================

  /**
   * Check if user has access to view a photo
   */
  async checkPhotoAccess(
    userId: string,
    photoId: string
  ): Promise<PhotoAccessResult> {
    // Check if user has a valid unlock token for this photo
    const existingUnlock = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM points_freezes WHERE reference_id = $1 AND account_id = $2 AND status = 'USED' AND expires_at > NOW()`,
      photoId,
      `account-${userId}`
    ).catch(() => []);

    if (existingUnlock && (existingUnlock as any[]).length > 0) {
      return {
        hasAccess: true,
        paymentRequired: false,
      };
    }

    // Check user's payment history for this photo
    const existingPayment = await this.prisma.pointsTransaction.findFirst({
      where: {
        userId,
        scene: 'VISION_SHARE' as any,
        referenceId: photoId,
        createdAt: {
          gte: new Date(Date.now() - UNLOCK_CONFIG.tokenExpiryHours * 3600000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      return {
        hasAccess: true,
        unlockToken: existingPayment.id,
        paymentRequired: false,
      };
    }

    // Get the required points for viewing
    const balanceCheck = await visionSharePaymentService.checkBalance(userId, photoId);

    return {
      hasAccess: false,
      paymentRequired: true,
      cost: balanceCheck.requiredPoints,
    };
  }

  // ==================== Unlock Photo ====================

  /**
   * Unlock a photo after successful payment
   */
  async unlockPhoto(request: PhotoUnlockRequest): Promise<PhotoUnlockResult> {
    const { userId, photoId, photographerUserId } = request;

    try {
      // Check if already unlocked
      const access = await this.checkPhotoAccess(userId, photoId);
      if (access.hasAccess) {
        return {
          success: true,
          photoUrl: await this.generatePhotoUrl(photoId, userId),
          unlockToken: access.unlockToken,
          expiresAt: new Date(
            Date.now() + UNLOCK_CONFIG.tokenExpiryHours * 3600000
          ).toISOString(),
        };
      }

      // Process payment
      const paymentResult = await visionSharePaymentService.processPayment({
        buyerUserId: userId,
        photoId,
        photographerUserId,
      });

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || 'Payment failed',
        };
      }

      // Generate unlock token
      const unlockTokenResult = await visionSharePaymentService.generateUnlockToken(
        userId,
        photoId
      );

      // Generate photo URL
      const photoUrl = await this.generatePhotoUrl(photoId, userId);

      return {
        success: true,
        photoUrl,
        unlockToken: unlockTokenResult.token,
        expiresAt: unlockTokenResult.expiresAt,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Photo unlock failed',
      };
    }
  }

  // ==================== Validate Token ====================

  /**
   * Validate an unlock token
   */
  async validateToken(token: string): Promise<{ valid: boolean; photoId?: string; userId?: string }> {
    try {
      const result = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM points_freezes WHERE id = $1 AND status = 'USED' AND expires_at > NOW()`,
        token
      );

      if ((result as any[]).length === 0) {
        return { valid: false };
      }

      const record = (result as any[])[0];

      // Extract userId and photoId from reference
      const photoId = record.reference_id as string;
      const userId = record.account_id?.replace('account-', '') as string;

      return { valid: true, photoId, userId };
    } catch {
      return { valid: false };
    }
  }

  // ==================== Photo URL Generation ====================

  /**
   * Generate a signed URL for a photo with access control
   */
  private async generatePhotoUrl(photoId: string, userId: string): Promise<string> {
    // In production, this would generate a signed S3 URL or similar
    // For now, return a placeholder with authentication info
    const timestamp = Date.now();
    const signature = Buffer.from(`${photoId}-${userId}-${timestamp}`).toString('base64');

    return `/api/v1/photos/${photoId}/view?token=${signature}&userId=${userId}`;
  }

  // ==================== Cleanup ====================

  /**
   * Clean up expired unlock tokens
   */
  async cleanupExpiredTokens(): Promise<{ cleaned: number }> {
    const result = await this.prisma.$executeRawUnsafe(
      `DELETE FROM points_freezes WHERE expires_at < NOW() AND reason = 'photo_unlock'`
    ).catch(() => 0);

    return { cleaned: result as number };
  }

  // ==================== User's Unlocked Photos ====================

  /**
   * Get list of photos a user has unlocked
   */
  async getUnlockedPhotos(userId: string): Promise<any[]> {
    const unlocks = await this.prisma.$queryRawUnsafe(
      `SELECT reference_id as photo_id, created_at, expires_at FROM points_freezes WHERE account_id = $1 AND reason = 'photo_unlock' AND status = 'USED' AND expires_at > NOW() ORDER BY created_at DESC`,
      `account-${userId}`
    ).catch(() => []);

    return unlocks as any[];
  }
}

// Singleton instance
export const photoUnlockService = new PhotoUnlockService();
