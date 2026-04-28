/**
 * Agent Location Service
 * Agent位置服务 - 管理Agent地理位置数据
 */
import type { Location, GeoCoordinates, LocationFilter, GeoFence } from '@bridgeai/shared';
export interface AgentLocationData {
    agentId: string;
    location: Location;
    coordinates?: GeoCoordinates;
    lastUpdated: Date;
}
export interface AgentWithLocation {
    id: string;
    name: string;
    type: string;
    location?: Location;
    coordinates?: GeoCoordinates;
    distanceKm?: number;
}
/**
 * Update agent's location
 */
export declare function updateAgentLocation(agentId: string, location: Location, coordinates?: GeoCoordinates): Promise<boolean>;
/**
 * Get agent's current location
 */
export declare function getAgentLocation(agentId: string): Promise<AgentLocationData | null>;
/**
 * Search agents by location filter
 */
export declare function searchAgentsByLocation(filter: LocationFilter, page?: number, limit?: number): Promise<{
    agents: AgentWithLocation[];
    total: number;
}>;
/**
 * Find agents within radius of a point
 */
export declare function findAgentsNearLocation(center: GeoCoordinates, radiusKm: number, options?: {
    agentType?: string;
    excludeAgentId?: string;
}): Promise<AgentWithLocation[]>;
/**
 * Get agents within geo-fences
 */
export declare function getAgentsInGeoFence(fenceId: string): Promise<AgentWithLocation[]>;
/**
 * Get geo-fences containing an agent
 */
export declare function getAgentGeoFences(agentId: string): Promise<GeoFence[]>;
/**
 * Calculate distance between two agents
 */
export declare function getDistanceBetweenAgents(agentId1: string, agentId2: string): Promise<number | null>;
/**
 * Batch update agent locations
 */
export declare function batchUpdateAgentLocations(updates: Array<{
    agentId: string;
    location: Location;
    coordinates?: GeoCoordinates;
}>): Promise<{
    success: number;
    failed: number;
}>;
//# sourceMappingURL=agentLocationService.d.ts.map