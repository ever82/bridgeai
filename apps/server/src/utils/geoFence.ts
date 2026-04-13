/**
 * Geo-fence Utilities - Server-side
 * 地理围栏工具函数
 */

export {
  createGeoFence,
  getGeoFence,
  getAllGeoFences,
  updateGeoFence,
  deleteGeoFence,
  checkGeoFence,
  checkMultipleGeoFences,
  findContainingGeoFences,
  createCircularGeoFence,
  createRectangularGeoFence,
  getGeoFencesWithinDistance,
  validateGeoFencePolygon,
} from '@visionshare/shared';

export type {
  GeoFence,
  GeoFenceCheckResult,
} from '@visionshare/shared';
