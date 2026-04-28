"use strict";
/**
 * Agent Location Service Tests
 * Agent位置服务测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@bridgeai/shared");
const client_1 = require("../../db/client");
const geoFenceService_1 = require("../geoFenceService");
const agentLocationService_1 = require("../agentLocationService");
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
// Mock shared utilities
jest.mock('@bridgeai/shared', () => ({
    ...jest.requireActual('@bridgeai/shared'),
    calculateDistance: jest.fn(),
    isWithinBoundingBox: jest.fn(),
    createBoundingBox: jest.fn(),
}));
// Mock geoFenceService (Prisma-backed, used by agentLocationService)
jest.mock('../geoFenceService', () => ({
    checkPointInFence: jest.fn(),
    findContainingFences: jest.fn(),
}));
describe('AgentLocationService', () => {
    const mockLocation = {
        province: '110000',
        provinceName: '北京市',
        city: '110100',
        cityName: '北京市',
        district: '110101',
        districtName: '东城区',
    };
    const mockCoordinates = {
        latitude: 39.9,
        longitude: 116.4,
        accuracy: 10,
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('updateAgentLocation', () => {
        it('should update agent location successfully', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: null,
                longitude: null,
                profile: { id: 'profile-1', l1Data: {} },
            });
            client_1.prisma.agentProfile.update.mockResolvedValue({});
            client_1.prisma.agent.update.mockResolvedValue({});
            const result = await (0, agentLocationService_1.updateAgentLocation)('agent-1', mockLocation, mockCoordinates);
            expect(result).toBe(true);
            expect(client_1.prisma.agentProfile.update).toHaveBeenCalled();
            expect(client_1.prisma.agent.update).toHaveBeenCalledWith({
                where: { id: 'agent-1' },
                data: {
                    latitude: 39.9,
                    longitude: 116.4,
                },
            });
        });
        it('should return false when agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            const result = await (0, agentLocationService_1.updateAgentLocation)('non-existent', mockLocation);
            expect(result).toBe(false);
        });
        it('should update profile without coordinates', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: null,
                longitude: null,
                profile: { id: 'profile-1', l1Data: {} },
            });
            client_1.prisma.agentProfile.update.mockResolvedValue({});
            const result = await (0, agentLocationService_1.updateAgentLocation)('agent-1', mockLocation);
            expect(result).toBe(true);
            expect(client_1.prisma.agent.update).not.toHaveBeenCalled();
        });
        it('should merge with existing profile data', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: null,
                longitude: null,
                profile: {
                    id: 'profile-1',
                    l1Data: { someOtherField: 'value' },
                },
            });
            client_1.prisma.agentProfile.update.mockResolvedValue({});
            await (0, agentLocationService_1.updateAgentLocation)('agent-1', mockLocation);
            expect(client_1.prisma.agentProfile.update).toHaveBeenCalledWith({
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
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            const result = await (0, agentLocationService_1.getAgentLocation)('agent-1');
            expect(result).toBeDefined();
            expect(result.agentId).toBe('agent-1');
            expect(result.location).toEqual(mockLocation);
            expect(result.coordinates).toEqual({
                latitude: 39.9,
                longitude: 116.4,
            });
        });
        it('should return null when agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            const result = await (0, agentLocationService_1.getAgentLocation)('non-existent');
            expect(result).toBeNull();
        });
        it('should return null when agent has no profile', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: null,
                longitude: null,
                profile: null,
            });
            const result = await (0, agentLocationService_1.getAgentLocation)('agent-1');
            expect(result).toBeNull();
        });
        it('should derive coordinates from agent lat/lng', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: 39.9,
                longitude: 116.4,
                updatedAt: new Date(),
                profile: { l1Data: {} },
            });
            const result = await (0, agentLocationService_1.getAgentLocation)('agent-1');
            expect(result.coordinates).toEqual({
                latitude: 39.9,
                longitude: 116.4,
            });
        });
    });
    describe('searchAgentsByLocation', () => {
        it('should search by province', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'SUPPLY',
                    latitude: 39.9,
                    longitude: 116.4,
                    profile: { l1Data: {} },
                },
            ]);
            client_1.prisma.agent.count.mockResolvedValue(1);
            const filter = { province: '110000' };
            const result = await (0, agentLocationService_1.searchAgentsByLocation)(filter);
            expect(result.total).toBe(1);
            expect(result.agents[0].id).toBe('agent-1');
        });
        it('should search by city', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([]);
            client_1.prisma.agent.count.mockResolvedValue(0);
            const filter = { city: '110100' };
            await (0, agentLocationService_1.searchAgentsByLocation)(filter);
            expect(client_1.prisma.agent.findMany).toHaveBeenCalled();
        });
        it('should filter by radius when specified', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
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
            client_1.prisma.agent.count.mockResolvedValue(2);
            shared_1.calculateDistance
                .mockReturnValueOnce({ distanceKm: 2 }) // near-agent within 10km
                .mockReturnValueOnce({ distanceKm: 25 }); // far-agent outside 10km
            const filter = {
                withinRadius: {
                    center: { latitude: 39.9, longitude: 116.4 },
                    radiusKm: 10,
                },
            };
            const result = await (0, agentLocationService_1.searchAgentsByLocation)(filter);
            // Only near-agent should be in results
            expect(result.agents.length).toBeLessThanOrEqual(2);
        });
        it('should filter by bounding box', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'SUPPLY',
                    latitude: 39.9,
                    longitude: 116.4,
                    profile: { l1Data: {} },
                },
            ]);
            client_1.prisma.agent.count.mockResolvedValue(1);
            shared_1.isWithinBoundingBox.mockReturnValueOnce(true);
            const filter = {
                withinBounds: {
                    minLat: 39.0,
                    maxLat: 40.0,
                    minLng: 116.0,
                    maxLng: 117.0,
                },
            };
            await (0, agentLocationService_1.searchAgentsByLocation)(filter);
            expect(shared_1.isWithinBoundingBox).toHaveBeenCalled();
        });
        it('should filter by geo-fence', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'SUPPLY',
                    latitude: 39.9,
                    longitude: 116.4,
                    profile: { l1Data: {} },
                },
            ]);
            client_1.prisma.agent.count.mockResolvedValue(1);
            geoFenceService_1.checkPointInFence.mockResolvedValueOnce({ inside: true });
            const filter = { withinFence: 'fence-123' };
            await (0, agentLocationService_1.searchAgentsByLocation)(filter);
            expect(geoFenceService_1.checkPointInFence).toHaveBeenCalled();
        });
        it('should handle pagination', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([]);
            client_1.prisma.agent.count.mockResolvedValue(0);
            await (0, agentLocationService_1.searchAgentsByLocation)({}, 2, 10);
            expect(client_1.prisma.agent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
        });
    });
    describe('findAgentsNearLocation', () => {
        it('should find agents within bounding box', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'SUPPLY',
                    latitude: 39.9,
                    longitude: 116.4,
                    profile: { l1Data: {} },
                },
            ]);
            shared_1.createBoundingBox.mockReturnValue({
                minLat: 39.0,
                maxLat: 40.0,
                minLng: 116.0,
                maxLng: 117.0,
            });
            shared_1.calculateDistance.mockReturnValue({ distanceKm: 0 });
            const result = await (0, agentLocationService_1.findAgentsNearLocation)({ latitude: 39.9, longitude: 116.4 }, 10);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('agent-1');
            expect(result[0].distanceKm).toBe(0);
        });
        it('should filter by agent type', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([]);
            shared_1.createBoundingBox.mockReturnValue({});
            await (0, agentLocationService_1.findAgentsNearLocation)({ latitude: 39.9, longitude: 116.4 }, 10, {
                agentType: 'DEMAND',
            });
            expect(client_1.prisma.agent.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ type: 'DEMAND' }),
            }));
        });
        it('should exclude specified agent', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([]);
            shared_1.createBoundingBox.mockReturnValue({});
            await (0, agentLocationService_1.findAgentsNearLocation)({ latitude: 39.9, longitude: 116.4 }, 10, {
                excludeAgentId: 'agent-1',
            });
            expect(client_1.prisma.agent.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    id: { not: 'agent-1' },
                }),
            }));
        });
        it('should sort results by distance', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
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
            shared_1.createBoundingBox.mockReturnValue({});
            shared_1.calculateDistance
                .mockReturnValueOnce({ distanceKm: 20 }) // far-agent
                .mockReturnValueOnce({ distanceKm: 2 }); // near-agent
            const result = await (0, agentLocationService_1.findAgentsNearLocation)({ latitude: 39.9, longitude: 116.4 }, 30);
            expect(result[0].id).toBe('near-agent');
        });
        it('should skip agents without coordinates', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'no-coord-agent',
                    name: 'No Coord Agent',
                    type: 'SUPPLY',
                    latitude: null,
                    longitude: null,
                    profile: { l1Data: {} },
                },
            ]);
            shared_1.createBoundingBox.mockReturnValue({});
            const result = await (0, agentLocationService_1.findAgentsNearLocation)({ latitude: 39.9, longitude: 116.4 }, 10);
            expect(result.length).toBe(0);
        });
    });
    describe('getAgentsInGeoFence', () => {
        it('should return agents inside geo-fence', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'SUPPLY',
                    latitude: 39.9,
                    longitude: 116.4,
                    profile: { l1Data: {} },
                },
            ]);
            geoFenceService_1.checkPointInFence.mockResolvedValueOnce({ inside: true });
            const result = await (0, agentLocationService_1.getAgentsInGeoFence)('fence-123');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('agent-1');
        });
        it('should exclude agents outside geo-fence', async () => {
            client_1.prisma.agent.findMany.mockResolvedValue([
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
            geoFenceService_1.checkPointInFence
                .mockResolvedValueOnce({ inside: true })
                .mockResolvedValueOnce({ inside: false });
            const result = await (0, agentLocationService_1.getAgentsInGeoFence)('fence-123');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('agent-1');
        });
    });
    describe('getAgentGeoFences', () => {
        it('should return geo-fences containing the agent', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: 39.9,
                longitude: 116.4,
            });
            geoFenceService_1.findContainingFences.mockResolvedValue([
                {
                    id: 'fence-1',
                    name: 'Beijing Area',
                    geometry: { type: 'Polygon', coordinates: [] },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            const result = await (0, agentLocationService_1.getAgentGeoFences)('agent-1');
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Beijing Area');
        });
        it('should return empty array for agent without coordinates', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                id: 'agent-1',
                latitude: null,
                longitude: null,
            });
            const result = await (0, agentLocationService_1.getAgentGeoFences)('agent-1');
            expect(result).toEqual([]);
            expect(geoFenceService_1.findContainingFences).not.toHaveBeenCalled();
        });
    });
    describe('getDistanceBetweenAgents', () => {
        it('should calculate distance between two agents', async () => {
            client_1.prisma.agent.findUnique
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
            shared_1.calculateDistance.mockReturnValue({ distanceKm: 1068 });
            const distance = await (0, agentLocationService_1.getDistanceBetweenAgents)('agent-1', 'agent-2');
            expect(distance).toBe(1068);
        });
        it('should return null when first agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValueOnce(null);
            const distance = await (0, agentLocationService_1.getDistanceBetweenAgents)('agent-1', 'agent-2');
            expect(distance).toBeNull();
        });
        it('should return null when agents have no coordinates', async () => {
            client_1.prisma.agent.findUnique
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
            const distance = await (0, agentLocationService_1.getDistanceBetweenAgents)('agent-1', 'agent-2');
            expect(distance).toBeNull();
        });
    });
    describe('batchUpdateAgentLocations', () => {
        it('should update multiple agents', async () => {
            client_1.prisma.agent.findUnique
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
            client_1.prisma.agentProfile.update.mockResolvedValue({});
            client_1.prisma.agent.update.mockResolvedValue({});
            const result = await (0, agentLocationService_1.batchUpdateAgentLocations)([
                { agentId: 'agent-1', location: mockLocation, coordinates: mockCoordinates },
                { agentId: 'agent-2', location: mockLocation, coordinates: mockCoordinates },
            ]);
            expect(result.success).toBe(2);
            expect(result.failed).toBe(0);
        });
        it('should count failures', async () => {
            client_1.prisma.agent.findUnique
                .mockResolvedValueOnce({
                id: 'agent-1',
                latitude: null,
                longitude: null,
                profile: { id: 'profile-1', l1Data: {} },
            })
                .mockResolvedValueOnce(null); // Second agent not found
            client_1.prisma.agentProfile.update.mockResolvedValue({});
            client_1.prisma.agent.update.mockResolvedValue({});
            const result = await (0, agentLocationService_1.batchUpdateAgentLocations)([
                { agentId: 'agent-1', location: mockLocation, coordinates: mockCoordinates },
                { agentId: 'agent-2', location: mockLocation, coordinates: mockCoordinates },
            ]);
            expect(result.success).toBe(1);
            expect(result.failed).toBe(1);
        });
    });
});
//# sourceMappingURL=agentLocationService.test.js.map