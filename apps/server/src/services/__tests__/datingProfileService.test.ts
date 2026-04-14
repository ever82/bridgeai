/**
 * Dating Profile Service Tests
 * 交友画像服务测试
 */

import * as profileService from '../dating/profileService';
import { prisma } from '../../db/client';
import { AppError } from '../../errors/AppError';

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
    datingProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('DatingProfileService', () => {
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';
  const mockProfileId = 'profile-123';
  const mockDate = new Date('2026-04-10');

  const mockAgent = {
    id: mockAgentId,
    userId: mockUserId,
    type: 'AGENTDATE',
    name: 'Test Agent',
  };

  const mockProfile = {
    id: mockProfileId,
    agentId: mockAgentId,
    userId: mockUserId,
    basicConditions: {
      ageRange: 'AGE_20_25',
      education: 'BACHELOR',
    },
    personality: null,
    interests: null,
    lifestyle: null,
    expectations: null,
    description: null,
    aiExtractedData: null,
    aiExtractionConfidence: null,
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
    completenessScore: 25,
    qualityScore: null,
    isActive: true,
    isComplete: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateProfile', () => {
    it('should return existing profile', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await profileService.getOrCreateProfile(mockAgentId, mockUserId);

      expect(result).toBeDefined();
      expect(result.agentId).toBe(mockAgentId);
      expect(result.userId).toBe(mockUserId);
    });

    it('should create new profile if not exists', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.datingProfile.create as jest.Mock).mockResolvedValue(mockProfile);

      const result = await profileService.getOrCreateProfile(mockAgentId, mockUserId);

      expect(result).toBeDefined();
      expect(prisma.datingProfile.create).toHaveBeenCalled();
    });

    it('should throw error if agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.getOrCreateProfile(mockAgentId, mockUserId))
        .rejects.toThrow(AppError);
    });

    it('should throw error if user not authorized', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        ...mockAgent,
        userId: 'other-user',
      });

      await expect(profileService.getOrCreateProfile(mockAgentId, mockUserId))
        .rejects.toThrow(AppError);
    });
  });

  describe('createProfile', () => {
    const createInput = {
      agentId: mockAgentId,
      basicConditions: {
        ageRange: 'AGE_26_30' as const,
        education: 'MASTER' as const,
      },
    };

    it('should create profile successfully', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.datingProfile.create as jest.Mock).mockResolvedValue({
        ...mockProfile,
        ...createInput,
      });

      const result = await profileService.createProfile(createInput, mockUserId);

      expect(result).toBeDefined();
      expect(result.basicConditions?.ageRange).toBe(createInput.basicConditions.ageRange);
      expect(prisma.datingProfile.create).toHaveBeenCalled();
    });

    it('should throw error if profile already exists', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      await expect(profileService.createProfile(createInput, mockUserId))
        .rejects.toThrow('Dating profile already exists');
    });

    it('should throw error if agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.createProfile(createInput, mockUserId))
        .rejects.toThrow(AppError);
    });
  });

  describe('updateProfile', () => {
    const updateInput = {
      description: 'Updated description',
      basicConditions: {
        ageRange: 'AGE_26_30' as const,
      },
    };

    it('should update profile successfully', async () => {
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.datingProfile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        ...updateInput,
      });

      const result = await profileService.updateProfile(mockAgentId, mockUserId, updateInput);

      expect(result).toBeDefined();
      expect(result.description).toBe(updateInput.description);
      expect(prisma.datingProfile.update).toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.updateProfile(mockAgentId, mockUserId, updateInput))
        .rejects.toThrow('Dating profile not found');
    });

    it('should throw error if user not authorized', async () => {
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        userId: 'other-user',
      });

      await expect(profileService.updateProfile(mockAgentId, mockUserId, updateInput))
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.datingProfile.delete as jest.Mock).mockResolvedValue(mockProfile);

      await profileService.deleteProfile(mockAgentId, mockUserId);

      expect(prisma.datingProfile.delete).toHaveBeenCalledWith({
        where: { agentId: mockAgentId },
      });
    });

    it('should throw error if profile not found', async () => {
      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.deleteProfile(mockAgentId, mockUserId))
        .rejects.toThrow('Dating profile not found');
    });
  });

  describe('checkCompleteness', () => {
    it('should calculate completeness correctly for empty profile', () => {
      const profile = {
        agentId: mockAgentId,
        userId: mockUserId,
        privacySettings: { profileVisibility: 'PUBLIC', fieldVisibility: {} },
        isActive: true,
        createdAt: mockDate.toISOString(),
        updatedAt: mockDate.toISOString(),
      } as any;

      const result = profileService.checkCompleteness(profile);

      expect(result.score).toBeLessThan(50);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.complete).toBe(false);
    });

    it('should return complete for filled profile', () => {
      const profile = {
        agentId: mockAgentId,
        userId: mockUserId,
        basicConditions: {
          ageRange: 'AGE_26_30',
          education: 'MASTER',
          location: { city: 'Beijing' },
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
        description: 'This is a detailed description about me...',
        privacySettings: { profileVisibility: 'PUBLIC', fieldVisibility: {} },
        isActive: true,
        createdAt: mockDate.toISOString(),
        updatedAt: mockDate.toISOString(),
      } as any;

      const result = profileService.checkCompleteness(profile);

      expect(result.score).toBeGreaterThan(70);
      expect(result.complete).toBe(true);
    });
  });

  describe('updateAIExtractedData', () => {
    it('should update AI extracted data', async () => {
      const extractedData = { ageRange: 'AGE_26_30' };
      const confidence = 0.85;

      (prisma.datingProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.datingProfile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        aiExtractedData: extractedData,
        aiExtractionConfidence: confidence,
      });

      const result = await profileService.updateAIExtractedData(
        mockAgentId,
        mockUserId,
        extractedData,
        confidence
      );

      expect(result).toBeDefined();
      expect(result.aiExtractedData).toEqual(extractedData);
      expect(result.aiExtractionConfidence).toBe(confidence);
    });
  });
});
