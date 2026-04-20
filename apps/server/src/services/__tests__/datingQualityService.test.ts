/**
 * Dating Profile Quality Service Tests
 * 交友画像质量评估服务测试
 */

import type { DatingProfile } from '@bridgeai/shared';

import * as qualityService from '../dating/profileQualityService';

describe('ProfileQualityService', () => {
  const mockDate = new Date('2026-04-10');
  const baseProfile: DatingProfile = {
    id: 'profile-123',
    agentId: 'agent-123',
    userId: 'user-123',
    privacySettings: {
      profileVisibility: 'PUBLIC',
      fieldVisibility: {},
    },
    isActive: true,
    isComplete: false,
    createdAt: mockDate.toISOString(),
    updatedAt: mockDate.toISOString(),
  };

  describe('calculateProfileQuality', () => {
    it('should calculate quality for minimal profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
      };

      const result = qualityService.calculateProfileQuality(profile);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.metrics.completenessScore).toBeLessThan(50);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate quality for complete profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
          education: 'MASTER',
          location: { city: 'Beijing', province: 'Beijing' },
        },
        personality: {
          mbti: ['INTJ'],
          traits: ['CREATIVE', 'INDEPENDENT'],
        },
        interests: {
          interests: [
            { category: 'SPORTS', name: 'Basketball', level: 'passionate' },
            { category: 'MUSIC', name: 'Jazz', level: 'regular' },
            { category: 'READING', name: 'Sci-Fi', level: 'regular' },
          ],
        },
        lifestyle: {
          sleepSchedule: 'NIGHT_OWL',
          smoking: 'NEVER',
          drinking: 'SOCIALLY',
          exercise: 'REGULARLY',
        },
        expectations: {
          purpose: 'SERIOUS_RELATIONSHIP',
          pace: 'MODERATE',
        },
        description: 'I am a software engineer who loves jazz music and basketball. ' +
          'Looking for someone who shares similar interests and values. ' +
          'I enjoy reading sci-fi novels and traveling to new places. ' +
          'In my free time, I like to explore new restaurants and try different cuisines.',
      };

      const result = qualityService.calculateProfileQuality(profile);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(60);
      expect(result.metrics.completenessScore).toBeGreaterThan(60);
      expect(result.metrics.richnessScore).toBeGreaterThan(40);
    });

    it('should provide suggestions for incomplete profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
        },
      };

      const result = qualityService.calculateProfileQuality(profile);

      expect(result.recommendations.length).toBeGreaterThan(0);
      const hasDescriptionSuggestion = result.recommendations.some(
        r => r.field === 'description'
      );
      expect(hasDescriptionSuggestion).toBe(true);
    });

    it('should score description richness correctly', () => {
      const shortDesc: DatingProfile = {
        ...baseProfile,
        description: 'Hi there',
      };

      const longDesc: DatingProfile = {
        ...baseProfile,
        description: 'I am a passionate software engineer with over 5 years of experience. ' +
          'I love exploring new technologies and building innovative products. ' +
          'In my free time, I enjoy playing basketball, listening to jazz music, ' +
          'and reading science fiction novels. I am looking for someone who shares ' +
          'similar interests and values, and who is also passionate about their career. ' +
          'I believe in continuous learning and personal growth.',
      };

      const shortResult = qualityService.calculateProfileQuality(shortDesc);
      const longResult = qualityService.calculateProfileQuality(longDesc);

      expect(longResult.metrics.richnessScore).toBeGreaterThan(shortResult.metrics.richnessScore);
    });

    it('should score interests richness correctly', () => {
      const fewInterests: DatingProfile = {
        ...baseProfile,
        interests: {
          interests: [{ category: 'SPORTS', name: 'Basketball' }],
        },
      };

      const manyInterests: DatingProfile = {
        ...baseProfile,
        interests: {
          interests: [
            { category: 'SPORTS', name: 'Basketball' },
            { category: 'MUSIC', name: 'Jazz' },
            { category: 'READING', name: 'Sci-Fi' },
            { category: 'TRAVEL', name: 'Hiking' },
            { category: 'COOKING', name: 'Italian' },
          ],
        },
      };

      const fewResult = qualityService.calculateProfileQuality(fewInterests);
      const manyResult = qualityService.calculateProfileQuality(manyInterests);

      expect(manyResult.metrics.richnessScore).toBeGreaterThan(fewResult.metrics.richnessScore);
    });
  });

  describe('isProfileReadyForMatching', () => {
    it('should return not ready for empty profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        completenessScore: 20,
      };

      const result = qualityService.isProfileReadyForMatching(profile);

      expect(result.ready).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should return ready for complete profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
          location: { city: 'Beijing', province: 'Beijing' },
        },
        interests: {
          interests: [
            { category: 'SPORTS', name: 'Basketball' },
          ],
        },
        expectations: {
          purpose: 'SERIOUS_RELATIONSHIP',
        },
        isActive: true,
        completenessScore: 80,
      };

      const result = qualityService.isProfileReadyForMatching(profile);

      expect(result.ready).toBe(true);
      expect(result.reasons.length).toBe(0);
    });

    it('should detect inactive profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        isActive: false,
      };

      const result = qualityService.isProfileReadyForMatching(profile);

      expect(result.ready).toBe(false);
      const hasInactiveReason = result.reasons.some(r => r.includes('激活'));
      expect(hasInactiveReason).toBe(true);
    });
  });

  describe('getMissingFields', () => {
    it('should return all fields for empty profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
      };

      const result = qualityService.getMissingFields(profile);

      expect(result.length).toBeGreaterThan(3);
      expect(result).toContain('datingPurpose');
      expect(result).toContain('city');
    });

    it('should return empty for complete profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
          education: 'MASTER',
          location: { city: 'Beijing', province: 'Beijing' },
        },
        interests: {
          interests: [{ category: 'SPORTS', name: 'Basketball' }],
        },
        expectations: {
          purpose: 'SERIOUS_RELATIONSHIP',
        },
        description: 'A detailed description that is definitely longer than 50 characters.',
      };

      const result = qualityService.getMissingFields(profile);

      expect(result.length).toBe(0);
    });
  });

  describe('calculateCompletenessPercentage', () => {
    it('should return 0 for empty profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
      };

      const result = qualityService.calculateCompletenessPercentage(profile);

      expect(result).toBe(0);
    });

    it('should return high percentage for complete profile', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
          heightRange: 'HEIGHT_170_180',
          education: 'MASTER',
          location: { city: 'Beijing', province: 'Beijing' },
          income: 'INCOME_20K_50K',
        },
        personality: {
          mbti: ['INTJ'],
          traits: ['CREATIVE'],
        },
        interests: {
          interests: [{ category: 'SPORTS', name: 'Basketball' }],
        },
        lifestyle: {
          sleepSchedule: 'NIGHT_OWL',
          smoking: 'NEVER',
        },
        expectations: {
          purpose: 'SERIOUS_RELATIONSHIP',
        },
        description: 'A detailed description that is definitely longer than 50 characters.',
      };

      const result = qualityService.calculateCompletenessPercentage(profile);

      expect(result).toBeGreaterThan(80);
    });

    it('should calculate partial completeness correctly', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        basicConditions: {
          ageRange: 'AGE_26_30',
        },
        expectations: {
          purpose: 'SERIOUS_RELATIONSHIP',
        },
      };

      const result = qualityService.calculateCompletenessPercentage(profile);

      expect(result).toBeGreaterThan(30);
      expect(result).toBeLessThan(60);
    });
  });
});
