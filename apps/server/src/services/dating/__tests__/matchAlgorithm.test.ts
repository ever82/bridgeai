/**
 * Match Algorithm Tests
 * 约会匹配算法测试 (ISSUE-DATE002 c1)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../db/client', () => ({
  prisma: null,
}));

import {
  AgeRangePreference,
  HeightRange,
  EducationPreference,
  IncomeRange,
  MBTIType,
  PersonalityTrait,
  InterestCategory,
  DatingPurpose,
  SleepSchedule,
} from '@bridgeai/shared';

import {
  calculateMatchScore,
  rankMatches,
  generateDailyRecommendations,
  getMatchAnalysis,
} from '../matchAlgorithm';

// 测试数据工厂
function createTestProfile(overrides = {}) {
  return {
    id: `profile-${Math.random().toString(36).slice(2, 8)}`,
    agentId: `agent-${Math.random().toString(36).slice(2, 8)}`,
    userId: `user-${Math.random().toString(36).slice(2, 8)}`,
    basicConditions: {
      ageRange: AgeRangePreference.AGE_26_30,
      heightRange: HeightRange.HEIGHT_170_180,
      education: EducationPreference.BACHELOR,
      income: IncomeRange.INCOME_10K_20K,
      location: { city: '上海', province: '上海' },
    },
    personality: {
      mbti: [MBTIType.INTP],
      traits: [PersonalityTrait.INTROVERTED, PersonalityTrait.RATIONAL],
      preferredTraits: [PersonalityTrait.GENTLE, PersonalityTrait.HUMOROUS],
    },
    interests: {
      interests: [
        { category: InterestCategory.TECH, name: '编程', level: 'passionate' },
        { category: InterestCategory.READING, name: '科幻小说', level: 'regular' },
      ],
    },
    lifestyle: {
      sleepSchedule: SleepSchedule.NIGHT_OWL,
    },
    expectations: {
      purpose: DatingPurpose.SERIOUS_RELATIONSHIP,
    },
    privacySettings: {
      profileVisibility: 'PUBLIC',
      fieldVisibility: {},
    },
    isActive: true,
    isComplete: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MatchAlgorithm', () => {
  describe('calculateMatchScore', () => {
    it('should return a score between 0-100', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const result = calculateMatchScore(profileA, profileB);

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should return high score for similar profiles', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const result = calculateMatchScore(profileA, profileB);

      expect(result.totalScore).toBeGreaterThan(50);
    });

    it('should include all 7 dimensions', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const result = calculateMatchScore(profileA, profileB);

      expect(result.dimensions).toHaveLength(7);
      const dimNames = result.dimensions.map(d => d.dimension);
      expect(dimNames).toContain('basicConditions');
      expect(dimNames).toContain('personality');
      expect(dimNames).toContain('interests');
      expect(dimNames).toContain('lifestyle');
      expect(dimNames).toContain('expectations');
      expect(dimNames).toContain('complementary');
      expect(dimNames).toContain('geoProximity');
    });

    it('should generate highlights for matching profiles', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const result = calculateMatchScore(profileA, profileB);

      expect(result.highlights.length).toBeGreaterThan(0);
    });
  });

  describe('rankMatches', () => {
    it('should sort candidates by score descending', () => {
      const source = createTestProfile();
      const candidates = [
        createTestProfile({ expectations: { purpose: DatingPurpose.CASUAL_DATING } }),
        createTestProfile(),
        createTestProfile({ personality: undefined }),
      ];

      const results = rankMatches(source, candidates);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].totalScore).toBeGreaterThanOrEqual(results[i].totalScore);
      }
    });

    it('should filter candidates below minScore', () => {
      const source = createTestProfile();
      const candidates = Array.from({ length: 10 }, () => createTestProfile());

      const results = rankMatches(source, candidates, { minMatchScore: 80 });
      results.forEach(r => {
        expect(r.totalScore).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('generateDailyRecommendations', () => {
    it('should return at most maxDailyRecommendations results', () => {
      const source = createTestProfile();
      const candidates = Array.from({ length: 20 }, () => createTestProfile());

      const results = generateDailyRecommendations(source, candidates, {
        maxDailyRecommendations: 3,
        minMatchScore: 0,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty candidate pool', () => {
      const source = createTestProfile();
      const results = generateDailyRecommendations(source, []);

      expect(results).toHaveLength(0);
    });
  });

  describe('getMatchAnalysis', () => {
    it('should return excellent rating for high scores', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const match = calculateMatchScore(profileA, profileB);

      // Force a high score for testing
      match.totalScore = 85;
      const analysis = getMatchAnalysis(match);

      expect(analysis.overallRating).toBe('excellent');
    });

    it('should return poor rating for low scores', () => {
      const profileA = createTestProfile();
      const profileB = createTestProfile();
      const match = calculateMatchScore(profileA, profileB);

      match.totalScore = 25;
      const analysis = getMatchAnalysis(match);

      expect(analysis.overallRating).toBe('poor');
    });
  });
});
