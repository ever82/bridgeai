/**
 * Geocoding Service
 * 地址编码服务 - 地址与坐标相互转换
 */

import { GeoCoordinates, Location } from '@bridgeai/shared';
import { logger } from '../utils/logger';

// Mock address database - in production, use real map API (高德/百度)
const ADDRESS_DATABASE: Array<{
  address: string;
  location: Location;
  coordinates: GeoCoordinates;
}> = [
  {
    address: '北京市朝阳区建国路',
    location: {
      province: '110000',
      provinceName: '北京市',
      city: '110100',
      cityName: '北京市',
      district: '110105',
      districtName: '朝阳区',
      address: '建国路',
    },
    coordinates: { latitude: 39.9088, longitude: 116.3975 },
  },
  {
    address: '上海市浦东新区陆家嘴',
    location: {
      province: '310000',
      provinceName: '上海市',
      city: '310100',
      cityName: '上海市',
      district: '310115',
      districtName: '浦东新区',
      address: '陆家嘴',
    },
    coordinates: { latitude: 31.2304, longitude: 121.4737 },
  },
  {
    address: '广州市天河区珠江新城',
    location: {
      province: '440000',
      provinceName: '广东省',
      city: '440100',
      cityName: '广州市',
      district: '440106',
      districtName: '天河区',
      address: '珠江新城',
    },
    coordinates: { latitude: 23.1196, longitude: 113.3223 },
  },
  {
    address: '深圳市南山区科技园',
    location: {
      province: '440000',
      provinceName: '广东省',
      city: '440300',
      cityName: '深圳市',
      district: '440305',
      districtName: '南山区',
      address: '科技园',
    },
    coordinates: { latitude: 22.5312, longitude: 113.9288 },
  },
  {
    address: '杭州市西湖区武林广场',
    location: {
      province: '330000',
      provinceName: '浙江省',
      city: '330100',
      cityName: '杭州市',
      district: '330102',
      districtName: '西湖区',
      address: '武林广场',
    },
    coordinates: { latitude: 30.2489, longitude: 120.1655 },
  },
];

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
export async function geocode(
  address: string
): Promise<GeocodingResult> {
  try {
    logger.info('Geocoding address', { address });

    // Exact match in mock database
    const exact = ADDRESS_DATABASE.find(
      item => item.address === address || item.address.includes(address)
    );

    if (exact) {
      return {
        success: true,
        coordinates: exact.coordinates,
        location: exact.location,
        address: exact.address,
        confidence: 1.0,
      };
    }

    // Partial match
    const partial = ADDRESS_DATABASE.find(item =>
      address.includes(item.address) || item.address.includes(address)
    );

    if (partial) {
      return {
        success: true,
        coordinates: partial.coordinates,
        location: partial.location,
        address: partial.address,
        confidence: 0.7,
      };
    }

    return {
      success: false,
      confidence: 0,
      error: 'Address not found',
    };
  } catch (error) {
    logger.error('Geocoding failed', { error, address });
    return {
      success: false,
      confidence: 0,
      error: 'Geocoding service error',
    };
  }
}

/**
 * Convert coordinates to address (reverse geocoding)
 * 坐标转地址
 */
export async function reverseGeocode(
  coordinates: GeoCoordinates
): Promise<ReverseGeocodingResult> {
  try {
    logger.info('Reverse geocoding coordinates', { coordinates });

    // Find nearest location in mock database
    let nearest = ADDRESS_DATABASE[0];
    let minDistance = Number.MAX_VALUE;

    for (const item of ADDRESS_DATABASE) {
      const dx = item.coordinates.latitude - coordinates.latitude;
      const dy = item.coordinates.longitude - coordinates.longitude;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = item;
      }
    }

    // Calculate confidence based on distance (rough approximation)
    const confidence = Math.max(0, 1 - minDistance * 10);

    return {
      success: true,
      coordinates: nearest.coordinates,
      location: nearest.location,
      address: nearest.address,
      confidence: Math.min(1, confidence),
    };
  } catch (error) {
    logger.error('Reverse geocoding failed', { error, coordinates });
    return {
      success: false,
      confidence: 0,
      error: 'Reverse geocoding service error',
    };
  }
}

/**
 * Search addresses by keyword
 * 地址搜索联想
 */
export async function searchAddresses(
  query: string,
  limit: number = 10
): Promise<AddressSuggestion[]> {
  try {
    logger.info('Searching addresses', { query });

    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: AddressSuggestion[] = [];

    for (const item of ADDRESS_DATABASE) {
      const fullAddress = `${item.location.provinceName}${item.location.cityName}${item.location.districtName}${item.address}`;

      if (fullAddress.toLowerCase().includes(lowerQuery)) {
        results.push({
          address: fullAddress,
          location: item.location,
          coordinates: item.coordinates,
          confidence: query.length / fullAddress.length,
        });
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  } catch (error) {
    logger.error('Address search failed', { error, query });
    return [];
  }
}

/**
 * Validate coordinates
 */
export function isValidCoordinatePair(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Get distance between two addresses
 */
export async function getDistanceBetweenAddresses(
  address1: string,
  address2: string
): Promise<number | null> {
  try {
    const [result1, result2] = await Promise.all([
      geocode(address1),
      geocode(address2),
    ]);

    if (!result1.success || !result2.success) {
      return null;
    }

    const lat1Rad = (result1.coordinates!.latitude * Math.PI) / 180;
    const lat2Rad = (result2.coordinates!.latitude * Math.PI) / 180;
    const dLat = ((result2.coordinates!.latitude - result1.coordinates!.latitude) * Math.PI) / 180;
    const dLng = ((result2.coordinates!.longitude - result1.coordinates!.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Earth radius in km
    return 6371 * c;
  } catch (error) {
    logger.error('Distance calculation failed', { error, address1, address2 });
    return null;
  }
}
