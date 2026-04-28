"use strict";
/**
 * TransactionService Tests
 * Tests for transaction list, detail, stats, export, refund, and appeal functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Mock prisma
jest.mock('../db/client', () => ({
    prisma: {
        transaction: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn(),
        },
        refund: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        refundAppeal: {
            create: jest.fn(),
        },
    },
}));
// Mock logger
jest.mock('../utils/logger', () => ({
    logger: {
        child: () => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        }),
    },
}));
const client_1 = require("../db/client");
const transactionService_1 = require("../services/transactionService");
describe('TransactionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // ========================================
    // getUserTransactions
    // ========================================
    describe('getUserTransactions', () => {
        const userId = 'user-123';
        const mockTransaction = {
            id: 'txn-1',
            userId,
            amount: 100,
            type: 'RECHARGE',
            status: 'SUCCESS',
            description: 'Top up',
            referenceId: 'ref-1',
            metadata: null,
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date('2025-01-15'),
        };
        it('should return paginated transactions with defaults', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([mockTransaction]);
            client_1.prisma.transaction.count.mockResolvedValue(1);
            const result = await transactionService_1.transactionService.getUserTransactions(userId);
            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0]).toEqual({
                id: 'txn-1',
                userId,
                amount: 100,
                type: 'RECHARGE',
                status: 'SUCCESS',
                description: 'Top up',
                referenceId: 'ref-1',
                metadata: null,
                createdAt: mockTransaction.createdAt,
                updatedAt: mockTransaction.updatedAt,
            });
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.totalPages).toBe(1);
            expect(client_1.prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId },
                skip: 0,
                take: 20,
                orderBy: { createdAt: 'desc' },
            }));
        });
        it('should apply pagination with page and limit', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(50);
            await transactionService_1.transactionService.getUserTransactions(userId, { page: 3, limit: 10 });
            expect(client_1.prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 20,
                take: 10,
            }));
        });
        it('should filter by type', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { type: 'recharge' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.type).toBe('RECHARGE');
        });
        it('should not filter by type when type is "all"', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { type: 'all' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.type).toBeUndefined();
        });
        it('should filter by status', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { status: 'success' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.status).toBe('SUCCESS');
        });
        it('should not filter by status when status is "all"', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { status: 'all' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.status).toBeUndefined();
        });
        it('should filter by startDate', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { startDate: '2025-01-01' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.createdAt).toEqual({ gte: new Date('2025-01-01') });
        });
        it('should filter by endDate', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, { endDate: '2025-12-31' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.createdAt).toEqual({ lte: new Date('2025-12-31') });
        });
        it('should filter by both startDate and endDate', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserTransactions(userId, {
                startDate: '2025-01-01',
                endDate: '2025-12-31',
            });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.createdAt).toEqual({
                gte: new Date('2025-01-01'),
                lte: new Date('2025-12-31'),
            });
        });
        it('should compute totalPages correctly', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.transaction.count.mockResolvedValue(45);
            const result = await transactionService_1.transactionService.getUserTransactions(userId, { limit: 10 });
            expect(result.totalPages).toBe(5);
        });
        it('should map amount from Decimal to number', async () => {
            const txnWithDecimal = { ...mockTransaction, amount: 99.99 };
            client_1.prisma.transaction.findMany.mockResolvedValue([txnWithDecimal]);
            client_1.prisma.transaction.count.mockResolvedValue(1);
            const result = await transactionService_1.transactionService.getUserTransactions(userId);
            expect(result.transactions[0].amount).toBe(99.99);
        });
    });
    // ========================================
    // getTransactionDetail
    // ========================================
    describe('getTransactionDetail', () => {
        const userId = 'user-123';
        const transactionId = 'txn-1';
        const mockTransaction = {
            id: transactionId,
            userId,
            amount: 200,
            type: 'DEDUCT',
            status: 'SUCCESS',
            description: 'Purchase',
            referenceId: 'ref-1',
            metadata: { key: 'value' },
            createdAt: new Date('2025-03-01'),
            updatedAt: new Date('2025-03-01'),
            refund: null,
        };
        it('should return transaction detail when found', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(mockTransaction);
            const result = await transactionService_1.transactionService.getTransactionDetail(userId, transactionId);
            expect(result).toEqual({
                id: transactionId,
                userId,
                amount: 200,
                type: 'DEDUCT',
                status: 'SUCCESS',
                description: 'Purchase',
                referenceId: 'ref-1',
                metadata: { key: 'value' },
                createdAt: mockTransaction.createdAt,
                updatedAt: mockTransaction.updatedAt,
                refund: null,
            });
            expect(client_1.prisma.transaction.findFirst).toHaveBeenCalledWith({
                where: { id: transactionId, userId },
                include: { refund: true },
            });
        });
        it('should return null when transaction not found', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(null);
            const result = await transactionService_1.transactionService.getTransactionDetail(userId, 'nonexistent');
            expect(result).toBeNull();
        });
        it('should include refund info when present', async () => {
            const txnWithRefund = {
                ...mockTransaction,
                refund: {
                    id: 'refund-1',
                    reason: 'Item defective',
                    status: 'PENDING',
                    refundAmount: 200,
                    pointsRefunded: false,
                    createdAt: new Date('2025-03-05'),
                },
            };
            client_1.prisma.transaction.findFirst.mockResolvedValue(txnWithRefund);
            const result = await transactionService_1.transactionService.getTransactionDetail(userId, transactionId);
            expect(result.refund).toEqual({
                id: 'refund-1',
                reason: 'Item defective',
                status: 'PENDING',
                refundAmount: 200,
                pointsRefunded: false,
                createdAt: txnWithRefund.refund.createdAt,
            });
        });
        it('should return null for transaction belonging to another user', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(null);
            const result = await transactionService_1.transactionService.getTransactionDetail('other-user', transactionId);
            expect(result).toBeNull();
            expect(client_1.prisma.transaction.findFirst).toHaveBeenCalledWith({
                where: { id: transactionId, userId: 'other-user' },
                include: { refund: true },
            });
        });
    });
    // ========================================
    // getTransactionStats
    // ========================================
    describe('getTransactionStats', () => {
        const userId = 'user-123';
        it('should return aggregated stats', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(42);
            // All 6 aggregate calls
            client_1.prisma.transaction.aggregate
                .mockResolvedValueOnce({ _sum: { amount: 1000 } }) // totalIncome
                .mockResolvedValueOnce({ _sum: { amount: 600 } }) // totalExpense
                .mockResolvedValueOnce({ _sum: { amount: 150 } }) // totalRefund
                .mockResolvedValueOnce({ _sum: { amount: 300 } }) // thisMonthIncome
                .mockResolvedValueOnce({ _sum: { amount: 200 } }); // thisMonthExpense
            const result = await transactionService_1.transactionService.getTransactionStats(userId);
            expect(result).toEqual({
                totalCount: 42,
                totalIncome: 1000,
                totalExpense: 600,
                totalRefund: 150,
                thisMonthIncome: 300,
                thisMonthExpense: 200,
            });
            // count called once for totalCount
            expect(client_1.prisma.transaction.count).toHaveBeenCalledTimes(1);
            // aggregate called 5 times
            expect(client_1.prisma.transaction.aggregate).toHaveBeenCalledTimes(5);
        });
        it('should handle null _sum.amount as zero', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(0);
            client_1.prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
            const result = await transactionService_1.transactionService.getTransactionStats(userId);
            expect(result.totalIncome).toBe(0);
            expect(result.totalExpense).toBe(0);
            expect(result.totalRefund).toBe(0);
            expect(result.thisMonthIncome).toBe(0);
            expect(result.thisMonthExpense).toBe(0);
        });
        it('should query with correct filters for income aggregation', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(0);
            client_1.prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            await transactionService_1.transactionService.getTransactionStats(userId);
            // First aggregate call is totalIncome
            const incomeCall = client_1.prisma.transaction.aggregate.mock.calls[0][0];
            expect(incomeCall.where).toEqual(expect.objectContaining({
                userId,
                status: 'SUCCESS',
                type: { in: ['RECHARGE', 'REWARD', 'TRANSFER'] },
            }));
        });
        it('should query with correct filters for expense aggregation', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(0);
            client_1.prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            await transactionService_1.transactionService.getTransactionStats(userId);
            // Second aggregate call is totalExpense
            const expenseCall = client_1.prisma.transaction.aggregate.mock.calls[1][0];
            expect(expenseCall.where).toEqual(expect.objectContaining({
                userId,
                status: 'SUCCESS',
                type: { in: ['DEDUCT'] },
            }));
        });
        it('should query with correct filters for refund aggregation', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(0);
            client_1.prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            await transactionService_1.transactionService.getTransactionStats(userId);
            // Third aggregate call is totalRefund
            const refundCall = client_1.prisma.transaction.aggregate.mock.calls[2][0];
            expect(refundCall.where).toEqual(expect.objectContaining({
                userId,
                status: 'SUCCESS',
                type: 'REFUND',
            }));
        });
        it('should query with monthStart for monthly aggregations', async () => {
            client_1.prisma.transaction.count.mockResolvedValue(0);
            client_1.prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            await transactionService_1.transactionService.getTransactionStats(userId);
            // Fourth aggregate call is thisMonthIncome
            const monthIncomeCall = client_1.prisma.transaction.aggregate.mock.calls[3][0];
            expect(monthIncomeCall.where.createdAt).toBeDefined();
            expect(monthIncomeCall.where.createdAt.gte).toBeInstanceOf(Date);
        });
    });
    // ========================================
    // exportTransactions
    // ========================================
    describe('exportTransactions', () => {
        const userId = 'user-123';
        const mockTransaction = {
            id: 'txn-1',
            userId,
            amount: 100,
            type: 'RECHARGE',
            status: 'SUCCESS',
            description: 'Top up',
            referenceId: null,
            metadata: null,
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date('2025-01-15'),
        };
        it('should return transactions limited to 1000', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([mockTransaction]);
            const result = await transactionService_1.transactionService.exportTransactions(userId);
            expect(result).toHaveLength(1);
            expect(client_1.prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 1000,
            }));
        });
        it('should filter by userId and status SUCCESS', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            await transactionService_1.transactionService.exportTransactions(userId);
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.userId).toBe(userId);
            expect(where.status).toBe('SUCCESS');
        });
        it('should apply type filter', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            await transactionService_1.transactionService.exportTransactions(userId, { type: 'recharge' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.type).toBe('RECHARGE');
        });
        it('should not filter by type when type is "all"', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            await transactionService_1.transactionService.exportTransactions(userId, { type: 'all' });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.type).toBeUndefined();
        });
        it('should apply date range filters', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            await transactionService_1.transactionService.exportTransactions(userId, {
                startDate: '2025-01-01',
                endDate: '2025-06-30',
            });
            const where = client_1.prisma.transaction.findMany.mock.calls[0][0].where;
            expect(where.createdAt).toEqual({
                gte: new Date('2025-01-01'),
                lte: new Date('2025-06-30'),
            });
        });
        it('should order by createdAt desc', async () => {
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            await transactionService_1.transactionService.exportTransactions(userId);
            expect(client_1.prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
                orderBy: { createdAt: 'desc' },
            }));
        });
        it('should map amount to number', async () => {
            const txnDecimal = { ...mockTransaction, amount: 55.5 };
            client_1.prisma.transaction.findMany.mockResolvedValue([txnDecimal]);
            const result = await transactionService_1.transactionService.exportTransactions(userId);
            expect(result[0].amount).toBe(55.5);
        });
    });
    // ========================================
    // createRefund
    // ========================================
    describe('createRefund', () => {
        const userId = 'user-123';
        const transactionId = 'txn-1';
        const mockTransaction = {
            id: transactionId,
            userId,
            amount: 200,
            type: 'DEDUCT',
            status: 'SUCCESS',
        };
        it('should create a refund for a successful transaction', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(mockTransaction);
            client_1.prisma.refund.findUnique.mockResolvedValue(null);
            client_1.prisma.refund.create.mockResolvedValue({
                id: 'refund-1',
                transactionId,
                userId,
                reason: 'Item defective',
                status: 'PENDING',
                refundAmount: 200,
                createdAt: new Date('2025-03-05'),
            });
            const result = await transactionService_1.transactionService.createRefund(userId, transactionId, 'Item defective');
            expect(result).toEqual({
                id: 'refund-1',
                transactionId,
                reason: 'Item defective',
                status: 'PENDING',
                refundAmount: 200,
                createdAt: expect.any(Date),
            });
            expect(client_1.prisma.refund.create).toHaveBeenCalledWith({
                data: {
                    transactionId,
                    userId,
                    reason: 'Item defective',
                    details: null,
                    evidence: null,
                    refundAmount: 200,
                },
            });
        });
        it('should create a refund with details and evidence', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(mockTransaction);
            client_1.prisma.refund.findUnique.mockResolvedValue(null);
            client_1.prisma.refund.create.mockResolvedValue({
                id: 'refund-2',
                transactionId,
                userId,
                reason: 'Wrong item',
                status: 'PENDING',
                refundAmount: 200,
                createdAt: new Date('2025-03-05'),
            });
            await transactionService_1.transactionService.createRefund(userId, transactionId, 'Wrong item', 'Received wrong product', ['img1.jpg', 'img2.jpg']);
            expect(client_1.prisma.refund.create).toHaveBeenCalledWith({
                data: {
                    transactionId,
                    userId,
                    reason: 'Wrong item',
                    details: 'Received wrong product',
                    evidence: ['img1.jpg', 'img2.jpg'],
                    refundAmount: 200,
                },
            });
        });
        it('should throw when transaction not found', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(null);
            await expect(transactionService_1.transactionService.createRefund(userId, 'nonexistent', 'reason')).rejects.toThrow('交易记录不存在');
        });
        it('should throw when transaction status is not SUCCESS', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue({
                ...mockTransaction,
                status: 'FAILED',
            });
            await expect(transactionService_1.transactionService.createRefund(userId, transactionId, 'reason')).rejects.toThrow('只能对已成功的交易发起退款');
        });
        it('should throw when transaction is a REFUND type', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue({
                ...mockTransaction,
                type: 'REFUND',
            });
            await expect(transactionService_1.transactionService.createRefund(userId, transactionId, 'reason')).rejects.toThrow('退款交易不能再次退款');
        });
        it('should throw when refund already exists for transaction', async () => {
            client_1.prisma.transaction.findFirst.mockResolvedValue(mockTransaction);
            client_1.prisma.refund.findUnique.mockResolvedValue({
                id: 'existing-refund',
                transactionId,
            });
            await expect(transactionService_1.transactionService.createRefund(userId, transactionId, 'reason')).rejects.toThrow('该交易已有退款申请');
        });
    });
    // ========================================
    // getUserRefunds
    // ========================================
    describe('getUserRefunds', () => {
        const userId = 'user-123';
        const mockRefund = {
            id: 'refund-1',
            transactionId: 'txn-1',
            userId,
            reason: 'Defective',
            details: 'Product was broken',
            evidence: ['img.jpg'],
            status: 'PENDING',
            refundAmount: 100,
            pointsRefunded: false,
            reviewedBy: null,
            reviewNote: null,
            reviewedAt: null,
            createdAt: new Date('2025-03-01'),
            updatedAt: new Date('2025-03-01'),
            transaction: {
                id: 'txn-1',
                amount: 100,
                type: 'DEDUCT',
                description: 'Purchase',
                createdAt: new Date('2025-02-28'),
            },
        };
        it('should return paginated refunds with defaults', async () => {
            client_1.prisma.refund.findMany.mockResolvedValue([mockRefund]);
            client_1.prisma.refund.count.mockResolvedValue(1);
            const result = await transactionService_1.transactionService.getUserRefunds(userId);
            expect(result.refunds).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.totalPages).toBe(1);
            expect(client_1.prisma.refund.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId },
                skip: 0,
                take: 20,
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
            }));
        });
        it('should apply pagination with page and limit', async () => {
            client_1.prisma.refund.findMany.mockResolvedValue([]);
            client_1.prisma.refund.count.mockResolvedValue(30);
            const result = await transactionService_1.transactionService.getUserRefunds(userId, { page: 2, limit: 10 });
            expect(client_1.prisma.refund.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 10,
                take: 10,
            }));
            expect(result.totalPages).toBe(3);
        });
        it('should filter by status', async () => {
            client_1.prisma.refund.findMany.mockResolvedValue([]);
            client_1.prisma.refund.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserRefunds(userId, { status: 'pending' });
            const where = client_1.prisma.refund.findMany.mock.calls[0][0].where;
            expect(where.status).toBe('PENDING');
        });
        it('should not filter by status when status is "all"', async () => {
            client_1.prisma.refund.findMany.mockResolvedValue([]);
            client_1.prisma.refund.count.mockResolvedValue(0);
            await transactionService_1.transactionService.getUserRefunds(userId, { status: 'all' });
            const where = client_1.prisma.refund.findMany.mock.calls[0][0].where;
            expect(where.status).toBeUndefined();
        });
        it('should include transaction in refund result', async () => {
            client_1.prisma.refund.findMany.mockResolvedValue([mockRefund]);
            client_1.prisma.refund.count.mockResolvedValue(1);
            const result = await transactionService_1.transactionService.getUserRefunds(userId);
            expect(result.refunds[0].transaction).toEqual({
                id: 'txn-1',
                amount: 100,
                type: 'DEDUCT',
                description: 'Purchase',
                createdAt: mockRefund.transaction.createdAt,
            });
        });
        it('should map refundAmount to number', async () => {
            const refundDecimal = { ...mockRefund, refundAmount: 49.99 };
            client_1.prisma.refund.findMany.mockResolvedValue([refundDecimal]);
            client_1.prisma.refund.count.mockResolvedValue(1);
            const result = await transactionService_1.transactionService.getUserRefunds(userId);
            expect(result.refunds[0].refundAmount).toBe(49.99);
        });
    });
    // ========================================
    // getRefundDetail
    // ========================================
    describe('getRefundDetail', () => {
        const userId = 'user-123';
        const refundId = 'refund-1';
        const mockRefund = {
            id: refundId,
            transactionId: 'txn-1',
            userId,
            reason: 'Defective',
            details: 'Product was broken',
            evidence: ['img.jpg'],
            status: 'REJECTED',
            refundAmount: 100,
            pointsRefunded: false,
            reviewedBy: 'admin-1',
            reviewNote: 'Not enough evidence',
            reviewedAt: new Date('2025-03-10'),
            createdAt: new Date('2025-03-01'),
            updatedAt: new Date('2025-03-10'),
            transaction: {
                id: 'txn-1',
                amount: 100,
                type: 'DEDUCT',
                status: 'SUCCESS',
                description: 'Purchase',
                createdAt: new Date('2025-02-28'),
            },
            appeals: [
                {
                    id: 'appeal-1',
                    reason: 'I have more evidence',
                    evidence: ['img2.jpg'],
                    status: 'PENDING',
                    reviewNote: null,
                    createdAt: new Date('2025-03-12'),
                },
            ],
        };
        it('should return refund detail with appeals', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(mockRefund);
            const result = await transactionService_1.transactionService.getRefundDetail(userId, refundId);
            expect(result).toEqual({
                id: refundId,
                transactionId: 'txn-1',
                reason: 'Defective',
                details: 'Product was broken',
                evidence: ['img.jpg'],
                status: 'REJECTED',
                refundAmount: 100,
                pointsRefunded: false,
                reviewedBy: 'admin-1',
                reviewNote: 'Not enough evidence',
                reviewedAt: mockRefund.reviewedAt,
                createdAt: mockRefund.createdAt,
                updatedAt: mockRefund.updatedAt,
                transaction: {
                    id: 'txn-1',
                    amount: 100,
                    type: 'DEDUCT',
                    status: 'SUCCESS',
                    description: 'Purchase',
                    createdAt: mockRefund.transaction.createdAt,
                },
                appeals: [
                    {
                        id: 'appeal-1',
                        reason: 'I have more evidence',
                        evidence: ['img2.jpg'],
                        status: 'PENDING',
                        reviewNote: null,
                        createdAt: mockRefund.appeals[0].createdAt,
                    },
                ],
            });
            expect(client_1.prisma.refund.findFirst).toHaveBeenCalledWith({
                where: { id: refundId, userId },
                include: {
                    transaction: true,
                    appeals: { orderBy: { createdAt: 'desc' } },
                },
            });
        });
        it('should return null when refund not found', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(null);
            const result = await transactionService_1.transactionService.getRefundDetail(userId, 'nonexistent');
            expect(result).toBeNull();
        });
        it('should return null when refund belongs to another user', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(null);
            const result = await transactionService_1.transactionService.getRefundDetail('other-user', refundId);
            expect(result).toBeNull();
            expect(client_1.prisma.refund.findFirst).toHaveBeenCalledWith({
                where: { id: refundId, userId: 'other-user' },
                include: {
                    transaction: true,
                    appeals: { orderBy: { createdAt: 'desc' } },
                },
            });
        });
        it('should return empty appeals array when no appeals exist', async () => {
            const refundNoAppeals = { ...mockRefund, appeals: [] };
            client_1.prisma.refund.findFirst.mockResolvedValue(refundNoAppeals);
            const result = await transactionService_1.transactionService.getRefundDetail(userId, refundId);
            expect(result.appeals).toEqual([]);
        });
    });
    // ========================================
    // createAppeal
    // ========================================
    describe('createAppeal', () => {
        const userId = 'user-123';
        const refundId = 'refund-1';
        it('should create an appeal for a rejected refund', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'REJECTED',
            });
            client_1.prisma.refundAppeal.create.mockResolvedValue({
                id: 'appeal-1',
                refundId,
                userId,
                reason: 'New evidence',
                evidence: ['doc.pdf'],
                status: 'PENDING',
                reviewedBy: null,
                reviewNote: null,
                reviewedAt: null,
                createdAt: new Date('2025-03-15'),
                updatedAt: new Date('2025-03-15'),
            });
            const result = await transactionService_1.transactionService.createAppeal(userId, refundId, 'New evidence', ['doc.pdf']);
            expect(result).toEqual({
                id: 'appeal-1',
                refundId,
                userId,
                reason: 'New evidence',
                evidence: ['doc.pdf'],
                status: 'PENDING',
                reviewedBy: null,
                reviewNote: null,
                reviewedAt: null,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            });
            expect(client_1.prisma.refundAppeal.create).toHaveBeenCalledWith({
                data: {
                    refundId,
                    userId,
                    reason: 'New evidence',
                    evidence: ['doc.pdf'],
                },
            });
            // Should reset refund status to PENDING
            expect(client_1.prisma.refund.update).toHaveBeenCalledWith({
                where: { id: refundId },
                data: { status: 'PENDING' },
            });
        });
        it('should create an appeal without evidence', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'REJECTED',
            });
            client_1.prisma.refundAppeal.create.mockResolvedValue({
                id: 'appeal-2',
                refundId,
                userId,
                reason: 'Please reconsider',
                evidence: null,
                status: 'PENDING',
                reviewedBy: null,
                reviewNote: null,
                reviewedAt: null,
                createdAt: new Date('2025-03-15'),
                updatedAt: new Date('2025-03-15'),
            });
            const result = await transactionService_1.transactionService.createAppeal(userId, refundId, 'Please reconsider');
            expect(client_1.prisma.refundAppeal.create).toHaveBeenCalledWith({
                data: {
                    refundId,
                    userId,
                    reason: 'Please reconsider',
                    evidence: null,
                },
            });
            expect(result.evidence).toBeNull();
        });
        it('should throw when refund not found', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(null);
            await expect(transactionService_1.transactionService.createAppeal(userId, 'nonexistent', 'reason')).rejects.toThrow('退款记录不存在');
        });
        it('should throw when refund status is not REJECTED', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'PENDING',
            });
            await expect(transactionService_1.transactionService.createAppeal(userId, refundId, 'reason')).rejects.toThrow('只能对被拒绝的退款发起申诉');
        });
        it('should throw when refund status is APPROVED', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'APPROVED',
            });
            await expect(transactionService_1.transactionService.createAppeal(userId, refundId, 'reason')).rejects.toThrow('只能对被拒绝的退款发起申诉');
        });
    });
    // ========================================
    // cancelRefund
    // ========================================
    describe('cancelRefund', () => {
        const userId = 'user-123';
        const refundId = 'refund-1';
        it('should cancel a pending refund', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'PENDING',
            });
            client_1.prisma.refund.update.mockResolvedValue({
                id: refundId,
                status: 'CANCELLED',
                updatedAt: new Date('2025-03-20'),
            });
            const result = await transactionService_1.transactionService.cancelRefund(userId, refundId);
            expect(result).toEqual({
                id: refundId,
                status: 'CANCELLED',
                updatedAt: expect.any(Date),
            });
            expect(client_1.prisma.refund.update).toHaveBeenCalledWith({
                where: { id: refundId },
                data: { status: 'CANCELLED' },
            });
        });
        it('should throw when refund not found', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(null);
            await expect(transactionService_1.transactionService.cancelRefund(userId, 'nonexistent')).rejects.toThrow('退款记录不存在');
        });
        it('should throw when refund status is not PENDING (APPROVED)', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'APPROVED',
            });
            await expect(transactionService_1.transactionService.cancelRefund(userId, refundId)).rejects.toThrow('只能取消待审核的退款申请');
        });
        it('should throw when refund status is not PENDING (REJECTED)', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'REJECTED',
            });
            await expect(transactionService_1.transactionService.cancelRefund(userId, refundId)).rejects.toThrow('只能取消待审核的退款申请');
        });
        it('should throw when refund status is not PENDING (CANCELLED)', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue({
                id: refundId,
                userId,
                status: 'CANCELLED',
            });
            await expect(transactionService_1.transactionService.cancelRefund(userId, refundId)).rejects.toThrow('只能取消待审核的退款申请');
        });
        it('should not cancel refund belonging to another user', async () => {
            client_1.prisma.refund.findFirst.mockResolvedValue(null);
            await expect(transactionService_1.transactionService.cancelRefund('other-user', refundId)).rejects.toThrow('退款记录不存在');
            // Verify it queried with the correct userId
            expect(client_1.prisma.refund.findFirst).toHaveBeenCalledWith({
                where: { id: refundId, userId: 'other-user' },
            });
        });
    });
});
//# sourceMappingURL=transactionService.test.js.map