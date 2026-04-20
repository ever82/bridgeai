/**
 * Location Service
 * 移动端位置服务 - GPS 设备定位 + API 集成
 */

import * as ExpoLocation from 'expo-location';
import type { Location } from '@bridgeai/shared';

import { api } from './api/client';

// ============================================
// Type exports from shared
// ============================================
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

export interface LocationOption {
  code: string;
  name: string;
}

export interface Province extends LocationOption {}
export interface City extends LocationOption {}
export interface District extends LocationOption {}

// ============================================
// Permission helpers
// ============================================

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if location permission is granted
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await ExpoLocation.getForegroundPermissionsAsync();
  return status === 'granted';
}

// ============================================
// Device location
// ============================================

/**
 * Get current device location (GPS)
 */
export async function getCurrentLocation(): Promise<GeoCoordinates | null> {
  const hasPermission = await hasLocationPermission();
  if (!hasPermission) {
    const granted = await requestLocationPermission();
    if (!granted) return null;
  }

  try {
    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      altitude: location.coords.altitude ?? undefined,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
}

/**
 * Watch device location changes
 */
export async function watchLocation(
  callback: (location: GeoCoordinates) => void,
  options?: {
    accuracy?: ExpoLocation.Accuracy;
    distanceInterval?: number;
    timeInterval?: number;
  }
): Promise<ExpoLocation.LocationSubscription | null> {
  const hasPermission = await hasLocationPermission();
  if (!hasPermission) {
    const granted = await requestLocationPermission();
    if (!granted) return null;
  }

  return ExpoLocation.watchPositionAsync(
    {
      accuracy: options?.accuracy ?? ExpoLocation.Accuracy.Balanced,
      distanceInterval: options?.distanceInterval ?? 100,
      timeInterval: options?.timeInterval ?? 10000,
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        altitude: location.coords.altitude ?? undefined,
      });
    }
  );
}

// ============================================
// Administrative location (API)
// ============================================

/**
 * Get all provinces from API
 */
export async function getProvinces(): Promise<Province[]> {
  try {
    const response = await api.get<Province[]>('/location/provinces');
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch provinces:', error);
    return [];
  }
}

/**
 * Get cities by province code
 */
export async function getCitiesByProvince(provinceCode: string): Promise<City[]> {
  try {
    const response = await api.get<City[]>(`/location/cities/${provinceCode}`);
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch cities:', error);
    return [];
  }
}

/**
 * Get districts by city code
 */
export async function getDistrictsByCity(cityCode: string): Promise<District[]> {
  try {
    const response = await api.get<District[]>(`/location/districts/${cityCode}`);
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to fetch districts:', error);
    return [];
  }
}

/**
 * Get full location hierarchy
 */
export async function getLocationHierarchy(
  provinceCode?: string,
  cityCode?: string
): Promise<{ provinces: Province[]; cities?: City[]; districts?: District[] }> {
  try {
    const params = new URLSearchParams();
    if (provinceCode) params.set('provinceCode', provinceCode);
    if (cityCode) params.set('cityCode', cityCode);
    const query = params.toString();

    const response = await api.get<{ provinces: Province[]; cities?: City[]; districts?: District[] }>(
      `/location/hierarchy${query ? `?${query}` : ''}`
    );
    return response.data.data ?? { provinces: [] };
  } catch (error) {
    console.error('Failed to fetch location hierarchy:', error);
    return { provinces: [] };
  }
}

/**
 * Search locations by keyword
 */
export async function searchLocations(query: string): Promise<
  Array<{ type: 'province' | 'city' | 'district'; code: string; name: string; fullPath: string }>
> {
  try {
    const response = await api.get<
      Array<{ type: 'province' | 'city' | 'district'; code: string; name: string; fullPath: string }>
    >(`/location/search?q=${encodeURIComponent(query)}`);
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to search locations:', error);
    return [];
  }
}

// ============================================
// Agent location
// ============================================

/**
 * Get agent location data
 */
export async function getAgentLocation(agentId: string): Promise<{
  location?: Location;
  coordinates?: GeoCoordinates;
  lastUpdated?: string;
} | null> {
  try {
    const response = await api.get<{
      location?: Location;
      coordinates?: GeoCoordinates;
      lastUpdated?: string;
    }>(`/location/agents/${agentId}`);
    return response.data.data ?? null;
  } catch (error) {
    console.error('Failed to get agent location:', error);
    return null;
  }
}

/**
 * Update current user's agent location
 */
export async function updateAgentLocation(
  location: Location,
  coordinates?: GeoCoordinates
): Promise<boolean> {
  try {
    await api.post('/location/agents/update', {
      location,
      coordinates,
    });
    return true;
  } catch (error) {
    console.error('Failed to update agent location:', error);
    return false;
  }
}

/**
 * Search agents by location filter
 */
export async function searchAgentsByLocation(filter: {
  province?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}): Promise<{
  agents: Array<{ id: string; name: string; location?: Location; distanceKm?: number }>;
  total: number;
}> {
  try {
    const params = new URLSearchParams();
    if (filter.province) params.set('province', filter.province);
    if (filter.city) params.set('city', filter.city);
    if (filter.district) params.set('district', filter.district);
    if (filter.lat && filter.lng && filter.radius) {
      params.set('lat', String(filter.lat));
      params.set('lng', String(filter.lng));
      params.set('radius', String(filter.radius));
    }
    if (filter.page) params.set('page', String(filter.page));
    if (filter.limit) params.set('limit', String(filter.limit));
    const query = params.toString();

    const response = await api.get<{
      agents: Array<{ id: string; name: string; location?: Location; distanceKm?: number }>;
      total: number;
    }>(`/location/agents${query ? `?${query}` : ''}`);
    return response.data.data ?? { agents: [], total: 0 };
  } catch (error) {
    console.error('Failed to search agents by location:', error);
    return { agents: [], total: 0 };
  }
}

/**
 * Find nearby agents
 */
export async function findNearbyAgents(
  center: GeoCoordinates,
  radiusKm: number,
  options?: { agentType?: string; excludeAgentId?: string }
): Promise<Array<{ id: string; name: string; type: string; distanceKm: number }>> {
  try {
    const params = new URLSearchParams({
      lat: String(center.latitude),
      lng: String(center.longitude),
      radius: String(radiusKm),
    });
    if (options?.agentType) params.set('agentType', options.agentType);
    if (options?.excludeAgentId) params.set('excludeAgentId', options.excludeAgentId);

    const response = await api.get<
      Array<{ id: string; name: string; type: string; distanceKm: number }>
    >(`/location/agents/nearby?${params.toString()}`);
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to find nearby agents:', error);
    return [];
  }
}

// ============================================
// Geocoding
// ============================================

/**
 * Convert address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  coordinates?: GeoCoordinates;
  location?: Location;
  confidence?: number;
} | null> {
  try {
    const response = await api.get<{
      coordinates?: GeoCoordinates;
      location?: Location;
      confidence?: number;
    }>(`/location/geocode?address=${encodeURIComponent(address)}`);
    return response.data.data ?? null;
  } catch (error) {
    console.error('Failed to geocode address:', error);
    return null;
  }
}

/**
 * Convert coordinates to address
 */
export async function reverseGeocode(coordinates: GeoCoordinates): Promise<{
  address?: string;
  location?: Location;
} | null> {
  try {
    const response = await api.get<{
      address?: string;
      location?: Location;
    }>(`/location/reverse-geocode?lat=${coordinates.latitude}&lng=${coordinates.longitude}`);
    return response.data.data ?? null;
  } catch (error) {
    console.error('Failed to reverse geocode:', error);
    return null;
  }
}

/**
 * Search addresses by keyword
 */
export async function searchAddresses(
  query: string,
  limit?: number
): Promise<Array<{ address: string; coordinates?: GeoCoordinates }>> {
  try {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    const response = await api.get<Array<{ address: string; coordinates?: GeoCoordinates }>>(
      `/location/address-search?${params.toString()}`
    );
    return response.data.data ?? [];
  } catch (error) {
    console.error('Failed to search addresses:', error);
    return [];
  }
}

// ============================================
// Geo-fence (client-side check)
// ============================================

/**
 * Calculate distance between two coordinates
 */
export function calculateDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): {
  distanceKm: number;
  distanceMeters: number;
} {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLng = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  return { distanceKm, distanceMeters: distanceKm * 1000 };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Check if point is within radius
 */
export function isWithinRadius(
  point: GeoCoordinates,
  center: GeoCoordinates,
  radiusKm: number
): boolean {
  return calculateDistance(point, center).distanceKm <= radiusKm;
}

/**
 * Check if point is within polygon (ray casting)
 */
export function isPointInPolygon(
  point: GeoCoordinates,
  polygon: GeoCoordinates[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    if (
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
