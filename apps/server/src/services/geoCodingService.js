/**
 * Geocoding Service
 * 地址编码服务 - 地址与坐标相互转换
 *
 * Uses development fallback data from locationData.ts.
 * For production, integrate 高德/百度地图 API.
 */
import { logger } from '../utils/logger';
import { ADDRESS_DATABASE } from '../data/locationData';
/**
 * Convert address to coordinates (geocoding)
 * 地址转坐标
 */
export async function geocode(address) {
    try {
        logger.info('Geocoding address', { address });
        // Exact match in address database
        const exact = ADDRESS_DATABASE.find(item => item.address === address || item.address.includes(address));
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
        const partial = ADDRESS_DATABASE.find(item => address.includes(item.address) || item.address.includes(address));
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
    }
    catch (error) {
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
export async function reverseGeocode(coordinates) {
    try {
        logger.info('Reverse geocoding coordinates', { coordinates });
        // Find nearest location in address database
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
    }
    catch (error) {
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
export async function searchAddresses(query, limit = 10) {
    try {
        logger.info('Searching addresses', { query });
        if (!query || query.length < 2) {
            return [];
        }
        const lowerQuery = query.toLowerCase();
        const results = [];
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
        return results.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
    }
    catch (error) {
        logger.error('Address search failed', { error, query });
        return [];
    }
}
/**
 * Validate coordinates
 */
export function isValidCoordinatePair(latitude, longitude) {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
/**
 * Get distance between two addresses
 */
export async function getDistanceBetweenAddresses(address1, address2) {
    try {
        const [result1, result2] = await Promise.all([geocode(address1), geocode(address2)]);
        if (!result1.success || !result2.success) {
            return null;
        }
        const lat1Rad = (result1.coordinates.latitude * Math.PI) / 180;
        const lat2Rad = (result2.coordinates.latitude * Math.PI) / 180;
        const dLat = ((result2.coordinates.latitude - result1.coordinates.latitude) * Math.PI) / 180;
        const dLng = ((result2.coordinates.longitude - result1.coordinates.longitude) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // Earth radius in km
        return 6371 * c;
    }
    catch (error) {
        logger.error('Distance calculation failed', { error, address1, address2 });
        return null;
    }
}
//# sourceMappingURL=geoCodingService.js.map