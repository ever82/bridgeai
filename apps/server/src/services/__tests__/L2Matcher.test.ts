/**
 * L2 Matcher Tests
 * 结构化信息匹配器单元测试
 */

import { L2Matcher, L2StructuredData } from '../matchers/L2Matcher';

describe('L2Matcher', () => {
  let matcher: L2Matcher;

  beforeEach(() => {
    matcher = new L2Matcher();
  });

  const baseSupply: L2StructuredData = {
    price: {
      min: 100,
      max: 200,
      unit: 'hour',
      currency: 'CNY',
    },
    quantity: {
      min: 1,
      max: 5,
      unit: 'service',
    },
    specifications: {
      experience: 'expert',
      certification: true,
      tools: 'full',
    },
    requirements: ['on-site', 'immediate'],
    conditions: ['weekday', 'daytime'],
  };

  describe('price matching', () => {
    it('should return 1 for exact price overlap', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return high score for overlapping prices', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        price: {
          min: 150,
          max: 250,
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-overlapping prices', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        price: {
          min: 300,
          max: 500,
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.5);
    });

    it('should handle missing price data', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        price: undefined,
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.4);
    });

    it('should return low score for currency mismatch', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        price: {
          min: 100,
          max: 200,
          currency: 'USD',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('quantity matching', () => {
    it('should return 1 for exact quantity match', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should handle quantity within range', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        quantity: {
          min: 2,
          max: 3,
          unit: 'service',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for quantity mismatch', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        quantity: {
          min: 10,
          max: 20,
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.5);
    });

    it('should handle unit mismatch', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        quantity: {
          min: 1,
          max: 5,
          unit: 'hour',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('specifications matching', () => {
    it('should return high score for matching specs', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return partial score for partial spec match', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        specifications: {
          experience: 'expert',
          certification: false,
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.9);
    });

    it('should return low score for spec mismatch', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        specifications: {
          experience: 'beginner',
          certification: false,
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.7);
    });
  });

  describe('requirements matching', () => {
    it('should return 1 when all requirements met', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return partial score when some requirements met', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        requirements: ['on-site'],
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return 1 when no requirements specified', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        requirements: [],
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('conditions matching', () => {
    it('should return 1 when all conditions match', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return partial score when conditions partially match', () => {
      const demand: L2StructuredData = {
        ...baseSupply,
        conditions: ['weekday', 'evening'],
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('batch calculate', () => {
    it('should calculate multiple matches', () => {
      const demands: L2StructuredData[] = [
        baseSupply,
        { ...baseSupply, price: { min: 300, max: 500 } },
        { ...baseSupply, specifications: { experience: 'beginner' } },
      ];

      const results = matcher.batchCalculate(baseSupply, demands);

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });
});
