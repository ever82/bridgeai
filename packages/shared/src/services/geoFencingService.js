"use strict";
/**
 * Geo-fencing Service
 * 地理围栏服务 - 纯函数计算层
 *
 * Persistence is handled by the server-side geoFenceService (Prisma-backed).
 * This module provides stateless geo computation utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeoFence = createGeoFence;
exports.getGeoFence = getGeoFence;
exports.getAllGeoFences = getAllGeoFences;
exports.updateGeoFence = updateGeoFence;
exports.deleteGeoFence = deleteGeoFence;
exports.checkGeoFence = checkGeoFence;
exports.checkPointAgainstFence = checkPointAgainstFence;
exports.checkMultipleGeoFences = checkMultipleGeoFences;
exports.findContainingGeoFences = findContainingGeoFences;
exports.findContainingFromList = findContainingFromList;
exports.createCircularGeoFence = createCircularGeoFence;
exports.createRectangularGeoFence = createRectangularGeoFence;
exports.getGeoFencesWithinDistance = getGeoFencesWithinDistance;
exports.filterFencesWithinDistance = filterFencesWithinDistance;
exports.validateGeoFencePolygon = validateGeoFencePolygon;
exports.doFencesIntersect = doFencesIntersect;
exports.findIntersectingFences = findIntersectingFences;
exports.findIntersectingWith = findIntersectingWith;
exports.findIntersectingFromList = findIntersectingFromList;
const geoUtils_1 = require("../utils/geoUtils");
/**
 * In-memory store — used only for tests and standalone usage.
 * Server code should use the Prisma-backed geoFenceService instead.
 */
const geoFences = new Map();
/**
 * Create a new geo-fence (in-memory only — use server DB service for persistence)
 */
function createGeoFence(name, polygon, description) {
    const fence = {
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
function getGeoFence(id) {
    return geoFences.get(id);
}
/**
 * Get all geo-fences (in-memory)
 */
function getAllGeoFences() {
    return Array.from(geoFences.values());
}
/**
 * Update a geo-fence (in-memory)
 */
function updateGeoFence(id, updates) {
    const fence = geoFences.get(id);
    if (!fence)
        return undefined;
    const updated = {
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
function deleteGeoFence(id) {
    return geoFences.delete(id);
}
/**
 * Check if a point is inside a geo-fence
 */
function checkGeoFence(point, fenceId) {
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
function checkPointAgainstFence(point, fence) {
    const inside = (0, geoUtils_1.isPointInPolygon)(point, fence.geometry);
    if (inside) {
        return {
            inside: true,
            distanceMeters: 0,
        };
    }
    // Calculate distance to nearest point on polygon boundary
    const centroid = (0, geoUtils_1.calculatePolygonCentroid)(fence.geometry);
    const { distanceMeters } = (0, geoUtils_1.calculateDistance)(point, centroid);
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
function checkMultipleGeoFences(point, fenceIds) {
    return fenceIds.filter(id => {
        const result = checkGeoFence(point, id);
        return result.inside;
    });
}
/**
 * Find all geo-fences containing a point (in-memory)
 */
function findContainingGeoFences(point) {
    return Array.from(geoFences.values()).filter(fence => (0, geoUtils_1.isPointInPolygon)(point, fence.geometry));
}
/**
 * Stateless: find which fences from a given list contain the point.
 */
function findContainingFromList(point, fences) {
    return fences.filter(fence => (0, geoUtils_1.isPointInPolygon)(point, fence.geometry));
}
/**
 * Create a circular geo-fence (approximated as polygon)
 */
function createCircularGeoFence(name, center, radiusMeters, description, segments = 32) {
    const coordinates = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        // Approximate: 1 degree latitude ≈ 111km
        const latOffset = (Math.cos(angle) * radiusMeters) / 111000;
        // Approximate: 1 degree longitude varies by latitude
        const lngOffset = (Math.sin(angle) * radiusMeters) / (111000 * Math.cos((center.latitude * Math.PI) / 180));
        coordinates.push([center.longitude + lngOffset, center.latitude + latOffset]);
    }
    // Close the polygon
    coordinates.push(coordinates[0]);
    const polygon = {
        type: 'Polygon',
        coordinates: [coordinates],
    };
    return createGeoFence(name, polygon, description);
}
/**
 * Create a rectangular geo-fence
 */
function createRectangularGeoFence(name, bounds, description) {
    const coordinates = [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
        [bounds.minLng, bounds.maxLat],
        [bounds.minLng, bounds.minLat], // Close the polygon
    ];
    const polygon = {
        type: 'Polygon',
        coordinates: [coordinates],
    };
    return createGeoFence(name, polygon, description);
}
/**
 * Get geo-fences within a distance from a point (in-memory)
 */
function getGeoFencesWithinDistance(point, maxDistanceKm) {
    const results = [];
    geoFences.forEach(fence => {
        const centroid = (0, geoUtils_1.calculatePolygonCentroid)(fence.geometry);
        const { distanceKm } = (0, geoUtils_1.calculateDistance)(point, centroid);
        if (distanceKm <= maxDistanceKm) {
            results.push({ fence, distanceKm });
        }
    });
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
/**
 * Stateless: filter a list of fences by distance from a point.
 */
function filterFencesWithinDistance(point, fences, maxDistanceKm) {
    const results = [];
    for (const fence of fences) {
        const centroid = (0, geoUtils_1.calculatePolygonCentroid)(fence.geometry);
        const { distanceKm } = (0, geoUtils_1.calculateDistance)(point, centroid);
        if (distanceKm <= maxDistanceKm) {
            results.push({ fence, distanceKm });
        }
    }
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
/**
 * Validate geo-fence polygon
 */
function validateGeoFencePolygon(polygon) {
    const errors = [];
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
function edgeIntersection(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
    const d = (ax2 - ax1) * (by2 - by1) - (ay2 - ay1) * (bx2 - bx1);
    if (Math.abs(d) < 1e-12)
        return null; // parallel
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
function doFencesIntersect(fence1, fence2) {
    const ring1 = fence1.geometry.coordinates[0];
    const ring2 = fence2.geometry.coordinates[0];
    // Check if any edge of ring1 intersects any edge of ring2
    for (let i = 0; i < ring1.length - 1; i++) {
        for (let j = 0; j < ring2.length - 1; j++) {
            const hit = edgeIntersection(ring1[i][0], ring1[i][1], ring1[i + 1][0], ring1[i + 1][1], ring2[j][0], ring2[j][1], ring2[j + 1][0], ring2[j + 1][1]);
            if (hit)
                return true;
        }
    }
    // Check if one polygon is entirely inside the other
    // Test first non-closing point of ring1 against ring2
    const testPoint = { latitude: ring1[0][1], longitude: ring1[0][0] };
    if ((0, geoUtils_1.isPointInPolygon)(testPoint, fence2.geometry))
        return true;
    // Test first non-closing point of ring2 against ring1
    const testPoint2 = { latitude: ring2[0][1], longitude: ring2[0][0] };
    if ((0, geoUtils_1.isPointInPolygon)(testPoint2, fence1.geometry))
        return true;
    return false;
}
/**
 * Find all intersecting pairs from a list of geo-fences.
 */
function findIntersectingFences(fences) {
    const pairs = [];
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
function findIntersectingWith(fence) {
    return Array.from(geoFences.values()).filter(other => other.id !== fence.id && doFencesIntersect(fence, other));
}
/**
 * Stateless: find all fences from a list that intersect with a given fence.
 */
function findIntersectingFromList(fence, fences) {
    return fences.filter(other => other.id !== fence.id && doFencesIntersect(fence, other));
}
//# sourceMappingURL=geoFencingService.js.map