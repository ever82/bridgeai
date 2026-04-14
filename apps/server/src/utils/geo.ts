/**
 * Geo Utilities - Server-side re-export
 * 地理计算工具函数
 */

export {
  calculateDistance,
  isWithinRadius,
  isValidCoordinates,
  createBoundingBox,
  isWithinBoundingBox,
  isPointInPolygon,
  calculatePolygonCentroid,
  calculatePolygonArea,
  toGeoJSONPoint,
  fromGeoJSONPoint,
  getDirection,
  formatDistance,
  interpolateCoordinates,
  toRadians,
  toDegrees,
} from '@visionshare/shared';

export type {
  GeoCoordinates,
  DistanceResult,
  BoundingBox,
  GeoJSONPoint,
  GeoJSONPolygon,
} from '@visionshare/shared';
