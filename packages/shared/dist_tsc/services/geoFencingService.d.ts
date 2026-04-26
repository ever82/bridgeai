/**
 * Geo-fencing Service
 * 地理围栏服务
 */
import { GeoFence, GeoFenceCheckResult, GeoCoordinates, GeoJSONPolygon } from '../types/location';
/**
 * Create a new geo-fence
 */
export declare function createGeoFence(name: string, polygon: GeoJSONPolygon, description?: string): GeoFence;
/**
 * Get a geo-fence by ID
 */
export declare function getGeoFence(id: string): GeoFence | undefined;
/**
 * Get all geo-fences
 */
export declare function getAllGeoFences(): GeoFence[];
/**
 * Update a geo-fence
 */
export declare function updateGeoFence(id: string, updates: Partial<Omit<GeoFence, 'id' | 'createdAt'>>): GeoFence | undefined;
/**
 * Delete a geo-fence
 */
export declare function deleteGeoFence(id: string): boolean;
/**
 * Check if a point is inside a geo-fence
 */
export declare function checkGeoFence(point: GeoCoordinates, fenceId: string): GeoFenceCheckResult;
/**
 * Check point against multiple geo-fences
 * Returns array of fence IDs the point is inside
 */
export declare function checkMultipleGeoFences(point: GeoCoordinates, fenceIds: string[]): string[];
/**
 * Find all geo-fences containing a point
 */
export declare function findContainingGeoFences(point: GeoCoordinates): GeoFence[];
/**
 * Create a circular geo-fence (approximated as polygon)
 */
export declare function createCircularGeoFence(name: string, center: GeoCoordinates, radiusMeters: number, description?: string, segments?: number): GeoFence;
/**
 * Create a rectangular geo-fence
 */
export declare function createRectangularGeoFence(name: string, bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}, description?: string): GeoFence;
/**
 * Get geo-fences within a distance from a point
 */
export declare function getGeoFencesWithinDistance(point: GeoCoordinates, maxDistanceKm: number): Array<{
    fence: GeoFence;
    distanceKm: number;
}>;
/**
 * Validate geo-fence polygon
 */
export declare function validateGeoFencePolygon(polygon: GeoJSONPolygon): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=geoFencingService.d.ts.map