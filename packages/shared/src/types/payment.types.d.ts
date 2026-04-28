/**
 * Payment Types
 * Type definitions for payment, transactions, and credit balance
 */
/** Transaction type */
export type TransactionType = 'purchase' | 'refund' | 'bonus' | 'payment' | 'withdraw' | 'fee';
/** Transaction status */
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
/** Payment method */
export type PaymentMethod = 'credit' | 'points' | 'cash' | 'subscription' | 'wallet';
/** Currency code */
export type CurrencyCode = 'CNY' | 'USD' | 'POINTS' | 'CREDIT';
/** Credit balance */
export interface CreditBalance {
    /** Total credit balance */
    total: number;
    /** Available credit balance */
    available: number;
    /** Frozen/locked credit amount */
    frozen: number;
    /** Pending credit amount */
    pending: number;
    /** Last updated timestamp */
    updatedAt: string;
}
/** Payment transaction */
export interface PaymentTransaction {
    /** Unique transaction ID */
    id: string;
    /** User ID */
    userId: string;
    /** Transaction type */
    type: TransactionType;
    /** Transaction status */
    status: TransactionStatus;
    /** Amount */
    amount: number;
    /** Currency code */
    currency: CurrencyCode;
    /** Payment method used */
    paymentMethod?: PaymentMethod;
    /** Related photo IDs (for photo purchases) */
    photoIds?: string[];
    /** Related task ID (for task payments) */
    taskId?: string;
    /** Transaction description */
    description?: string;
    /** Transaction fee */
    fee?: number;
    /** Net amount after fee */
    netAmount?: number;
    /** Payment reference/trade number */
    tradeNo?: string;
    /** Transaction timestamp */
    createdAt: string;
    /** Completion timestamp */
    completedAt?: string;
    /** Failure reason (if failed) */
    failureReason?: string;
}
/** Credit balance response */
export interface CreditBalanceResponse {
    success: boolean;
    data: CreditBalance;
}
/** Transaction list response */
export interface TransactionListResponse {
    success: boolean;
    data: {
        transactions: PaymentTransaction[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    };
}
/** Refund request */
export interface RefundRequest {
    transactionId: string;
    reason: string;
    details?: string;
    refundAmount?: number;
}
/** Refund response */
export interface RefundResponse {
    success: boolean;
    data?: {
        refundId: string;
        refundAmount: number;
        status: TransactionStatus;
    };
    error?: string;
}
//# sourceMappingURL=payment.types.d.ts.map