/**
 * Credit Payment Service
 * Handles VisionShare photo payments using points (credits)
 */

import { PrismaClient } from '@prisma/client';
import { SceneCode } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { pointsService } from '../pointsService';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentTransaction,
  PaymentStatus,
  PaymentConfirmation,
  UnlockedPhotoInfo,
  CreditBalance,
} from '../../../../shared/types/payment.types';
import { PhotoStatus } from '../../../../shared/types/photo.types';

const loggerCtx = logger.child({ module: 'CreditPaymentService' });

// Photo price per image in points
const DEFAULT_PHOTO_PRICE = 20;
// Download token expiry (24 hours)
const DOWNLOAD_TOKEN_EXPIRY_HOURS = 24;
// Max downloads per token
const MAX_DOWNLOADS_PER_TOKEN = 5;

// In-memory store for payment transactions (demo stage)
const paymentTransactions = new Map<string, PaymentTransaction>();
// In-memory store for download tokens
const downloadTokens = new Map<
  string,
  {
    photoId: string;
    userId: string;
    expiresAt: Date;
    maxDownloads: number;
    usedDownloads: number;
  }
>();
// In-memory store for photo statuses
const photoStatuses = new Map<string, { status: PhotoStatus; price: number; supplierId: string }>();

export class CreditPaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * Process payment for one or multiple photos
   */
  async processPayment(userId: string, request: PaymentRequest): Promise<PaymentResponse> {
    const { photoIds, totalAmount } = request;

    if (!photoIds || photoIds.length === 0) {
      return {
        success: false,
        remainingBalance: 0,
        unlockedPhotos: [],
        error: { code: 'INVALID_REQUEST', message: 'No photo IDs provided' },
      };
    }

    // Check for already unlocked photos
    const alreadyUnlocked: string[] = [];
    for (const photoId of photoIds) {
      const info = photoStatuses.get(photoId);
      if (info && info.status === PhotoStatus.UNLOCKED) {
        alreadyUnlocked.push(photoId);
      }
    }

    if (alreadyUnlocked.length === photoIds.length) {
      return {
        success: false,
        remainingBalance: 0,
        unlockedPhotos: [],
        error: { code: 'ALREADY_UNLOCKED', message: 'All photos are already unlocked' },
      };
    }

    // Filter out already-unlocked photos so we only charge for payable ones
    const payableIds = photoIds.filter(id => !alreadyUnlocked.includes(id));

    // Calculate total cost based only on payable photos
    const calculatedTotal = this.calculateTotal(payableIds);
    if (calculatedTotal !== totalAmount) {
      return {
        success: false,
        remainingBalance: 0,
        unlockedPhotos: [],
        error: {
          code: 'AMOUNT_MISMATCH',
          message: `Expected ${calculatedTotal}, got ${totalAmount}`,
        },
      };
    }

    // Check user balance
    const balance = await this.getBalance(userId);
    if (balance.available < calculatedTotal) {
      return {
        success: false,
        remainingBalance: balance.available,
        unlockedPhotos: [],
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient credits. Available: ${balance.available}, Required: ${calculatedTotal}`,
        },
      };
    }

    // Create payment transaction
    const transactionId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const transaction: PaymentTransaction = {
      id: transactionId,
      userId,
      photoId: payableIds.length === 1 ? payableIds[0] : payableIds.join(','),
      sceneId: SceneCode.VISION_SHARE,
      amount: calculatedTotal,
      currency: 'credits',
      status: PaymentStatus.PROCESSING,
      type: 'purchase' as PaymentTransaction['type'],
      metadata: {
        source: request.metadata?.source,
      },
      createdAt: new Date().toISOString(),
    };
    paymentTransactions.set(transactionId, transaction);

    // Deduct points via PointsService
    try {
      const spendResult = await pointsService.spendByRule({
        userId,
        ruleCode: 'VIEW_PHOTO',
        baseAmount: calculatedTotal,
        metadata: {
          transactionId,
          photoIds: payableIds,
          scene: SceneCode.VISION_SHARE,
        },
      });

      if (!spendResult.success) {
        transaction.status = PaymentStatus.FAILED;
        paymentTransactions.set(transactionId, transaction);

        return {
          success: false,
          remainingBalance: balance.available,
          unlockedPhotos: [],
          error: { code: 'PAYMENT_FAILED', message: spendResult.error || 'Payment failed' },
        };
      }
    } catch (error) {
      transaction.status = PaymentStatus.FAILED;
      paymentTransactions.set(transactionId, transaction);

      loggerCtx.error('Points deduction failed', { error, userId, transactionId });
      return {
        success: false,
        remainingBalance: balance.available,
        unlockedPhotos: [],
        error: { code: 'PAYMENT_FAILED', message: 'Points deduction failed' },
      };
    }

    // Mark transaction as completed
    transaction.status = PaymentStatus.COMPLETED;
    transaction.completedAt = new Date().toISOString();
    paymentTransactions.set(transactionId, transaction);

    // Unlock photos
    const unlockedPhotos = await this.unlockPhotosAfterPayment(userId, payableIds);

    // Get updated balance
    const updatedBalance = await this.getBalance(userId);

    loggerCtx.info('Payment processed successfully', {
      userId,
      transactionId,
      photoCount: payableIds.length,
      amount: calculatedTotal,
    });

    return {
      success: true,
      transactionId,
      remainingBalance: updatedBalance.available,
      unlockedPhotos,
    };
  }

  /**
   * Verify payment password (placeholder for demo)
   */
  async verifyPaymentPassword(userId: string, password: string): Promise<boolean> {
    // Demo stage: always accept
    return password.length >= 4;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    const transaction = paymentTransactions.get(transactionId);
    return transaction?.status ?? PaymentStatus.FAILED;
  }

  /**
   * Get payment confirmation
   */
  async getConfirmation(transactionId: string): Promise<PaymentConfirmation | null> {
    const transaction = paymentTransactions.get(transactionId);
    if (!transaction) return null;

    const balance = await this.getBalance(transaction.userId);

    return {
      transactionId: transaction.id,
      photoCount: transaction.photoId.split(',').length,
      totalAmount: transaction.amount,
      balanceAfter: balance.available,
      timestamp: transaction.completedAt || transaction.createdAt,
    };
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(transactionId: string): Promise<boolean> {
    const transaction = paymentTransactions.get(transactionId);
    if (!transaction || transaction.status !== PaymentStatus.PENDING) {
      return false;
    }

    transaction.status = PaymentStatus.FAILED;
    paymentTransactions.set(transactionId, transaction);
    return true;
  }

  /**
   * Get user credit balance
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const account = await pointsService.getOrCreateAccount(userId);
    return {
      userId,
      available: account.availableBalance,
      frozen: account.frozenAmount,
      total: account.balance,
      currency: 'credits',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if user has sufficient credits
   */
  async hasSufficientCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance.available >= amount;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    return paymentTransactions.get(transactionId) ?? null;
  }

  /**
   * Get user transactions with pagination
   */
  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: PaymentTransaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const userTransactions = Array.from(paymentTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = userTransactions.length;
    const start = (page - 1) * limit;
    const items = userTransactions.slice(start, start + limit);

    return {
      transactions: items,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    };
  }

  /**
   * Register a photo in the system
   */
  registerPhoto(photoId: string, supplierId: string, price: number = DEFAULT_PHOTO_PRICE): void {
    photoStatuses.set(photoId, {
      status: PhotoStatus.LOCKED,
      price,
      supplierId,
    });
  }

  /**
   * Check if a photo is unlocked for a user
   */
  async isPhotoUnlocked(photoId: string, _userId: string): Promise<boolean> {
    const info = photoStatuses.get(photoId);
    return info?.status === PhotoStatus.UNLOCKED;
  }

  /**
   * Generate download token for an unlocked photo
   */
  async generateDownloadToken(photoId: string, userId: string): Promise<string> {
    const unlocked = await this.isPhotoUnlocked(photoId, userId);
    if (!unlocked) {
      throw new Error('Photo is not unlocked for this user');
    }

    const token = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    downloadTokens.set(token, {
      photoId,
      userId,
      expiresAt: new Date(Date.now() + DOWNLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
      maxDownloads: MAX_DOWNLOADS_PER_TOKEN,
      usedDownloads: 0,
    });

    return token;
  }

  /**
   * Validate a download token and record usage
   */
  async validateAndUseDownloadToken(
    token: string,
    userId: string
  ): Promise<{
    valid: boolean;
    photoId?: string;
    error?: string;
  }> {
    const info = downloadTokens.get(token);
    if (!info) {
      return { valid: false, error: 'Invalid download token' };
    }

    if (info.userId !== userId) {
      return { valid: false, error: 'Token does not belong to this user' };
    }

    if (info.expiresAt < new Date()) {
      downloadTokens.delete(token);
      return { valid: false, error: 'Download token has expired' };
    }

    if (info.usedDownloads >= info.maxDownloads) {
      return { valid: false, error: 'Download limit reached' };
    }

    info.usedDownloads++;
    downloadTokens.set(token, info);

    return { valid: true, photoId: info.photoId };
  }

  // ==================== Private helpers ====================

  private calculateTotal(photoIds: string[]): number {
    let total = 0;
    for (const id of photoIds) {
      const info = photoStatuses.get(id);
      total += info?.price ?? DEFAULT_PHOTO_PRICE;
    }
    return total;
  }

  private async unlockPhotosAfterPayment(
    userId: string,
    photoIds: string[]
  ): Promise<UnlockedPhotoInfo[]> {
    const results: UnlockedPhotoInfo[] = [];
    const now = new Date();

    for (const photoId of photoIds) {
      const info = photoStatuses.get(photoId);
      if (!info) {
        // Auto-register if not yet tracked
        this.registerPhoto(photoId, '');
      }

      // Mark as unlocked
      photoStatuses.set(photoId, {
        status: PhotoStatus.UNLOCKED,
        price: info?.price ?? DEFAULT_PHOTO_PRICE,
        supplierId: info?.supplierId ?? '',
      });

      // Generate download token
      const downloadToken = await this.generateDownloadToken(photoId, userId);

      results.push({
        photoId,
        hdUrl: `/api/visionshare/photos/${photoId}/hd`,
        downloadToken,
        expiresAt: new Date(
          now.getTime() + DOWNLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
        ).toISOString(),
        downloadLimit: MAX_DOWNLOADS_PER_TOKEN,
        downloadsRemaining: MAX_DOWNLOADS_PER_TOKEN,
      });
    }

    return results;
  }
}

export const creditPaymentService = new CreditPaymentService();
