/**
 * CreditPaymentService Tests
 * Tests for VisionShare credit payment and HD unlock functionality
 */

// Mock pointsService
jest.mock('../services/pointsService', () => ({
  pointsService: {
    getOrCreateAccount: jest.fn(),
    spendByRule: jest.fn(),
  },
}));

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    pointsAccount: {
      findUnique: jest.fn(),
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

import { CreditPaymentService } from '../services/payment/creditPaymentService';
import { pointsService } from '../services/pointsService';
import { PaymentStatus } from '../../../shared/types/payment.types';

describe('CreditPaymentService', () => {
  let service: CreditPaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreditPaymentService();
  });

  describe('processPayment', () => {
    const userId = 'user-123';
    const photoId = 'photo-456';

    beforeEach(() => {
      // Register a photo with default price
      service.registerPhoto(photoId, 'supplier-789', 20);
    });

    it('should reject payment with no photo IDs', async () => {
      const result = await service.processPayment(userId, {
        photoIds: [],
        totalAmount: 20,
        password: '1234',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });

    it('should reject payment with amount mismatch', async () => {
      const result = await service.processPayment(userId, {
        photoIds: [photoId],
        totalAmount: 999,
        password: '1234',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AMOUNT_MISMATCH');
    });

    it('should reject payment with insufficient balance', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 10,
        totalEarned: 10,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 10,
      });

      const result = await service.processPayment(userId, {
        photoIds: [photoId],
        totalAmount: 20,
        password: '1234',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should process single photo payment successfully', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        totalEarned: 100,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 100,
      });

      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-1' },
      });

      const result = await service.processPayment(userId, {
        photoIds: [photoId],
        totalAmount: 20,
        password: '1234',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.unlockedPhotos).toHaveLength(1);
      expect(result.unlockedPhotos[0].photoId).toBe(photoId);
      expect(result.unlockedPhotos[0].downloadToken).toBeDefined();
      expect(result.remainingBalance).toBe(100);

      // Verify pointsService was called correctly
      expect(pointsService.spendByRule).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          ruleCode: 'VIEW_PHOTO',
          baseAmount: 20,
        })
      );
    });

    it('should process batch payment for multiple photos', async () => {
      const photoId2 = 'photo-789';
      service.registerPhoto(photoId2, 'supplier-789', 20);

      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        totalEarned: 100,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 100,
      });

      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-batch' },
      });

      const result = await service.processPayment(userId, {
        photoIds: [photoId, photoId2],
        totalAmount: 40,
        password: '1234',
      });

      expect(result.success).toBe(true);
      expect(result.unlockedPhotos).toHaveLength(2);
    });

    it('should handle points deduction failure', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        totalEarned: 100,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 100,
      });

      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient points',
      });

      const result = await service.processPayment(userId, {
        photoIds: [photoId],
        totalAmount: 20,
        password: '1234',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PAYMENT_FAILED');
    });
  });

  describe('getBalance', () => {
    it('should return user credit balance', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 500,
        totalEarned: 600,
        totalSpent: 100,
        frozenAmount: 50,
        availableBalance: 450,
      });

      const balance = await service.getBalance('user-123');

      expect(balance.available).toBe(450);
      expect(balance.frozen).toBe(50);
      expect(balance.total).toBe(500);
      expect(balance.currency).toBe('credits');
    });
  });

  describe('hasSufficientCredits', () => {
    it('should return true when user has enough credits', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        totalEarned: 100,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 100,
      });

      const result = await service.hasSufficientCredits('user-123', 50);
      expect(result).toBe(true);
    });

    it('should return false when user has insufficient credits', async () => {
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 30,
        totalEarned: 30,
        totalSpent: 0,
        frozenAmount: 0,
        availableBalance: 30,
      });

      const result = await service.hasSufficientCredits('user-123', 50);
      expect(result).toBe(false);
    });
  });

  describe('verifyPaymentPassword', () => {
    it('should accept password with 4+ characters', async () => {
      const result = await service.verifyPaymentPassword('user-123', '1234');
      expect(result).toBe(true);
    });

    it('should reject password with less than 4 characters', async () => {
      const result = await service.verifyPaymentPassword('user-123', '12');
      expect(result).toBe(false);
    });
  });

  describe('isPhotoUnlocked', () => {
    it('should return false for locked photo', async () => {
      service.registerPhoto('photo-1', 'supplier-1', 20);
      const result = await service.isPhotoUnlocked('photo-1', 'user-1');
      expect(result).toBe(false);
    });

    it('should return true for unlocked photo', async () => {
      service.registerPhoto('photo-1', 'supplier-1', 20);

      // Simulate payment to unlock
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        availableBalance: 100,
        frozenAmount: 0,
      });
      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-1' },
      });

      await service.processPayment('user-1', {
        photoIds: ['photo-1'],
        totalAmount: 20,
        password: '1234',
      });

      const result = await service.isPhotoUnlocked('photo-1', 'user-1');
      expect(result).toBe(true);
    });
  });

  describe('download tokens', () => {
    it('should generate download token for unlocked photo', async () => {
      service.registerPhoto('photo-1', 'supplier-1', 20);

      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        availableBalance: 100,
        frozenAmount: 0,
      });
      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-1' },
      });

      const paymentResult = await service.processPayment('user-1', {
        photoIds: ['photo-1'],
        totalAmount: 20,
        password: '1234',
      });

      // Payment should include download token
      expect(paymentResult.success).toBe(true);
      expect(paymentResult.unlockedPhotos[0].downloadToken).toBeDefined();
    });

    it('should reject download token generation for locked photo', async () => {
      service.registerPhoto('photo-2', 'supplier-1', 20);

      await expect(service.generateDownloadToken('photo-2', 'user-1')).rejects.toThrow(
        'Photo is not unlocked'
      );
    });

    it('should validate and use download token', async () => {
      service.registerPhoto('photo-1', 'supplier-1', 20);

      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        availableBalance: 100,
        frozenAmount: 0,
      });
      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-1' },
      });

      const paymentResult = await service.processPayment('user-1', {
        photoIds: ['photo-1'],
        totalAmount: 20,
        password: '1234',
      });

      const token = paymentResult.unlockedPhotos[0].downloadToken;

      // Validate token
      const validationResult = await service.validateAndUseDownloadToken(token, 'user-1');
      expect(validationResult.valid).toBe(true);
      expect(validationResult.photoId).toBe('photo-1');
    });

    it('should reject invalid download token', async () => {
      const result = await service.validateAndUseDownloadToken('invalid-token', 'user-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid download token');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return FAILED for unknown transaction', async () => {
      const status = await service.getPaymentStatus('unknown-txn');
      expect(status).toBe(PaymentStatus.FAILED);
    });

    it('should return COMPLETED for successful payment', async () => {
      service.registerPhoto('photo-1', 'supplier-1', 20);

      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        availableBalance: 100,
        frozenAmount: 0,
      });
      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: true,
        transaction: { id: 'txn-1' },
      });

      const result = await service.processPayment('user-1', {
        photoIds: ['photo-1'],
        totalAmount: 20,
        password: '1234',
      });

      const status = await service.getPaymentStatus(result.transactionId!);
      expect(status).toBe(PaymentStatus.COMPLETED);
    });
  });

  describe('getUserTransactions', () => {
    it('should return empty list for user with no transactions', async () => {
      const result = await service.getUserTransactions('user-no-txns');
      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
