/**
 * Agent Location Privacy Service Tests
 * Agent位置隐私服务测试
 */

import {
  getAgentLocationPrivacy,
  setAgentLocationPrivacy,
  applyPrivacyFilter,
  deleteAgentLocationPrivacy,
} from '../agentLocationPrivacyService';

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    agentLocationPrivacy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { prisma } from '../../db/client';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('agentLocationPrivacyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentLocationPrivacy', () => {
    it('should return privacy settings for agent with settings', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: false,
      });

      const result = await getAgentLocationPrivacy('agent-123');

      expect(result).toEqual({
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: false,
      });
      expect(mockPrisma.agentLocationPrivacy.findUnique).toHaveBeenCalledWith({
        where: { agentId: 'agent-123' },
      });
    });

    it('should return null for agent without privacy settings', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getAgentLocationPrivacy('agent-unknown');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB error')
      );

      const result = await getAgentLocationPrivacy('agent-123');

      expect(result).toBeNull();
    });
  });

  describe('setAgentLocationPrivacy', () => {
    it('should create privacy settings for new agent', async () => {
      (mockPrisma.agentLocationPrivacy.upsert as jest.Mock).mockResolvedValue({
        agentId: 'agent-new',
        privacyLevel: 'DISTRICT',
        showExactCoords: true,
        hideFromPublic: false,
      });

      const result = await setAgentLocationPrivacy('agent-new', {
        privacyLevel: 'DISTRICT',
        showExactCoords: true,
      });

      expect(result).toBe(true);
      expect(mockPrisma.agentLocationPrivacy.upsert).toHaveBeenCalledWith({
        where: { agentId: 'agent-new' },
        create: {
          agentId: 'agent-new',
          privacyLevel: 'DISTRICT',
          showExactCoords: true,
          hideFromPublic: false,
        },
        update: {
          privacyLevel: 'DISTRICT',
          showExactCoords: true,
        },
      });
    });

    it('should update existing privacy settings', async () => {
      (mockPrisma.agentLocationPrivacy.upsert as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'HIDDEN',
        showExactCoords: false,
        hideFromPublic: true,
      });

      const result = await setAgentLocationPrivacy('agent-123', {
        privacyLevel: 'HIDDEN',
        hideFromPublic: true,
      });

      expect(result).toBe(true);
      expect(mockPrisma.agentLocationPrivacy.upsert).toHaveBeenCalledWith({
        where: { agentId: 'agent-123' },
        create: {
          agentId: 'agent-123',
          privacyLevel: 'HIDDEN',
          showExactCoords: false,
          hideFromPublic: true,
        },
        update: {
          privacyLevel: 'HIDDEN',
          hideFromPublic: true,
        },
      });
    });

    it('should return false on database error', async () => {
      (mockPrisma.agentLocationPrivacy.upsert as jest.Mock).mockRejectedValue(
        new Error('DB error')
      );

      const result = await setAgentLocationPrivacy('agent-123', {
        privacyLevel: 'CITY',
      });

      expect(result).toBe(false);
    });
  });

  describe('applyPrivacyFilter', () => {
    it('should hide all data when hideFromPublic is true', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: true,
      });

      const result = await applyPrivacyFilter('agent-123', {
        location: { province: '110000', city: '110100' },
        latitude: 39.9,
        longitude: 116.4,
      });

      expect(result).toEqual({
        location: undefined,
        latitude: null,
        longitude: null,
        privacyApplied: true,
      });
    });

    it('should hide all data when no privacy settings exist', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await applyPrivacyFilter('agent-no-privacy', {
        location: { province: '110000', city: '110100' },
        latitude: 39.9,
        longitude: 116.4,
      });

      expect(result).toEqual({
        location: undefined,
        latitude: null,
        longitude: null,
        privacyApplied: true,
      });
    });

    it('should apply EXACT privacy level - return all data when showExactCoords is true', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'EXACT',
        showExactCoords: true,
        hideFromPublic: false,
      });

      const locationData = {
        location: { province: '110000', provinceName: '北京市' },
        latitude: 39.9,
        longitude: 116.4,
      };

      const result = await applyPrivacyFilter('agent-123', locationData);

      expect(result.privacyApplied).toBe(false);
    });

    it('should apply CITY privacy level - remove district and address', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: false,
      });

      const locationData = {
        location: {
          province: '110000',
          provinceName: '北京市',
          city: '110100',
          cityName: '北京市',
          district: '110105',
          districtName: '朝阳区',
          address: '建国路',
        },
        latitude: 39.9,
        longitude: 116.4,
      };

      const result = await applyPrivacyFilter('agent-123', locationData);

      expect(result.privacyApplied).toBe(true);
      expect(result.location).not.toHaveProperty('district');
      expect(result.location).not.toHaveProperty('districtName');
      expect(result.location).not.toHaveProperty('address');
      expect(result.location).toHaveProperty('province');
      expect(result.location).toHaveProperty('city');
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });

    it('should apply DISTRICT privacy level - remove only address', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'DISTRICT',
        showExactCoords: false,
        hideFromPublic: false,
      });

      const locationData = {
        location: {
          province: '110000',
          provinceName: '北京市',
          city: '110100',
          cityName: '北京市',
          district: '110105',
          districtName: '朝阳区',
          address: '建国路1号',
        },
        latitude: 39.9,
        longitude: 116.4,
      };

      const result = await applyPrivacyFilter('agent-123', locationData);

      expect(result.privacyApplied).toBe(true);
      expect(result.location).toHaveProperty('district');
      expect(result.location).toHaveProperty('districtName');
      expect(result.location).not.toHaveProperty('address');
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });

    it('should apply PROVINCE privacy level - return only province', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'PROVINCE',
        showExactCoords: false,
        hideFromPublic: false,
      });

      const locationData = {
        location: {
          province: '110000',
          provinceName: '北京市',
          city: '110100',
          cityName: '北京市',
          district: '110105',
          districtName: '朝阳区',
          address: '建国路',
        },
        latitude: 39.9,
        longitude: 116.4,
      };

      const result = await applyPrivacyFilter('agent-123', locationData);

      expect(result.privacyApplied).toBe(true);
      expect(result.location).toEqual({
        province: '110000',
        provinceName: '北京市',
      });
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });

    it('should return original data for unknown privacy level', async () => {
      (mockPrisma.agentLocationPrivacy.findUnique as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'UNKNOWN' as any,
        showExactCoords: false,
        hideFromPublic: false,
      });

      const locationData = {
        location: { province: '110000' },
        latitude: 39.9,
        longitude: 116.4,
      };

      const result = await applyPrivacyFilter('agent-123', locationData);

      expect(result.privacyApplied).toBe(false);
    });
  });

  describe('deleteAgentLocationPrivacy', () => {
    it('should delete privacy settings successfully', async () => {
      (mockPrisma.agentLocationPrivacy.delete as jest.Mock).mockResolvedValue({
        agentId: 'agent-123',
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: false,
      });

      const result = await deleteAgentLocationPrivacy('agent-123');

      expect(result).toBe(true);
      expect(mockPrisma.agentLocationPrivacy.delete).toHaveBeenCalledWith({
        where: { agentId: 'agent-123' },
      });
    });

    it('should return false on database error', async () => {
      (mockPrisma.agentLocationPrivacy.delete as jest.Mock).mockRejectedValue(
        new Error('DB error')
      );

      const result = await deleteAgentLocationPrivacy('agent-123');

      expect(result).toBe(false);
    });
  });
});
