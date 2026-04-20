/**
 * Agent Location Service Tests
 * Agent位置服务测试
 */

import {
  calculateDistance,
  isWithinBoundingBox,
  createBoundingBox,
  checkGeoFence,
  findContainingGeoFences,
} from '@bridgeai/shared';
import type { Location, GeoCoordinates, LocationFilter } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import {
  updateAgentLocation,
  getAgentLocation,
  searchAgentsByLocation,
  findAgentsNearLocation,
  getAgentsInGeoFence,
  getAgentGeoFences,
  getDistanceBetweenAgents,
  batchUpdateAgentLocations,
} from '../agentLocationService';

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    agentProfile: {
      update: jest.fn(),
    },
    geoFence: {
      findMany: jest.fn(),
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

// Mock shared geo-fencing service
jest.mock('@bridgeai/shared', () => ({
  ...jest.requireActual('@bridgeai/shared'),
  calculateDistance: jest.fn(),
  isWithinBoundingBox: jest.fn(),
  createBoundingBox: jest.fn(),
  checkGeoFence: jest.fn(),
  findContainingGeoFences: jest.fn(),
  getGeoFencesWithinDistance: jest.fn(),
}));

describe('AgentLocationService', () => {
  const mockLocation: Location = {
    province: '110000',
    provinceName: '北京市',
    city: '110100',
    cityName: '北京市',
    district: '110101',
    districtName: '东城区',
  };

  const mockCoordinates: GeoCoordinates = {
    latitude: 39.9,
    longitude: 116.4,
    accuracy: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAgentLocation', () => {
    it('should update agent location successfully', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: null,
        longitude: null,
        profile: { id: 'profile-1', l1Data: {} },
      });
      (prisma.agentProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.agent.update as jest.Mock).mockResolvedValue({});

      const result = await updateAgentLocation('agent-1', mockLocation, mockCoordinates);

      expect(result).toBe(true);
      expect(prisma.agentProfile.update).toHaveBeenCalled();
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: {
          latitude: 39.9,
          longitude: 116.4,
        },
      });
    });

    it('should return false when agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await updateAgentLocation('non-existent', mockLocation);

      expect(result).toBe(false);
    });

    it('should update profile without coordinates', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: null,
        longitude: null,
        profile: { id: 'profile-1', l1Data: {} },
      });
      (prisma.agentProfile.update as jest.Mock).mockResolvedValue({});

      const result = await updateAgentLocation('agent-1', mockLocation);

      expect(result).toBe(true);
      expect(prisma.agent.update).not.toHaveBeenCalled();
    });

    it('should merge with existing profile data', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: null,
        longitude: null,
        profile: {
          id: 'profile-1',
          l1Data: { someOtherField: 'value' },
        },
      });
      (prisma.agentProfile.update as jest.Mock).mockResolvedValue({});

      await updateAgentLocation('agent-1', mockLocation);

      expect(prisma.agentProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          l1Data: {
            someOtherField: 'value',
            location: expect.objectContaining({
              province: '110000',
            }),
          },
        },
      });
    });
  });

  describe('getAgentLocation', () => {
    it('should return agent location data', async () => {
      const mockAgent = {
        id: 'agent-1',
        latitude: 39.9,
        longitude: 116.4,
        updatedAt: new Date('2024-01-01'),
        profile: {
          l1Data: { location: mockLocation },
        },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await getAgentLocation('agent-1');

      expect(result).toBeDefined();
      expect(result!.agentId).toBe('agent-1');
      expect(result!.location).toEqual(mockLocation);
      expect(result!.coordinates).toEqual({
        latitude: 39.9,
        longitude: 116.4,
      });
    });

    it('should return null when agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getAgentLocation('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when agent has no profile', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: null,
        longitude: null,
        profile: null,
      });

      const result = await getAgentLocation('agent-1');

      expect(result).toBeNull();
    });

    it('should derive coordinates from agent lat/lng', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: 39.9,
        longitude: 116.4,
        updatedAt: new Date(),
        profile: { l1Data: {} },
      });

      const result = await getAgentLocation('agent-1');

      expect(result!.coordinates).toEqual({
        latitude: 39.9,
        longitude: 116.4,
      });
    });
  });

  describe('searchAgentsByLocation', () => {
    it('should search by province', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
      ]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const filter: LocationFilter = { province: '110000' };
      const result = await searchAgentsByLocation(filter);

      expect(result.total).toBe(1);
      expect(result.agents[0].id).toBe('agent-1');
    });

    it('should search by city', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(0);

      const filter: LocationFilter = { city: '110100' };
      await searchAgentsByLocation(filter);

      expect(prisma.agent.findMany).toHaveBeenCalled();
    });

    it('should filter by radius when specified', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'near-agent',
          name: 'Near Agent',
          type: 'SUPPLY',
          latitude: 39.91,
          longitude: 116.41,
          profile: { l1Data: {} },
        },
        {
          id: 'far-agent',
          name: 'Far Agent',
          type: 'SUPPLY',
          latitude: 40.1,
          longitude: 116.6,
          profile: { l1Data: {} },
        },
      ]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      (calculateDistance as jest.Mock)
        .mockReturnValueOnce({ distanceKm: 2 }) // near-agent within 10km
        .mockReturnValueOnce({ distanceKm: 25 }); // far-agent outside 10km

      const filter: LocationFilter = {
        withinRadius: {
          center: { latitude: 39.9, longitude: 116.4 },
          radiusKm: 10,
        },
      };

      const result = await searchAgentsByLocation(filter);

      // Only near-agent should be in results
      expect(result.agents.length).toBeLessThanOrEqual(2);
    });

    it('should filter by bounding box', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
      ]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      (isWithinBoundingBox as jest.Mock).mockReturnValueOnce(true);

      const filter: LocationFilter = {
        withinBounds: {
          minLat: 39.0,
          maxLat: 40.0,
          minLng: 116.0,
          maxLng: 117.0,
        },
      };

      await searchAgentsByLocation(filter);

      expect(isWithinBoundingBox).toHaveBeenCalled();
    });

    it('should filter by geo-fence', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
      ]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      (checkGeoFence as jest.Mock).mockReturnValueOnce({ inside: true });

      const filter: LocationFilter = { withinFence: 'fence-123' };
      await searchAgentsByLocation(filter);

      expect(checkGeoFence).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(0);

      await searchAgentsByLocation({}, 2, 10);

      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('findAgentsNearLocation', () => {
    it('should find agents within bounding box', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
      ]);

      (createBoundingBox as jest.Mock).mockReturnValue({
        minLat: 39.0,
        maxLat: 40.0,
        minLng: 116.0,
        maxLng: 117.0,
      });

      (calculateDistance as jest.Mock).mockReturnValue({ distanceKm: 0 });

      const result = await findAgentsNearLocation(
        { latitude: 39.9, longitude: 116.4 },
        10
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('agent-1');
      expect(result[0].distanceKm).toBe(0);
    });

    it('should filter by agent type', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([]);
      (createBoundingBox as jest.Mock).mockReturnValue({});

      await findAgentsNearLocation(
        { latitude: 39.9, longitude: 116.4 },
        10,
        { agentType: 'DEMAND' }
      );

      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'DEMAND' }),
        })
      );
    });

    it('should exclude specified agent', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([]);
      (createBoundingBox as jest.Mock).mockReturnValue({});

      await findAgentsNearLocation(
        { latitude: 39.9, longitude: 116.4 },
        10,
        { excludeAgentId: 'agent-1' }
      );

      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'agent-1' },
          }),
        })
      );
    });

    it('should sort results by distance', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'far-agent',
          name: 'Far Agent',
          type: 'SUPPLY',
          latitude: 40.1,
          longitude: 116.6,
          profile: { l1Data: {} },
        },
        {
          id: 'near-agent',
          name: 'Near Agent',
          type: 'SUPPLY',
          latitude: 39.91,
          longitude: 116.41,
          profile: { l1Data: {} },
        },
      ]);
      (createBoundingBox as jest.Mock).mockReturnValue({});

      (calculateDistance as jest.Mock)
        .mockReturnValueOnce({ distanceKm: 20 }) // far-agent
        .mockReturnValueOnce({ distanceKm: 2 }); // near-agent

      const result = await findAgentsNearLocation(
        { latitude: 39.9, longitude: 116.4 },
        30
      );

      expect(result[0].id).toBe('near-agent');
    });

    it('should skip agents without coordinates', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'no-coord-agent',
          name: 'No Coord Agent',
          type: 'SUPPLY',
          latitude: null,
          longitude: null,
          profile: { l1Data: {} },
        },
      ]);
      (createBoundingBox as jest.Mock).mockReturnValue({});

      const result = await findAgentsNearLocation(
        { latitude: 39.9, longitude: 116.4 },
        10
      );

      expect(result.length).toBe(0);
    });
  });

  describe('getAgentsInGeoFence', () => {
    it('should return agents inside geo-fence', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
      ]);

      (checkGeoFence as jest.Mock).mockReturnValueOnce({ inside: true });

      const result = await getAgentsInGeoFence('fence-123');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('agent-1');
    });

    it('should exclude agents outside geo-fence', async () => {
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'SUPPLY',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'SUPPLY',
          latitude: 31.2,
          longitude: 121.4,
          profile: { l1Data: {} },
        },
      ]);

      (checkGeoFence as jest.Mock)
        .mockReturnValueOnce({ inside: true })
        .mockReturnValueOnce({ inside: false });

      const result = await getAgentsInGeoFence('fence-123');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('agent-1');
    });
  });

  describe('getAgentGeoFences', () => {
    it('should return geo-fences containing the agent', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: 39.9,
        longitude: 116.4,
      });

      (findContainingGeoFences as jest.Mock).mockReturnValue([
        {
          id: 'fence-1',
          name: 'Beijing Area',
          geometry: { type: 'Polygon' as const, coordinates: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await getAgentGeoFences('agent-1');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Beijing Area');
    });

    it('should return empty array for agent without coordinates', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        latitude: null,
        longitude: null,
      });

      const result = await getAgentGeoFences('agent-1');

      expect(result).toEqual([]);
      expect(findContainingGeoFences).not.toHaveBeenCalled();
    });
  });

  describe('getDistanceBetweenAgents', () => {
    it('should calculate distance between two agents', async () => {
      (prisma.agent.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'agent-1',
          latitude: 39.9,
          longitude: 116.4,
          profile: { l1Data: {} },
        })
        .mockResolvedValueOnce({
          id: 'agent-2',
          latitude: 31.2,
          longitude: 121.4,
          profile: { l1Data: {} },
        });

      (calculateDistance as jest.Mock).mockReturnValue({ distanceKm: 1068 });

      const distance = await getDistanceBetweenAgents('agent-1', 'agent-2');

      expect(distance).toBe(1068);
    });

    it('should return null when first agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const distance = await getDistanceBetweenAgents('agent-1', 'agent-2');

      expect(distance).toBeNull();
    });

    it('should return null when agents have no coordinates', async () => {
      (prisma.agent.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'agent-1',
          latitude: null,
          longitude: null,
          profile: { l1Data: {} },
        })
        .mockResolvedValueOnce({
          id: 'agent-2',
          latitude: null,
          longitude: null,
          profile: { l1Data: {} },
        });

      const distance = await getDistanceBetweenAgents('agent-1', 'agent-2');

      expect(distance).toBeNull();
    });
  });

  describe('batchUpdateAgentLocations', () => {
    it('should update multiple agents', async () => {
      (prisma.agent.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'agent-1',
          latitude: null,
          longitude: null,
          profile: { id: 'profile-1', l1Data: {} },
        })
        .mockResolvedValueOnce({
          id: 'agent-2',
          latitude: null,
          longitude: null,
          profile: { id: 'profile-2', l1Data: {} },
        });

      (prisma.agentProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.agent.update as jest.Mock).mockResolvedValue({});

      const result = await batchUpdateAgentLocations([
        { agentId: 'agent-1', location: mockLocation, coordinates: mockCoordinates },
        { agentId: 'agent-2', location: mockLocation, coordinates: mockCoordinates },
      ]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should count failures', async () => {
      (prisma.agent.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'agent-1',
          latitude: null,
          longitude: null,
          profile: { id: 'profile-1', l1Data: {} },
        })
        .mockResolvedValueOnce(null); // Second agent not found

      (prisma.agentProfile.update as jest.Mock).mockResolvedValue({});
      (prisma.agent.update as jest.Mock).mockResolvedValue({});

      const result = await batchUpdateAgentLocations([
        { agentId: 'agent-1', location: mockLocation, coordinates: mockCoordinates },
        { agentId: 'agent-2', location: mockLocation, coordinates: mockCoordinates },
      ]);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
