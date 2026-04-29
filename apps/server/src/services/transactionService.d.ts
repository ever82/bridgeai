/**
 * Transaction Service
 * 交易记录与退款申诉服务
 */
export interface TransactionListOptions {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}
export interface TransactionListResult {
    transactions: TransactionRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface TransactionRow {
    id: string;
    userId: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    referenceId: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
}
export interface TransactionStats {
    totalCount: number;
    totalIncome: number;
    totalExpense: number;
    totalRefund: number;
    thisMonthIncome: number;
    thisMonthExpense: number;
}
export interface RefundListOptions {
    page?: number;
    limit?: number;
    status?: string;
}
export interface RefundListResult {
    refunds: RefundRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface RefundRow {
    id: string;
    transactionId: string;
    userId: string;
    reason: string;
    details: string | null;
    evidence: unknown;
    status: string;
    refundAmount: number;
    pointsRefunded: boolean;
    reviewedBy: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    transaction?: TransactionRow;
}
export interface AppealRow {
    id: string;
    refundId: string;
    userId: string;
    reason: string;
    evidence: unknown;
    status: string;
    reviewedBy: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
declare class TransactionService {
    /**
     * Get user's transaction list with pagination and filters
     */
    getUserTransactions(userId: string, options?: TransactionListOptions): Promise<TransactionListResult>;
    /**
     * Get transaction detail by ID
     */
    getTransactionDetail(userId: string, transactionId: string): Promise<{
        id: string;
        userId: string;
        amount: number;
        type: import(".prisma/client").$Enums.TransactionType;
        status: import(".prisma/client").$Enums.TransactionStatus;
        description: string;
        referenceId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        refund: {
            id: string;
            reason: string;
            status: import(".prisma/client").$Enums.RefundStatus;
            refundAmount: number;
            pointsRefunded: boolean;
            createdAt: Date;
        };
    }>;
    /**
     * Get transaction statistics for a user
     */
    getTransactionStats(userId: string): Promise<TransactionStats>;
    /**
     * Export transactions as array (for CSV generation)
     */
    exportTransactions(userId: string, options?: TransactionListOptions): Promise<TransactionRow[]>;
    /**
     * Create a refund request for a transaction
     */
    createRefund(userId: string, transactionId: string, reason: string, details?: string, evidence?: string[]): Promise<{
        id: string;
        transactionId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RefundStatus;
        refundAmount: number;
        createdAt: Date;
    }>;
    /**
     * Get user's refund list
     */
    getUserRefunds(userId: string, options?: RefundListOptions): Promise<RefundListResult>;
    /**
     * Get refund detail with appeals
     */
    getRefundDetail(userId: string, refundId: string): Promise<{
        id: string;
        transactionId: string;
        reason: string;
        details: string;
        evidence: import("@prisma/client/runtime/library").JsonValue;
        status: import(".prisma/client").$Enums.RefundStatus;
        refundAmount: number;
        pointsRefunded: boolean;
        reviewedBy: string;
        reviewNote: string;
        reviewedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        transaction: {
            id: string;
            amount: number;
            type: import(".prisma/client").$Enums.TransactionType;
            status: import(".prisma/client").$Enums.TransactionStatus;
            description: string;
            createdAt: Date;
        };
        appeals: {
            id: string;
            reason: string;
            evidence: import("@prisma/client/runtime/library").JsonValue;
            status: import(".prisma/client").$Enums.AppealStatus;
            reviewNote: string;
            createdAt: Date;
        }[];
    }>;
    /**
     * Create an appeal for a rejected refund
     */
    createAppeal(userId: string, refundId: string, reason: string, evidence?: string[]): Promise<AppealRow>;
    /**
     * Cancel a pending refund
     */
    cancelRefund(userId: string, refundId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.RefundStatus;
        updatedAt: Date;
    }>;
}
export declare const transactionService: TransactionService;
export {};
//# sourceMappingURL=transactionService.d.ts.map