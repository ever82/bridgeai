/**
 * Location Types and GeoJSON Support
 * 地理位置类型定义和 GeoJSON 支持
 */

// ============================================
// Basic Location Types
// ============================================

export interface Location {
  province: string;           // 省份代码
  provinceName: string;       // 省份名称
  city: string;               // 城市代码
  cityName: string;           // 城市名称
  district?: string;          // 区县代码（可选）
  districtName?: string;      // 区县名称（可选）
  address?: string;           // 详细地址
  postalCode?: string;        // 邮政编码
}

export interface GeoCoordinates {
  latitude: number;           // 纬度 (-90 to 90)
  longitude: number;          // 经度 (-180 to 180)
  accuracy?: number;          // 精度（米）
  altitude?: number;          // 海拔（米）
}

export interface LocationWithCoordinates extends Location {
  coordinates: GeoCoordinates;
}

// ============================================
// GeoJSON Types
// ============================================

export type GeoJSONType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'GeometryCollection'
  | 'Feature'
  | 'FeatureCollection';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>;
}

export interface GeoJSONFeature<T = GeoJSONGeometry> {
  type: 'Feature';
  geometry: T;
  properties?: Record<string, any>;
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon;

// ============================================
// Administrative Division Codes
// ============================================

export interface Province {
  code: string;               // 省份代码 (如: 110000)
  name: string;               // 省份名称
  nameEn?: string;            // 英文名称
  shortName?: string;         // 简称
}

export interface City {
  code: string;               // 城市代码 (如: 110100)
  name: string;               // 城市名称
  provinceCode: string;       // 所属省份代码
  nameEn?: string;
}

export interface District {
  code: string;               // 区县代码 (如: 110101)
  name: string;               // 区县名称
  cityCode: string;           // 所属城市代码
  provinceCode: string;       // 所属省份代码
}

// ============================================
// Distance and Radius Types
// ============================================

export interface DistanceFilter {
  center: GeoCoordinates;     // 中心点
  radiusKm: number;           // 半径（公里）
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ============================================
// Geo-fencing Types
// ============================================

export interface GeoFence {
  id: string;
  name: string;
  description?: string;
  geometry: GeoJSONPolygon;   // 多边形边界
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoFenceCheckResult {
  inside: boolean;            // 是否在围栏内
  distanceMeters?: number;     // 距离边界（米）
  nearestPoint?: GeoCoordinates;
}

// ============================================
// Location Filter Types
// ============================================

export interface LocationFilter {
  province?: string;          // 按省份筛选
  city?: string;              // 按城市筛选
  district?: string;          // 按区县筛选
  withinRadius?: DistanceFilter;
  withinBounds?: BoundingBox;
  withinFence?: string;       // 围栏ID
}

export interface LocationSearchRequest {
  query?: string;             // 地址搜索关键词
  filter?: LocationFilter;
  page?: number;
  limit?: number;
}

export interface LocationSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Address Parsing Types
// ============================================

export interface ParsedAddress {
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string;
  room?: string;
  confidence: number;         // 解析置信度
}

// ============================================
// Constants
// ============================================

export const EARTH_RADIUS_KM = 6371; // 地球半径（公里）

export const LOCATION_LEVELS = {
  PROVINCE: 1,
  CITY: 2,
  DISTRICT: 3,
} as const;

// ============================================
// Utility Types
// ============================================

export interface LocationValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DistanceResult {
  distanceKm: number;
  distanceMiles: number;
  distanceMeters: number;
}
