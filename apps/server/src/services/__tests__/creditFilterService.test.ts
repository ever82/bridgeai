/**
 * Credit Filter Service Tests
 * 信用分过滤服务测试
 */

import {
  CreditLevel,
  CREDIT_LEVEL_THRESHOLDS,
} from '@bridgeai/shared';
import {
  CreditFilterOptions,
  getCreditLevel,
  getCreditLevelLabel,
  getCreditLevelColor,
  buildCreditFilterCondition,
  filterAgentsByCredit,
  checkCreditThreshold,
  getCreditStatistics,
  addCreditFilterToDSL,
} from '../creditFilterService';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    creditScore: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CreditFilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCreditLevel', () => {
    it('should return correct level for excellent score', () => {
      expect(getCreditLevel(850)).toBe('excellent');
      expect(getCreditLevel(800)).toBe('excellent');
      expect(getCreditLevel(1000)).toBe('excellent');
    });

    it('should return correct level for good score', () => {
      expect(getCreditLevel(700)).toBe('good');
      expect(getCreditLevel(600)).toBe('good');
      expect(getCreditLevel(799)).toBe('good');
    });

    it('should return correct level for average score', () => {
      expect(getCreditLevel(500)).toBe('average');
      expect(getCreditLevel(400)).toBe('average');
      expect(getCreditLevel(599)).toBe('average');
    });

    it('should return correct level for poor score', () => {
      expect(getCreditLevel(300)).toBe('poor');
      expect(getCreditLevel(0)).toBe('poor');
      expect(getCreditLevel(399)).toBe('poor');
    });

    it('should return null for null or undefined score', () => {
      expect(getCreditLevel(null)).toBeNull();
      expect(getCreditLevel(undefined)).toBeNull();
    });
  });

  describe('getCreditLevelLabel', () => {
    it('should return correct labels for each level', () => {
      expect(getCreditLevelLabel('excellent')).toBe('优秀');
      expect(getCreditLevelLabel('good')).toBe('良好');
      expect(getCreditLevelLabel('average')).toBe('一般');
      expect(getCreditLevelLabel('poor')).toBe('较差');
    });

    it('should return "无信用分" for null level', () => {
      expect(getCreditLevelLabel(null)).toBe('无信用分');
    });
  });

  describe('getCreditLevelColor', () => {
    it('should return correct colors for each level', () => {
      expect(getCreditLevelColor('excellent')).toBe('#4CAF50');
      expect(getCreditLevelColor('good')).toBe('#8BC34A');
      expect(getCreditLevelColor('average')).toBe('#FFC107');
      expect(getCreditLevelColor('poor')).toBe('#FF5722');
    });

    it('should return gray color for null level', () => {
      expect(getCreditLevelColor(null)).toBe('#9E9E9E');
    });
  });

  describe('buildCreditFilterCondition', () => {
    it('should build condition for min credit score', () => {
      const options: CreditFilterOptions = { minCreditScore: 600 };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: {
              gte: 600,
            },
          },
        },
      });
    });

    it('should build condition for max credit score', () => {
      const options: CreditFilterOptions = { maxCreditScore: 800 };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: {
              lte: 800,
            },
          },
        },
      });
    });

    it('should build condition for credit score range', () => {
      const options: CreditFilterOptions = { minCreditScore: 600, maxCreditScore: 800 };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: {
              gte: 600,
              lte: 800,
            },
          },
        },
      });
    });

    it('should build condition for single credit level', () => {
      const options: CreditFilterOptions = { creditLevel: 'excellent' };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: {
              gte: 800,
              lte: 1000,
            },
          },
        },
      });
    });

    it('should build condition for multiple credit levels', () => {
      const options: CreditFilterOptions = { creditLevel: ['excellent', 'good'] };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        OR: [
          {
            user: {
              creditScore: {
                score: {
                  gte: 800,
                  lte: 1000,
                },
              },
            },
          },
          {
            user: {
              creditScore: {
                score: {
                  gte: 600,
                  lte: 799,
                },
              },
            },
          },
        ],
      });
    });

    it('should build condition to include agents without credit score', () => {
      const options: CreditFilterOptions = { includeNoCredit: true };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            is: null,
          },
        },
      });
    });

    it('should return empty object when no options provided', () => {
      const options: CreditFilterOptions = {};
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({});
    });

    it('should combine multiple conditions with OR', () => {
      const options: CreditFilterOptions = {
        minCreditScore: 600,
        includeNoCredit: true,
      };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        OR: [
          {
            user: {
              creditScore: {
                score: {
                  gte: 600,
                },
              },
            },
          },
          {
            user: {
              creditScore: {
                is: null,
              },
            },
          },
        ],
      });
    });
  });

  describe('filterAgentsByCredit', () => {
    it('should filter agents by credit score', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'VISIONSHARE',
          user: {
            creditScore: { score: 850 },
          },
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'VISIONSHARE',
          user: {
            creditScore: { score: 700 },
          },
        },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      const result = await filterAgentsByCredit(
        { minCreditScore: 600 },
        { page: 1, limit: 20 }
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].creditScore).toBe(850);
      expect(result.items[0].creditLevel).toBe('excellent');
      expect(result.items[1].creditScore).toBe(700);
      expect(result.items[1].creditLevel).toBe('good');
    });

    it('should handle agents without credit score', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'VISIONSHARE',
          user: {
            creditScore: null,
          },
        },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ includeNoCredit: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].creditScore).toBeNull();
      expect(result.items[0].creditLevel).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (prisma.agent.findMany as jest.Mock).mockRejectedValue(error);

      await expect(filterAgentsByCredit({ minCreditScore: 600 })).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to filter agents by credit',
        expect.any(Object)
      );
    });
  });

  describe('checkCreditThreshold', () => {
    it('should return meetsThreshold=true when agent meets threshold', async () => {
      const mockAgent = {
        id: 'agent-1',
        user: {
          creditScore: { score: 750 },
        },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await checkCreditThreshold('agent-1', 600);

      expect(result.meetsThreshold).toBe(true);
      expect(result.agentScore).toBe(750);
      expect(result.agentLevel).toBe('good');
      expect(result.requiredScore).toBe(600);
      expect(result.gap).toBe(0);
    });

    it('should return meetsThreshold=false when agent does not meet threshold', async () => {
      const mockAgent = {
        id: 'agent-1',
        user: {
          creditScore: { score: 500 },
        },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await checkCreditThreshold('agent-1', 600);

      expect(result.meetsThreshold).toBe(false);
      expect(result.agentScore).toBe(500);
      expect(result.agentLevel).toBe('average');
      expect(result.requiredScore).toBe(600);
      expect(result.gap).toBe(100);
    });

    it('should handle agent without credit score', async () => {
      const mockAgent = {
        id: 'agent-1',
        user: {
          creditScore: null,
        },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await checkCreditThreshold('agent-1', 600);

      expect(result.meetsThreshold).toBe(false);
      expect(result.agentScore).toBeNull();
      expect(result.agentLevel).toBeNull();
      expect(result.gap).toBe(600);
    });

    it('should throw error when agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(checkCreditThreshold('agent-1', 600)).rejects.toThrow('Agent not found');
    });
  });

  describe('getCreditStatistics', () => {
    it('should return credit statistics', async () => {
      const mockScores = [
        { score: 900 },
        { score: 850 },
        { score: 700 },
        { score: 500 },
        { score: 300 },
      ];

      (prisma.creditScore.findMany as jest.Mock).mockResolvedValue(mockScores);
      (prisma.user.count as jest.Mock).mockResolvedValue(3);

      const result = await getCreditStatistics();

      expect(result.total).toBe(8); // 5 with score + 3 without
      expect(result.byLevel.excellent).toBe(2);
      expect(result.byLevel.good).toBe(1);
      expect(result.byLevel.average).toBe(1);
      expect(result.byLevel.poor).toBe(1);
      expect(result.noCredit).toBe(3);
      expect(result.average).toBe(650); // (900+850+700+500+300) / 5
    });

    it('should handle empty scores', async () => {
      (prisma.creditScore.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      const result = await getCreditStatistics();

      expect(result.total).toBe(0);
      expect(result.average).toBe(0);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (prisma.creditScore.findMany as jest.Mock).mockRejectedValue(error);

      await expect(getCreditStatistics()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get credit statistics',
        expect.any(Object)
      );
    });
  });

  describe('addCreditFilterToDSL', () => {
    it('should add credit filter to existing AND filter', () => {
      const dsl: any = {
        where: {
          and: [
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
          ],
        },
      };

      const result = addCreditFilterToDSL(dsl, { minCreditScore: 600 });

      expect(result.where).toEqual({
        and: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'user.creditScore.score', operator: 'gte', value: 600 },
        ],
      });
    });

    it('should create AND filter when DSL has simple condition', () => {
      const dsl: any = {
        where: {
          field: 'status',
          operator: 'eq',
          value: 'ACTIVE',
        },
      };

      const result = addCreditFilterToDSL(dsl, { minCreditScore: 600 });

      expect(result.where).toEqual({
        and: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'user.creditScore.score', operator: 'gte', value: 600 },
        ],
      });
    });

    it('should use default minCreditScore of 0 when not provided', () => {
      const dsl: any = {
        where: {
          field: 'status',
          operator: 'eq',
          value: 'ACTIVE',
        },
      };

      const result = addCreditFilterToDSL(dsl, {});

      expect(result.where).toEqual({
        and: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'user.creditScore.score', operator: 'gte', value: 0 },
        ],
      });
    });
  });

  describe('CREDIT_LEVEL_THRESHOLDS', () => {
    it('should have correct thresholds for all levels', () => {
      expect(CREDIT_LEVEL_THRESHOLDS.excellent).toEqual({ min: 800, max: 1000 });
      expect(CREDIT_LEVEL_THRESHOLDS.good).toEqual({ min: 600, max: 799 });
      expect(CREDIT_LEVEL_THRESHOLDS.average).toEqual({ min: 400, max: 599 });
      expect(CREDIT_LEVEL_THRESHOLDS.poor).toEqual({ min: 0, max: 399 });
    });
  });
});
