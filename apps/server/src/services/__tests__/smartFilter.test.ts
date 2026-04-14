import {
  smartFilter,
  filterAndSort,
  adjustWeights,
  getFilterSuggestions,
  FilterCriteria,
  FilterWeights,
} from '../smartFilter';
import { Agent } from '../../models/Agent';

describe('smartFilter', () => {
  const mockAgents: Agent[] = [
    {
      id: '1',
      name: 'Agent A',
      skills: ['React', 'TypeScript'],
      rating: 4.8,
      hourlyRate: 50,
      isAvailable: true,
      isVerified: true,
      experienceYears: 5,
    },
    {
      id: '2',
      name: 'Agent B',
      skills: ['Python', 'Machine Learning'],
      rating: 4.5,
      hourlyRate: 80,
      isAvailable: false,
      isVerified: true,
      experienceYears: 8,
    },
    {
      id: '3',
      name: 'Agent C',
      skills: ['React', 'Node.js'],
      rating: 4.2,
      hourlyRate: 40,
      isAvailable: true,
      isVerified: false,
      experienceYears: 3,
    },
  ];

  describe('smartFilter', () => {
    it('should filter agents by skills', () => {
      const criteria: FilterCriteria = { skills: ['React'] };
      const results = smartFilter(mockAgents, criteria);

      expect(results).toHaveLength(2);
      expect(results[0].agent.id).toBe('1');
      expect(results[1].agent.id).toBe('3');
    });

    it('should filter agents by minimum rating', () => {
      const criteria: FilterCriteria = { minRating: 4.5 };
      const results = smartFilter(mockAgents, criteria);

      expect(results).toHaveLength(2);
      expect(results[0].agent.rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should filter agents by maximum hourly rate', () => {
      const criteria: FilterCriteria = { maxHourlyRate: 50 };
      const results = smartFilter(mockAgents, criteria);

      expect(results.every(r => r.agent.hourlyRate <= 50)).toBe(true);
    });

    it('should filter agents by availability', () => {
      const criteria: FilterCriteria = { availability: true };
      const results = smartFilter(mockAgents, criteria);

      expect(results.every(r => r.agent.isAvailable)).toBe(true);
    });

    it('should filter agents by verification status', () => {
      const criteria: FilterCriteria = { verified: true };
      const results = smartFilter(mockAgents, criteria);

      expect(results.every(r => r.agent.isVerified)).toBe(true);
    });

    it('should calculate match scores', () => {
      const criteria: FilterCriteria = { skills: ['React'] };
      const results = smartFilter(mockAgents, criteria);

      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].matchDetails).toBeDefined();
    });
  });

  describe('adjustWeights', () => {
    it('should adjust and normalize weights', () => {
      const baseWeights: FilterWeights = {
        skillMatch: 0.3,
        rating: 0.25,
        price: 0.15,
        availability: 0.1,
        experience: 0.1,
        verification: 0.1,
      };

      const adjusted = adjustWeights(baseWeights, { skillMatch: 0.5 });
      const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1, 5);
      expect(adjusted.skillMatch).toBeGreaterThan(baseWeights.skillMatch);
    });
  });

  describe('getFilterSuggestions', () => {
    it('should return filter suggestions', () => {
      const suggestions = getFilterSuggestions(mockAgents);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('minRating');
    });
  });
});
