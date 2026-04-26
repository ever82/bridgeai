/**
 * Agent Location Service
 * Agent位置服务 - 管理Agent地理位置数据
 */

import { calculateDistance, isWithinBoundingBox, createBoundingBox } from '@bridgeai/shared';
import type { Location, GeoCoordinates, LocationFilter, GeoFence } from '@bridgeai/shared';

import { logger } from '../utils/logger';
import { prisma } from '../db/client';

import { checkPointInFence, findContainingFences } from './geoFenceService';

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
 * Get the primary profile from a Prisma agent fetch result.
 * Tolerates both `profile` (singular, used in some legacy/test mocks) and
 * `profiles` (the canonical Prisma array relation in schema.prisma).
 */
function getPrimaryProfile(agent: any): any | null {
  if (!agent) return null;
  if (agent.profile) return agent.profile;
  if (Array.isArray(agent.profiles) && agent.profiles.length > 0) {
    return agent.profiles[0];
  }
  return null;
}

/**
 * Update agent's location
 */
export async function updateAgentLocation(
  agentId: string,
  location: Location,
  coordinates?: GeoCoordinates
): Promise<boolean> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { profiles: true },
    });

    if (!agent) {
      logger.warn('Agent not found for location update', { agentId });
      return false;
    }

    const profile = getPrimaryProfile(agent);
    if (!profile) {
      logger.warn('Agent has no profile for location update', { agentId });
      return false;
    }

    const locationData = {
      ...location,
      ...(coordinates && { coordinates }),
    };

    // Update agent's profile with location data
    await prisma.agentProfile.update({
      where: { id: profile.id },
      data: {
        l1Data: {
          ...((profile.l1Data as object) || {}),
          location: locationData,
        } as any,
      },
    });

    // Update agent's lat/lng if available
    if (coordinates) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      });
    }

    logger.info('Agent location updated', { agentId, location });
    return true;
  } catch (error) {
    logger.error('Failed to update agent location', { error, agentId });
    return false;
  }
}

/**
 * Get agent's current location
 */
export async function getAgentLocation(agentId: string): Promise<AgentLocationData | null> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { profiles: true },
    });

    const profile = getPrimaryProfile(agent);
    if (!profile?.l1Data) {
      return null;
    }

    const locationData = (profile.l1Data as any).location as Location;

    return {
      agentId: agent!.id,
      location: locationData,
      coordinates:
        agent!.latitude && agent!.longitude
          ? { latitude: agent!.latitude, longitude: agent!.longitude }
          : undefined,
      lastUpdated: agent!.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get agent location', { error, agentId });
    return null;
  }
}

/**
 * Search agents by location filter
 */
export async function searchAgentsByLocation(
  filter: LocationFilter,
  page: number = 1,
  limit: number = 20
): Promise<{ agents: AgentWithLocation[]; total: number }> {
  try {
    const where: any = {};

    // Build combined location filter using AND to avoid overwriting
    const locationFilters: any[] = [];

    if (filter.province) {
      locationFilters.push({
        profiles: {
          some: {
            l1Data: {
              path: ['location', 'province'],
              equals: filter.province,
            },
          },
        },
      });
    }

    if (filter.city) {
      locationFilters.push({
        profiles: {
          some: {
            l1Data: {
              path: ['location', 'city'],
              equals: filter.city,
            },
          },
        },
      });
    }

    if (filter.district) {
      locationFilters.push({
        profiles: {
          some: {
            l1Data: {
              path: ['location', 'district'],
              equals: filter.district,
            },
          },
        },
      });
    }

    if (locationFilters.length > 0) {
      where.AND = locationFilters;
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { profiles: { select: { l1Data: true } } },
      }),
      prisma.agent.count({ where }),
    ]);

    let results: AgentWithLocation[] = agents.map(agent => {
      const profile = getPrimaryProfile(agent);
      const locationData = (profile?.l1Data as any)?.location as Location;
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        location: locationData,
        coordinates:
          agent.latitude && agent.longitude
            ? { latitude: agent.latitude, longitude: agent.longitude }
            : undefined,
      };
    });

    // Apply radius filter
    if (filter.withinRadius) {
      results = results.filter(item => {
        if (!item.coordinates) return false;
        const { distanceKm } = calculateDistance(item.coordinates, filter.withinRadius!.center);
        item.distanceKm = distanceKm;
        return distanceKm <= filter.withinRadius!.radiusKm;
      });
    }

    // Apply bounding box filter
    if (filter.withinBounds) {
      results = results.filter(item => {
        if (!item.coordinates) return false;
        return isWithinBoundingBox(item.coordinates, filter.withinBounds!);
      });
    }

    // Apply geo-fence filter
    if (filter.withinFence) {
      const fenceChecks = await Promise.all(
        results.map(async item => {
          if (!item.coordinates) return false;
          const result = await checkPointInFence(item.coordinates, filter.withinFence!);
          return result.inside;
        })
      );
      results = results.filter((_, i) => fenceChecks[i]);
    }

    return { agents: results, total };
  } catch (error) {
    logger.error('Failed to search agents by location', { error, filter });
    throw error;
  }
}

/**
 * Find agents within radius of a point
 */
export async function findAgentsNearLocation(
  center: GeoCoordinates,
  radiusKm: number,
  options?: { agentType?: string; excludeAgentId?: string }
): Promise<AgentWithLocation[]> {
  try {
    const boundingBox = createBoundingBox(center, radiusKm);

    const where: any = {
      latitude: { gte: boundingBox.minLat, lte: boundingBox.maxLat },
      longitude: { gte: boundingBox.minLng, lte: boundingBox.maxLng },
    };

    if (options?.agentType) {
      where.type = options.agentType;
    }

    if (options?.excludeAgentId) {
      where.id = { not: options.excludeAgentId };
    }

    const agents = await prisma.agent.findMany({
      where,
      include: { profiles: { select: { l1Data: true } } },
    });

    const results: AgentWithLocation[] = [];

    for (const agent of agents) {
      if (!agent.latitude || !agent.longitude) continue;

      const coords: GeoCoordinates = {
        latitude: agent.latitude,
        longitude: agent.longitude,
      };

      const { distanceKm } = calculateDistance(center, coords);

      if (distanceKm <= radiusKm) {
        const profile = getPrimaryProfile(agent);
        const locationData = (profile?.l1Data as any)?.location as Location;
        results.push({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          location: locationData,
          coordinates: coords,
          distanceKm,
        });
      }
    }

    return results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  } catch (error) {
    logger.error('Failed to find agents near location', { error, center, radiusKm });
    throw error;
  }
}

/**
 * Get agents within geo-fences
 */
export async function getAgentsInGeoFence(fenceId: string): Promise<AgentWithLocation[]> {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      include: { profiles: { select: { l1Data: true } } },
    });

    const results: AgentWithLocation[] = [];

    for (const agent of agents) {
      if (!agent.latitude || !agent.longitude) continue;

      const coords: GeoCoordinates = {
        latitude: agent.latitude,
        longitude: agent.longitude,
      };

      const result = await checkPointInFence(coords, fenceId);

      if (result.inside) {
        const profile = getPrimaryProfile(agent);
        const locationData = (profile?.l1Data as any)?.location as Location;
        results.push({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          location: locationData,
          coordinates: coords,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('Failed to get agents in geo-fence', { error, fenceId });
    throw error;
  }
}

/**
 * Get geo-fences containing an agent
 */
export async function getAgentGeoFences(agentId: string): Promise<GeoFence[]> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent?.latitude || !agent?.longitude) {
      return [];
    }

    const coords: GeoCoordinates = {
      latitude: agent.latitude,
      longitude: agent.longitude,
    };

    return findContainingFences(coords) as unknown as GeoFence[];
  } catch (error) {
    logger.error('Failed to get agent geo-fences', { error, agentId });
    return [];
  }
}

/**
 * Calculate distance between two agents
 */
export async function getDistanceBetweenAgents(
  agentId1: string,
  agentId2: string
): Promise<number | null> {
  try {
    const [loc1, loc2] = await Promise.all([
      getAgentLocation(agentId1),
      getAgentLocation(agentId2),
    ]);

    if (!loc1?.coordinates || !loc2?.coordinates) {
      return null;
    }

    const { distanceKm } = calculateDistance(loc1.coordinates, loc2.coordinates);
    return distanceKm;
  } catch (error) {
    logger.error('Failed to calculate distance between agents', {
      error,
      agentId1,
      agentId2,
    });
    return null;
  }
}

/**
 * Batch update agent locations
 */
export async function batchUpdateAgentLocations(
  updates: Array<{ agentId: string; location: Location; coordinates?: GeoCoordinates }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    const result = await updateAgentLocation(update.agentId, update.location, update.coordinates);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}
