/**
 * PointsService Tests
 * Tests for the high-level points API facade
 */

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    pointsAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    pointsTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    pointsFreeze: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock rule engine
const mockRuleEngine = {
  validateRule: jest.fn(),
  checkLimits: jest.fn(),
  calculatePoints: jest.fn(),
  checkGlobalEarnLimits: jest.fn(),
  checkGlobalSpendLimits: jest.fn(),
  getAllRules: jest.fn(),
  getRulesByScene: jest.fn(),
  getRuleDetail: jest.fn(),
};

jest.mock('../pointsRuleEngine', () => ({
  PointsRuleEngine: jest.fn().mockImplementation(() => mockRuleEngine),
  pointsRuleEngine: mockRuleEngine,
}));

// Mock transaction service
const mockTransactionService = {
  earnPoints: jest.fn(),
  spendPoints: jest.fn(),
  freezePoints: jest.fn(),
  unfreezePoints: jest.fn(),
  confirmFrozenPoints: jest.fn(),
  transferPoints: jest.fn(),
  batchEarnPoints: jest.fn(),
  cleanupExpiredFreezes: jest.fn(),
};

jest.mock('../pointsTransactionService', () => ({
  PointsTransactionService: jest.fn().mockImplementation(() => mockTransactionService),
  pointsTransactionService: mockTransactionService,
}));

// Mock config
jest.mock('../../config/pointsRules', () => ({
  getRuleByCode: jest.fn(),
  getPointsValueConfig: jest.fn(() => ({
    rmbToPointsRate: 100,
    pointsToRmbRate: 0.01,
    minRechargeAmount: 1,
    minWithdrawAmount: 10,
  })),
  getPointsLimitConfig: jest.fn(() => ({
    dailyEarnLimit: 1000,
    weeklyEarnLimit: 5000,
    dailySpendLimit: 2000,
    weeklySpendLimit: 10000,
  })),
  calculateRechargePoints: jest.fn((amount: number) => Math.floor(amount * 100)),
  calculatePointsRmbValue: jest.fn((points: number) => Math.round(points * 0.01 * 100) / 100),
}));

import { pointsService } from '../pointsService';
import { prisma } from '../../db/client';

describe('PointsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 账户管理 ====================

  describe('getAccount', () => {
    it('should return account when found', async () => {
      const mockAccount = {
        id: 'acc-1',
        balance: 100,
        totalEarned: 500,
        totalSpent: 400,
        frozenAmount: 10,
      };
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await pointsService.getAccount('user-1');

      expect(result).toEqual({
        id: 'acc-1',
        balance: 100,
        totalEarned: 500,
        totalSpent: 400,
        frozenAmount: 10,
        availableBalance: 90,
      });
    });

    it('should return null when account not found', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await pointsService.getAccount('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateAccount', () => {
    it('should return existing account', async () => {
      const mockAccount = {
        id: 'acc-1',
        balance: 100,
        totalEarned: 500,
        totalSpent: 400,
        frozenAmount: 10,
      };
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await pointsService.getOrCreateAccount('user-1');

      expect(result.id).toBe('acc-1');
      expect(result.availableBalance).toBe(90);
    });

    it('should create account when not found', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(null);
      const newAccount = {
        id: 'acc-new',
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        frozenAmount: 0,
        version: 0,
      };
      (prisma.pointsAccount.create as jest.Mock).mockResolvedValue(newAccount);

      const result = await pointsService.getOrCreateAccount('user-1');

      expect(result.id).toBe('acc-new');
      expect(result.availableBalance).toBe(0);
    });
  });

  describe('getAvailableBalance', () => {
    it('should return available balance', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        balance: 100,
        frozenAmount: 30,
      });

      const balance = await pointsService.getAvailableBalance('user-1');

      expect(balance).toBe(70);
    });

    it('should return 0 when no account', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const balance = await pointsService.getAvailableBalance('user-1');

      expect(balance).toBe(0);
    });
  });

  // ==================== 积分获取 ====================

  describe('earnByRule', () => {
    it('should earn points successfully', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: true });
      mockRuleEngine.checkLimits.mockResolvedValue({ allowed: true });
      mockRuleEngine.calculatePoints.mockResolvedValue(50);
      mockRuleEngine.checkGlobalEarnLimits.mockResolvedValue(undefined);

      const mockTransaction = { id: 'tx-1', amount: 50 };
      mockTransactionService.earnPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const { getRuleByCode } = jest.requireMock('../../config/pointsRules');
      getRuleByCode.mockReturnValue({ name: '签到' });

      const result = await pointsService.earnByRule({
        userId: 'user-1',
        ruleCode: 'CHECKIN',
      });

      expect(result.success).toBe(true);
      expect(result.transaction).toEqual(mockTransaction);
    });

    it('should fail when rule is invalid', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: false, error: 'Invalid rule' });

      const result = await pointsService.earnByRule({
        userId: 'user-1',
        ruleCode: 'INVALID',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid rule');
    });

    it('should fail when limit exceeded', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: true });
      mockRuleEngine.checkLimits.mockResolvedValue({
        allowed: false,
        error: 'Daily limit exceeded',
      });

      const result = await pointsService.earnByRule({
        userId: 'user-1',
        ruleCode: 'CHECKIN',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily limit exceeded');
    });
  });

  describe('recharge', () => {
    it('should recharge points successfully', async () => {
      const mockTransaction = { id: 'tx-recharge', amount: 1000 };
      mockTransactionService.earnPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const result = await pointsService.recharge('user-1', { rmbAmount: 10 });

      expect(result.success).toBe(true);
      expect(result.transaction).toEqual(mockTransaction);
    });

    it('should fail with zero amount', async () => {
      const result = await pointsService.recharge('user-1', { rmbAmount: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should fail with negative amount', async () => {
      const result = await pointsService.recharge('user-1', { rmbAmount: -5 });

      expect(result.success).toBe(false);
    });
  });

  // ==================== 积分消耗 ====================

  describe('spendByRule', () => {
    it('should spend points successfully', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: true });
      mockRuleEngine.checkLimits.mockResolvedValue({ allowed: true });
      mockRuleEngine.calculatePoints.mockResolvedValue(-20);
      mockRuleEngine.checkGlobalSpendLimits.mockResolvedValue(undefined);

      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        balance: 100,
        frozenAmount: 0,
      });

      const mockTransaction = { id: 'tx-spend', amount: 20 };
      mockTransactionService.spendPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const { getRuleByCode } = jest.requireMock('../../config/pointsRules');
      getRuleByCode.mockReturnValue({ name: '查看照片', scene: 'vision_share' });

      const result = await pointsService.spendByRule({
        userId: 'user-1',
        ruleCode: 'VIEW_PHOTO',
      });

      expect(result.success).toBe(true);
    });

    it('should fail with insufficient balance', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: true });
      mockRuleEngine.checkLimits.mockResolvedValue({ allowed: true });
      mockRuleEngine.calculatePoints.mockResolvedValue(-20);
      mockRuleEngine.checkGlobalSpendLimits.mockResolvedValue(undefined);

      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        balance: 10,
        frozenAmount: 0,
      });

      const result = await pointsService.spendByRule({
        userId: 'user-1',
        ruleCode: 'VIEW_PHOTO',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('viewPhoto', () => {
    it('should spend points for viewing photo', async () => {
      mockRuleEngine.validateRule.mockReturnValue({ valid: true });
      mockRuleEngine.checkLimits.mockResolvedValue({ allowed: true });
      mockRuleEngine.calculatePoints.mockResolvedValue(-20);
      mockRuleEngine.checkGlobalSpendLimits.mockResolvedValue(undefined);

      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        balance: 100,
        frozenAmount: 0,
      });

      mockTransactionService.spendPoints.mockResolvedValue({
        success: true,
        transaction: { id: 'tx-photo', amount: 20 },
      });

      const { getRuleByCode } = jest.requireMock('../../config/pointsRules');
      getRuleByCode.mockReturnValue({ name: '查看照片', scene: 'vision_share' });

      const result = await pointsService.viewPhoto('user-1', 'photo-1', 'owner-1');

      expect(result.success).toBe(true);
      expect(mockTransactionService.spendPoints).toHaveBeenCalledWith(
        'user-1',
        20,
        expect.objectContaining({
          description: '查看照片',
          scene: 'vision_share',
          metadata: expect.objectContaining({
            photoId: 'photo-1',
            ownerId: 'owner-1',
            scene: 'vision_share',
          }),
        })
      );
    });
  });

  // ==================== 积分冻结/解冻 ====================

  describe('freezePoints', () => {
    it('should freeze points successfully', async () => {
      const mockFreeze = { id: 'freeze-1', amount: 50 };
      mockTransactionService.freezePoints.mockResolvedValue({
        success: true,
        freeze: mockFreeze,
      });

      const result = await pointsService.freezePoints('user-1', 50, {
        amount: 50,
        reason: 'Transaction guarantee',
      });

      expect(result.success).toBe(true);
      expect(result.freeze).toEqual(mockFreeze);
    });
  });

  describe('unfreezePoints', () => {
    it('should unfreeze points successfully', async () => {
      const mockTransaction = { id: 'tx-unfreeze', amount: 50 };
      mockTransactionService.unfreezePoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const result = await pointsService.unfreezePoints('user-1', 'freeze-1');

      expect(result.success).toBe(true);
    });
  });

  describe('confirmFreeze', () => {
    it('should confirm freeze successfully', async () => {
      const mockTransaction = { id: 'tx-confirm', amount: 50 };
      mockTransactionService.confirmFrozenPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const result = await pointsService.confirmFreeze('user-1', 'freeze-1');

      expect(result.success).toBe(true);
    });
  });

  describe('getFreezeList', () => {
    it('should return freeze list with pagination', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({ id: 'acc-1' });

      const mockFreezes = [
        { id: 'freeze-1', amount: 50, status: 'FROZEN' },
        { id: 'freeze-2', amount: 30, status: 'RELEASED' },
      ];
      (prisma.pointsFreeze.findMany as jest.Mock).mockResolvedValue(mockFreezes);
      (prisma.pointsFreeze.count as jest.Mock).mockResolvedValue(2);

      const result = await pointsService.getFreezeList('user-1', { page: 1, pageSize: 20 });

      expect(result.freezes).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should return empty list when no account', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await pointsService.getFreezeList('user-1');

      expect(result.freezes).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ==================== 积分转账 ====================

  describe('transfer', () => {
    it('should transfer points successfully', async () => {
      const mockTransaction = { id: 'tx-transfer', amount: 50 };
      mockTransactionService.transferPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const result = await pointsService.transfer('user-1', 'user-2', 50, {
        description: 'Tip',
      });

      expect(result.success).toBe(true);
      expect(mockTransactionService.transferPoints).toHaveBeenCalledWith('user-1', 'user-2', 50, {
        description: 'Tip',
      });
    });
  });

  // ==================== 交易记录查询 ====================

  describe('getTransactionList', () => {
    it('should return transactions with pagination', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 50, type: 'EARN' },
        { id: 'tx-2', amount: -20, type: 'SPEND' },
      ];
      (prisma.pointsTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
      (prisma.pointsTransaction.count as jest.Mock).mockResolvedValue(2);

      const result = await pointsService.getTransactionList('user-1');

      expect(result.transactions).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by type', async () => {
      (prisma.pointsTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pointsTransaction.count as jest.Mock).mockResolvedValue(0);

      await pointsService.getTransactionList('user-1', { type: 'EARN' as any });

      expect(prisma.pointsTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'EARN' }),
        })
      );
    });
  });

  describe('getTransactionDetail', () => {
    it('should return transaction when found', async () => {
      const mockTransaction = { id: 'tx-1', userId: 'user-1' };
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await pointsService.getTransactionDetail('user-1', 'tx-1');

      expect(result).toEqual(mockTransaction);
    });

    it('should return null when not found', async () => {
      (prisma.pointsTransaction.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await pointsService.getTransactionDetail('user-1', 'tx-999');

      expect(result).toBeNull();
    });
  });

  // ==================== 管理功能 ====================

  describe('deductPoints', () => {
    it('should fail with zero amount', async () => {
      const result = await pointsService.deductPoints('user-1', 0, 'violation');

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should fail with insufficient balance', async () => {
      (prisma.pointsAccount.findUnique as jest.Mock).mockResolvedValue({
        balance: 10,
        frozenAmount: 0,
      });

      const result = await pointsService.deductPoints('user-1', 50, 'violation');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('manualAddPoints', () => {
    it('should fail with zero amount', async () => {
      const result = await pointsService.manualAddPoints('user-1', 0, 'compensation');

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should add points successfully', async () => {
      const mockTransaction = { id: 'tx-add', amount: 100 };
      mockTransactionService.earnPoints.mockResolvedValue({
        success: true,
        transaction: mockTransaction,
      });

      const result = await pointsService.manualAddPoints('user-1', 100, 'compensation', 'admin-1');

      expect(result.success).toBe(true);
      expect(mockTransactionService.earnPoints).toHaveBeenCalledWith(
        'user-1',
        100,
        expect.objectContaining({
          metadata: expect.objectContaining({ type: 'manual', adminId: 'admin-1' }),
        })
      );
    });
  });

  describe('batchReward', () => {
    it('should reward multiple users', async () => {
      mockTransactionService.batchEarnPoints.mockResolvedValue({
        transactions: [{ id: 'tx-1' }, { id: 'tx-2' }],
        totalEarned: 200,
        totalSpent: 0,
      });

      const result = await pointsService.batchReward(['user-1', 'user-2'], 100, 'Event reward');

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  // ==================== 配置查询 ====================

  describe('getValueConfig', () => {
    it('should return value config', () => {
      const config = pointsService.getValueConfig();

      expect(config.rmbToPointsRate).toBe(100);
      expect(config.pointsToRmbRate).toBe(0.01);
    });
  });

  describe('getLimitConfig', () => {
    it('should return limit config', () => {
      const config = pointsService.getLimitConfig();

      expect(config.dailyEarnLimit).toBe(1000);
      expect(config.weeklyEarnLimit).toBe(5000);
    });
  });
});
