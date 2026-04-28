/**
 * VisionShare Payment Service
 * Handles points-based photo payment in VisionShare scenario
 * Including balance check, payment processing, platform commission, and refund
 */
import { PrismaClient } from '@prisma/client';
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
export declare class VisionSharePaymentService {
    private prisma;
    constructor(prismaClient?: PrismaClient);
    /**
     * Check if user has sufficient balance for viewing a photo
     */
    checkBalance(userId: string, photoId: string): Promise<BalanceCheckResult>;
    /**
     * Process photo payment: deduct points from buyer, give to photographer, take platform commission
     */
    processPayment(request: PhotoPaymentRequest): Promise<PhotoPaymentResult>;
    /**
     * Process refund for a failed photo payment
     */
    processRefund(buyerUserId: string, photoId: string, originalTransactionId: string): Promise<{
        success: boolean;
        refundAmount: number;
        error?: string;
    }>;
    /**
     * Generate a temporary unlock token for a purchased photo
     */
    generateUnlockToken(userId: string, photoId: string): Promise<{
        token: string;
        expiresAt: string;
    }>;
    /**
     * Get user's payment history for VisionShare
     */
    getPaymentHistory(userId: string, limit?: number): Promise<any[]>;
}
export declare const visionSharePaymentService: VisionSharePaymentService;
//# sourceMappingURL=visionSharePaymentService.d.ts.map