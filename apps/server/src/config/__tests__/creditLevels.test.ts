import { describe, it, expect } from '@jest/globals';
import {
  getCreditLevel,
  getCreditLevelConfig,
  getCreditLevelConfigByScore,
  getLevelBadge,
  CREDIT_LEVEL_RANGES,
  CREDIT_LEVEL_BENEFITS,
} from '../creditLevels';
import { CreditLevel } from '../../types/credit';

describe('CreditLevels Config', () => {
  describe('getCreditLevel', () => {
    it('should return EXCELLENT for scores 900-1000', () => {
      expect(getCreditLevel(900)).toBe(CreditLevel.EXCELLENT);
      expect(getCreditLevel(950)).toBe(CreditLevel.EXCELLENT);
      expect(getCreditLevel(1000)).toBe(CreditLevel.EXCELLENT);
    });

    it('should return GOOD for scores 750-899', () => {
      expect(getCreditLevel(750)).toBe(CreditLevel.GOOD);
      expect(getCreditLevel(800)).toBe(CreditLevel.GOOD);
      expect(getCreditLevel(899)).toBe(CreditLevel.GOOD);
    });

    it('should return GENERAL for scores 600-749', () => {
      expect(getCreditLevel(600)).toBe(CreditLevel.GENERAL);
      expect(getCreditLevel(700)).toBe(CreditLevel.GENERAL);
      expect(getCreditLevel(749)).toBe(CreditLevel.GENERAL);
    });

    it('should return POOR for scores below 600', () => {
      expect(getCreditLevel(599)).toBe(CreditLevel.POOR);
      expect(getCreditLevel(500)).toBe(CreditLevel.POOR);
      expect(getCreditLevel(0)).toBe(CreditLevel.POOR);
    });
  });

  describe('getCreditLevelConfig', () => {
    it('should return config for each level', () => {
      Object.values(CreditLevel).forEach(level => {
        const config = getCreditLevelConfig(level);
        expect(config).toBeDefined();
        expect(config.level).toBe(level);
        expect(config.name).toBeDefined();
        expect(config.benefits).toBeInstanceOf(Array);
        expect(config.restrictions).toBeInstanceOf(Array);
      });
    });

    it('should throw error for invalid level', () => {
      expect(() => getCreditLevelConfig('invalid' as CreditLevel)).toThrow();
    });
  });

  describe('getCreditLevelConfigByScore', () => {
    it('should return correct config based on score', () => {
      const excellentConfig = getCreditLevelConfigByScore(950);
      expect(excellentConfig.level).toBe(CreditLevel.EXCELLENT);

      const goodConfig = getCreditLevelConfigByScore(800);
      expect(goodConfig.level).toBe(CreditLevel.GOOD);

      const generalConfig = getCreditLevelConfigByScore(650);
      expect(generalConfig.level).toBe(CreditLevel.GENERAL);

      const poorConfig = getCreditLevelConfigByScore(500);
      expect(poorConfig.level).toBe(CreditLevel.POOR);
    });
  });

  describe('getLevelBadge', () => {
    it('should return badge info for each level', () => {
      Object.values(CreditLevel).forEach(level => {
        const badge = getLevelBadge(level);
        expect(badge).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.color).toBeDefined();
        expect(badge.icon).toBeDefined();
      });
    });
  });

  describe('CREDIT_LEVEL_RANGES', () => {
    it('should have correct score ranges', () => {
      expect(CREDIT_LEVEL_RANGES[CreditLevel.EXCELLENT]).toEqual({ min: 900, max: 1000 });
      expect(CREDIT_LEVEL_RANGES[CreditLevel.GOOD]).toEqual({ min: 750, max: 899 });
      expect(CREDIT_LEVEL_RANGES[CreditLevel.GENERAL]).toEqual({ min: 600, max: 749 });
      expect(CREDIT_LEVEL_RANGES[CreditLevel.POOR]).toEqual({ min: 0, max: 599 });
    });
  });

  describe('CREDIT_LEVEL_BENEFITS', () => {
    it('should have benefits for each level', () => {
      expect(CREDIT_LEVEL_BENEFITS).toHaveLength(4);

      CREDIT_LEVEL_BENEFITS.forEach(config => {
        expect(config.level).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.minScore).toBeDefined();
        expect(config.maxScore).toBeDefined();
        expect(config.benefits).toBeInstanceOf(Array);
        expect(config.restrictions).toBeInstanceOf(Array);
      });
    });

    it('should have more benefits for higher levels', () => {
      const excellentBenefits = CREDIT_LEVEL_BENEFITS.find(
        b => b.level === CreditLevel.EXCELLENT
      )!.benefits.length;
      const goodBenefits = CREDIT_LEVEL_BENEFITS.find(
        b => b.level === CreditLevel.GOOD
      )!.benefits.length;
      const generalBenefits = CREDIT_LEVEL_BENEFITS.find(
        b => b.level === CreditLevel.GENERAL
      )!.benefits.length;
      const poorBenefits = CREDIT_LEVEL_BENEFITS.find(
        b => b.level === CreditLevel.POOR
      )!.benefits.length;

      expect(excellentBenefits).toBeGreaterThan(goodBenefits);
      expect(goodBenefits).toBeGreaterThan(generalBenefits);
      expect(generalBenefits).toBeGreaterThanOrEqual(poorBenefits);
    });

    it('should have restrictions only for lower levels', () => {
      const excellent = CREDIT_LEVEL_BENEFITS.find(b => b.level === CreditLevel.EXCELLENT)!;
      const good = CREDIT_LEVEL_BENEFITS.find(b => b.level === CreditLevel.GOOD)!;
      const general = CREDIT_LEVEL_BENEFITS.find(b => b.level === CreditLevel.GENERAL)!;
      const poor = CREDIT_LEVEL_BENEFITS.find(b => b.level === CreditLevel.POOR)!;

      expect(excellent.restrictions).toHaveLength(0);
      expect(good.restrictions).toHaveLength(0);
      expect(general.restrictions.length).toBeGreaterThan(0);
      expect(poor.restrictions.length).toBeGreaterThan(general.restrictions.length);
    });
  });
});
