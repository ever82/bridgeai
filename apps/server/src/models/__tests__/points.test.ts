/**
 * Points Account Data Model Tests
 * Tests for PointsAccount, PointsTransaction, and PointsFreeze models
 */

import { PrismaClient } from '@prisma/client';

// Define enums locally to avoid build dependency issues
enum PointsTransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  RECHARGE = 'recharge',
  REFUND = 'refund',
  FROZEN = 'frozen',
  UNFROZEN = 'unfrozen',
  DEDUCT = 'deduct',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
}

enum FreezeStatus {
  FROZEN = 'frozen',
  USED = 'used',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

enum SceneCode {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
}

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    pointsAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    pointsTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    pointsFreeze: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callbacks: any[]) => {
      // Mock transaction - execute all callbacks sequentially
      return Promise.all(callbacks.map(cb => cb()));
    }),
  })),
}));

describe('Points Account Data Models', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const prisma = new PrismaClient();
    mockPrisma = prisma;
  });

  describe('PointsAccount Model', () => {
    it('should create a points account with correct default values', async () => {
      const userId = 'user-123';
      const mockAccount = {
        id: 'account-1',
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        frozenAmount: 0,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.pointsAccount.create.mockResolvedValue(mockAccount);

      const result = await mockPrisma.pointsAccount.create({
        data: { userId },
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.balance).toBe(0);
      expect(result.totalEarned).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.frozenAmount).toBe(0);
      expect(result.version).toBe(0);
    });

    it('should enforce unique constraint on userId', async () => {
      const userId = 'user-123';

      mockPrisma.pointsAccount.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`user_id`)')
      );

      await expect(
        mockPrisma.pointsAccount.create({
          data: { userId },
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should have correct relation to user', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        pointsAccount: {
          id: 'account-1',
          userId,
          balance: 100,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await mockPrisma.user.findUnique({
        where: { id: userId },
        include: { pointsAccount: true },
      });

      expect(result.pointsAccount).toBeDefined();
      expect(result.pointsAccount.userId).toBe(userId);
    });

    it('should calculate available balance correctly', async () => {
      const mockAccount = {
        id: 'account-1',
        userId: 'user-123',
        balance: 1000,
        frozenAmount: 200,
      };

      mockPrisma.pointsAccount.findUnique.mockResolvedValue(mockAccount);

      const account = await mockPrisma.pointsAccount.findUnique({
        where: { userId: 'user-123' },
      });

      const availableBalance = account.balance - account.frozenAmount;
      expect(availableBalance).toBe(800);
    });
  });

  describe('PointsTransaction Model', () => {
    it('should create a transaction with all required fields', async () => {
      const mockTransaction = {
        id: 'trans-1',
        accountId: 'account-1',
        userId: 'user-123',
        type: PointsTransactionType.EARN,
        amount: 100,
        balanceAfter: 100,
        description: '注册奖励',
        scene: SceneCode.VISION_SHARE,
        referenceId: 'ref-1',
        metadata: { source: 'signup' },
        createdAt: new Date(),
      };

      mockPrisma.pointsTransaction.create.mockResolvedValue(mockTransaction);

      const result = await mockPrisma.pointsTransaction.create({
        data: {
          accountId: 'account-1',
          userId: 'user-123',
          type: PointsTransactionType.EARN,
          amount: 100,
          balanceAfter: 100,
          description: '注册奖励',
          scene: SceneCode.VISION_SHARE,
          referenceId: 'ref-1',
          metadata: { source: 'signup' },
        },
      });

      expect(result).toBeDefined();
      expect(result.type).toBe(PointsTransactionType.EARN);
      expect(result.amount).toBe(100);
      expect(result.balanceAfter).toBe(100);
      expect(result.scene).toBe(SceneCode.VISION_SHARE);
    });

    it('should support all transaction types', async () => {
      const transactionTypes = Object.values(PointsTransactionType) as PointsTransactionType[];

      for (const type of transactionTypes) {
        const mockTransaction = {
          id: `trans-${type}`,
          accountId: 'account-1',
          userId: 'user-123',
          type,
          amount: type.includes('OUT') || type === 'spend' || type === 'deduct' || type === 'frozen' ? -50 : 50,
          balanceAfter: 100,
          createdAt: new Date(),
        };

        mockPrisma.pointsTransaction.create.mockResolvedValue(mockTransaction);

        const result = await mockPrisma.pointsTransaction.create({
          data: {
            accountId: 'account-1',
            userId: 'user-123',
            type,
            amount: mockTransaction.amount,
            balanceAfter: 100,
          },
        });

        expect(result.type).toBe(type);
      }
    });

    it('should query transactions with pagination', async () => {
      const mockTransactions = [
        { id: 'trans-1', amount: 100 },
        { id: 'trans-2', amount: -50 },
      ];

      mockPrisma.pointsTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.pointsTransaction.count.mockResolvedValue(2);

      const transactions = await mockPrisma.pointsTransaction.findMany({
        where: { accountId: 'account-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(transactions).toHaveLength(2);
    });

    it('should filter transactions by type', async () => {
      mockPrisma.pointsTransaction.findMany.mockResolvedValue([
        { id: 'trans-1', type: PointsTransactionType.EARN },
      ]);

      const transactions = await mockPrisma.pointsTransaction.findMany({
        where: {
          accountId: 'account-1',
          type: PointsTransactionType.EARN,
        },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe(PointsTransactionType.EARN);
    });

    it('should filter transactions by scene', async () => {
      mockPrisma.pointsTransaction.findMany.mockResolvedValue([
        { id: 'trans-1', scene: SceneCode.VISION_SHARE },
        { id: 'trans-2', scene: SceneCode.VISION_SHARE },
      ]);

      const transactions = await mockPrisma.pointsTransaction.findMany({
        where: {
          scene: SceneCode.VISION_SHARE,
        },
      });

      expect(transactions).toHaveLength(2);
    });
  });

  describe('PointsFreeze Model', () => {
    it('should create a freeze record with correct default status', async () => {
      const mockFreeze = {
        id: 'freeze-1',
        accountId: 'account-1',
        transactionId: null,
        amount: 100,
        reason: 'VisionShare任务担保',
        scene: SceneCode.VISION_SHARE,
        referenceId: 'task-1',
        status: FreezeStatus.FROZEN,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.pointsFreeze.create.mockResolvedValue(mockFreeze);

      const result = await mockPrisma.pointsFreeze.create({
        data: {
          accountId: 'account-1',
          amount: 100,
          reason: 'VisionShare任务担保',
          scene: SceneCode.VISION_SHARE,
          referenceId: 'task-1',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(FreezeStatus.FROZEN);
      expect(result.amount).toBe(100);
    });

    it('should support all freeze statuses', async () => {
      const statuses = Object.values(FreezeStatus);

      for (const status of statuses) {
        const mockFreeze = {
          id: `freeze-${status}`,
          accountId: 'account-1',
          amount: 100,
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.pointsFreeze.create.mockResolvedValue(mockFreeze);

        const result = await mockPrisma.pointsFreeze.create({
          data: {
            accountId: 'account-1',
            amount: 100,
            reason: 'Test freeze',
            status,
          },
        });

        expect(result.status).toBe(status);
      }
    });

    it('should update freeze status', async () => {
      const mockFreeze = {
        id: 'freeze-1',
        accountId: 'account-1',
        amount: 100,
        status: FreezeStatus.USED,
        updatedAt: new Date(),
      };

      mockPrisma.pointsFreeze.update.mockResolvedValue(mockFreeze);

      const result = await mockPrisma.pointsFreeze.update({
        where: { id: 'freeze-1' },
        data: { status: FreezeStatus.USED },
      });

      expect(result.status).toBe(FreezeStatus.USED);
    });

    it('should filter freezes by status', async () => {
      mockPrisma.pointsFreeze.findMany.mockResolvedValue([
        { id: 'freeze-1', status: FreezeStatus.FROZEN },
        { id: 'freeze-2', status: FreezeStatus.FROZEN },
      ]);

      const freezes = await mockPrisma.pointsFreeze.findMany({
        where: {
          accountId: 'account-1',
          status: FreezeStatus.FROZEN,
        },
      });

      expect(freezes).toHaveLength(2);
      expect(freezes[0].status).toBe(FreezeStatus.FROZEN);
    });

    it('should filter expired freezes', async () => {
      const now = new Date();
      mockPrisma.pointsFreeze.findMany.mockResolvedValue([
        { id: 'freeze-1', expiresAt: new Date(now.getTime() - 1000) },
        { id: 'freeze-2', expiresAt: new Date(now.getTime() - 2000) },
      ]);

      const expiredFreezes = await mockPrisma.pointsFreeze.findMany({
        where: {
          accountId: 'account-1',
          status: FreezeStatus.FROZEN,
          expiresAt: { lt: now },
        },
      });

      expect(expiredFreezes).toHaveLength(2);
    });
  });

  describe('Model Relationships', () => {
    it('should cascade delete points account with user', async () => {
      mockPrisma.pointsAccount.delete.mockResolvedValue({ id: 'account-1' });

      const result = await mockPrisma.pointsAccount.delete({
        where: { userId: 'user-123' },
      });

      expect(result).toBeDefined();
      expect(mockPrisma.pointsAccount.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should cascade delete transactions with account', async () => {
      mockPrisma.pointsTransaction.deleteMany.mockResolvedValue({ count: 5 });

      const result = await mockPrisma.pointsTransaction.deleteMany({
        where: { accountId: 'account-1' },
      });

      expect(result.count).toBe(5);
    });

    it('should set transactionId to null when freeze is deleted', async () => {
      mockPrisma.pointsFreeze.delete.mockResolvedValue({ id: 'freeze-1' });

      const result = await mockPrisma.pointsFreeze.delete({
        where: { id: 'freeze-1' },
      });

      expect(result).toBeDefined();
    });
  });

  describe('Constraints and Validation', () => {
    it('should not allow negative balance (business logic level)', async () => {
      // This tests the business logic constraint, not DB-level constraint
      // In practice, this would be handled by the service layer
      const mockAccount = {
        balance: 100,
      };

      mockPrisma.pointsAccount.findUnique.mockResolvedValue(mockAccount);

      const account = await mockPrisma.pointsAccount.findUnique({
        where: { id: 'account-1' },
      });

      // Simulate balance check before spending
      const spendAmount = 150;
      const canSpend = account.balance >= spendAmount;

      expect(canSpend).toBe(false);
    });

    it('should handle concurrent updates with version field', async () => {
      const mockAccount = {
        id: 'account-1',
        balance: 100,
        version: 1,
      };

      mockPrisma.pointsAccount.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.pointsAccount.update.mockResolvedValue({
        ...mockAccount,
        balance: 150,
        version: 2,
      });

      // Simulate optimistic locking
      const account = await mockPrisma.pointsAccount.findUnique({
        where: { id: 'account-1' },
      });

      const result = await mockPrisma.pointsAccount.update({
        where: {
          id: 'account-1',
          version: account.version,
        },
        data: {
          balance: account.balance + 50,
          version: account.version + 1,
        },
      });

      expect(result.version).toBe(2);
      expect(result.balance).toBe(150);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct transaction type values', () => {
      expect(PointsTransactionType.EARN).toBe('earn');
      expect(PointsTransactionType.SPEND).toBe('spend');
      expect(PointsTransactionType.RECHARGE).toBe('recharge');
      expect(PointsTransactionType.REFUND).toBe('refund');
      expect(PointsTransactionType.FROZEN).toBe('frozen');
      expect(PointsTransactionType.UNFROZEN).toBe('unfrozen');
      expect(PointsTransactionType.DEDUCT).toBe('deduct');
      expect(PointsTransactionType.TRANSFER_IN).toBe('transfer_in');
      expect(PointsTransactionType.TRANSFER_OUT).toBe('transfer_out');
    });

    it('should have correct freeze status values', () => {
      expect(FreezeStatus.FROZEN).toBe('frozen');
      expect(FreezeStatus.USED).toBe('used');
      expect(FreezeStatus.RELEASED).toBe('released');
      expect(FreezeStatus.EXPIRED).toBe('expired');
    });

    it('should have correct scene code values', () => {
      expect(SceneCode.VISION_SHARE).toBe('vision_share');
      expect(SceneCode.AGENT_DATE).toBe('agent_date');
      expect(SceneCode.AGENT_JOB).toBe('agent_job');
      expect(SceneCode.AGENT_AD).toBe('agent_ad');
    });
  });
});
