/**
 * VisionShare Payment Service
 * Handles points-based photo payment in VisionShare scenario
 * Including balance check, payment processing, platform commission, and refund
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

// VisionShare payment configuration
const VISION_SHARE_CONFIG = {
  viewPhotoRuleCode: 'VIEW_PHOTO',
  platformCommissionRate: 0.1, // 10% platform commission
  unlockTokenExpiryHours: 24,
};

export interface PhotoPaymentRequest {
  buyerUserId: string;
  photoId: string;
  photographerUserId: string;
}

export interface PhotoPaymentResult {
  success: boolean;
  transactionId?: string;
  photographerTransactionId?: string;
  commissionTransactionId?: string;
  pointsCharged: number;
  photographerPoints: number;
  platformCommission: number;
  error?: string;
}

export interface BalanceCheckResult {
  sufficient: boolean;
  currentBalance: number;
  requiredPoints: number;
  photoId: string;
}

export interface PhotoUnlockResult {
  success: boolean;
  photoUrl: string;
  unlockToken: string;
  expiresAt: string;
  error?: string;
}

export class VisionSharePaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  // ==================== Balance Check ====================

  /**
   * Check if user has sufficient balance for viewing a photo
   */
  async checkBalance(
    userId: string,
    photoId: string
  ): Promise<BalanceCheckResult> {
    const account = await this.prisma.pointsAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return {
        sufficient: false,
        currentBalance: 0,
        requiredPoints: 50,
        photoId,
      };
    }

    const requiredPoints = 50; // Default cost per photo view

    return {
      sufficient: account.balance >= requiredPoints,
      currentBalance: account.balance,
      requiredPoints,
      photoId,
    };
  }

  // ==================== Payment Processing ====================

  /**
   * Process photo payment: deduct points from buyer, give to photographer, take platform commission
   */
  async processPayment(
    request: PhotoPaymentRequest
  ): Promise<PhotoPaymentResult> {
    const { buyerUserId, photoId, photographerUserId } = request;

    if (buyerUserId === photographerUserId) {
      return {
        success: false,
        error: 'Cannot pay for your own photo',
        pointsCharged: 0,
        photographerPoints: 0,
        platformCommission: 0,
      };
    }

    // Check balance first
    const balanceCheck = await this.checkBalance(buyerUserId, photoId);
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        error: 'Insufficient points',
        pointsCharged: 0,
        photographerPoints: 0,
        platformCommission: 0,
      };
    }

    const totalCost = balanceCheck.requiredPoints;
    const commissionRate = VISION_SHARE_CONFIG.platformCommissionRate;
    const platformCommission = Math.floor(totalCost * commissionRate);
    const photographerPoints = totalCost - platformCommission;

    try {
      // Execute payment in a database transaction
      const result = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 1. Deduct from buyer
          const buyerAccount = await tx.pointsAccount.findUnique({
            where: { userId: buyerUserId },
          });
          if (!buyerAccount) {
            throw new AppError('Buyer points account not found', 'ACCOUNT_NOT_FOUND', 404);
          }

          const newBuyerBalance = buyerAccount.balance - totalCost;
          if (newBuyerBalance < 0) {
            throw new AppError('Insufficient points', 'INSUFFICIENT_POINTS', 400);
          }

          await tx.pointsAccount.update({
            where: { userId: buyerUserId, version: buyerAccount.version },
            data: {
              balance: newBuyerBalance,
              totalSpent: buyerAccount.totalSpent + totalCost,
              version: buyerAccount.version + 1,
            },
          });

          const buyerTx = await tx.pointsTransaction.create({
            data: {
              accountId: buyerAccount.id,
              userId: buyerUserId,
              type: 'SPEND' as any,
              amount: -totalCost,
              balanceAfter: newBuyerBalance,
              description: `查看照片支付 - ${photoId}`,
              scene: 'VISION_SHARE' as any,
              referenceId: photoId,
              metadata: JSON.stringify({
                photoId,
                photographerUserId,
                totalCost,
                platformCommission,
                photographerPoints,
              }),
            },
          });

          // 2. Credit photographer
          let photographerTx;
          let photographerAccount = await tx.pointsAccount.findUnique({
            where: { userId: photographerUserId },
          });

          if (photographerAccount) {
            const newPhotographerBalance = photographerAccount.balance + photographerPoints;
            await tx.pointsAccount.update({
              where: { userId: photographerUserId, version: photographerAccount.version },
              data: {
                balance: newPhotographerBalance,
                totalEarned: photographerAccount.totalEarned + photographerPoints,
                version: photographerAccount.version + 1,
              },
            });

            photographerTx = await tx.pointsTransaction.create({
              data: {
                accountId: photographerAccount.id,
                userId: photographerUserId,
                type: 'EARN' as any,
                amount: photographerPoints,
                balanceAfter: newPhotographerBalance,
                description: '照片被查看奖励',
                scene: 'VISION_SHARE' as any,
                referenceId: photoId,
                metadata: JSON.stringify({
                  photoId,
                  buyerUserId,
                  commission: platformCommission,
                }),
              },
            });
          }

          return {
            buyerTransactionId: buyerTx.id,
            photographerTransactionId: photographerTx?.id,
          };
        },
        {
          isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
          maxWait: 5000,
          timeout: 15000,
        }
      );

      return {
        success: true,
        transactionId: result.buyerTransactionId,
        photographerTransactionId: result.photographerTransactionId,
        pointsCharged: totalCost,
        photographerPoints,
        platformCommission,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        pointsCharged: 0,
        photographerPoints: 0,
        platformCommission: 0,
      };
    }
  }

  // ==================== Refund ====================

  /**
   * Process refund for a failed photo payment
   */
  async processRefund(
    buyerUserId: string,
    photoId: string,
    originalTransactionId: string
  ): Promise<{ success: boolean; refundAmount: number; error?: string }> {
    try {
      const originalTx = await this.prisma.pointsTransaction.findUnique({
        where: { id: originalTransactionId },
      });

      if (!originalTx) {
        return {
          success: false,
          refundAmount: 0,
          error: 'Original transaction not found',
        };
      }

      const refundAmount = Math.abs(originalTx.amount);

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const account = await tx.pointsAccount.findUnique({
          where: { userId: buyerUserId },
        });

        if (!account) {
          throw new AppError('Points account not found', 'ACCOUNT_NOT_FOUND', 404);
        }

        await tx.pointsAccount.update({
          where: { userId: buyerUserId, version: account.version },
          data: {
            balance: account.balance + refundAmount,
            totalEarned: account.totalEarned + refundAmount,
            version: account.version + 1,
          },
        });

        await tx.pointsTransaction.create({
          data: {
            accountId: account.id,
            userId: buyerUserId,
            type: 'REFUND' as any,
            amount: refundAmount,
            balanceAfter: account.balance + refundAmount,
            description: `照片支付退款 - ${photoId}`,
            scene: 'VISION_SHARE' as any,
            referenceId: photoId,
            metadata: JSON.stringify({
              originalTransactionId,
              photoId,
              type: 'payment_refund',
            }),
          },
        });
      });

      return {
        success: true,
        refundAmount,
      };
    } catch (error: any) {
      return {
        success: false,
        refundAmount: 0,
        error: error.message || 'Refund processing failed',
      };
    }
  }

  // ==================== Unlock Token ====================

  /**
   * Generate a temporary unlock token for a purchased photo
   */
  async generateUnlockToken(
    userId: string,
    photoId: string
  ): Promise<{ token: string; expiresAt: string }> {
    const token = `unlock-${userId}-${photoId}-${Date.now()}`;
    const expiresAt = new Date(
      Date.now() + VISION_SHARE_CONFIG.unlockTokenExpiryHours * 3600000
    ).toISOString();

    return {
      token,
      expiresAt,
    };
  }

  // ==================== Payment History ====================

  /**
   * Get user's payment history for VisionShare
   */
  async getPaymentHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const transactions = await this.prisma.pointsTransaction.findMany({
      where: {
        userId,
        scene: 'VISION_SHARE' as any,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return transactions;
  }
}

// Singleton instance
export const visionSharePaymentService = new VisionSharePaymentService();
