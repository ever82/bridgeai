"use strict";
/**
 * PhotoUnlockService Tests
 * Tests for photo access checking, unlocking, token validation, cleanup, and unlocked photos listing
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Mock Prisma
const mockPrisma = {
    pointsTransaction: {
        findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
};
jest.mock('../../db/client', () => ({
    prisma: mockPrisma,
}));
// Mock visionSharePaymentService
const mockVisionSharePaymentService = {
    checkBalance: jest.fn(),
    processPayment: jest.fn(),
    generateUnlockToken: jest.fn(),
};
jest.mock('../visionSharePaymentService', () => ({
    VisionSharePaymentService: jest.fn().mockImplementation(() => mockVisionSharePaymentService),
    visionSharePaymentService: mockVisionSharePaymentService,
}));
const photoUnlockService_1 = require("../photoUnlockService");
describe('PhotoUnlockService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new photoUnlockService_1.PhotoUnlockService(mockPrisma);
    });
    // ==================== checkPhotoAccess ====================
    describe('checkPhotoAccess', () => {
        it('should return hasAccess=true when existing unlock token found', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
                { id: 'unlock-1', reference_id: 'photo-1', account_id: 'account-user-1' },
            ]);
            const result = await service.checkPhotoAccess('user-1', 'photo-1');
            expect(result.hasAccess).toBe(true);
            expect(result.paymentRequired).toBe(false);
        });
        it('should return hasAccess=true when existing payment found (no unlock token)', async () => {
            // No unlock token found
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
            // But payment exists
            mockPrisma.pointsTransaction.findFirst.mockResolvedValueOnce({
                id: 'tx-existing',
                userId: 'user-1',
                scene: 'VISION_SHARE',
                referenceId: 'photo-1',
            });
            const result = await service.checkPhotoAccess('user-1', 'photo-1');
            expect(result.hasAccess).toBe(true);
            expect(result.paymentRequired).toBe(false);
            expect(result.unlockToken).toBe('tx-existing');
        });
        it('should return paymentRequired when no access found', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
            mockPrisma.pointsTransaction.findFirst.mockResolvedValueOnce(null);
            mockVisionSharePaymentService.checkBalance.mockResolvedValueOnce({
                sufficient: false,
                currentBalance: 0,
                requiredPoints: 50,
                photoId: 'photo-1',
            });
            const result = await service.checkPhotoAccess('user-1', 'photo-1');
            expect(result.hasAccess).toBe(false);
            expect(result.paymentRequired).toBe(true);
            expect(result.cost).toBe(50);
        });
        it('should handle raw query error gracefully and continue to payment check', async () => {
            mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('Query error'));
            mockPrisma.pointsTransaction.findFirst.mockResolvedValueOnce(null);
            mockVisionSharePaymentService.checkBalance.mockResolvedValueOnce({
                sufficient: true,
                currentBalance: 100,
                requiredPoints: 50,
                photoId: 'photo-1',
            });
            const result = await service.checkPhotoAccess('user-1', 'photo-1');
            expect(result.hasAccess).toBe(false);
            expect(result.paymentRequired).toBe(true);
            expect(result.cost).toBe(50);
        });
    });
    // ==================== unlockPhoto ====================
    describe('unlockPhoto', () => {
        it('should return success when photo is already unlocked', async () => {
            // checkPhotoAccess: find unlock token
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
                { id: 'unlock-1', reference_id: 'photo-1', account_id: 'account-user-1' },
            ]);
            const result = await service.unlockPhoto({
                userId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(true);
            expect(result.photoUrl).toBeDefined();
            expect(result.unlockToken).toBeUndefined(); // from checkPhotoAccess with unlock token
            expect(result.expiresAt).toBeDefined();
        });
        it('should process payment and unlock when not yet unlocked', async () => {
            // checkPhotoAccess: no unlock token, no payment, needs checkBalance
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
            mockPrisma.pointsTransaction.findFirst.mockResolvedValueOnce(null);
            mockVisionSharePaymentService.checkBalance.mockResolvedValueOnce({
                sufficient: true,
                currentBalance: 100,
                requiredPoints: 50,
                photoId: 'photo-1',
            });
            mockVisionSharePaymentService.processPayment.mockResolvedValueOnce({
                success: true,
                transactionId: 'tx-1',
                photographerTransactionId: 'tx-2',
                pointsCharged: 50,
                photographerPoints: 45,
                platformCommission: 5,
            });
            mockVisionSharePaymentService.generateUnlockToken.mockResolvedValueOnce({
                token: 'unlock-token-1',
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
            });
            const result = await service.unlockPhoto({
                userId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(true);
            expect(result.unlockToken).toBe('unlock-token-1');
            expect(result.photoUrl).toContain('photo-1');
            expect(result.expiresAt).toBeDefined();
        });
        it('should return error when payment fails', async () => {
            // checkPhotoAccess: no access, needs checkBalance
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
            mockPrisma.pointsTransaction.findFirst.mockResolvedValueOnce(null);
            mockVisionSharePaymentService.checkBalance.mockResolvedValueOnce({
                sufficient: false,
                currentBalance: 0,
                requiredPoints: 50,
                photoId: 'photo-1',
            });
            mockVisionSharePaymentService.processPayment.mockResolvedValueOnce({
                success: false,
                error: 'Insufficient points',
                pointsCharged: 0,
                photographerPoints: 0,
                platformCommission: 0,
            });
            const result = await service.unlockPhoto({
                userId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient points');
        });
        it('should handle unexpected errors gracefully', async () => {
            mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('Unexpected'));
            mockPrisma.pointsTransaction.findFirst.mockRejectedValueOnce(new Error('Unexpected'));
            const result = await service.unlockPhoto({
                userId: 'user-1',
                photoId: 'photo-1',
                photographerUserId: 'photographer-1',
            });
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    // ==================== validateToken ====================
    describe('validateToken', () => {
        it('should return valid=true when token found in DB', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
                {
                    id: 'token-1',
                    reference_id: 'photo-1',
                    account_id: 'account-user-1',
                    status: 'USED',
                    expires_at: new Date(Date.now() + 86400000),
                },
            ]);
            const result = await service.validateToken('token-1');
            expect(result.valid).toBe(true);
            expect(result.photoId).toBe('photo-1');
            expect(result.userId).toBe('user-1');
        });
        it('should return valid=false when token not found', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
            const result = await service.validateToken('nonexistent-token');
            expect(result.valid).toBe(false);
        });
        it('should return valid=false when query throws', async () => {
            mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.validateToken('token-error');
            expect(result.valid).toBe(false);
        });
    });
    // ==================== cleanupExpiredTokens ====================
    describe('cleanupExpiredTokens', () => {
        it('should delete expired tokens and return count', async () => {
            mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(5);
            const result = await service.cleanupExpiredTokens();
            expect(result.cleaned).toBe(5);
            expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM points_freezes'));
        });
        it('should return 0 when cleanup fails', async () => {
            mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.cleanupExpiredTokens();
            expect(result.cleaned).toBe(0);
        });
    });
    // ==================== getUnlockedPhotos ====================
    describe('getUnlockedPhotos', () => {
        it('should return list of unlocked photos', async () => {
            const mockUnlocks = [
                { photo_id: 'photo-1', created_at: new Date(), expires_at: new Date() },
                { photo_id: 'photo-2', created_at: new Date(), expires_at: new Date() },
            ];
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockUnlocks);
            const result = await service.getUnlockedPhotos('user-1');
            expect(result).toHaveLength(2);
            expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('account_id = $1'), 'account-user-1');
        });
        it('should return empty array when query fails', async () => {
            mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.getUnlockedPhotos('user-1');
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=photoUnlockService.test.js.map