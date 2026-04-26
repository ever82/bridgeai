/**
 * Geo-fencing Service
 * 地理围栏服务 - 纯函数计算层
 *
 * Persistence is handled by the server-side geoFenceService (Prisma-backed).
 * This module provides stateless geo computation utilities.
 */

import { GeoFence, GeoFenceCheckResult, GeoCoordinates, GeoJSONPolygon } from '../types/location';
import { calculateDistance, isPointInPolygon, calculatePolygonCentroid } from '../utils/geoUtils';

/**
 * In-memory store — used only for tests and standalone usage.
 * Server code should use the Prisma-backed geoFenceService instead.
 */
const geoFences: Map<string, GeoFence> = new Map();

/**
 * Create a new geo-fence (in-memory only — use server DB service for persistence)
 */
export function createGeoFence(
  name: string,
  polygon: GeoJSONPolygon,
  description?: string
): GeoFence {
  const fence: GeoFence = {
    id: `fence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    geometry: polygon,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  geoFences.set(fence.id, fence);
  return fence;
}

/**
 * Get a geo-fence by ID (in-memory)
 */
export function getGeoFence(id: string): GeoFence | undefined {
  return geoFences.get(id);
}

/**
 * Get all geo-fences (in-memory)
 */
export function getAllGeoFences(): GeoFence[] {
  return Array.from(geoFences.values());
}

/**
 * Update a geo-fence (in-memory)
 */
export function updateGeoFence(
  id: string,
  updates: Partial<Omit<GeoFence, 'id' | 'createdAt'>>
): GeoFence | undefined {
  const fence = geoFences.get(id);
  if (!fence) return undefined;

  const updated: GeoFence = {
    ...fence,
    ...updates,
    updatedAt: new Date(),
  };

  geoFences.set(id, updated);
  return updated;
}

/**
 * Delete a geo-fence (in-memory)
 */
export function deleteGeoFence(id: string): boolean {
  return geoFences.delete(id);
}

/**
 * Check if a point is inside a geo-fence
 */
export function checkGeoFence(point: GeoCoordinates, fenceId: string): GeoFenceCheckResult {
  const fence = geoFences.get(fenceId);
  if (!fence) {
    return { inside: false };
  }

  return checkPointAgainstFence(point, fence);
}

/**
 * Stateless: check a point against a given fence geometry.
 * Server code should prefer this over the in-memory checkGeoFence.
 */
export function checkPointAgainstFence(
  point: GeoCoordinates,
  fence: GeoFence
): GeoFenceCheckResult {
  const inside = isPointInPolygon(point, fence.geometry);

  if (inside) {
    return {
      inside: true,
      distanceMeters: 0,
    };
  }

  // Calculate distance to nearest point on polygon boundary
  const centroid = calculatePolygonCentroid(fence.geometry);
  const { distanceMeters } = calculateDistance(point, centroid);

  return {
    inside: false,
    distanceMeters,
    nearestPoint: centroid,
  };
}

/**
 * Check point against multiple geo-fences
 * Returns array of fence IDs the point is inside
 */
export function checkMultipleGeoFences(point: GeoCoordinates, fenceIds: string[]): string[] {
  return fenceIds.filter(id => {
    const result = checkGeoFence(point, id);
    return result.inside;
  });
}

/**
 * Find all geo-fences containing a point (in-memory)
 */
export function findContainingGeoFences(point: GeoCoordinates): GeoFence[] {
  return Array.from(geoFences.values()).filter(fence => isPointInPolygon(point, fence.geometry));
}

/**
 * Stateless: find which fences from a given list contain the point.
 */
export function findContainingFromList(point: GeoCoordinates, fences: GeoFence[]): GeoFence[] {
  return fences.filter(fence => isPointInPolygon(point, fence.geometry));
}

/**
 * Create a circular geo-fence (approximated as polygon)
 */
export function createCircularGeoFence(
  name: string,
  center: GeoCoordinates,
  radiusMeters: number,
  description?: string,
  segments: number = 32
): GeoFence {
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    // Approximate: 1 degree latitude ≈ 111km
    const latOffset = (Math.cos(angle) * radiusMeters) / 111000;
    // Approximate: 1 degree longitude varies by latitude
    const lngOffset =
      (Math.sin(angle) * radiusMeters) / (111000 * Math.cos((center.latitude * Math.PI) / 180));

    coordinates.push([center.longitude + lngOffset, center.latitude + latOffset]);
  }

  // Close the polygon
  coordinates.push(coordinates[0]);

  const polygon: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: [coordinates],
  };

  return createGeoFence(name, polygon, description);
}

/**
 * Create a rectangular geo-fence
 */
export function createRectangularGeoFence(
  name: string,
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
  description?: string
): GeoFence {
  const coordinates: [number, number][] = [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
    [bounds.minLng, bounds.maxLat],
    [bounds.minLng, bounds.minLat], // Close the polygon
  ];

  const polygon: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: [coordinates],
  };

  return createGeoFence(name, polygon, description);
}

/**
 * Get geo-fences within a distance from a point (in-memory)
 */
export function getGeoFencesWithinDistance(
  point: GeoCoordinates,
  maxDistanceKm: number
): Array<{ fence: GeoFence; distanceKm: number }> {
  const results: Array<{ fence: GeoFence; distanceKm: number }> = [];

  geoFences.forEach(fence => {
    const centroid = calculatePolygonCentroid(fence.geometry);
    const { distanceKm } = calculateDistance(point, centroid);

    if (distanceKm <= maxDistanceKm) {
      results.push({ fence, distanceKm });
    }
  });

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Stateless: filter a list of fences by distance from a point.
 */
export function filterFencesWithinDistance(
  point: GeoCoordinates,
  fences: GeoFence[],
  maxDistanceKm: number
): Array<{ fence: GeoFence; distanceKm: number }> {
  const results: Array<{ fence: GeoFence; distanceKm: number }> = [];

  for (const fence of fences) {
    const centroid = calculatePolygonCentroid(fence.geometry);
    const { distanceKm } = calculateDistance(point, centroid);

    if (distanceKm <= maxDistanceKm) {
      results.push({ fence, distanceKm });
    }
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Validate geo-fence polygon
 */
export function validateGeoFencePolygon(polygon: GeoJSONPolygon): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!polygon.coordinates || polygon.coordinates.length === 0) {
    errors.push('Polygon must have coordinates');
    return { valid: false, errors };
  }

  const outerRing = polygon.coordinates[0];

  if (outerRing.length < 4) {
    errors.push('Polygon must have at least 4 points (including closing point)');
  }

  // Check if polygon is closed
  const first = outerRing[0];
  const last = outerRing[outerRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    errors.push('Polygon ring must be closed (first and last points must match)');
  }

  // Check coordinate validity
  for (const coord of outerRing) {
    const [lng, lat] = coord;
    if (lat < -90 || lat > 90) {
      errors.push(`Invalid latitude: ${lat}`);
    }
    if (lng < -180 || lng > 180) {
      errors.push(`Invalid longitude: ${lng}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if two edges intersect. Returns intersection point or null.
 * Edge: from (ax1,ay1) to (ax2,ay2) and from (bx1,by1) to (bx2,by2)
 */
function edgeIntersection(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number
): [number, number] | null {
  const d = (ax2 - ax1) * (by2 - by1) - (ay2 - ay1) * (bx2 - bx1);
  if (Math.abs(d) < 1e-12) return null; // parallel

  const t = ((bx1 - ax1) * (by2 - by1) - (by1 - ay1) * (bx2 - bx1)) / d;
  const u = ((bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1)) / d;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [ax1 + t * (ax2 - ax1), ay1 + t * (ay2 - ay1)];
  }
  return null;
}

/**
 * Check if two geo-fence polygons intersect (have overlapping area).
 * Uses edge intersection + point-in-polygon checks.
 */
export function doFencesIntersect(fence1: GeoFence, fence2: GeoFence): boolean {
  const ring1 = fence1.geometry.coordinates[0];
  const ring2 = fence2.geometry.coordinates[0];

  // Check if any edge of ring1 intersects any edge of ring2
  for (let i = 0; i < ring1.length - 1; i++) {
    for (let j = 0; j < ring2.length - 1; j++) {
      const hit = edgeIntersection(
        ring1[i][0],
        ring1[i][1],
        ring1[i + 1][0],
        ring1[i + 1][1],
        ring2[j][0],
        ring2[j][1],
        ring2[j + 1][0],
        ring2[j + 1][1]
      );
      if (hit) return true;
    }
  }

  // Check if one polygon is entirely inside the other
  // Test first non-closing point of ring1 against ring2
  const testPoint: GeoCoordinates = { latitude: ring1[0][1], longitude: ring1[0][0] };
  if (isPointInPolygon(testPoint, fence2.geometry)) return true;

  // Test first non-closing point of ring2 against ring1
  const testPoint2: GeoCoordinates = { latitude: ring2[0][1], longitude: ring2[0][0] };
  if (isPointInPolygon(testPoint2, fence1.geometry)) return true;

  return false;
}

/**
 * Find all intersecting pairs from a list of geo-fences.
 */
export function findIntersectingFences(fences: GeoFence[]): Array<[GeoFence, GeoFence]> {
  const pairs: Array<[GeoFence, GeoFence]> = [];

  for (let i = 0; i < fences.length; i++) {
    for (let j = i + 1; j < fences.length; j++) {
      if (doFencesIntersect(fences[i], fences[j])) {
        pairs.push([fences[i], fences[j]]);
      }
    }
  }

  return pairs;
}

/**
 * Find all geo-fences that intersect with a given fence (in-memory).
 */
export function findIntersectingWith(fence: GeoFence): GeoFence[] {
  return Array.from(geoFences.values()).filter(
    other => other.id !== fence.id && doFencesIntersect(fence, other)
  );
}

/**
 * Stateless: find all fences from a list that intersect with a given fence.
 */
export function findIntersectingFromList(fence: GeoFence, fences: GeoFence[]): GeoFence[] {
  return fences.filter(other => other.id !== fence.id && doFencesIntersect(fence, other));
}
