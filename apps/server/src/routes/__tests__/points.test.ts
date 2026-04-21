/**
 * Points Routes Tests
 */

import request from 'supertest';
import express from 'express';

import pointsRoutes from '../points';
import { pointsService } from '../../services/pointsService';

// Mock points service
jest.mock('../../services/pointsService', () => ({
  pointsService: {
    getOrCreateAccount: jest.fn(),
    getAccount: jest.fn(),
    getAvailableBalance: jest.fn(),
    earnByRule: jest.fn(),
    spendByRule: jest.fn(),
    viewPhoto: jest.fn(),
    recharge: jest.fn(),
    checkIn: jest.fn(),
    freezePoints: jest.fn(),
    unfreezePoints: jest.fn(),
    confirmFreeze: jest.fn(),
    getFreezeList: jest.fn(),
    transfer: jest.fn(),
    getTransactionList: jest.fn(),
    getTransactionDetail: jest.fn(),
    getAllRules: jest.fn(),
    getRulesByScene: jest.fn(),
    getRuleDetail: jest.fn(),
    checkRuleLimits: jest.fn(),
    getValueConfig: jest.fn(),
    getLimitConfig: jest.fn(),
    deductPoints: jest.fn(),
    manualAddPoints: jest.fn(),
    batchReward: jest.fn(),
  },
}));

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com', role: 'user' };
    next();
  },
  requireAdmin: (req: any, _res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      _res.status(403).json({ success: false, error: 'Admin access required' });
    }
  },
}));

jest.mock('../../middleware/validation', () => ({
  validate: (_schemas: any) => (req: any, _res: any, next: any) => next(),
}));

describe('Points Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/points', pointsRoutes);
  });

  // ==================== 账户管理 ====================

  describe('GET /points/account', () => {
    it('should return user account', async () => {
      const mockAccount = {
        id: 'acc-1',
        balance: 100,
        totalEarned: 500,
        totalSpent: 400,
        frozenAmount: 10,
        availableBalance: 90,
      };
      (pointsService.getOrCreateAccount as jest.Mock).mockResolvedValue(mockAccount);

      const res = await request(app).get('/points/account');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(100);
    });
  });

  describe('GET /points/balance', () => {
    it('should return available balance', async () => {
      (pointsService.getAvailableBalance as jest.Mock).mockResolvedValue(90);

      const res = await request(app).get('/points/balance');

      expect(res.status).toBe(200);
      expect(res.body.data.availableBalance).toBe(90);
    });
  });

  // ==================== 积分获取 ====================

  describe('POST /points/earn', () => {
    it('should earn points by rule', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-1', amount: 50 } };
      (pointsService.earnByRule as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/earn').send({ ruleCode: 'CHECKIN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 on earn failure', async () => {
      (pointsService.earnByRule as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Daily limit exceeded',
      });

      const res = await request(app).post('/points/earn').send({ ruleCode: 'CHECKIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /points/recharge', () => {
    it('should recharge points', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-r', amount: 1000 } };
      (pointsService.recharge as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/recharge').send({ rmbAmount: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /points/checkin', () => {
    it('should check in', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-c', amount: 10 } };
      (pointsService.checkIn as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/checkin').send({ continuousDays: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 积分消耗 ====================

  describe('POST /points/spend', () => {
    it('should spend points by rule', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-s', amount: 20 } };
      (pointsService.spendByRule as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/spend').send({ ruleCode: 'VIEW_PHOTO' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when insufficient points', async () => {
      (pointsService.spendByRule as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient points',
      });

      const res = await request(app).post('/points/spend').send({ ruleCode: 'VIEW_PHOTO' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /points/view-photo', () => {
    it('should spend points for viewing photo', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-p', amount: 20 } };
      (pointsService.viewPhoto as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/points/view-photo')
        .send({ photoId: 'photo-1', ownerId: 'owner-1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(pointsService.viewPhoto).toHaveBeenCalledWith('user-123', 'photo-1', 'owner-1');
    });

    it('should return 400 when insufficient points', async () => {
      (pointsService.viewPhoto as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient points',
      });

      const res = await request(app)
        .post('/points/view-photo')
        .send({ photoId: 'photo-1', ownerId: 'owner-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient');
    });
  });

  // ==================== 冻结/解冻 ====================

  describe('POST /points/freeze', () => {
    it('should freeze points', async () => {
      const mockResult = { success: true, freeze: { id: 'f-1', amount: 50 } };
      (pointsService.freezePoints as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/points/freeze')
        .send({ amount: 50, reason: 'Transaction guarantee' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /points/freeze/:freezeId/unfreeze', () => {
    it('should unfreeze points', async () => {
      const mockResult = { success: true };
      (pointsService.unfreezePoints as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/freeze/freeze-1/unfreeze');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /points/freeze/:freezeId/confirm', () => {
    it('should confirm freeze', async () => {
      const mockResult = { success: true };
      (pointsService.confirmFreeze as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).post('/points/freeze/freeze-1/confirm');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /points/freezes', () => {
    it('should return freeze list', async () => {
      const mockResult = {
        freezes: [{ id: 'f-1', amount: 50 }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      (pointsService.getFreezeList as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).get('/points/freezes');

      expect(res.status).toBe(200);
      expect(res.body.data.freezes).toHaveLength(1);
    });
  });

  // ==================== 转账 ====================

  describe('POST /points/transfer', () => {
    it('should transfer points', async () => {
      const mockResult = { success: true, transaction: { id: 'tx-t', amount: 50 } };
      (pointsService.transfer as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/points/transfer')
        .send({ toUserId: 'user-456', amount: 50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 交易记录 ====================

  describe('GET /points/transactions', () => {
    it('should return transaction list', async () => {
      const mockResult = {
        transactions: [{ id: 'tx-1', amount: 50 }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      (pointsService.getTransactionList as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).get('/points/transactions');

      expect(res.status).toBe(200);
      expect(res.body.data.transactions).toHaveLength(1);
    });
  });

  describe('GET /points/transactions/:transactionId', () => {
    it('should return transaction detail', async () => {
      const mockTransaction = { id: 'tx-1', amount: 50, type: 'EARN' };
      (pointsService.getTransactionDetail as jest.Mock).mockResolvedValue(mockTransaction);

      const res = await request(app).get('/points/transactions/tx-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('tx-1');
    });

    it('should return 404 when not found', async () => {
      (pointsService.getTransactionDetail as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/points/transactions/tx-999');

      expect(res.status).toBe(404);
    });
  });

  // ==================== 规则查询 ====================

  describe('GET /points/rules', () => {
    it('should return all rules', async () => {
      const mockRules = [{ code: 'CHECKIN', name: '签到' }];
      (pointsService.getAllRules as jest.Mock).mockReturnValue(mockRules);

      const res = await request(app).get('/points/rules');

      expect(res.status).toBe(200);
      expect(res.body.data.rules).toEqual(mockRules);
    });
  });

  describe('GET /points/rules/scene/:scene', () => {
    it('should return scene rules', async () => {
      const mockRules = [{ code: 'VIEW_PHOTO', scene: 'vision_share' }];
      (pointsService.getRulesByScene as jest.Mock).mockReturnValue(mockRules);

      const res = await request(app).get('/points/rules/scene/vision_share');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /points/rules/:ruleCode', () => {
    it('should return rule detail', async () => {
      const mockRule = { code: 'CHECKIN', name: '签到', points: 10 };
      (pointsService.getRuleDetail as jest.Mock).mockReturnValue(mockRule);

      const res = await request(app).get('/points/rules/CHECKIN');

      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('CHECKIN');
    });

    it('should return 404 for unknown rule', async () => {
      (pointsService.getRuleDetail as jest.Mock).mockReturnValue(null);

      const res = await request(app).get('/points/rules/UNKNOWN');

      expect(res.status).toBe(404);
    });
  });

  // ==================== 配置查询 ====================

  describe('GET /points/config/value', () => {
    it('should return value config', async () => {
      const mockConfig = { rmbToPointsRate: 100, pointsToRmbRate: 0.01 };
      (pointsService.getValueConfig as jest.Mock).mockReturnValue(mockConfig);

      const res = await request(app).get('/points/config/value');

      expect(res.status).toBe(200);
      expect(res.body.data.rmbToPointsRate).toBe(100);
    });
  });

  describe('GET /points/config/limits', () => {
    it('should return limit config', async () => {
      const mockConfig = { dailyEarnLimit: 1000 };
      (pointsService.getLimitConfig as jest.Mock).mockReturnValue(mockConfig);

      const res = await request(app).get('/points/config/limits');

      expect(res.status).toBe(200);
    });
  });

  // ==================== 管理功能 ====================

  describe('POST /points/admin/deduct', () => {
    it('should reject non-admin', async () => {
      const res = await request(app)
        .post('/points/admin/deduct')
        .send({ userId: 'user-1', amount: 50, reason: 'violation' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /points/admin/add', () => {
    it('should reject non-admin', async () => {
      const res = await request(app)
        .post('/points/admin/add')
        .send({ userId: 'user-1', amount: 50, reason: 'compensation' });

      expect(res.status).toBe(403);
    });
  });
});
