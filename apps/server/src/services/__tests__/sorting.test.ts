import {
  sortAgents,
  sortRawAgents,
  getSortingOptions,
  calculateCompositeScore,
  calculateActivityScore,
} from '../../utils/sorting';
import { FilterResult } from '../smartFilter';
import { Agent } from '../../models/Agent';

describe('sorting', () => {
  const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
    id: '1',
    name: 'Agent',
    skills: [],
    rating: 4.0,
    hourlyRate: 50,
    isAvailable: true,
    isVerified: true,
    experienceYears: 5,
    ...overrides,
  });

  const createMockResult = (agent: Agent, score: number = 1): FilterResult => ({
    agent,
    score,
    matchDetails: {
      skillMatch: 1,
      ratingScore: 1,
      priceScore: 1,
      availabilityScore: 1,
      experienceScore: 1,
      verificationScore: 1,
    },
  });

  describe('sortAgents', () => {
    it('should sort by rating descending', () => {
      const results: FilterResult[] = [
        createMockResult(createMockAgent({ id: '1', rating: 3.0 })),
        createMockResult(createMockAgent({ id: '2', rating: 5.0 })),
        createMockResult(createMockAgent({ id: '3', rating: 4.0 })),
      ];

      const sorted = sortAgents(results, 'rating', 'desc');

      expect(sorted[0].agent.rating).toBe(5.0);
      expect(sorted[1].agent.rating).toBe(4.0);
      expect(sorted[2].agent.rating).toBe(3.0);
    });

    it('should sort by price ascending', () => {
      const results: FilterResult[] = [
        createMockResult(createMockAgent({ id: '1', hourlyRate: 100 })),
        createMockResult(createMockAgent({ id: '2', hourlyRate: 50 })),
        createMockResult(createMockAgent({ id: '3', hourlyRate: 75 })),
      ];

      const sorted = sortAgents(results, 'price', 'asc');

      expect(sorted[0].agent.hourlyRate).toBe(50);
      expect(sorted[1].agent.hourlyRate).toBe(75);
      expect(sorted[2].agent.hourlyRate).toBe(100);
    });

    it('should sort by experience descending', () => {
      const results: FilterResult[] = [
        createMockResult(createMockAgent({ id: '1', experienceYears: 3 })),
        createMockResult(createMockAgent({ id: '2', experienceYears: 10 })),
        createMockResult(createMockAgent({ id: '3', experienceYears: 5 })),
      ];

      const sorted = sortAgents(results, 'experience', 'desc');

      expect(sorted[0].agent.experienceYears).toBe(10);
      expect(sorted[1].agent.experienceYears).toBe(5);
      expect(sorted[2].agent.experienceYears).toBe(3);
    });

    it('should sort by relevance (score)', () => {
      const results: FilterResult[] = [
        createMockResult(createMockAgent({ id: '1' }), 0.5),
        createMockResult(createMockAgent({ id: '2' }), 0.9),
        createMockResult(createMockAgent({ id: '3' }), 0.7),
      ];

      const sorted = sortAgents(results, 'relevance', 'desc');

      expect(sorted[0].score).toBe(0.9);
      expect(sorted[1].score).toBe(0.7);
      expect(sorted[2].score).toBe(0.5);
    });
  });

  describe('calculateCompositeScore', () => {
    it('should calculate composite score', () => {
      const agent = createMockAgent({
        rating: 5.0,
        experienceYears: 10,
        creditScore: 800,
      });

      const score = calculateCompositeScore(agent);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateActivityScore', () => {
    it('should return high score for recently active agent', () => {
      const agent = createMockAgent({
        lastActiveAt: new Date(),
      });

      const score = calculateActivityScore(agent);

      expect(score).toBe(1);
    });

    it('should return low score for inactive agent', () => {
      const agent = createMockAgent({
        lastActiveAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      });

      const score = calculateActivityScore(agent);

      expect(score).toBe(0.2);
    });
  });

  describe('getSortingOptions', () => {
    it('should return sorting options', () => {
      const options = getSortingOptions();

      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('value');
      expect(options[0]).toHaveProperty('label');
    });
  });
});
