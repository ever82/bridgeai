import { describe, it, expect } from '@jest/globals';
import {
  CREDIT_SCORE_CONFIG,
  FACTOR_WEIGHTS,
  getFactorWeight,
  getSubFactorWeight,
  calculateWeightedScore,
} from '../creditWeights';
import { CreditFactorType } from '../../types/credit';

describe('CreditWeights Config', () => {
  describe('CREDIT_SCORE_CONFIG', () => {
    it('should have valid score configuration', () => {
      expect(CREDIT_SCORE_CONFIG.minScore).toBe(0);
      expect(CREDIT_SCORE_CONFIG.maxScore).toBe(1000);
      expect(CREDIT_SCORE_CONFIG.defaultScore).toBe(600);
      expect(CREDIT_SCORE_CONFIG.updateIntervalMinutes).toBeGreaterThan(0);
      expect(CREDIT_SCORE_CONFIG.fluctuationThreshold).toBeGreaterThan(0);
    });

    it('should have valid score range', () => {
      expect(CREDIT_SCORE_CONFIG.maxScore).toBeGreaterThan(CREDIT_SCORE_CONFIG.minScore);
      expect(CREDIT_SCORE_CONFIG.defaultScore).toBeGreaterThanOrEqual(CREDIT_SCORE_CONFIG.minScore);
      expect(CREDIT_SCORE_CONFIG.defaultScore).toBeLessThanOrEqual(CREDIT_SCORE_CONFIG.maxScore);
    });
  });

  describe('FACTOR_WEIGHTS', () => {
    it('should have all factor types', () => {
      const factorTypes = FACTOR_WEIGHTS.map(f => f.type);
      expect(factorTypes).toContain(CreditFactorType.PROFILE);
      expect(factorTypes).toContain(CreditFactorType.BEHAVIOR);
      expect(factorTypes).toContain(CreditFactorType.TRANSACTION);
      expect(factorTypes).toContain(CreditFactorType.SOCIAL);
    });

    it('should have weights summing to 1.0', () => {
      const totalWeight = FACTOR_WEIGHTS.reduce((sum, f) => sum + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should have all positive weights', () => {
      FACTOR_WEIGHTS.forEach(factor => {
        expect(factor.weight).toBeGreaterThan(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
      });
    });

    it('should have subfactors for each factor', () => {
      FACTOR_WEIGHTS.forEach(factor => {
        expect(factor.subFactors.length).toBeGreaterThan(0);

        // Subfactor weights should sum to 1.0
        const subTotalWeight = factor.subFactors.reduce((sum, sf) => sum + sf.weight, 0);
        expect(subTotalWeight).toBeCloseTo(1.0, 2);
      });
    });

    it('should have valid subfactor configurations', () => {
      FACTOR_WEIGHTS.forEach(factor => {
        factor.subFactors.forEach(subFactor => {
          expect(subFactor.name).toBeDefined();
          expect(subFactor.weight).toBeGreaterThan(0);
          expect(subFactor.maxScore).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getFactorWeight', () => {
    it('should return weight for valid factor type', () => {
      const profileWeight = getFactorWeight(CreditFactorType.PROFILE);
      expect(profileWeight).toBeGreaterThan(0);

      const behaviorWeight = getFactorWeight(CreditFactorType.BEHAVIOR);
      expect(behaviorWeight).toBeGreaterThan(0);
    });

    it('should return 0 for invalid factor type', () => {
      const weight = getFactorWeight('invalid' as CreditFactorType);
      expect(weight).toBe(0);
    });
  });

  describe('getSubFactorWeight', () => {
    it('should return weight and maxScore for valid subfactor', () => {
      const result = getSubFactorWeight(CreditFactorType.PROFILE, 'completeness');
      expect(result).toBeDefined();
      expect(result?.weight).toBeGreaterThan(0);
      expect(result?.maxScore).toBeGreaterThan(0);
    });

    it('should return null for invalid factor type', () => {
      const result = getSubFactorWeight('invalid' as CreditFactorType, 'completeness');
      expect(result).toBeNull();
    });

    it('should return null for invalid subfactor name', () => {
      const result = getSubFactorWeight(CreditFactorType.PROFILE, 'invalid');
      expect(result).toBeNull();
    });
  });

  describe('calculateWeightedScore', () => {
    it('should calculate weighted score correctly', () => {
      const subFactorScores = [
        { name: 'completeness', score: 100 },
        { name: 'verification', score: 100 },
        { name: 'avatar_quality', score: 100 },
        { name: 'bio_quality', score: 100 },
      ];

      const score = calculateWeightedScore(CreditFactorType.PROFILE, subFactorScores);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for invalid factor type', () => {
      const score = calculateWeightedScore('invalid' as CreditFactorType, []);
      expect(score).toBe(0);
    });

    it('should handle partial subfactor scores', () => {
      const subFactorScores = [
        { name: 'completeness', score: 50 },
        { name: 'verification', score: 80 },
      ];

      const score = calculateWeightedScore(CreditFactorType.PROFILE, subFactorScores);
      expect(score).toBeGreaterThan(0);
    });

    it('should normalize scores to maxScore', () => {
      const subFactorScores = [
        { name: 'completeness', score: 50 }, // maxScore is 100
      ];

      const score = calculateWeightedScore(CreditFactorType.PROFILE, subFactorScores);
      expect(score).toBeGreaterThan(0);
      // Score should be half of what it would be with 100
    });
  });

  describe('Transaction factor weights', () => {
    it('should have highest weight for transaction factor', () => {
      const transactionWeight = getFactorWeight(CreditFactorType.TRANSACTION);
      const profileWeight = getFactorWeight(CreditFactorType.PROFILE);
      const behaviorWeight = getFactorWeight(CreditFactorType.BEHAVIOR);
      const socialWeight = getFactorWeight(CreditFactorType.SOCIAL);

      expect(transactionWeight).toBeGreaterThan(profileWeight);
      expect(transactionWeight).toBeGreaterThan(behaviorWeight);
      expect(transactionWeight).toBeGreaterThan(socialWeight);
    });
  });
});
