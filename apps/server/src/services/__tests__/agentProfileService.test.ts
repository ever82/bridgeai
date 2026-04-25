/**
 * AgentProfile Service Tests
 * Covers L1/L2/L3 CRUD operations
 */

import { AgeRange, Gender, EducationLevel } from '@bridgeai/shared';

import { AppError } from '../../errors/AppError';
import * as agentProfileService from '../agentProfileService';

// Mock db/client to avoid Prisma $extends compatibility issues
jest.mock('../../db/client', () => {
  const mockAgentFindUnique = jest.fn();
  const mockAgentProfileFindFirst = jest.fn();
  const mockAgentProfileUpdate = jest.fn();
  const mockAgentProfileCreate = jest.fn();
  const mockProfileHistoryCreate = jest.fn();
  return {
    prisma: {
      agent: {
        findUnique: mockAgentFindUnique,
      },
      agentProfile: {
        findFirst: mockAgentProfileFindFirst,
        update: mockAgentProfileUpdate,
        create: mockAgentProfileCreate,
      },
      profileHistory: {
        create: mockProfileHistoryCreate,
      },
      $transaction: jest.fn(async (fn: any) => {
        return fn({
          agentProfile: { update: mockAgentProfileUpdate },
          profileHistory: { create: mockProfileHistoryCreate },
        });
      }),
    },
    __mockAgentFindUnique: mockAgentFindUnique,
    __mockAgentProfileFindFirst: mockAgentProfileFindFirst,
    __mockAgentProfileUpdate: mockAgentProfileUpdate,
    __mockAgentProfileCreate: mockAgentProfileCreate,
    __mockProfileHistoryCreate: mockProfileHistoryCreate,
  };
});

const {
  __mockAgentFindUnique: mockAgentFindUnique,
  __mockAgentProfileFindFirst: mockAgentProfileFindFirst,
  __mockAgentProfileUpdate: mockAgentProfileUpdate,
  __mockAgentProfileCreate: mockAgentProfileCreate,
  __mockProfileHistoryCreate: mockProfileHistoryCreate,
} = jest.requireMock('../../db/client');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AgentProfileService - L1 Operations', () => {
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getL1Profile', () => {
    it('should return L1 data for owned agent', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: { age: AgeRange.AGE_26_30, gender: Gender.MALE },
        l2Data: null,
        l3Description: null,
      });

      const result = await agentProfileService.getL1Profile(mockAgentId, mockUserId);

      expect(result).toEqual({ age: AgeRange.AGE_26_30, gender: Gender.MALE });
      expect(mockAgentFindUnique).toHaveBeenCalledWith({ where: { id: mockAgentId } });
    });

    it('should throw AGENT_NOT_FOUND for non-existent agent', async () => {
      mockAgentFindUnique.mockResolvedValue(null);

      await expect(agentProfileService.getL1Profile('nonexistent', mockUserId)).rejects.toThrow(
        AppError
      );

      await expect(
        agentProfileService.getL1Profile('nonexistent', mockUserId)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
    });

    it('should throw UNAUTHORIZED for wrong user', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: 'different-user' });

      await expect(agentProfileService.getL1Profile(mockAgentId, mockUserId)).rejects.toMatchObject(
        { code: 'UNAUTHORIZED', statusCode: 403 }
      );
    });

    it('should return null l1Data when no profile exists and one is auto-created', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue(null);
      mockAgentProfileCreate.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: null,
        l2Data: null,
        l3Description: null,
      });

      const result = await agentProfileService.getL1Profile(mockAgentId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateL1Profile', () => {
    const validL1Data = {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
      occupation: 'Software Engineer',
      education: EducationLevel.BACHELOR,
      location: { province: 'Beijing', city: 'Beijing' },
    };

    it('should update L1 profile with valid data', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
        l2Data: null,
        l3Description: null,
      });
      mockAgentProfileUpdate.mockResolvedValue({
        id: 'profile-1',
        l1Data: validL1Data,
      });
      mockProfileHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await agentProfileService.updateL1Profile(
        mockAgentId,
        mockUserId,
        validL1Data
      );

      expect(result).toEqual(validL1Data);
    });

    it('should throw VALIDATION_ERROR for invalid age enum', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          age: 'INVALID_AGE' as any,
        })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw VALIDATION_ERROR for invalid gender enum', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          gender: 'INVALID_GENDER' as any,
        })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw VALIDATION_ERROR for invalid education enum', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          education: 'INVALID_EDU' as any,
        })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw VALIDATION_ERROR when location missing province', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          location: { city: 'Beijing' },
        } as any)
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw VALIDATION_ERROR when location missing city', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          location: { province: 'Beijing' },
        } as any)
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw VALIDATION_ERROR for occupation > 100 chars', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: {},
      });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, {
          occupation: 'x'.repeat(101),
        })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('should throw AGENT_NOT_FOUND for non-existent agent', async () => {
      mockAgentFindUnique.mockResolvedValue(null);

      await expect(
        agentProfileService.updateL1Profile('nonexistent', mockUserId, validL1Data)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
    });

    it('should throw UNAUTHORIZED for wrong user', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: 'different-user' });

      await expect(
        agentProfileService.updateL1Profile(mockAgentId, mockUserId, validL1Data)
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
    });
  });
});

describe('AgentProfileService - L2 Operations', () => {
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getL2Profile', () => {
    it('should return L2 data for owned agent', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l1Data: null,
        l2Data: { description: 'Test L2' },
        l3Description: null,
      });

      const result = await agentProfileService.getL2Profile(mockAgentId, mockUserId);

      expect(result).toEqual({ description: 'Test L2' });
    });

    it('should throw AGENT_NOT_FOUND for non-existent agent', async () => {
      mockAgentFindUnique.mockResolvedValue(null);

      await expect(
        agentProfileService.getL2Profile('nonexistent', mockUserId)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
    });
  });
});

describe('AgentProfileService - L3 Operations', () => {
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getL3Profile', () => {
    it('should return L3 description for owned agent', async () => {
      mockAgentFindUnique.mockResolvedValue({ id: mockAgentId, userId: mockUserId });
      mockAgentProfileFindFirst.mockResolvedValue({
        id: 'profile-1',
        agentId: mockAgentId,
        l3Description: 'Test L3 description',
      });

      const result = await agentProfileService.getL3Profile(mockAgentId, mockUserId);

      expect(result).toBe('Test L3 description');
    });

    it('should throw AGENT_NOT_FOUND for non-existent agent', async () => {
      mockAgentFindUnique.mockResolvedValue(null);

      await expect(
        agentProfileService.getL3Profile('nonexistent', mockUserId)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
    });
  });
});
