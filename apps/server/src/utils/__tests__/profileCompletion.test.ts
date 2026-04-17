/**
 * Profile Completion Tests
 */
import { calculateL1Completion, getCompletionMessage } from '../profileCompletion';
import { L1Profile, AgeRange, Gender, EducationLevel } from '@bridgeai/shared';

describe('calculateL1Completion', () => {
  it('should return 0% when no data', () => {
    const result = calculateL1Completion(null);
    expect(result.l1Percentage).toBe(0);
    expect(result.l1FilledFields).toBe(0);
    expect(result.l1TotalFields).toBe(5);
    expect(result.l1MissingFields).toHaveLength(5);
  });

  it('should return 20% when 1 field filled', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1Percentage).toBe(20);
    expect(result.l1FilledFields).toBe(1);
    expect(result.l1MissingFields).toHaveLength(4);
  });

  it('should return 40% when 2 fields filled', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1Percentage).toBe(40);
    expect(result.l1FilledFields).toBe(2);
  });

  it('should return 60% when 3 fields filled', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
      occupation: 'Software Engineer',
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1Percentage).toBe(60);
    expect(result.l1FilledFields).toBe(3);
  });

  it('should return 80% when 4 fields filled', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
      occupation: 'Software Engineer',
      education: EducationLevel.BACHELOR,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1Percentage).toBe(80);
    expect(result.l1FilledFields).toBe(4);
  });

  it('should return 100% when all fields filled', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
      location: { province: 'Beijing', city: 'Beijing' },
      occupation: 'Software Engineer',
      education: EducationLevel.BACHELOR,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1Percentage).toBe(100);
    expect(result.l1FilledFields).toBe(5);
    expect(result.l1MissingFields).toHaveLength(0);
  });

  it('should calculate weighted score correctly', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30, // weight: 20
      gender: Gender.MALE, // weight: 15
      occupation: 'Software Engineer', // weight: 20
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1WeightedScore).toBe(55); // 20 + 15 + 20
  });

  it('should identify missing fields correctly', () => {
    const l1Data: L1Profile = {
      age: AgeRange.AGE_26_30,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1MissingFields).toContain('gender');
    expect(result.l1MissingFields).toContain('location');
    expect(result.l1MissingFields).toContain('occupation');
    expect(result.l1MissingFields).toContain('education');
    expect(result.l1MissingFields).not.toContain('age');
  });

  it('should handle empty strings as missing', () => {
    const l1Data: L1Profile = {
      occupation: '',
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1MissingFields).toContain('occupation');
  });

  it('should handle undefined fields as missing', () => {
    const l1Data: L1Profile = {
      occupation: undefined,
    };
    const result = calculateL1Completion(l1Data);
    expect(result.l1MissingFields).toContain('occupation');
  });
});

describe('getCompletionMessage', () => {
  it('should return start message for 0%', () => {
    expect(getCompletionMessage(0)).toContain('开始');
  });

  it('should return progress message for 20%', () => {
    expect(getCompletionMessage(20)).toContain('刚开始');
  });

  it('should return continue message for 50%', () => {
    expect(getCompletionMessage(50)).toContain('进行中');
  });

  it('should return almost done message for 80%', () => {
    expect(getCompletionMessage(80)).toContain('快完成');
  });

  it('should return complete message for 100%', () => {
    expect(getCompletionMessage(100)).toContain('已完成');
  });
});
