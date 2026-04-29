/**
 * Credit Payment Service
 * Handles VisionShare photo payments using points (credits)
 */
import { SceneCode } from '@bridgeai/shared';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { pointsService } from '../pointsService';
import { PaymentStatus, } from '../../../../shared/types/payment.types';
import { PhotoStatus } from '../../../../shared/types/photo.types';
const loggerCtx = logger.child({ module: 'CreditPaymentService' });
// Photo price per image in points
const DEFAULT_PHOTO_PRICE = 20;
// Download token expiry (24 hours)
const DOWNLOAD_TOKEN_EXPIRY_HOURS = 24;
// Max downloads per token
const MAX_DOWNLOADS_PER_TOKEN = 5;
// In-memory store for payment transactions (demo stage)
const paymentTransactions = new Map();
// In-memory store for download tokens
const downloadTokens = new Map();
// In-memory store for photo statuses
const photoStatuses = new Map();
export class CreditPaymentService {
    prisma;
    constructor(prismaClient = prisma) {
        this.prisma = prismaClient;
    }
    /**
     * Process payment for one or multiple photos
     */
    async processPayment(userId, request) {
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
        const alreadyUnlocked = [];
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
        const transaction = {
            id: transactionId,
            userId,
            photoId: payableIds.length === 1 ? payableIds[0] : payableIds.join(','),
            sceneId: SceneCode.VISION_SHARE,
            amount: calculatedTotal,
            currency: 'credits',
            status: PaymentStatus.PROCESSING,
            type: 'purchase',
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
        }
        catch (error) {
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
    async verifyPaymentPassword(userId, password) {
        // Demo stage: always accept
        return password.length >= 4;
    }
    /**
     * Get payment status
     */
    async getPaymentStatus(transactionId) {
        const transaction = paymentTransactions.get(transactionId);
        return transaction?.status ?? PaymentStatus.FAILED;
    }
    /**
     * Get payment confirmation
     */
    async getConfirmation(transactionId) {
        const transaction = paymentTransactions.get(transactionId);
        if (!transaction)
            return null;
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
    async cancelPayment(transactionId) {
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
    async getBalance(userId) {
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
    async hasSufficientCredits(userId, amount) {
        const balance = await this.getBalance(userId);
        return balance.available >= amount;
    }
    /**
     * Get transaction by ID
     */
    async getTransaction(transactionId) {
        return paymentTransactions.get(transactionId) ?? null;
    }
    /**
     * Get user transactions with pagination
     */
    async getUserTransactions(userId, page = 1, limit = 20) {
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
    registerPhoto(photoId, supplierId, price = DEFAULT_PHOTO_PRICE) {
        photoStatuses.set(photoId, {
            status: PhotoStatus.LOCKED,
            price,
            supplierId,
        });
    }
    /**
     * Check if a photo is unlocked for a user
     */
    async isPhotoUnlocked(photoId, _userId) {
        const info = photoStatuses.get(photoId);
        return info?.status === PhotoStatus.UNLOCKED;
    }
    /**
     * Generate download token for an unlocked photo
     */
    async generateDownloadToken(photoId, userId) {
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
    async validateAndUseDownloadToken(token, userId) {
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
    calculateTotal(photoIds) {
        let total = 0;
        for (const id of photoIds) {
            const info = photoStatuses.get(id);
            total += info?.price ?? DEFAULT_PHOTO_PRICE;
        }
        return total;
    }
    async unlockPhotosAfterPayment(userId, photoIds) {
        const results = [];
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
                expiresAt: new Date(now.getTime() + DOWNLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
                downloadLimit: MAX_DOWNLOADS_PER_TOKEN,
                downloadsRemaining: MAX_DOWNLOADS_PER_TOKEN,
            });
        }
        return results;
    }
}
export const creditPaymentService = new CreditPaymentService();
//# sourceMappingURL=creditPaymentService.js.map