/**
 * Credit Payment Service
 * Handles VisionShare photo payments using points (credits)
 */
import { PrismaClient } from '@prisma/client';
import { PaymentRequest, PaymentResponse, PaymentTransaction, PaymentStatus, PaymentConfirmation, CreditBalance } from '../../../../shared/types/payment.types';
export declare class CreditPaymentService {
    private prisma;
    constructor(prismaClient?: PrismaClient);
    /**
     * Process payment for one or multiple photos
     */
    processPayment(userId: string, request: PaymentRequest): Promise<PaymentResponse>;
    /**
     * Verify payment password (placeholder for demo)
     */
    verifyPaymentPassword(userId: string, password: string): Promise<boolean>;
    /**
     * Get payment status
     */
    getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
    /**
     * Get payment confirmation
     */
    getConfirmation(transactionId: string): Promise<PaymentConfirmation | null>;
    /**
     * Cancel a pending payment
     */
    cancelPayment(transactionId: string): Promise<boolean>;
    /**
     * Get user credit balance
     */
    getBalance(userId: string): Promise<CreditBalance>;
    /**
     * Check if user has sufficient credits
     */
    hasSufficientCredits(userId: string, amount: number): Promise<boolean>;
    /**
     * Get transaction by ID
     */
    getTransaction(transactionId: string): Promise<PaymentTransaction | null>;
    /**
     * Get user transactions with pagination
     */
    getUserTransactions(userId: string, page?: number, limit?: number): Promise<{
        transactions: PaymentTransaction[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    /**
     * Register a photo in the system
     */
    registerPhoto(photoId: string, supplierId: string, price?: number): void;
    /**
     * Check if a photo is unlocked for a user
     */
    isPhotoUnlocked(photoId: string, _userId: string): Promise<boolean>;
    /**
     * Generate download token for an unlocked photo
     */
    generateDownloadToken(photoId: string, userId: string): Promise<string>;
    /**
     * Validate a download token and record usage
     */
    validateAndUseDownloadToken(token: string, userId: string): Promise<{
        valid: boolean;
        photoId?: string;
        error?: string;
    }>;
    private calculateTotal;
    private unlockPhotosAfterPayment;
}
export declare const creditPaymentService: CreditPaymentService;
//# sourceMappingURL=creditPaymentService.d.ts.map