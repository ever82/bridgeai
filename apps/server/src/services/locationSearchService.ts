/**
 * Location Search Service
 * 位置搜索服务
 */

import { Location, GeoCoordinates } from '@bridgeai/shared';
import { calculateDistance } from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { PROVINCES, CITIES, DISTRICTS } from '../data/locationData';

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
