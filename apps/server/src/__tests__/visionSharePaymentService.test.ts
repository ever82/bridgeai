/**
 * VisionSharePaymentService Tests
 * Tests for balance check, payment processing, refund, unlock token, and payment history
 */

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    pointsAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pointsTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

import { VisionSharePaymentService } from '../services/visionSharePaymentService';
import { prisma } from '../db/client';

describe('VisionSharePaymentService', () => {
  let service: VisionSharePaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisionSharePaymentService(prisma);
  });

  // ==================== Balance Check ====================

  describe('checkBalance', () => {
    it('should return insufficient when user account does not exist', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.checkBalance('user-1', 'photo-1');

      expect(result.sufficient).toBe(false);
      expect(result.currentBalance).toBe(0);
      expect(result.requiredPoints).toBe(50);
      expect(result.photoId).toBe('photo-1');
    });

    it('should return sufficient when user has enough balance', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        balance: 100,
      });

      const result = await service.checkBalance('user-1', 'photo-1');

      expect(result.sufficient).toBe(true);
      expect(result.currentBalance).toBe(100);
      expect(result.requiredPoints).toBe(50);
    });

    it('should return insufficient when user has less balance than required', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        balance: 30,
      });

      const result = await service.checkBalance('user-1', 'photo-1');

      expect(result.sufficient).toBe(false);
      expect(result.currentBalance).toBe(30);
      expect(result.requiredPoints).toBe(50);
    });
  });

  // ==================== Payment Processing ====================

  describe('processPayment', () => {
    it('should reject when buyer is the photographer', async () => {
      const result = await service.processPayment({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot pay for your own photo');
      expect(result.pointsCharged).toBe(0);
    });

    it('should reject when balance is insufficient', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        balance: 10,
      });

      const result = await service.processPayment({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient points');
    });

    it('should process payment successfully with photographer account', async () => {
      // balance check mock
      (prisma.pointsAccount.findUnique as jest.Mock).mockImplementation((args: object) => {
        if (args.where.userId === 'user-1') {
          return Promise.resolve({ id: 'acc-1', userId: 'user-1', balance: 100, version: 1 });
        }
        if (args.where.userId === 'user-2') {
          return Promise.resolve({
            id: 'acc-2',
            userId: 'user-2',
            balance: 0,
            totalEarned: 0,
            version: 1,
          });
        }
        return Promise.resolve(null);
      });

      // $transaction mock - invoke the callback immediately
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: object) => Promise<unknown>) => {
          const txMock = {
            pointsAccount: {
              findUnique: jest.fn().mockImplementation((args: object) => {
                if (args.where.userId === 'user-1') {
                  return Promise.resolve({
                    id: 'acc-1',
                    userId: 'user-1',
                    balance: 100,
                    version: 1,
                  });
                }
                if (args.where.userId === 'user-2') {
                  return Promise.resolve({
                    id: 'acc-2',
                    userId: 'user-2',
                    balance: 0,
                    totalEarned: 0,
                    version: 1,
                  });
                }
                return Promise.resolve(null);
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            pointsTransaction: {
              create: jest.fn().mockImplementation((args: object) => {
                return Promise.resolve({ id: `txn-${args.data.userId}` });
              }),
            },
          };
          return cb(txMock);
        }
      );

      const result = await service.processPayment({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-2',
      });

      expect(result.success).toBe(true);
      expect(result.pointsCharged).toBe(50);
      expect(result.platformCommission).toBe(5); // 10% of 50
      expect(result.photographerPoints).toBe(45); // 50 - 5
      expect(result.transactionId).toBeDefined();
      expect(result.photographerTransactionId).toBeDefined();
    });

    it('should process payment successfully without photographer account', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockImplementation((args: object) => {
        if (args.where.userId === 'user-1') {
          return Promise.resolve({ id: 'acc-1', userId: 'user-1', balance: 100, version: 1 });
        }
        return Promise.resolve(null);
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: object) => Promise<unknown>) => {
          const txMock = {
            pointsAccount: {
              findUnique: jest.fn().mockImplementation((args: object) => {
                if (args.where.userId === 'user-1') {
                  return Promise.resolve({
                    id: 'acc-1',
                    userId: 'user-1',
                    balance: 100,
                    version: 1,
                  });
                }
                return Promise.resolve(null);
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            pointsTransaction: {
              create: jest.fn().mockResolvedValue({ id: 'txn-buyer-1' }),
            },
          };
          return cb(txMock);
        }
      );

      const result = await service.processPayment({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-2',
      });

      expect(result.success).toBe(true);
      expect(result.photographerTransactionId).toBeUndefined();
    });

    it('should handle transaction errors gracefully', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        balance: 100,
        version: 1,
      });

      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.processPayment({
        buyerUserId: 'user-1',
        photoId: 'photo-1',
        photographerUserId: 'user-2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  // ==================== Refund ====================

  describe('processRefund', () => {
    it('should fail when original transaction not found', async () => {
      (prisma.pointsTransaction.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.processRefund('user-1', 'photo-1', 'txn-unknown');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Original transaction not found');
      expect(result.refundAmount).toBe(0);
    });

    it('should process refund successfully without photographer deduction', async () => {
      const originalTx = {
        id: 'txn-1',
        amount: -50,
        metadata: JSON.stringify({ photographerUserId: 'user-2', photographerPoints: 45 }),
      };

      (prisma.pointsTransaction.findUnique as jest.Mock).mockResolvedValue(originalTx);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: object) => Promise<unknown>) => {
          const txMock = {
            pointsAccount: {
              findUnique: jest.fn().mockImplementation((args: object) => {
                if (args.where.userId === 'user-1') {
                  return Promise.resolve({
                    id: 'acc-1',
                    userId: 'user-1',
                    balance: 50,
                    totalEarned: 100,
                    version: 1,
                  });
                }
                // Photographer has insufficient balance
                return Promise.resolve({
                  id: 'acc-2',
                  userId: 'user-2',
                  balance: 10,
                  totalSpent: 0,
                  version: 1,
                });
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            pointsTransaction: {
              create: jest.fn().mockResolvedValue({ id: 'txn-refund-1' }),
            },
          };
          return cb(txMock);
        }
      );

      const result = await service.processRefund('user-1', 'photo-1', 'txn-1');

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(50);
    });

    it('should process refund with photographer deduction when photographer has sufficient balance', async () => {
      const originalTx = {
        id: 'txn-1',
        amount: -50,
        metadata: JSON.stringify({ photographerUserId: 'user-2', photographerPoints: 45 }),
      };

      (prisma.pointsTransaction.findUnique as jest.Mock).mockResolvedValue(originalTx);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: object) => Promise<unknown>) => {
          const txMock = {
            pointsAccount: {
              findUnique: jest.fn().mockImplementation((args: object) => {
                if (args.where.userId === 'user-1') {
                  return Promise.resolve({
                    id: 'acc-1',
                    userId: 'user-1',
                    balance: 50,
                    totalEarned: 100,
                    version: 1,
                  });
                }
                return Promise.resolve({
                  id: 'acc-2',
                  userId: 'user-2',
                  balance: 100,
                  totalSpent: 0,
                  version: 1,
                });
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            pointsTransaction: {
              create: jest.fn().mockResolvedValue({ id: 'txn-refund-1' }),
            },
          };
          return cb(txMock);
        }
      );

      const result = await service.processRefund('user-1', 'photo-1', 'txn-1');

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(50);
    });

    it('should handle refund transaction errors', async () => {
      (prisma.pointsTransaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'txn-1',
        amount: -50,
        metadata: null,
      });

      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Refund DB error'));

      const result = await service.processRefund('user-1', 'photo-1', 'txn-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refund DB error');
    });
  });

  // ==================== Unlock Token ====================

  describe('generateUnlockToken', () => {
    it('should generate a token with correct format and expiry', async () => {
      (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);

      const result = await service.generateUnlockToken('user-1', 'photo-1');

      expect(result.token).toContain('unlock-user-1-photo-1-');
      expect(result.expiresAt).toBeDefined();

      // Verify the token was persisted
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO points_freezes'),
        expect.stringContaining('unlock-user-1-photo-1-'),
        'account-user-1',
        'photo-1',
        expect.any(String)
      );
    });

    it('should still return token even if persistence fails', async () => {
      (prisma.$executeRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.generateUnlockToken('user-1', 'photo-1');

      expect(result.token).toContain('unlock-user-1-photo-1-');
      expect(result.expiresAt).toBeDefined();
    });
  });

  // ==================== Payment History ====================

  describe('getPaymentHistory', () => {
    it('should return transactions for a user', async () => {
      const mockTransactions = [
        { id: 'txn-1', userId: 'user-1', scene: 'VISION_SHARE', amount: -50 },
        { id: 'txn-2', userId: 'user-1', scene: 'VISION_SHARE', amount: 45 },
      ];

      (prisma.pointsTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await service.getPaymentHistory('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('txn-1');
      expect(prisma.pointsTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', scene: 'VISION_SHARE' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );
    });

    it('should respect custom limit', async () => {
      (prisma.pointsTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPaymentHistory('user-1', 10);

      expect(prisma.pointsTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });
});
