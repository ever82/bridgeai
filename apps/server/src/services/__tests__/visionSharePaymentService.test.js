"use strict";
/**
 * VisionSharePaymentService Tests
 * Tests for photo payment processing, refund, balance check, and unlock token generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Mock Prisma
const mockPrisma = {
    pointsAccount: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    pointsTransaction: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRawUnsafe: jest.fn(),
};
jest.mock('../../db/client', () => ({
    prisma: mockPrisma,
}));
const visionSharePaymentService_1 = require("../visionSharePaymentService");
describe('VisionSharePaymentService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new visionSharePaymentService_1.VisionSharePaymentService(mockPrisma);
    });
    // ==================== checkBalance ====================
    describe('checkBalance', () => {
        it('should return insufficient when no account exists', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValue(null);
            const result = await service.checkBalance('user-1', 'photo-1');
            expect(result).toEqual({
                sufficient: false,
                currentBalance: 0,
                requiredPoints: 50,
                photoId: 'photo-1',
            });
        });
        it('should return insufficient when balance is below required', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValue({
                id: 'acc-1',
                balance: 30,
                version: 1,
            });
            const result = await service.checkBalance('user-1', 'photo-1');
            expect(result.sufficient).toBe(false);
            expect(result.currentBalance).toBe(30);
            expect(result.requiredPoints).toBe(50);
        });
        it('should return sufficient when balance >= 50', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValue({
                id: 'acc-1',
                balance: 100,
                version: 1,
            });
            const result = await service.checkBalance('user-1', 'photo-1');
            expect(result.sufficient).toBe(true);
            expect(result.currentBalance).toBe(100);
            expect(result.requiredPoints).toBe(50);
        });
        it('should return sufficient when balance is exactly 50', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValue({
                id: 'acc-1',
                balance: 50,
                version: 1,
            });
            const result = await service.checkBalance('user-1', 'photo-1');
            expect(result.sufficient).toBe(true);
        });
    });
    // ==================== processPayment ====================
    describe('processPayment', () => {
        it('should reject self-payment', async () => {
            const result = await service.processPayment({
                buyerUserId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'user-1',
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot pay for your own photo');
            expect(result.pointsCharged).toBe(0);
        });
        it('should reject payment when balance is insufficient', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValue({
                id: 'acc-1',
                balance: 20,
                version: 1,
            });
            const result = await service.processPayment({
                buyerUserId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'user-2',
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient points');
        });
        it('should process valid payment correctly', async () => {
            // checkBalance finds the buyer account with sufficient balance
            mockPrisma.pointsAccount.findUnique
                .mockResolvedValueOnce({ id: 'acc-1', balance: 100, version: 1 })
                // Inside transaction: find buyer account again
                .mockResolvedValueOnce({ id: 'acc-1', balance: 100, version: 1, totalSpent: 0 })
                // Inside transaction: find photographer account
                .mockResolvedValueOnce({ id: 'acc-2', balance: 200, version: 1, totalEarned: 0 });
            mockPrisma.pointsAccount.update.mockResolvedValue({});
            mockPrisma.pointsTransaction.create
                .mockResolvedValueOnce({ id: 'buyer-tx-1' })
                .mockResolvedValueOnce({ id: 'photo-tx-1' });
            mockPrisma.$transaction.mockImplementation(async (fn) => {
                return fn({
                    pointsAccount: {
                        findUnique: mockPrisma.pointsAccount.findUnique,
                        update: mockPrisma.pointsAccount.update,
                    },
                    pointsTransaction: {
                        create: mockPrisma.pointsTransaction.create,
                    },
                });
            });
            const result = await service.processPayment({
                buyerUserId: 'buyer-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(true);
            expect(result.pointsCharged).toBe(50);
            // 10% commission = 5, photographer gets 45
            expect(result.photographerPoints).toBe(45);
            expect(result.platformCommission).toBe(5);
            expect(result.transactionId).toBe('buyer-tx-1');
            expect(result.photographerTransactionId).toBe('photo-tx-1');
        });
        it('should process payment when photographer has no account', async () => {
            mockPrisma.pointsAccount.findUnique
                .mockResolvedValueOnce({ id: 'acc-1', balance: 100, version: 1 })
                .mockResolvedValueOnce({ id: 'acc-1', balance: 100, version: 1, totalSpent: 0 })
                .mockResolvedValueOnce(null); // photographer account not found
            mockPrisma.pointsAccount.update.mockResolvedValue({});
            mockPrisma.pointsTransaction.create.mockResolvedValueOnce({ id: 'buyer-tx-2' });
            mockPrisma.$transaction.mockImplementation(async (fn) => {
                return fn({
                    pointsAccount: {
                        findUnique: mockPrisma.pointsAccount.findUnique,
                        update: mockPrisma.pointsAccount.update,
                    },
                    pointsTransaction: {
                        create: mockPrisma.pointsTransaction.create,
                    },
                });
            });
            const result = await service.processPayment({
                buyerUserId: 'buyer-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-noaccount',
            });
            expect(result.success).toBe(true);
            expect(result.photographerTransactionId).toBeUndefined();
        });
        it('should handle transaction errors gracefully', async () => {
            mockPrisma.pointsAccount.findUnique.mockResolvedValueOnce({
                id: 'acc-1',
                balance: 100,
                version: 1,
            });
            mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));
            const result = await service.processPayment({
                buyerUserId: 'buyer-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });
    // ==================== processRefund ====================
    describe('processRefund', () => {
        it('should fail when original transaction not found', async () => {
            mockPrisma.pointsTransaction.findUnique.mockResolvedValue(null);
            const result = await service.processRefund('buyer-1', 'photo-1', 'tx-missing');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Original transaction not found');
            expect(result.refundAmount).toBe(0);
        });
        it('should refund buyer AND deduct photographer earnings', async () => {
            const originalAmount = -50;
            const photographerPoints = 45;
            const originalMetadata = JSON.stringify({
                photographerUserId: 'photographer-1',
                photographerPoints,
            });
            mockPrisma.pointsTransaction.findUnique.mockResolvedValue({
                id: 'original-tx-1',
                amount: originalAmount,
                metadata: originalMetadata,
            });
            // Buyer account for refund transaction
            const buyerAccount = { id: 'acc-1', balance: 50, totalEarned: 100, version: 2 };
            // Photographer account for deduction
            const photographerAccount = {
                id: 'acc-2',
                balance: 200,
                totalSpent: 0,
                version: 1,
            };
            const txMock = {
                pointsAccount: {
                    findUnique: jest.fn(),
                    update: jest.fn(),
                },
                pointsTransaction: {
                    create: jest.fn(),
                },
            };
            // First call: buyer account, second call: photographer account
            txMock.pointsAccount.findUnique
                .mockResolvedValueOnce(buyerAccount)
                .mockResolvedValueOnce(photographerAccount);
            txMock.pointsAccount.update.mockResolvedValue({});
            txMock.pointsTransaction.create.mockResolvedValue({ id: 'new-tx' });
            mockPrisma.$transaction.mockImplementation(async (fn) => {
                return fn(txMock);
            });
            const result = await service.processRefund('buyer-1', 'photo-1', 'original-tx-1');
            expect(result.success).toBe(true);
            expect(result.refundAmount).toBe(50);
            // Verify buyer was refunded
            expect(txMock.pointsAccount.update).toHaveBeenCalledTimes(2);
            expect(txMock.pointsAccount.update).toHaveBeenNthCalledWith(1, {
                where: { userId: 'buyer-1', version: 2 },
                data: expect.objectContaining({
                    balance: 100, // 50 + 50 refund
                    totalEarned: 150, // 100 + 50 refund
                    version: 3,
                }),
            });
            // Verify photographer was deducted
            expect(txMock.pointsAccount.update).toHaveBeenNthCalledWith(2, {
                where: { userId: 'photographer-1', version: 1 },
                data: expect.objectContaining({
                    balance: 155, // 200 - 45 deduction
                    totalSpent: 45,
                    version: 2,
                }),
            });
            // Verify two transactions created: one refund for buyer, one deduction for photographer
            expect(txMock.pointsTransaction.create).toHaveBeenCalledTimes(2);
        });
        it('should skip photographer deduction when photographer has insufficient balance', async () => {
            const originalMetadata = JSON.stringify({
                photographerUserId: 'photographer-1',
                photographerPoints: 45,
            });
            mockPrisma.pointsTransaction.findUnique.mockResolvedValue({
                id: 'original-tx-2',
                amount: -50,
                metadata: originalMetadata,
            });
            const buyerAccount = { id: 'acc-1', balance: 50, totalEarned: 100, version: 2 };
            const poorPhotographerAccount = {
                id: 'acc-2',
                balance: 10, // less than photographerPoints (45)
                totalSpent: 0,
                version: 1,
            };
            const txMock = {
                pointsAccount: {
                    findUnique: jest.fn(),
                    update: jest.fn(),
                },
                pointsTransaction: {
                    create: jest.fn(),
                },
            };
            txMock.pointsAccount.findUnique
                .mockResolvedValueOnce(buyerAccount)
                .mockResolvedValueOnce(poorPhotographerAccount);
            txMock.pointsAccount.update.mockResolvedValue({});
            txMock.pointsTransaction.create.mockResolvedValue({ id: 'new-tx' });
            mockPrisma.$transaction.mockImplementation(async (fn) => {
                return fn(txMock);
            });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const result = await service.processRefund('buyer-1', 'photo-1', 'original-tx-2');
            expect(result.success).toBe(true);
            // Buyer still gets refunded
            expect(txMock.pointsAccount.update).toHaveBeenCalledTimes(1);
            // But no photographer deduction
            expect(txMock.pointsTransaction.create).toHaveBeenCalledTimes(1);
            consoleWarnSpy.mockRestore();
        });
        it('should handle refund gracefully on transaction error', async () => {
            mockPrisma.pointsTransaction.findUnique.mockResolvedValue({
                id: 'original-tx-3',
                amount: -50,
                metadata: null,
            });
            mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));
            const result = await service.processRefund('buyer-1', 'photo-1', 'original-tx-3');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Transaction failed');
        });
    });
    // ==================== generateUnlockToken ====================
    describe('generateUnlockToken', () => {
        it('should return token and persist to DB', async () => {
            mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
            const result = await service.generateUnlockToken('user-1', 'photo-1');
            expect(result.token).toContain('unlock-user-1-photo-1-');
            expect(result.expiresAt).toBeDefined();
            // Verify the token was persisted
            expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO points_freezes'), expect.stringContaining('unlock-user-1-photo-1-'), 'account-user-1', 'photo-1', expect.any(String));
        });
        it('should still return token even if DB persist fails', async () => {
            mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DB error'));
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const result = await service.generateUnlockToken('user-1', 'photo-1');
            expect(result.token).toBeDefined();
            expect(result.expiresAt).toBeDefined();
            // Should not throw, just warn
            consoleWarnSpy.mockRestore();
        });
    });
    // ==================== getPaymentHistory ====================
    describe('getPaymentHistory', () => {
        it('should return payment transactions for user', async () => {
            const mockTransactions = [
                { id: 'tx-1', userId: 'user-1', scene: 'VISION_SHARE', amount: -50 },
                { id: 'tx-2', userId: 'user-1', scene: 'VISION_SHARE', amount: 45 },
            ];
            mockPrisma.pointsTransaction.findMany.mockResolvedValue(mockTransactions);
            const result = await service.getPaymentHistory('user-1');
            expect(result).toHaveLength(2);
            expect(mockPrisma.pointsTransaction.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    scene: 'VISION_SHARE',
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        });
        it('should respect custom limit', async () => {
            mockPrisma.pointsTransaction.findMany.mockResolvedValue([]);
            await service.getPaymentHistory('user-1', 10);
            expect(mockPrisma.pointsTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
        });
    });
});
//# sourceMappingURL=visionSharePaymentService.test.js.map