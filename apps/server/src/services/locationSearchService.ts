/**
 * Location Search Service
 * 位置搜索服务
 */

import { Location, GeoCoordinates, LocationFilter, LocationSearchResult } from '@bridgeai/shared';
import { calculateDistance, isWithinBoundingBox } from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { PROVINCES, CITIES, DISTRICTS } from '../data/locationData';

/**
 * Search agents by location
 */
export async function searchAgentsByLocation(
  filter: LocationFilter,
  page: number = 1,
  limit: number = 20
): Promise<LocationSearchResult<{ id: string; name: string; location: Location }>> {
  try {
    const where: any = {};

    // Build combined location filter using JSON path queries on l1Data
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

    // Handle geo-fence filter
    if (filter.withinFence) {
      // In production, this would query agents whose coordinates are within the fence
      logger.info('Geo-fence filter applied', { fenceId: filter.withinFence });
    }

    const agents = await prisma.agent.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        profiles: {
          select: {
            l1Data: true,
          },
        },
      },
    });

    // Transform and filter by distance if needed
    let results = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      location: (agent.profiles[0]?.l1Data as any)?.location as Location,
    }));

    // Filter by radius if specified
    if (filter.withinRadius && filter.withinRadius.center) {
      results = results.filter(item => {
        if (!item.location) return false;
        const coords = (item.location as any).coordinates as GeoCoordinates;
        if (!coords) return false;

        const { distanceKm } = calculateDistance(coords, filter.withinRadius!.center);
        return distanceKm <= filter.withinRadius!.radiusKm;
      });
    }

    // Filter by bounding box if specified
    if (filter.withinBounds) {
      results = results.filter(item => {
        if (!item.location) return false;
        const coords = (item.location as any).coordinates as GeoCoordinates;
        if (!coords) return false;

        return isWithinBoundingBox(coords, filter.withinBounds!);
      });
    }

    const total = await prisma.agent.count({ where });

    return {
      items: results,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Failed to search agents by location', { error, filter });
    throw error;
  }
}

/**
 * Get all provinces
 */
export async function getProvinces(): Promise<Array<{ code: string; name: string }>> {
  return PROVINCES;
}

/**
 * Get cities by province code
 */
export async function getCitiesByProvince(
  provinceCode: string
): Promise<Array<{ code: string; name: string }>> {
  return CITIES.filter(city => city.provinceCode === provinceCode);
}

/**
 * Get districts by city code
 */
export async function getDistrictsByCity(
  cityCode: string
): Promise<Array<{ code: string; name: string }>> {
  return DISTRICTS.filter(district => district.cityCode === cityCode);
}

/**
 * Get location hierarchy
 */
export async function getLocationHierarchy(
  provinceCode?: string,
  cityCode?: string
): Promise<{
  provinces: Array<{ code: string; name: string }>;
  cities?: Array<{ code: string; name: string }>;
  districts?: Array<{ code: string; name: string }>;
}> {
  const result: any = {
    provinces: PROVINCES,
  };

  if (provinceCode) {
    result.cities = await getCitiesByProvince(provinceCode);
  }

  if (cityCode) {
    result.districts = await getDistrictsByCity(cityCode);
  }

  return result;
}

/**
 * Get location name by code
 */
export async function getLocationNameByCode(code: string): Promise<string | null> {
  // Check provinces
  const province = PROVINCES.find(p => p.code === code);
  if (province) return province.name;

  // Check cities
  const city = CITIES.find(c => c.code === code);
  if (city) return city.name;

  // Check districts
  const district = DISTRICTS.find(d => d.code === code);
  if (district) return district.name;

  return null;
}

/**
 * Get full location path
 */
export async function getFullLocationPath(
  provinceCode?: string,
  cityCode?: string,
  districtCode?: string
): Promise<string> {
  const parts: string[] = [];

  if (provinceCode) {
    const province = PROVINCES.find(p => p.code === provinceCode);
    if (province) parts.push(province.name);
  }

  if (cityCode) {
    const city = CITIES.find(c => c.code === cityCode);
    if (city) parts.push(city.name);
  }

  if (districtCode) {
    const district = DISTRICTS.find(d => d.code === districtCode);
    if (district) parts.push(district.name);
  }

  return parts.join(' - ') || '未知位置';
}

/**
 * Search locations by keyword
 */
export async function searchLocations(query: string): Promise<
  Array<{
    type: 'province' | 'city' | 'district';
    code: string;
    name: string;
    fullPath: string;
  }>
> {
  const results: Array<{
    type: 'province' | 'city' | 'district';
    code: string;
    name: string;
    fullPath: string;
  }> = [];

  // Search provinces
  for (const province of PROVINCES) {
    if (province.name.includes(query)) {
      results.push({
        type: 'province',
        code: province.code,
        name: province.name,
        fullPath: province.name,
      });
    }
  }

  // Search cities
  for (const city of CITIES) {
    if (city.name.includes(query)) {
      const province = PROVINCES.find(p => p.code === city.provinceCode);
      results.push({
        type: 'city',
        code: city.code,
        name: city.name,
        fullPath: `${province?.name || ''} - ${city.name}`,
      });
    }
  }

  // Search districts
  for (const district of DISTRICTS) {
    if (district.name.includes(query)) {
      const province = PROVINCES.find(p => p.code === district.provinceCode);
      const city = CITIES.find(c => c.code === district.cityCode);
      results.push({
        type: 'district',
        code: district.code,
        name: district.name,
        fullPath: `${province?.name || ''} - ${city?.name || ''} - ${district.name}`,
      });
    }
  }

  return results.slice(0, 20); // Limit results
}

/**
 * Calculate distance between two agents
 */
export async function getDistanceBetweenAgents(
  agentId1: string,
  agentId2: string
): Promise<number | null> {
  try {
    const [agent1, agent2] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId1 },
        include: { profiles: { select: { l1Data: true } } },
      }),
      prisma.agent.findUnique({
        where: { id: agentId2 },
        include: { profiles: { select: { l1Data: true } } },
      }),
    ]);

    if (!agent1?.profiles[0]?.l1Data || !agent2?.profiles[0]?.l1Data) {
      return null;
    }

    const location1 = (agent1.profiles[0].l1Data as any).location as Location & {
      coordinates?: GeoCoordinates;
    };
    const location2 = (agent2.profiles[0].l1Data as any).location as Location & {
      coordinates?: GeoCoordinates;
    };

    if (!location1?.coordinates || !location2?.coordinates) {
      return null;
    }

    const { distanceKm } = calculateDistance(location1.coordinates, location2.coordinates);

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
 * Find agents within radius
 */
export async function findAgentsWithinRadius(
  center: GeoCoordinates,
  radiusKm: number,
  options?: { agentType?: string; excludeAgentId?: string }
): Promise<
  Array<{
    agent: { id: string; name: string; type: string };
    distanceKm: number;
  }>
> {
  try {
    const where: any = {};

    if (options?.agentType) {
      where.type = options.agentType;
    }

    if (options?.excludeAgentId) {
      where.id = { not: options.excludeAgentId };
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        profiles: {
          select: {
            l1Data: true,
          },
        },
      },
    });

    const results: Array<{
      agent: { id: string; name: string; type: string };
      distanceKm: number;
    }> = [];

    for (const agent of agents) {
      const location = (agent.profiles[0]?.l1Data as any)?.location as Location & {
        coordinates?: GeoCoordinates;
      };

      if (!location?.coordinates) continue;

      const { distanceKm } = calculateDistance(center, location.coordinates);

      if (distanceKm <= radiusKm) {
        results.push({
          agent: {
            id: agent.id,
            name: agent.name,
            type: agent.type,
          },
          distanceKm,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    logger.error('Failed to find agents within radius', {
      error,
      center,
      radiusKm,
    });
    throw error;
  }
}
