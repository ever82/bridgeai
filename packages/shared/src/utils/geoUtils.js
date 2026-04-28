"use strict";
/**
 * Geo Utilities
 * 地理计算工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRadians = toRadians;
exports.toDegrees = toDegrees;
exports.calculateDistance = calculateDistance;
exports.isWithinRadius = isWithinRadius;
exports.isValidCoordinates = isValidCoordinates;
exports.createBoundingBox = createBoundingBox;
exports.isWithinBoundingBox = isWithinBoundingBox;
exports.isPointInPolygon = isPointInPolygon;
exports.calculatePolygonCentroid = calculatePolygonCentroid;
exports.calculatePolygonArea = calculatePolygonArea;
exports.toGeoJSONPoint = toGeoJSONPoint;
exports.fromGeoJSONPoint = fromGeoJSONPoint;
exports.getDirection = getDirection;
exports.formatDistance = formatDistance;
exports.interpolateCoordinates = interpolateCoordinates;
const location_1 = require("../types/location");
/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
    return (radians * 180) / Math.PI;
}
/**
 * Calculate distance between two coordinates using Haversine formula
 * 使用 Haversine 公式计算两点间距离
 */
function calculateDistance(coord1, coord2) {
    const lat1Rad = toRadians(coord1.latitude);
    const lat2Rad = toRadians(coord2.latitude);
    const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
    const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);
    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) *
            Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = location_1.EARTH_RADIUS_KM * c;
    return {
        distanceKm,
        distanceMiles: distanceKm * 0.621371,
        distanceMeters: distanceKm * 1000,
    };
}
/**
 * Check if a point is within a given radius
 */
function isWithinRadius(point, center, radiusKm) {
    const { distanceKm } = calculateDistance(point, center);
    return distanceKm <= radiusKm;
}
/**
 * Check if coordinates are valid
 */
function isValidCoordinates(coords) {
    return (coords.latitude >= -90 &&
        coords.latitude <= 90 &&
        coords.longitude >= -180 &&
        coords.longitude <= 180);
}
/**
 * Create a bounding box from center point and radius
 */
function createBoundingBox(center, radiusKm) {
    // Approximate degrees per km at equator
    const latDelta = (radiusKm / location_1.EARTH_RADIUS_KM) * (180 / Math.PI);
    const lngDelta = (radiusKm / location_1.EARTH_RADIUS_KM) *
        (180 / Math.PI) /
        Math.cos(toRadians(center.latitude));
    return {
        minLat: center.latitude - latDelta,
        maxLat: center.latitude + latDelta,
        minLng: center.longitude - lngDelta,
        maxLng: center.longitude + lngDelta,
    };
}
/**
 * Check if a point is within a bounding box
 */
function isWithinBoundingBox(point, box) {
    return (point.latitude >= box.minLat &&
        point.latitude <= box.maxLat &&
        point.longitude >= box.minLng &&
        point.longitude <= box.maxLng);
}
/**
 * Check if a point is inside a polygon using ray casting algorithm
 * 使用射线投射算法判断点是否在多边形内
 */
function isPointInPolygon(point, polygon) {
    const coordinates = polygon.coordinates[0]; // Outer ring
    const x = point.longitude;
    const y = point.latitude;
    let inside = false;
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
        const xi = coordinates[i][0];
        const yi = coordinates[i][1];
        const xj = coordinates[j][0];
        const yj = coordinates[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}
/**
 * Calculate the centroid of a polygon
 */
function calculatePolygonCentroid(polygon) {
    const coordinates = polygon.coordinates[0];
    let sumX = 0;
    let sumY = 0;
    for (const coord of coordinates) {
        sumX += coord[0];
        sumY += coord[1];
    }
    return {
        latitude: sumY / coordinates.length,
        longitude: sumX / coordinates.length,
    };
}
/**
 * Calculate the area of a polygon (approximate, in square km)
 */
function calculatePolygonArea(polygon) {
    const coordinates = polygon.coordinates[0];
    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [x1, y1] = coordinates[i];
        const [x2, y2] = coordinates[i + 1];
        area += toRadians(x2 - x1) *
            (2 + Math.sin(toRadians(y1)) + Math.sin(toRadians(y2)));
    }
    const areaKm2 = Math.abs(area * location_1.EARTH_RADIUS_KM * location_1.EARTH_RADIUS_KM / 2);
    return areaKm2;
}
/**
 * Convert GeoCoordinates to GeoJSON Point
 */
function toGeoJSONPoint(coords) {
    return {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude],
    };
}
/**
 * Convert GeoJSON Point to GeoCoordinates
 */
function fromGeoJSONPoint(point) {
    return {
        latitude: point.coordinates[1],
        longitude: point.coordinates[0],
    };
}
/**
 * Get cardinal direction between two points
 */
function getDirection(from, to) {
    const latDiff = to.latitude - from.latitude;
    const lngDiff = to.longitude - from.longitude;
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const angle = Math.atan2(lngDiff, latDiff);
    const index = Math.round((angle * 8) / (2 * Math.PI) + 8) % 8;
    return directions[index];
}
/**
 * Format distance for display
 */
function formatDistance(distanceMeters) {
    if (distanceMeters < 1000) {
        return `${Math.round(distanceMeters)}米`;
    }
    const km = distanceMeters / 1000;
    if (km < 10) {
        return `${km.toFixed(1)}公里`;
    }
    return `${Math.round(km)}公里`;
}
/**
 * Interpolate between two coordinates
 */
function interpolateCoordinates(coord1, coord2, fraction) {
    return {
        latitude: coord1.latitude + (coord2.latitude - coord1.latitude) * fraction,
        longitude: coord1.longitude + (coord2.longitude - coord1.longitude) * fraction,
    };
}
//# sourceMappingURL=geoUtils.js.map