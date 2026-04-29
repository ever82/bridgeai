/**
 * Transaction Service
 * 交易记录与退款申诉服务
 */
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
const log = logger.child({ module: 'TransactionService' });
class TransactionService {
    /**
     * Get user's transaction list with pagination and filters
     */
    async getUserTransactions(userId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (options.type && options.type !== 'all') {
            where.type = options.type.toUpperCase();
        }
        if (options.status && options.status !== 'all') {
            where.status = options.status.toUpperCase();
        }
        if (options.startDate || options.endDate) {
            where.createdAt = {
                ...(options.startDate && { gte: new Date(options.startDate) }),
                ...(options.endDate && { lte: new Date(options.endDate) }),
            };
        }
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transaction.count({ where }),
        ]);
        return {
            transactions: transactions.map(t => ({
                id: t.id,
                userId: t.userId,
                amount: Number(t.amount),
                type: t.type,
                status: t.status,
                description: t.description,
                referenceId: t.referenceId,
                metadata: t.metadata,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get transaction detail by ID
     */
    async getTransactionDetail(userId, transactionId) {
        const transaction = await prisma.transaction.findFirst({
            where: { id: transactionId, userId },
            include: { refund: true },
        });
        if (!transaction)
            return null;
        return {
            id: transaction.id,
            userId: transaction.userId,
            amount: Number(transaction.amount),
            type: transaction.type,
            status: transaction.status,
            description: transaction.description,
            referenceId: transaction.referenceId,
            metadata: transaction.metadata,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            refund: transaction.refund
                ? {
                    id: transaction.refund.id,
                    reason: transaction.refund.reason,
                    status: transaction.refund.status,
                    refundAmount: Number(transaction.refund.refundAmount),
                    pointsRefunded: transaction.refund.pointsRefunded,
                    createdAt: transaction.refund.createdAt,
                }
                : null,
        };
    }
    /**
     * Get transaction statistics for a user
     */
    async getTransactionStats(userId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalCount, incomeAgg, expenseAgg, refundAgg, monthIncomeAgg, monthExpenseAgg] = await Promise.all([
            prisma.transaction.count({ where: { userId, status: 'SUCCESS' } }),
            prisma.transaction.aggregate({
                where: { userId, status: 'SUCCESS', type: { in: ['RECHARGE', 'REWARD', 'TRANSFER'] } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, status: 'SUCCESS', type: { in: ['DEDUCT'] } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, status: 'SUCCESS', type: 'REFUND' },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: {
                    userId,
                    status: 'SUCCESS',
                    type: { in: ['RECHARGE', 'REWARD', 'TRANSFER'] },
                    createdAt: { gte: monthStart },
                },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: {
                    userId,
                    status: 'SUCCESS',
                    type: 'DEDUCT',
                    createdAt: { gte: monthStart },
                },
                _sum: { amount: true },
            }),
        ]);
        return {
            totalCount,
            totalIncome: Number(incomeAgg._sum.amount || 0),
            totalExpense: Number(expenseAgg._sum.amount || 0),
            totalRefund: Number(refundAgg._sum.amount || 0),
            thisMonthIncome: Number(monthIncomeAgg._sum.amount || 0),
            thisMonthExpense: Number(monthExpenseAgg._sum.amount || 0),
        };
    }
    /**
     * Export transactions as array (for CSV generation)
     */
    async exportTransactions(userId, options = {}) {
        const where = { userId, status: 'SUCCESS' };
        if (options.type && options.type !== 'all') {
            where.type = options.type.toUpperCase();
        }
        if (options.startDate || options.endDate) {
            where.createdAt = {
                ...(options.startDate && { gte: new Date(options.startDate) }),
                ...(options.endDate && { lte: new Date(options.endDate) }),
            };
        }
        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 1000, // limit exports
        });
        return transactions.map(t => ({
            id: t.id,
            userId: t.userId,
            amount: Number(t.amount),
            type: t.type,
            status: t.status,
            description: t.description,
            referenceId: t.referenceId,
            metadata: t.metadata,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
    }
    // ========================================
    // Refund & Appeal
    // ========================================
    /**
     * Create a refund request for a transaction
     */
    async createRefund(userId, transactionId, reason, details, evidence) {
        const transaction = await prisma.transaction.findFirst({
            where: { id: transactionId, userId },
        });
        if (!transaction) {
            throw new Error('交易记录不存在');
        }
        if (transaction.status !== 'SUCCESS') {
            throw new Error('只能对已成功的交易发起退款');
        }
        if (transaction.type === 'REFUND') {
            throw new Error('退款交易不能再次退款');
        }
        // Check if refund already exists
        const existingRefund = await prisma.refund.findUnique({
            where: { transactionId },
        });
        if (existingRefund) {
            throw new Error('该交易已有退款申请');
        }
        const refund = await prisma.refund.create({
            data: {
                transactionId,
                userId,
                reason,
                details: details || null,
                evidence: evidence || null,
                refundAmount: transaction.amount,
            },
        });
        log.info('Refund created', { refundId: refund.id, transactionId, userId });
        return {
            id: refund.id,
            transactionId: refund.transactionId,
            reason: refund.reason,
            status: refund.status,
            refundAmount: Number(refund.refundAmount),
            createdAt: refund.createdAt,
        };
    }
    /**
     * Get user's refund list
     */
    async getUserRefunds(userId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (options.status && options.status !== 'all') {
            where.status = options.status.toUpperCase();
        }
        const [refunds, total] = await Promise.all([
            prisma.refund.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    transaction: {
                        select: {
                            id: true,
                            amount: true,
                            type: true,
                            description: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            prisma.refund.count({ where }),
        ]);
        return {
            refunds: refunds.map(r => ({
                id: r.id,
                transactionId: r.transactionId,
                userId: r.userId,
                reason: r.reason,
                details: r.details,
                evidence: r.evidence,
                status: r.status,
                refundAmount: Number(r.refundAmount),
                pointsRefunded: r.pointsRefunded,
                reviewedBy: r.reviewedBy,
                reviewNote: r.reviewNote,
                reviewedAt: r.reviewedAt,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                transaction: r.transaction
                    ? {
                        ...r.transaction,
                        amount: Number(r.transaction.amount),
                    }
                    : undefined,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get refund detail with appeals
     */
    async getRefundDetail(userId, refundId) {
        const refund = await prisma.refund.findFirst({
            where: { id: refundId, userId },
            include: {
                transaction: true,
                appeals: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!refund)
            return null;
        return {
            id: refund.id,
            transactionId: refund.transactionId,
            reason: refund.reason,
            details: refund.details,
            evidence: refund.evidence,
            status: refund.status,
            refundAmount: Number(refund.refundAmount),
            pointsRefunded: refund.pointsRefunded,
            reviewedBy: refund.reviewedBy,
            reviewNote: refund.reviewNote,
            reviewedAt: refund.reviewedAt,
            createdAt: refund.createdAt,
            updatedAt: refund.updatedAt,
            transaction: {
                id: refund.transaction.id,
                amount: Number(refund.transaction.amount),
                type: refund.transaction.type,
                status: refund.transaction.status,
                description: refund.transaction.description,
                createdAt: refund.transaction.createdAt,
            },
            appeals: refund.appeals.map(a => ({
                id: a.id,
                reason: a.reason,
                evidence: a.evidence,
                status: a.status,
                reviewNote: a.reviewNote,
                createdAt: a.createdAt,
            })),
        };
    }
    /**
     * Create an appeal for a rejected refund
     */
    async createAppeal(userId, refundId, reason, evidence) {
        const refund = await prisma.refund.findFirst({
            where: { id: refundId, userId },
        });
        if (!refund) {
            throw new Error('退款记录不存在');
        }
        if (refund.status !== 'REJECTED') {
            throw new Error('只能对被拒绝的退款发起申诉');
        }
        const appeal = await prisma.refundAppeal.create({
            data: {
                refundId,
                userId,
                reason,
                evidence: evidence || null,
            },
        });
        // Reset refund status to PENDING for re-review
        await prisma.refund.update({
            where: { id: refundId },
            data: { status: 'PENDING' },
        });
        log.info('Appeal created', { appealId: appeal.id, refundId, userId });
        return {
            id: appeal.id,
            refundId: appeal.refundId,
            userId: appeal.userId,
            reason: appeal.reason,
            evidence: appeal.evidence,
            status: appeal.status,
            reviewedBy: appeal.reviewedBy,
            reviewNote: appeal.reviewNote,
            reviewedAt: appeal.reviewedAt,
            createdAt: appeal.createdAt,
            updatedAt: appeal.updatedAt,
        };
    }
    /**
     * Cancel a pending refund
     */
    async cancelRefund(userId, refundId) {
        const refund = await prisma.refund.findFirst({
            where: { id: refundId, userId },
        });
        if (!refund) {
            throw new Error('退款记录不存在');
        }
        if (refund.status !== 'PENDING') {
            throw new Error('只能取消待审核的退款申请');
        }
        const updated = await prisma.refund.update({
            where: { id: refundId },
            data: { status: 'CANCELLED' },
        });
        return {
            id: updated.id,
            status: updated.status,
            updatedAt: updated.updatedAt,
        };
    }
}
export const transactionService = new TransactionService();
//# sourceMappingURL=transactionService.js.map