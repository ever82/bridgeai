/**
 * PhotoUnlockService Tests
 * Tests for access check, photo unlock, token validation, cleanup, and unlocked photos list
 */

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    pointsAccount: {
      findUnique: jest.fn(),
    },
    pointsTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  },
}));

// Mock visionSharePaymentService
jest.mock('../services/visionSharePaymentService', () => ({
  visionSharePaymentService: {
    checkBalance: jest.fn(),
    processPayment: jest.fn(),
    generateUnlockToken: jest.fn(),
  },
}));

import { PhotoUnlockService } from '../services/photoUnlockService';
import { prisma } from '../db/client';
import { visionSharePaymentService } from '../services/visionSharePaymentService';

describe('PhotoUnlockService', () => {
  let service: PhotoUnlockService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhotoUnlockService(prisma);
  });

  // ==================== Access Check ====================

  describe('checkPhotoAccess', () => {
    it('should grant access if user has a valid points_freezes record', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { id: 'freeze-1', reference_id: 'photo-1', account_id: 'account-user-1' },
      ]);

      const result = await service.checkPhotoAccess('user-1', 'photo-1');

      expect(result.hasAccess).toBe(true);
      expect(result.paymentRequired).toBe(false);
    });

    it('should grant access if user has a recent payment transaction', async () => {
      // First call (points_freezes) returns empty
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue({
        id: 'txn-existing',
        userId: 'user-1',
        scene: 'VISION_SHARE',
        referenceId: 'photo-1',
      });

      const result = await service.checkPhotoAccess('user-1', 'photo-1');

      expect(result.hasAccess).toBe(true);
      expect(result.paymentRequired).toBe(false);
      expect(result.unlockToken).toBe('txn-existing');
    });

    it('should require payment when no access exists', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(null);

      (visionSharePaymentService.checkBalance as jest.Mock).mockResolvedValue({
        sufficient: false,
        currentBalance: 10,
        requiredPoints: 50,
        photoId: 'photo-1',
      });

      const result = await service.checkPhotoAccess('user-1', 'photo-1');

      expect(result.hasAccess).toBe(false);
      expect(result.paymentRequired).toBe(true);
      expect(result.cost).toBe(50);
    });

    it('should handle query errors in points_freezes check gracefully', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB error'));
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(null);

      (visionSharePaymentService.checkBalance as jest.Mock).mockResolvedValue({
        sufficient: false,
        currentBalance: 0,
        requiredPoints: 50,
        photoId: 'photo-1',
      });

      const result = await service.checkPhotoAccess('user-1', 'photo-1');

      expect(result.hasAccess).toBe(false);
      expect(result.paymentRequired).toBe(true);
    });
  });

  // ==================== Unlock Photo ====================

  describe('unlockPhoto', () => {
    const request = {
      userId: 'user-1',
      photoId: 'photo-1',
      photographerUserId: 'user-2',
    };

    it('should return existing access if already unlocked', async () => {
      // checkPhotoAccess returns hasAccess: true
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { id: 'freeze-1', reference_id: 'photo-1' },
      ]);

      const result = await service.unlockPhoto(request);

      expect(result.success).toBe(true);
      expect(result.photoUrl).toContain('/api/v1/photos/photo-1/view');
      expect(result.expiresAt).toBeDefined();
    });

    it('should process payment and unlock photo', async () => {
      // checkPhotoAccess: no existing access
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(null);

      (visionSharePaymentService.checkBalance as jest.Mock).mockResolvedValue({
        sufficient: true,
        currentBalance: 100,
        requiredPoints: 50,
        photoId: 'photo-1',
      });

      (visionSharePaymentService.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionId: 'txn-1',
        pointsCharged: 50,
      });

      (visionSharePaymentService.generateUnlockToken as jest.Mock).mockResolvedValue({
        token: 'unlock-user-1-photo-1-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.unlockPhoto(request);

      expect(result.success).toBe(true);
      expect(result.photoUrl).toContain('/api/v1/photos/photo-1/view');
      expect(result.unlockToken).toBe('unlock-user-1-photo-1-123');
      expect(result.expiresAt).toBeDefined();

      expect(visionSharePaymentService.processPayment).toHaveBeenCalledWith({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-2',
      });
    });

    it('should fail when payment is unsuccessful', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(null);

      (visionSharePaymentService.checkBalance as jest.Mock).mockResolvedValue({
        sufficient: false,
        currentBalance: 10,
        requiredPoints: 50,
        photoId: 'photo-1',
      });

      (visionSharePaymentService.processPayment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient points',
      });

      const result = await service.unlockPhoto(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient points');
    });

    it('should handle unexpected errors gracefully', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      // checkPhotoAccess will handle the rejected $queryRawUnsafe, but findFirst
      // also throws, making checkPhotoAccess throw
      (prisma.pointsTransaction.findFirst as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      const result = await service.unlockPhoto(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected');
    });
  });

  // ==================== Validate Token ====================

  describe('validateToken', () => {
    it('should return valid for existing token', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'token-123',
          reference_id: 'photo-1',
          account_id: 'account-user-1',
        },
      ]);

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(true);
      expect(result.photoId).toBe('photo-1');
      expect(result.userId).toBe('user-1');
    });

    it('should return invalid for non-existent token', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      const result = await service.validateToken('token-nonexistent');

      expect(result.valid).toBe(false);
    });

    it('should return invalid on query error', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(false);
    });
  });

  // ==================== Cleanup ====================

  describe('cleanupExpiredTokens', () => {
    it('should return number of cleaned records', async () => {
      (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(5);

      const result = await service.cleanupExpiredTokens();

      expect(result.cleaned).toBe(5);
    });

    it('should return 0 when cleanup query fails', async () => {
      (prisma.$executeRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.cleanupExpiredTokens();

      expect(result.cleaned).toBe(0);
    });
  });

  // ==================== User Unlocked Photos ====================

  describe('getUnlockedPhotos', () => {
    it('should return list of unlocked photos', async () => {
      const mockPhotos = [
        { photo_id: 'photo-1', created_at: new Date(), expires_at: new Date() },
        { photo_id: 'photo-2', created_at: new Date(), expires_at: new Date() },
      ];

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockPhotos);

      const result = await service.getUnlockedPhotos('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT reference_id as photo_id'),
        'account-user-1'
      );
    });

    it('should return empty array on query error', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.getUnlockedPhotos('user-1');

      expect(result).toEqual([]);
    });
  });
});
