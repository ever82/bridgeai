/**
 * Dating Privacy Service Tests
 * 交友隐私服务测试
 */

import type { DatingProfile, PrivacySettings } from '@bridgeai/shared';

import * as privacyService from '../dating/privacyService';

describe('DatingPrivacyService', () => {
  const mockDate = new Date('2026-04-10');
  const baseProfile: DatingProfile = {
    id: 'profile-123',
    agentId: 'agent-123',
    userId: 'user-123',
    basicConditions: {
      ageRange: 'AGE_26_30',
      education: 'MASTER',
      income: 'INCOME_20K_50K',
      location: {
        province: 'Beijing',
        city: 'Beijing',
        district: 'Haidian',
      },
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
    description: 'A detailed description',
    privacySettings: {
      profileVisibility: 'PUBLIC',
      fieldVisibility: {
        basicInfo: 'PUBLIC',
        photos: 'PUBLIC',
        income: 'MATCHED_ONLY',
        location: 'MATCHED_ONLY',
        contactInfo: 'PRIVATE',
        personalDetails: 'PUBLIC',
      },
    },
    isActive: true,
    isComplete: true,
    createdAt: mockDate.toISOString(),
    updatedAt: mockDate.toISOString(),
  };

  describe('getVisibleFieldsAtStage', () => {
    it('should show all fields to owner', () => {
      const result = privacyService.getVisibleFieldsAtStage(
        baseProfile,
        'initial',
        true,
        false
      );

      expect(result).toContain('basicInfo');
      expect(result).toContain('income');
      expect(result).toContain('location');
    });

    it('should hide matched-only fields at initial stage', () => {
      const result = privacyService.getVisibleFieldsAtStage(
        baseProfile,
        'initial',
        false,
        false
      );

      expect(result).toContain('basicInfo');
      expect(result).not.toContain('income');
      expect(result).not.toContain('location');
    });

    it('should show matched-only fields after matching', () => {
      const result = privacyService.getVisibleFieldsAtStage(
        baseProfile,
        'matched',
        false,
        true
      );

      expect(result).toContain('income');
      expect(result).toContain('location');
    });

    it('should hide all fields for private profile', () => {
      const privateProfile: DatingProfile = {
        ...baseProfile,
        privacySettings: {
          ...baseProfile.privacySettings,
          profileVisibility: 'PRIVATE',
        },
      };

      const result = privacyService.getVisibleFieldsAtStage(
        privateProfile,
        'initial',
        false,
        false
      );

      // Should only show always visible fields
      expect(result.length).toBeLessThan(5);
    });
  });

  describe('filterProfileForViewer', () => {
    it('should return full profile for owner', () => {
      const result = privacyService.filterProfileForViewer(
        baseProfile,
        'user-123',
        'initial',
        false
      );

      expect(result.basicConditions?.income).toBeDefined();
      expect(result.basicConditions?.location?.district).toBeDefined();
    });

    it('should filter sensitive fields for non-owner', () => {
      const result = privacyService.filterProfileForViewer(
        baseProfile,
        'other-user',
        'initial',
        false
      );

      // Income should be hidden (MATCHED_ONLY)
      expect(result.basicConditions?.income).toBeUndefined();
      // Location should only show province/city
      expect(result.basicConditions?.location?.district).toBeUndefined();
    });

    it('should show more fields after matching', () => {
      const result = privacyService.filterProfileForViewer(
        baseProfile,
        'other-user',
        'matched',
        true
      );

      // Income should be visible after matching
      expect(result.basicConditions?.income).toBeDefined();
      expect(result.basicConditions?.location).toBeDefined();
    });
  });

  describe('canAccessField', () => {
    it('should allow owner to access any field', () => {
      const result = privacyService.canAccessField(
        baseProfile,
        'income',
        'user-123',
        'initial',
        false
      );

      expect(result).toBe(true);
    });

    it('should deny access to private fields', () => {
      const result = privacyService.canAccessField(
        baseProfile,
        'contactInfo',
        'other-user',
        'initial',
        false
      );

      expect(result).toBe(false);
    });

    it('should deny access to matched-only fields before matching', () => {
      const result = privacyService.canAccessField(
        baseProfile,
        'income',
        'other-user',
        'initial',
        false
      );

      expect(result).toBe(false);
    });

    it('should allow access to matched-only fields after matching', () => {
      const result = privacyService.canAccessField(
        baseProfile,
        'income',
        'other-user',
        'matched',
        true
      );

      expect(result).toBe(true);
    });

    it('should deny access to public fields for private profile', () => {
      const privateProfile: DatingProfile = {
        ...baseProfile,
        privacySettings: {
          ...baseProfile.privacySettings,
          profileVisibility: 'PRIVATE',
        },
      };

      const result = privacyService.canAccessField(
        privateProfile,
        'basicInfo',
        'other-user',
        'initial',
        false
      );

      expect(result).toBe(false);
    });
  });

  describe('validatePrivacySettings', () => {
    it('should validate correct settings', () => {
      const settings: Partial<PrivacySettings> = {
        profileVisibility: 'PUBLIC',
        fieldVisibility: {
          basicInfo: 'PUBLIC',
          income: 'MATCHED_ONLY',
        },
      };

      const result = privacyService.validatePrivacySettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid profile visibility', () => {
      const settings: Partial<PrivacySettings> = {
        profileVisibility: 'INVALID',
      };

      const result = privacyService.validatePrivacySettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid field visibility', () => {
      const settings: Partial<PrivacySettings> = {
        fieldVisibility: {
          basicInfo: 'INVALID_LEVEL',
        },
      };

      const result = privacyService.validatePrivacySettings(settings);

      expect(result.valid).toBe(false);
    });
  });

  describe('getDefaultPrivacySettings', () => {
    it('should return default settings', () => {
      const result = privacyService.getDefaultPrivacySettings();

      expect(result.profileVisibility).toBe('PUBLIC');
      expect(result.fieldVisibility.income).toBe('MATCHED_ONLY');
      expect(result.fieldVisibility.location).toBe('MATCHED_ONLY');
      expect(result.fieldVisibility.contactInfo).toBe('PRIVATE');
    });
  });

  describe('getRecommendedPrivacySettings', () => {
    it('should return low privacy settings', () => {
      const result = privacyService.getRecommendedPrivacySettings('low');

      expect(result.profileVisibility).toBe('PUBLIC');
      expect(result.fieldVisibility.photos).toBe('PUBLIC');
    });

    it('should return medium privacy settings', () => {
      const result = privacyService.getRecommendedPrivacySettings('medium');

      expect(result.profileVisibility).toBe('MATCHED_ONLY');
      expect(result.fieldVisibility.photos).toBe('MATCHED_ONLY');
    });

    it('should return high privacy settings', () => {
      const result = privacyService.getRecommendedPrivacySettings('high');

      expect(result.profileVisibility).toBe('VERIFIED_ONLY');
      expect(result.fieldVisibility.income).toBe('PRIVATE');
      expect(result.showOnlineStatus).toBe(false);
    });
  });

  describe('isSensitiveField', () => {
    it('should identify sensitive fields', () => {
      expect(privacyService.isSensitiveField('income')).toBe(true);
      expect(privacyService.isSensitiveField('phone')).toBe(true);
      expect(privacyService.isSensitiveField('address')).toBe(true);
    });

    it('should identify non-sensitive fields', () => {
      expect(privacyService.isSensitiveField('ageRange')).toBe(false);
      expect(privacyService.isSensitiveField('education')).toBe(false);
    });
  });

  describe('maskFieldValue', () => {
    it('should mask sensitive field values', () => {
      const result = privacyService.maskFieldValue('phone', '13812345678');

      expect(result).toContain('*');
      expect(result).not.toBe('13812345678');
    });

    it('should return value as-is for non-sensitive fields', () => {
      const result = privacyService.maskFieldValue('ageRange', '26-30');

      expect(result).toBe('26-30');
    });

    it('should handle short values', () => {
      const result = privacyService.maskFieldValue('phone', '123');

      expect(result).toBe('***');
    });
  });

  describe('getDisclosureRecommendations', () => {
    it('should recommend protecting income', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        privacySettings: {
          ...baseProfile.privacySettings,
          fieldVisibility: {
            ...baseProfile.privacySettings.fieldVisibility,
            income: 'PUBLIC',
          },
        },
      };

      const result = privacyService.getDisclosureRecommendations(profile);

      const incomeRec = result.find(r => r.field === 'income');
      expect(incomeRec).toBeDefined();
      expect(incomeRec?.recommendedVisibility).toBe('MATCHED_ONLY');
    });

    it('should recommend protecting detailed location', () => {
      const profile: DatingProfile = {
        ...baseProfile,
        privacySettings: {
          ...baseProfile.privacySettings,
          fieldVisibility: {
            ...baseProfile.privacySettings.fieldVisibility,
            location: 'PUBLIC',
          },
        },
      };

      const result = privacyService.getDisclosureRecommendations(profile);

      const locationRec = result.find(r => r.field === 'location');
      expect(locationRec).toBeDefined();
    });
  });
});
