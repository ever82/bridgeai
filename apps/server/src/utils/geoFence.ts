/**
 * Geo-fence Utilities - Server-side
 * 地理围栏工具函数
 */

export {
  createGeoFence,
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
} from '@bridgeai/shared';

export type {
  GeoFence,
  GeoFenceCheckResult,
} from '@bridgeai/shared';
