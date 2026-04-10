import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import creditRoutes from '../credit';
import { CreditScoreService } from '../../services/creditScoreService';

// Mock the credit score service
jest.mock('../../services/creditScoreService', () => ({
  creditScoreService: {
    getOrCreateCreditScore: jest.fn(),
    getCreditHistory: jest.fn(),
    getCreditFactors: jest.fn(),
    getCreditRank: jest.fn(),
    updateCreditScore: jest.fn(),
  },
  CreditScoreService: jest.fn().mockImplementation(() => ({
    calculateScore: jest.fn(),
  })),
}));

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com', role: 'user' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Admin access required' });
    }
  },
}));

jest.mock('../../middleware/validation', () => ({
  validateRequest: (schemas: any) => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../config/creditLevels', () => ({
  getCreditLevelConfigByScore: jest.fn().mockReturnValue({
    name: '良好',
    description: '信用良好',
    minScore: 750,
    maxScore: 899,
    benefits: ['优先匹配'],
    restrictions: [],
  }),
}));

describe('Credit Routes', () => {
  let app: express.Application;
  const mockCreditScoreService = CreditScoreService as jest.MockedClass<typeof CreditScoreService>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/credit', creditRoutes);
  });

  describe('GET /credit/score', () => {
    it('should return user credit score', async () => {
      const mockCreditScore = {
        id: 'credit-123',
        userId: 'user-123',
        score: 800,
        level: 'GOOD',
        lastUpdatedAt: new Date(),
        nextUpdateAt: new Date(),
        updateCount: 5,
      };

      const { creditScoreService } = require('../../services/creditScoreService');
      creditScoreService.getOrCreateCreditScore.mockResolvedValue(mockCreditScore);

      const response = await request(app)
        .get('/credit/score')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(800);
      expect(response.body.data.level).toBe('GOOD');
    });
  });

  describe('GET /credit/history', () => {
    it('should return credit history with pagination', async () => {
      const mockHistory = {
        histories: [
          {
            id: 'history-1',
            oldScore: 700,
            newScore: 750,
            delta: 50,
            reason: 'Profile updated',
            sourceType: 'PROFILE_UPDATE',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      const { creditScoreService } = require('../../services/creditScoreService');
      creditScoreService.getCreditHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/credit/history?page=1&pageSize=20')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.histories).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
    });
  });

  describe('GET /credit/factors', () => {
    it('should return credit factors', async () => {
      const mockFactors = [
        {
          type: 'PROFILE',
          score: 80,
          weight: 0.25,
          subFactors: [
            { name: 'completeness', score: 90, maxScore: 100, description: '资料完整度' },
          ],
        },
      ];
      const mockRank = { rank: 10, total: 100, percentile: 90 };
      const mockCreditScore = { score: 800 };

      const { creditScoreService } = require('../../services/creditScoreService');
      creditScoreService.getCreditFactors.mockResolvedValue(mockFactors);
      creditScoreService.getCreditRank.mockResolvedValue(mockRank);
      creditScoreService.getOrCreateCreditScore.mockResolvedValue(mockCreditScore);

      const response = await request(app)
        .get('/credit/factors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.factors).toHaveLength(1);
      expect(response.body.data.rank).toBe(10);
    });
  });

  describe('GET /credit/level', () => {
    it('should return credit level info', async () => {
      const mockCreditScore = {
        id: 'credit-123',
        userId: 'user-123',
        score: 800,
        level: 'GOOD',
      };

      const { creditScoreService } = require('../../services/creditScoreService');
      creditScoreService.getOrCreateCreditScore.mockResolvedValue(mockCreditScore);

      const response = await request(app)
        .get('/credit/level')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('GOOD');
      expect(response.body.data.benefits).toContain('优先匹配');
    });
  });

  describe('GET /credit/user/:userId', () => {
    it('should return masked credit info for other users', async () => {
      const mockCreditScore = {
        id: 'credit-456',
        userId: 'user-456',
        score: 850,
        level: 'GOOD',
      };

      const { creditScoreService } = require('../../services/creditScoreService');
      creditScoreService.getOrCreateCreditScore.mockResolvedValue(mockCreditScore);

      const response = await request(app)
        .get('/credit/user/user-456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('GOOD');
      expect(response.body.data.scoreRange).toBeDefined();
      // Should not have exact score
      expect(response.body.data.score).toBeUndefined();
    });

    it('should return error for self query', async () => {
      const response = await request(app)
        .get('/credit/user/user-123')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /credit/recalculate (Admin)', () => {
    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/credit/recalculate')
        .send({ userIds: ['user-456'] })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
