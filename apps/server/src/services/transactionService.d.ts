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
        description: string | null;
        referenceId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        refund: {
            id: any;
            reason: any;
            status: any;
            refundAmount: number;
            pointsRefunded: any;
            createdAt: any;
        } | null;
    } | null>;
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
        id: any;
        transactionId: any;
        reason: any;
        status: any;
        refundAmount: number;
        createdAt: any;
    }>;
    /**
     * Get user's refund list
     */
    getUserRefunds(userId: string, options?: RefundListOptions): Promise<RefundListResult>;
    /**
     * Get refund detail with appeals
     */
    getRefundDetail(userId: string, refundId: string): Promise<{
        id: any;
        transactionId: any;
        reason: any;
        details: any;
        evidence: any;
        status: any;
        refundAmount: number;
        pointsRefunded: any;
        reviewedBy: any;
        reviewNote: any;
        reviewedAt: any;
        createdAt: any;
        updatedAt: any;
        transaction: {
            id: any;
            amount: number;
            type: any;
            status: any;
            description: any;
            createdAt: any;
        };
        appeals: any;
    } | null>;
    /**
     * Create an appeal for a rejected refund
     */
    createAppeal(userId: string, refundId: string, reason: string, evidence?: string[]): Promise<AppealRow>;
    /**
     * Cancel a pending refund
     */
    cancelRefund(userId: string, refundId: string): Promise<{
        id: any;
        status: any;
        updatedAt: any;
    }>;
}
export declare const transactionService: TransactionService;
export {};
//# sourceMappingURL=transactionService.d.ts.map