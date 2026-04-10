import { CreditScoreService } from '../creditScoreService';
import { CreditLevel, CreditFactorType } from '../../types/credit';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    creditScore: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    creditHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    creditFactor: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
    },
    rating: {
      findMany: jest.fn(),
    },
    connection: {
      count: jest.fn(),
    },
    userDevice: {
      count: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
  })),
}));

describe('CreditScoreService', () => {
  let service: CreditScoreService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreditScoreService();
    mockPrisma = (PrismaClient as jest.MockedClass<typeof PrismaClient>).mock.results[0]?.value;
  });

  describe('calculateScore', () => {
    it('should calculate credit score for a user', async () => {
      const userId = 'user-123';

      // Mock user data
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        displayName: 'Test',
        avatarUrl: 'http://example.com/avatar.jpg',
        bio: 'This is a test bio with sufficient length for testing purposes.',
        website: 'http://example.com',
        location: 'Test City',
        phone: '1234567890',
        emailVerified: true,
        phoneVerified: true,
        agents: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userDevice.count.mockResolvedValue(5);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.rating.findMany.mockResolvedValue([]);
      mockPrisma.connection.count.mockResolvedValue(3);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const result = await service.calculateScore(userId);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(1000);
      expect(Object.values(CreditLevel)).toContain(result.level);
      expect(result.factors).toBeInstanceOf(Array);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should handle user with no data', async () => {
      const userId = 'user-456';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        agents: [],
      });
      mockPrisma.userDevice.count.mockResolvedValue(0);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.rating.findMany.mockResolvedValue([]);
      mockPrisma.connection.count.mockResolvedValue(0);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const result = await service.calculateScore(userId);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOrCreateCreditScore', () => {
    it('should return existing credit score', async () => {
      const userId = 'user-123';
      const mockCreditScore = {
        id: 'credit-123',
        userId,
        score: 750,
        level: CreditLevel.GOOD,
        factors: [],
      };

      mockPrisma.creditScore.findUnique.mockResolvedValue(mockCreditScore);

      const result = await service.getOrCreateCreditScore(userId);

      expect(result).toEqual(mockCreditScore);
      expect(mockPrisma.creditScore.create).not.toHaveBeenCalled();
    });

    it('should create new credit score if not exists', async () => {
      const userId = 'user-123';
      const mockNewCreditScore = {
        id: 'credit-123',
        userId,
        score: 600,
        level: CreditLevel.GENERAL,
        factors: [],
      };

      mockPrisma.creditScore.findUnique.mockResolvedValue(null);
      mockPrisma.creditScore.create.mockResolvedValue(mockNewCreditScore);

      const result = await service.getOrCreateCreditScore(userId);

      expect(mockPrisma.creditScore.create).toHaveBeenCalled();
      expect(result).toEqual(mockNewCreditScore);
    });
  });

  describe('getCreditHistory', () => {
    it('should return credit history with pagination', async () => {
      const userId = 'user-123';
      const mockCreditScore = { id: 'credit-123' };
      const mockHistories = [
        {
          id: 'history-1',
          oldScore: 600,
          newScore: 650,
          delta: 50,
          reason: 'Profile updated',
          sourceType: 'PROFILE_UPDATE',
          createdAt: new Date(),
        },
      ];

      mockPrisma.creditScore.findUnique.mockResolvedValue(mockCreditScore);
      mockPrisma.creditHistory.findMany.mockResolvedValue(mockHistories);
      mockPrisma.creditHistory.count.mockResolvedValue(1);

      const result = await service.getCreditHistory(userId, 1, 20);

      expect(result.histories).toEqual(mockHistories);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should return empty history if no credit score exists', async () => {
      const userId = 'user-123';

      mockPrisma.creditScore.findUnique.mockResolvedValue(null);

      const result = await service.getCreditHistory(userId);

      expect(result.histories).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getCreditFactors', () => {
    it('should return factor details', async () => {
      const userId = 'user-123';
      const mockCreditScore = {
        id: 'credit-123',
        factors: [
          {
            factorType: CreditFactorType.PROFILE,
            subFactor: 'completeness',
            score: 80,
            weight: 0.1,
          },
        ],
      };

      mockPrisma.creditScore.findUnique.mockResolvedValue(mockCreditScore);

      const result = await service.getCreditFactors(userId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCreditRank', () => {
    it('should return user rank information', async () => {
      const userId = 'user-123';
      const mockCreditScore = { score: 800 };

      mockPrisma.creditScore.findUnique.mockResolvedValue(mockCreditScore);
      mockPrisma.creditScore.count.mockResolvedValueOnce(5); // higher scores
      mockPrisma.creditScore.count.mockResolvedValueOnce(100); // total users

      const result = await service.getCreditRank(userId);

      expect(result.rank).toBe(6);
      expect(result.total).toBe(100);
      expect(result.percentile).toBe(95);
    });

    it('should handle user with no credit score', async () => {
      const userId = 'user-123';

      mockPrisma.creditScore.findUnique.mockResolvedValue(null);

      const result = await service.getCreditRank(userId);

      expect(result.rank).toBe(0);
      expect(result.total).toBe(0);
      expect(result.percentile).toBe(0);
    });
  });
});
