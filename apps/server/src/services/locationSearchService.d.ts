/**
 * Location Search Service
 * 位置搜索服务
 */
import { GeoCoordinates } from '@bridgeai/shared';
/**
 * Get all provinces
 */
export declare function getProvinces(): Promise<Array<{
    code: string;
    name: string;
}>>;
/**
 * Get cities by province code
 */
export declare function getCitiesByProvince(provinceCode: string): Promise<Array<{
    code: string;
    name: string;
}>>;
/**
 * Get districts by city code
 */
export declare function getDistrictsByCity(cityCode: string): Promise<Array<{
    code: string;
    name: string;
}>>;
/**
 * Get location hierarchy
 */
export declare function getLocationHierarchy(provinceCode?: string, cityCode?: string): Promise<{
    provinces: Array<{
        code: string;
        name: string;
    }>;
    cities?: Array<{
        code: string;
        name: string;
    }>;
    districts?: Array<{
        code: string;
        name: string;
    }>;
}>;
/**
 * Get location name by code
 */
export declare function getLocationNameByCode(code: string): Promise<string | null>;
/**
 * Get full location path
 */
export declare function getFullLocationPath(provinceCode?: string, cityCode?: string, districtCode?: string): Promise<string>;
/**
 * Search locations by keyword
 */
export declare function searchLocations(query: string): Promise<Array<{
    type: 'province' | 'city' | 'district';
    code: string;
    name: string;
    fullPath: string;
}>>;
/**
 * Find agents within radius
 */
export declare function findAgentsWithinRadius(center: GeoCoordinates, radiusKm: number, options?: {
    agentType?: string;
    excludeAgentId?: string;
}): Promise<Array<{
    agent: {
        id: string;
        name: string;
        type: string;
    };
    distanceKm: number;
}>>;
//# sourceMappingURL=locationSearchService.d.ts.map