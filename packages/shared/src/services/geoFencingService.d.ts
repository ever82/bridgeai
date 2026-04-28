/**
 * Geo-fencing Service
 * 地理围栏服务 - 纯函数计算层
 *
 * Persistence is handled by the server-side geoFenceService (Prisma-backed).
 * This module provides stateless geo computation utilities.
 */
import { GeoFence, GeoFenceCheckResult, GeoCoordinates, GeoJSONPolygon } from '../types/location';
/**
 * Create a new geo-fence (in-memory only — use server DB service for persistence)
 */
export declare function createGeoFence(name: string, polygon: GeoJSONPolygon, description?: string): GeoFence;
/**
 * Get a geo-fence by ID (in-memory)
 */
export declare function getGeoFence(id: string): GeoFence | undefined;
/**
 * Get all geo-fences (in-memory)
 */
export declare function getAllGeoFences(): GeoFence[];
/**
 * Update a geo-fence (in-memory)
 */
export declare function updateGeoFence(id: string, updates: Partial<Omit<GeoFence, 'id' | 'createdAt'>>): GeoFence | undefined;
/**
 * Delete a geo-fence (in-memory)
 */
export declare function deleteGeoFence(id: string): boolean;
/**
 * Check if a point is inside a geo-fence
 */
export declare function checkGeoFence(point: GeoCoordinates, fenceId: string): GeoFenceCheckResult;
/**
 * Stateless: check a point against a given fence geometry.
 * Server code should prefer this over the in-memory checkGeoFence.
 */
export declare function checkPointAgainstFence(point: GeoCoordinates, fence: GeoFence): GeoFenceCheckResult;
/**
 * Check point against multiple geo-fences
 * Returns array of fence IDs the point is inside
 */
export declare function checkMultipleGeoFences(point: GeoCoordinates, fenceIds: string[]): string[];
/**
 * Find all geo-fences containing a point (in-memory)
 */
export declare function findContainingGeoFences(point: GeoCoordinates): GeoFence[];
/**
 * Stateless: find which fences from a given list contain the point.
 */
export declare function findContainingFromList(point: GeoCoordinates, fences: GeoFence[]): GeoFence[];
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
 * Get geo-fences within a distance from a point (in-memory)
 */
export declare function getGeoFencesWithinDistance(point: GeoCoordinates, maxDistanceKm: number): Array<{
    fence: GeoFence;
    distanceKm: number;
}>;
/**
 * Stateless: filter a list of fences by distance from a point.
 */
export declare function filterFencesWithinDistance(point: GeoCoordinates, fences: GeoFence[], maxDistanceKm: number): Array<{
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
/**
 * Check if two geo-fence polygons intersect (have overlapping area).
 * Uses edge intersection + point-in-polygon checks.
 */
export declare function doFencesIntersect(fence1: GeoFence, fence2: GeoFence): boolean;
/**
 * Find all intersecting pairs from a list of geo-fences.
 */
export declare function findIntersectingFences(fences: GeoFence[]): Array<[GeoFence, GeoFence]>;
/**
 * Find all geo-fences that intersect with a given fence (in-memory).
 */
export declare function findIntersectingWith(fence: GeoFence): GeoFence[];
/**
 * Stateless: find all fences from a list that intersect with a given fence.
 */
export declare function findIntersectingFromList(fence: GeoFence, fences: GeoFence[]): GeoFence[];
//# sourceMappingURL=geoFencingService.d.ts.map