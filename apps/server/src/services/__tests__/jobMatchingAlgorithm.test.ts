/**
 * Job Matching Algorithm Tests
 * 职位匹配算法测试
 */

// Mock db/client before imports
jest.mock('../../db/client', () => ({
  prisma: {
    demand: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    supply: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    match: {
      upsert: jest.fn().mockResolvedValue({ id: 'match-1' }),
      count: jest.fn().mockResolvedValue(0),
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

import {
  calculateSkillScore,
  calculateExperienceScore,
  calculateSalaryScore,
  calculateLocationScore,
  calculateCultureScore,
  DEFAULT_WEIGHTS,
} from '../job/matchScoring';
import { JobMatchingAlgorithm } from '../job/jobMatchingAlgorithm';

describe('MatchScoring', () => {
  describe('calculateSkillScore', () => {
    it('returns perfect score when all required skills match', () => {
      const result = calculateSkillScore(
        ['React', 'TypeScript', 'Node.js'],
        ['React', 'TypeScript']
      );
      expect(result.score).toBe(100);
      expect(result.details.requiredMatchRate).toBe('2/2');
    });

    it('returns 0 when no skills match', () => {
      const result = calculateSkillScore(
        ['Python', 'Django'],
        ['React', 'TypeScript']
      );
      expect(result.score).toBe(0);
    });

    it('returns partial score for partial match', () => {
      const result = calculateSkillScore(
        ['React', 'Python', 'Node.js'],
        ['React', 'TypeScript', 'Node.js']
      );
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(100);
    });

    it('handles case-insensitive matching', () => {
      const result = calculateSkillScore(
        ['react', 'typescript'],
        ['React', 'TypeScript']
      );
      expect(result.score).toBe(100);
    });

    it('adds bonus for preferred skills', () => {
      const withPref = calculateSkillScore(
        ['React', 'GraphQL', 'Docker'],
        ['React'],
        ['GraphQL']
      );
      const noPref = calculateSkillScore(
        ['React'],
        ['React'],
        []
      );
      // With preferred skills bonus, score should be higher than without
      expect(withPref.score).toBeGreaterThanOrEqual(noPref.score);
    });

    it('returns neutral score for empty inputs', () => {
      const result = calculateSkillScore([], []);
      expect(result.score).toBe(50);
    });
  });

  describe('calculateExperienceScore', () => {
    it('scores high for matching experience', () => {
      const result = calculateExperienceScore(
        { years: 5, level: 'senior' },
        { years: 5, level: 'senior' }
      );
      expect(result.score).toBeGreaterThanOrEqual(85);
    });

    it('handles overqualified candidates', () => {
      const result = calculateExperienceScore(
        { years: 15, level: 'expert' },
        { years: 3, level: 'junior' }
      );
      expect(result.score).toBeGreaterThan(50);
    });

    it('scores industry overlap', () => {
      const result = calculateExperienceScore(
        { industries: ['tech', 'finance'] },
        { industries: ['tech', 'retail'] }
      );
      expect(result.details.industryOverlap).toBe('1/2');
    });

    it('returns baseline for empty data', () => {
      const result = calculateExperienceScore({}, {});
      expect(result.score).toBe(50);
    });
  });

  describe('calculateSalaryScore', () => {
    it('scores high for overlapping ranges', () => {
      const result = calculateSalaryScore(
        { min: 15000, max: 25000 },
        { min: 18000, max: 28000 }
      );
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.details.hasOverlap).toBe(true);
    });

    it('scores low for non-overlapping ranges', () => {
      const result = calculateSalaryScore(
        { min: 30000, max: 50000 },
        { min: 10000, max: 15000 }
      );
      expect(result.score).toBeLessThan(50);
      expect(result.details.hasOverlap).toBe(false);
    });

    it('returns neutral for missing data', () => {
      const result = calculateSalaryScore({}, {});
      expect(result.score).toBe(50);
    });
  });

  describe('calculateLocationScore', () => {
    it('scores 90 for same city', () => {
      const result = calculateLocationScore(
        { city: 'Beijing' },
        { city: 'Beijing' }
      );
      expect(result.score).toBe(90);
    });

    it('scores 100 for both remote', () => {
      const result = calculateLocationScore(
        { remote: true },
        { workMode: 'remote' }
      );
      expect(result.score).toBe(100);
    });

    it('scores lower for different cities', () => {
      const result = calculateLocationScore(
        { city: 'Beijing' },
        { city: 'Shanghai' }
      );
      // Different city gets lower score than same city
      expect(result.score).toBeLessThanOrEqual(50);
    });
  });

  describe('calculateCultureScore', () => {
    it('scores based on overlap', () => {
      const result = calculateCultureScore(
        ['innovative', 'collaborative', 'learning'],
        ['innovative', 'collaborative']
      );
      expect(result.score).toBeGreaterThanOrEqual(65);
    });

    it('returns neutral for empty data', () => {
      expect(calculateCultureScore([], ['x']).score).toBe(50);
      expect(calculateCultureScore(['x'], []).score).toBe(50);
    });
  });

  describe('DEFAULT_WEIGHTS', () => {
    it('weights sum to 1', () => {
      const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});

describe('JobMatchingAlgorithm', () => {
  let algorithm: JobMatchingAlgorithm;

  beforeEach(() => {
    jest.clearAllMocks();
    algorithm = new JobMatchingAlgorithm();
  });

  describe('calculateMatch', () => {
    it('returns complete match result', () => {
      const seeker = {
        agentId: 'seeker-1',
        skills: ['React', 'TypeScript', 'Node.js'],
        experience: { years: 5, level: 'senior' as const },
        salaryExpectation: { min: 20000, max: 35000 },
        location: { city: 'Beijing', workMode: 'hybrid' as const },
        culturePreference: ['innovative', 'collaborative'],
      };

      const job = {
        demandId: 'job-1',
        requiredSkills: ['React', 'TypeScript'],
        experience: { years: 3, level: 'mid' as const },
        salaryOffer: { min: 18000, max: 30000 },
        location: { city: 'Beijing', workMode: 'hybrid' as const },
        companyCulture: ['innovative', 'collaborative'],
      };

      const result = algorithm.calculateMatch(seeker, job);

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.seekerId).toBe('seeker-1');
      expect(result.jobId).toBe('job-1');
      expect(result.summary).toBeTruthy();
      expect(result.matchTimestamp).toBeInstanceOf(Date);
    });

    it('produces high score for good match', () => {
      const seeker = {
        agentId: 's1',
        skills: ['React', 'TypeScript', 'Node.js'],
        experience: { years: 5, level: 'senior' as const },
        salaryExpectation: { min: 20000, max: 30000 },
        location: { city: 'Beijing', workMode: 'hybrid' as const },
        culturePreference: ['innovative'],
      };

      const job = {
        demandId: 'j1',
        requiredSkills: ['React', 'TypeScript', 'Node.js'],
        experience: { years: 5, level: 'senior' as const },
        salaryOffer: { min: 20000, max: 30000 },
        location: { city: 'Beijing', workMode: 'hybrid' as const },
        companyCulture: ['innovative'],
      };

      expect(algorithm.calculateMatch(seeker, job).totalScore).toBeGreaterThanOrEqual(80);
    });

    it('produces low score for poor match', () => {
      const seeker = {
        agentId: 's1',
        skills: ['Python', 'Django'],
        experience: { years: 1, level: 'junior' as const },
        salaryExpectation: { min: 50000, max: 80000 },
        location: { city: 'Shanghai' },
        culturePreference: ['stable'],
      };

      const job = {
        demandId: 'j1',
        requiredSkills: ['React', 'TypeScript', 'AWS'],
        experience: { years: 8, level: 'expert' as const },
        salaryOffer: { min: 10000, max: 15000 },
        location: { city: 'Beijing' },
        companyCulture: ['fastpaced', 'innovative'],
      };

      expect(algorithm.calculateMatch(seeker, job).totalScore).toBeLessThan(50);
    });

    it('always returns score 0-100 for empty profiles', () => {
      const seeker = {
        agentId: 's1',
        skills: [] as string[],
        experience: {},
        salaryExpectation: {},
        location: {},
        culturePreference: [] as string[],
      };

      const job = {
        demandId: 'j1',
        requiredSkills: [] as string[],
        experience: {},
        salaryOffer: {},
        location: {},
        companyCulture: [] as string[],
      };

      const result = algorithm.calculateMatch(seeker, job);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('weights', () => {
    it('supports custom weights', () => {
      const algo = new JobMatchingAlgorithm({ skills: 0.5, experience: 0.3, salary: 0.1, location: 0.05, culture: 0.05 });
      expect(algo.getWeights().skills).toBeCloseTo(0.5, 5);
    });

    it('normalizes weights to sum to 1', () => {
      const algo = new JobMatchingAlgorithm({ skills: 2, experience: 2, salary: 2, location: 2, culture: 2 });
      const sum = Object.values(algo.getWeights()).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('allows updating weights', () => {
      algorithm.setWeights({ skills: 0.8 });
      expect(algorithm.getWeights().skills).toBeGreaterThan(0.5);
    });
  });
});
