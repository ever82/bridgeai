import { CreditScoreService } from '../creditScoreService';
import { CreditLevel, CreditFactorType } from '../../types/credit';
import { prisma } from '../../db/client';

describe('CreditScoreService', () => {
  let service: CreditScoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreditScoreService();
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

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.userDevice, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.match, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.match, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.rating, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.connection, 'count').mockResolvedValue(3);
      jest.spyOn(prisma.conversation, 'findMany').mockResolvedValue([]);

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

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        agents: [],
      } as any);
      jest.spyOn(prisma.userDevice, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.match, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.match, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.rating, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.connection, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.conversation, 'findMany').mockResolvedValue([]);

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

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(mockCreditScore as any);

      const result = await service.getOrCreateCreditScore(userId);

      expect(result).toEqual(mockCreditScore);
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

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.creditScore, 'create').mockResolvedValue(mockNewCreditScore as any);

      const result = await service.getOrCreateCreditScore(userId);

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

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(mockCreditScore as any);
      jest.spyOn(prisma.creditHistory, 'findMany').mockResolvedValue(mockHistories as any[]);
      jest.spyOn(prisma.creditHistory, 'count').mockResolvedValue(1);

      const result = await service.getCreditHistory(userId, 1, 20);

      expect(result.histories).toEqual(mockHistories);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should return empty history if no credit score exists', async () => {
      const userId = 'user-123';

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(null);

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

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(mockCreditScore as any);

      const result = await service.getCreditFactors(userId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCreditRank', () => {
    it('should return user rank information', async () => {
      const userId = 'user-123';
      const mockCreditScore = { score: 800 };

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(mockCreditScore as any);
      jest
        .spyOn(prisma.creditScore, 'count')
        .mockResolvedValueOnce(5) // higher scores
        .mockResolvedValueOnce(100); // total users

      const result = await service.getCreditRank(userId);

      expect(result.rank).toBe(6);
      expect(result.total).toBe(100);
      expect(result.percentile).toBe(95);
    });

    it('should handle user with no credit score', async () => {
      const userId = 'user-123';

      jest.spyOn(prisma.creditScore, 'findUnique').mockResolvedValue(null);

      const result = await service.getCreditRank(userId);

      expect(result.rank).toBe(0);
      expect(result.total).toBe(0);
      expect(result.percentile).toBe(0);
    });
  });
});
