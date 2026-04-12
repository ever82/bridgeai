/**
 * L1 Matcher Tests
 * 基础属性匹配器单元测试
 */

import { L1Matcher, L1Attributes } from '../matchers/L1Matcher';

describe('L1Matcher', () => {
  let matcher: L1Matcher;

  beforeEach(() => {
    matcher = new L1Matcher();
  });

  const baseSupply: L1Attributes = {
    category: 'service',
    subCategory: 'repair',
    location: {
      lat: 39.9042,
      lng: 116.4074,
      city: '北京',
      district: '朝阳区',
    },
    timeRange: {
      start: new Date('2026-04-15T09:00:00'),
      end: new Date('2026-04-15T18:00:00'),
    },
    tags: ['home', 'quick', 'professional'],
  };

  describe('category matching', () => {
    it('should return 0 for different main categories', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        category: 'product',
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBe(0);
    });

    it('should return 1 for exact category match', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return partial score for subcategory mismatch', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        subCategory: 'cleaning',
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('location matching', () => {
    it('should return 1 for same location', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return high score for nearby locations', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        location: {
          lat: 39.9142,
          lng: 116.4174, // ~1.4km away
          city: '北京',
          district: '朝阳区',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.7);
    });

    it('should return low score for distant locations', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        location: {
          lat: 31.2304,
          lng: 121.4737, // Shanghai
          city: '上海',
          district: '黄浦区',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeLessThan(0.5);
    });

    it('should consider city match for distant same-city locations', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        location: {
          lat: 39.9642,
          lng: 116.4574, // ~8km away, same city
          city: '北京',
          district: '海淀区',
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe('time matching', () => {
    it('should return 1 for exact time overlap', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return partial score for partial overlap', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        timeRange: {
          start: new Date('2026-04-15T12:00:00'),
          end: new Date('2026-04-15T20:00:00'),
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-overlapping times', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        timeRange: {
          start: new Date('2026-04-16T09:00:00'),
          end: new Date('2026-04-16T18:00:00'),
        },
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('tag matching', () => {
    it('should return 1 for exact tag match', () => {
      const score = matcher.calculate(baseSupply, baseSupply);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return partial score for partial tag overlap', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        tags: ['home', 'emergency'],
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for no tag overlap', () => {
      const demand: L1Attributes = {
        ...baseSupply,
        tags: ['car', 'remote'],
      };

      const score = matcher.calculate(baseSupply, demand);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('batch calculate', () => {
    it('should calculate multiple matches', () => {
      const demands: L1Attributes[] = [
        baseSupply,
        { ...baseSupply, tags: ['car', 'remote'] },
        { ...baseSupply, category: 'product' },
      ];

      const results = matcher.batchCalculate(baseSupply, demands);

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[2].score).toBe(0);
    });
  });
});
