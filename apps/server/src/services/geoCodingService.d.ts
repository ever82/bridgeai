/**
 * Geocoding Service
 * 地址编码服务 - 地址与坐标相互转换
 *
 * Uses development fallback data from locationData.ts.
 * For production, integrate 高德/百度地图 API.
 */
import { GeoCoordinates, Location } from '@bridgeai/shared';
export interface GeocodingResult {
    success: boolean;
    coordinates?: GeoCoordinates;
    location?: Location;
    address?: string;
    confidence: number;
    error?: string;
}
export interface ReverseGeocodingResult {
    success: boolean;
    address?: string;
    location?: Location;
    coordinates?: GeoCoordinates;
    confidence: number;
    error?: string;
}
export interface AddressSuggestion {
    address: string;
    location: Location;
    coordinates: GeoCoordinates;
    confidence: number;
}
/**
 * Convert address to coordinates (geocoding)
 * 地址转坐标
 */
export declare function geocode(address: string): Promise<GeocodingResult>;
/**
 * Convert coordinates to address (reverse geocoding)
 * 坐标转地址
 */
export declare function reverseGeocode(coordinates: GeoCoordinates): Promise<ReverseGeocodingResult>;
/**
 * Search addresses by keyword
 * 地址搜索联想
 */
export declare function searchAddresses(query: string, limit?: number): Promise<AddressSuggestion[]>;
/**
 * Validate coordinates
 */
export declare function isValidCoordinatePair(latitude: number, longitude: number): boolean;
/**
 * Get distance between two addresses
 */
export declare function getDistanceBetweenAddresses(address1: string, address2: string): Promise<number | null>;
//# sourceMappingURL=geoCodingService.d.ts.map