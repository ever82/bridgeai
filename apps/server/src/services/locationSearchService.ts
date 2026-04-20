/**
 * Location Search Service
 * 位置搜索服务
 */

import {
  Location,
  GeoCoordinates,
  LocationFilter,
  LocationSearchRequest,
  LocationSearchResult,
  DistanceFilter,
  BoundingBox,
} from '@bridgeai/shared';
import {
  calculateDistance,
  isWithinBoundingBox,
  createBoundingBox,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// Mock data for provinces, cities, districts
// In production, this would come from a database
const PROVINCES: Array<{ code: string; name: string }> = [
  { code: '110000', name: '北京市' },
  { code: '310000', name: '上海市' },
  { code: '440000', name: '广东省' },
  { code: '320000', name: '江苏省' },
  { code: '330000', name: '浙江省' },
  { code: '510000', name: '四川省' },
  { code: '420000', name: '湖北省' },
  { code: '610000', name: '陕西省' },
];

const CITIES: Array<{ code: string; name: string; provinceCode: string }> = [
  { code: '110100', name: '北京市', provinceCode: '110000' },
  { code: '310100', name: '上海市', provinceCode: '310000' },
  { code: '440100', name: '广州市', provinceCode: '440000' },
  { code: '440300', name: '深圳市', provinceCode: '440000' },
  { code: '320100', name: '南京市', provinceCode: '320000' },
  { code: '320500', name: '苏州市', provinceCode: '320000' },
  { code: '330100', name: '杭州市', provinceCode: '330000' },
  { code: '510100', name: '成都市', provinceCode: '510000' },
  { code: '420100', name: '武汉市', provinceCode: '420000' },
  { code: '610100', name: '西安市', provinceCode: '610000' },
];

const DISTRICTS: Array<{
  code: string;
  name: string;
  cityCode: string;
  provinceCode: string;
}> = [
  { code: '110101', name: '东城区', cityCode: '110100', provinceCode: '110000' },
  { code: '110102', name: '西城区', cityCode: '110100', provinceCode: '110000' },
  { code: '110105', name: '朝阳区', cityCode: '110100', provinceCode: '110000' },
  { code: '440103', name: '荔湾区', cityCode: '440100', provinceCode: '440000' },
  { code: '440104', name: '越秀区', cityCode: '440100', provinceCode: '440000' },
  { code: '440305', name: '南山区', cityCode: '440300', provinceCode: '440000' },
  { code: '440306', name: '宝安区', cityCode: '440300', provinceCode: '440000' },
];

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

    // Build location filter
    if (filter.province) {
      where.location = {
        ...(where.location || {}),
        province: filter.province,
      };
    }

    if (filter.city) {
      where.location = {
        ...(where.location || {}),
        city: filter.city,
      };
    }

    if (filter.district) {
      where.location = {
        ...(where.location || {}),
        district: filter.district,
      };
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
        profile: {
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
      location: (agent.profile?.l1Data as any)?.location as Location,
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
export async function getProvinces(): Promise<
  Array<{ code: string; name: string }>
> {
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
export async function getLocationHierarchy(provinceCode?: string, cityCode?: string): Promise<{
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
export async function getLocationNameByCode(
  code: string
): Promise<string | null> {
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
export async function searchLocations(
  query: string
): Promise<
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

  const lowerQuery = query.toLowerCase();

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
        include: { profile: { select: { l1Data: true } } },
      }),
      prisma.agent.findUnique({
        where: { id: agentId2 },
        include: { profile: { select: { l1Data: true } } },
      }),
    ]);

    if (!agent1?.profile?.l1Data || !agent2?.profile?.l1Data) {
      return null;
    }

    const location1 = (agent1.profile.l1Data as any).location as Location & {
      coordinates?: GeoCoordinates;
    };
    const location2 = (agent2.profile.l1Data as any).location as Location & {
      coordinates?: GeoCoordinates;
    };

    if (!location1?.coordinates || !location2?.coordinates) {
      return null;
    }

    const { distanceKm } = calculateDistance(
      location1.coordinates,
      location2.coordinates
    );

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
        profile: {
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
      const location = (agent.profile?.l1Data as any)?.location as Location & {
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
