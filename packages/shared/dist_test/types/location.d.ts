/**
 * Location Types and GeoJSON Support
 * 地理位置类型定义和 GeoJSON 支持
 */
export interface Location {
    province: string;
    provinceName: string;
    city: string;
    cityName: string;
    district?: string;
    districtName?: string;
    address?: string;
    postalCode?: string;
}
export interface GeoCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
}
export interface LocationWithCoordinates extends Location {
    coordinates: GeoCoordinates;
}
export type GeoJSONType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection' | 'Feature' | 'FeatureCollection';
export interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number];
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
export interface Province {
    code: string;
    name: string;
    nameEn?: string;
    shortName?: string;
}
export interface City {
    code: string;
    name: string;
    provinceCode: string;
    nameEn?: string;
}
export interface District {
    code: string;
    name: string;
    cityCode: string;
    provinceCode: string;
}
export interface DistanceFilter {
    center: GeoCoordinates;
    radiusKm: number;
}
export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}
export interface GeoFence {
    id: string;
    name: string;
    description?: string;
    geometry: GeoJSONPolygon;
    createdAt: Date;
    updatedAt: Date;
}
export interface GeoFenceCheckResult {
    inside: boolean;
    distanceMeters?: number;
    nearestPoint?: GeoCoordinates;
}
export interface LocationFilter {
    province?: string;
    city?: string;
    district?: string;
    withinRadius?: DistanceFilter;
    withinBounds?: BoundingBox;
    withinFence?: string;
}
export interface LocationSearchRequest {
    query?: string;
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
export interface ParsedAddress {
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    building?: string;
    room?: string;
    confidence: number;
}
export declare const EARTH_RADIUS_KM = 6371;
export declare const LOCATION_LEVELS: {
    readonly PROVINCE: 1;
    readonly CITY: 2;
    readonly DISTRICT: 3;
};
export interface LocationValidationResult {
    valid: boolean;
    errors: string[];
}
export interface DistanceResult {
    distanceKm: number;
    distanceMiles: number;
    distanceMeters: number;
}
//# sourceMappingURL=location.d.ts.map