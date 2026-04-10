/**
 * Geo-fencing Service
 * 地理围栏服务
 */

import {
  GeoFence,
  GeoFenceCheckResult,
  GeoCoordinates,
  GeoJSONPolygon,
  DistanceFilter,
} from '../types/location';
import {
  calculateDistance,
  isPointInPolygon,
  calculatePolygonCentroid,
  toGeoJSONPoint,
} from '../utils/geoUtils';

// In-memory store for geo-fences (in production, use database)
const geoFences: Map<string, GeoFence> = new Map();

/**
 * Create a new geo-fence
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
 * Get a geo-fence by ID
 */
export function getGeoFence(id: string): GeoFence | undefined {
  return geoFences.get(id);
}

/**
 * Get all geo-fences
 */
export function getAllGeoFences(): GeoFence[] {
  return Array.from(geoFences.values());
}

/**
 * Update a geo-fence
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
 * Delete a geo-fence
 */
export function deleteGeoFence(id: string): boolean {
  return geoFences.delete(id);
}

/**
 * Check if a point is inside a geo-fence
 */
export function checkGeoFence(
  point: GeoCoordinates,
  fenceId: string
): GeoFenceCheckResult {
  const fence = geoFences.get(fenceId);
  if (!fence) {
    return { inside: false };
  }

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
export function checkMultipleGeoFences(
  point: GeoCoordinates,
  fenceIds: string[]
): string[] {
  return fenceIds.filter(id => {
    const result = checkGeoFence(point, id);
    return result.inside;
  });
}

/**
 * Find all geo-fences containing a point
 */
export function findContainingGeoFences(point: GeoCoordinates): GeoFence[] {
  return Array.from(geoFences.values()).filter(fence =>
    isPointInPolygon(point, fence.geometry)
  );
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
    const latOffset =
      (Math.cos(angle) * radiusMeters) / 111000;
    // Approximate: 1 degree longitude varies by latitude
    const lngOffset =
      (Math.sin(angle) * radiusMeters) /
      (111000 * Math.cos((center.latitude * Math.PI) / 180));

    coordinates.push([
      center.longitude + lngOffset,
      center.latitude + latOffset,
    ]);
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
 * Get geo-fences within a distance from a point
 */
export function getGeoFencesWithinDistance(
  point: GeoCoordinates,
  maxDistanceKm: number
): Array<{ fence: GeoFence; distanceKm: number }> {
  const results: Array<{ fence: GeoFence; distanceKm: number }> = [];

  for (const fence of geoFences.values()) {
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
export function validateGeoFencePolygon(
  polygon: GeoJSONPolygon
): { valid: boolean; errors: string[] } {
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
