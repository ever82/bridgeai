/**
 * Geo-Fence Service (Database-backed)
 * 地理围栏服务 - 基于 Prisma 持久化
 */
import { isPointInPolygon, calculateDistance } from '@bridgeai/shared';
import { prisma } from '../db/client';
/**
 * Create a new geo-fence
 */
export async function createGeoFence(input) {
    return prisma.geoFence.create({
        data: {
            name: input.name,
            description: input.description,
            type: input.type || 'POLYGON',
            coordinates: input.coordinates,
            centerLat: input.centerLat,
            centerLng: input.centerLng,
            radiusMeters: input.radiusMeters,
            color: input.color,
            createdBy: input.createdBy,
            metadata: (input.metadata || {}),
        },
    });
}
/**
 * Get geo-fence by ID
 */
export async function getGeoFence(id) {
    return prisma.geoFence.findUnique({ where: { id } });
}
/**
 * List all geo-fences (optionally filtered by creator)
 */
export async function listGeoFences(options) {
    const where = {};
    if (options?.createdBy)
        where.createdBy = options.createdBy;
    if (options?.activeOnly)
        where.isActive = true;
    return prisma.geoFence.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Update geo-fence
 */
export async function updateGeoFence(id, input) {
    const data = {};
    if (input.name !== undefined)
        data.name = input.name;
    if (input.description !== undefined)
        data.description = input.description;
    if (input.coordinates !== undefined)
        data.coordinates = input.coordinates;
    if (input.centerLat !== undefined)
        data.centerLat = input.centerLat;
    if (input.centerLng !== undefined)
        data.centerLng = input.centerLng;
    if (input.radiusMeters !== undefined)
        data.radiusMeters = input.radiusMeters;
    if (input.color !== undefined)
        data.color = input.color;
    if (input.isActive !== undefined)
        data.isActive = input.isActive;
    if (input.metadata !== undefined)
        data.metadata = input.metadata;
    return prisma.geoFence.update({ where: { id }, data });
}
/**
 * Delete geo-fence
 */
export async function deleteGeoFence(id) {
    return prisma.geoFence.delete({ where: { id } });
}
/**
 * Check if a point is inside a geo-fence
 */
export async function checkPointInFence(point, fenceId) {
    const fence = await prisma.geoFence.findUnique({ where: { id: fenceId } });
    if (!fence || !fence.isActive) {
        return { inside: false };
    }
    // Circle fence: use distance calculation
    if (fence.type === 'CIRCLE' && fence.centerLat && fence.centerLng && fence.radiusMeters) {
        const center = { latitude: fence.centerLat, longitude: fence.centerLng };
        const { distanceMeters } = calculateDistance(point, center);
        const distM = distanceMeters || calculateDistance(point, center).distanceKm * 1000;
        const inside = distM <= fence.radiusMeters;
        return {
            inside,
            distanceMeters: inside ? 0 : Math.round(distM - fence.radiusMeters),
        };
    }
    // Polygon/Rectangle fence: use point-in-polygon
    const coords = fence.coordinates;
    if (!coords || coords.length === 0 || coords[0].length < 3) {
        return { inside: false };
    }
    const polygon = {
        type: 'Polygon',
        coordinates: [coords[0]],
    };
    const inside = isPointInPolygon(point, polygon);
    return { inside };
}
/**
 * Check a point against multiple fences
 */
export async function checkMultipleFences(point, fenceIds) {
    const results = {};
    await Promise.all(fenceIds.map(async (id) => {
        results[id] = await checkPointInFence(point, id);
    }));
    return results;
}
/**
 * Find all fences containing a point
 */
export async function findContainingFences(point) {
    const fences = await prisma.geoFence.findMany({ where: { isActive: true } });
    const containing = [];
    for (const fence of fences) {
        if (fence.type === 'CIRCLE' && fence.centerLat && fence.centerLng && fence.radiusMeters) {
            const center = { latitude: fence.centerLat, longitude: fence.centerLng };
            const distKm = calculateDistance(point, center).distanceKm;
            if (distKm * 1000 <= fence.radiusMeters) {
                containing.push(fence);
            }
        }
        else {
            const coords = fence.coordinates;
            if (coords && coords.length > 0 && coords[0].length >= 3) {
                const polygon = {
                    type: 'Polygon',
                    coordinates: [coords[0]],
                };
                if (isPointInPolygon(point, polygon)) {
                    containing.push(fence);
                }
            }
        }
    }
    return containing;
}
/**
 * Create a circular geo-fence (approximated as polygon)
 */
export async function createCircularFence(name, center, radiusMeters, options) {
    const segments = options?.segments || 32;
    const coordinates = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        const lat = center.latitude + (radiusMeters / 110540) * Math.cos(angle);
        const lng = center.longitude +
            (radiusMeters / (111320 * Math.cos((center.latitude * Math.PI) / 180))) * Math.sin(angle);
        coordinates.push([lng, lat]);
    }
    return createGeoFence({
        name,
        description: options?.description,
        type: 'CIRCLE',
        coordinates: [coordinates],
        centerLat: center.latitude,
        centerLng: center.longitude,
        radiusMeters,
        createdBy: options?.createdBy,
        color: options?.color,
    });
}
//# sourceMappingURL=geoFenceService.js.map