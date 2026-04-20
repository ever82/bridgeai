/**
 * Agent Profile Service Tests - L1 Basic Info Model
 */
import { AgeRange, Gender, EducationLevel } from '@bridgeai/shared';

import { calculateL1Completion } from '../agentProfileService';

// Note: Only testing pure functions that don't require Prisma
// Service functions that interact with the database are tested via integration tests

describe('AgentProfileService - L1 Basic Info Model', () => {
  describe('calculateL1Completion', () => {
    it('should return 0% for null data', () => {
      const result = calculateL1Completion(null);
      expect(result.l1Percentage).toBe(0);
      expect(result.l1FilledFields).toBe(0);
      expect(result.l1TotalFields).toBe(5);
      expect(result.l1MissingFields).toHaveLength(5);
      expect(result.l1WeightedScore).toBe(0);
    });

    it('should return 0% for empty object', () => {
      const result = calculateL1Completion({});
      expect(result.l1Percentage).toBe(0);
      expect(result.l1FilledFields).toBe(0);
    });

    it('should count age field correctly', () => {
      const result = calculateL1Completion({ age: AgeRange.AGE_26_30 });
      expect(result.l1Percentage).toBe(20);
      expect(result.l1FilledFields).toBe(1);
      expect(result.l1MissingFields).not.toContain('age');
    });

    it('should count gender field correctly', () => {
      const result = calculateL1Completion({ gender: Gender.MALE });
      expect(result.l1Percentage).toBe(20);
      expect(result.l1FilledFields).toBe(1);
    });

    it('should count location field correctly', () => {
      const result = calculateL1Completion({
        location: { province: 'Beijing', city: 'Beijing' },
      });
      expect(result.l1Percentage).toBe(20);
      expect(result.l1FilledFields).toBe(1);
    });

    it('should count occupation field correctly', () => {
      const result = calculateL1Completion({ occupation: 'Engineer' });
      expect(result.l1Percentage).toBe(20);
      expect(result.l1FilledFields).toBe(1);
    });

    it('should count education field correctly', () => {
      const result = calculateL1Completion({ education: EducationLevel.BACHELOR });
      expect(result.l1Percentage).toBe(20);
      expect(result.l1FilledFields).toBe(1);
    });

    it('should calculate weighted score correctly', () => {
      const result = calculateL1Completion({
        age: AgeRange.AGE_26_30, // 20
        gender: Gender.FEMALE, // 15
        location: { province: 'Beijing', city: 'Beijing' }, // 25
        occupation: 'Engineer', // 20
        education: EducationLevel.MASTER, // 20
      });
      expect(result.l1Percentage).toBe(100);
      expect(result.l1FilledFields).toBe(5);
      expect(result.l1MissingFields).toHaveLength(0);
      expect(result.l1WeightedScore).toBe(100);
    });

    it('should handle partial completion', () => {
      const result = calculateL1Completion({
        age: AgeRange.AGE_31_35,
        occupation: 'Designer',
      });
      expect(result.l1Percentage).toBe(40);
      expect(result.l1FilledFields).toBe(2);
      expect(result.l1MissingFields).toContain('gender');
      expect(result.l1MissingFields).toContain('location');
      expect(result.l1MissingFields).toContain('education');
    });

    it('should treat empty string as missing', () => {
      const result = calculateL1Completion({ occupation: '' });
      expect(result.l1FilledFields).toBe(0);
      expect(result.l1MissingFields).toContain('occupation');
    });

    it('should treat undefined as missing', () => {
      const result = calculateL1Completion({ occupation: undefined });
      expect(result.l1FilledFields).toBe(0);
      expect(result.l1MissingFields).toContain('occupation');
    });
  });
});
