/**
 * Geo Utilities
 * 地理计算工具函数
 */
import { GeoCoordinates, DistanceResult, BoundingBox, GeoJSONPoint, GeoJSONPolygon } from '../types/location';
/**
 * Convert degrees to radians
 */
export declare function toRadians(degrees: number): number;
/**
 * Convert radians to degrees
 */
export declare function toDegrees(radians: number): number;
/**
 * Calculate distance between two coordinates using Haversine formula
 * 使用 Haversine 公式计算两点间距离
 */
export declare function calculateDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): DistanceResult;
/**
 * Check if a point is within a given radius
 */
export declare function isWithinRadius(point: GeoCoordinates, center: GeoCoordinates, radiusKm: number): boolean;
/**
 * Check if coordinates are valid
 */
export declare function isValidCoordinates(coords: GeoCoordinates): boolean;
/**
 * Create a bounding box from center point and radius
 */
export declare function createBoundingBox(center: GeoCoordinates, radiusKm: number): BoundingBox;
/**
 * Check if a point is within a bounding box
 */
export declare function isWithinBoundingBox(point: GeoCoordinates, box: BoundingBox): boolean;
/**
 * Check if a point is inside a polygon using ray casting algorithm
 * 使用射线投射算法判断点是否在多边形内
 */
export declare function isPointInPolygon(point: GeoCoordinates, polygon: GeoJSONPolygon): boolean;
/**
 * Calculate the centroid of a polygon
 */
export declare function calculatePolygonCentroid(polygon: GeoJSONPolygon): GeoCoordinates;
/**
 * Calculate the area of a polygon (approximate, in square km)
 */
export declare function calculatePolygonArea(polygon: GeoJSONPolygon): number;
/**
 * Convert GeoCoordinates to GeoJSON Point
 */
export declare function toGeoJSONPoint(coords: GeoCoordinates): GeoJSONPoint;
/**
 * Convert GeoJSON Point to GeoCoordinates
 */
export declare function fromGeoJSONPoint(point: GeoJSONPoint): GeoCoordinates;
/**
 * Get cardinal direction between two points
 */
export declare function getDirection(from: GeoCoordinates, to: GeoCoordinates): string;
/**
 * Format distance for display
 */
export declare function formatDistance(distanceMeters: number): string;
/**
 * Interpolate between two coordinates
 */
export declare function interpolateCoordinates(coord1: GeoCoordinates, coord2: GeoCoordinates, fraction: number): GeoCoordinates;
//# sourceMappingURL=geoUtils.d.ts.map