/**
 * Geocoding Service Tests
 * 地址编码服务测试
 */

import {
  geocode,
  reverseGeocode,
  searchAddresses,
  isValidCoordinatePair,
  getDistanceBetweenAddresses,
} from '../geoCodingService';

describe('GeoCodingService', () => {
  describe('geocode', () => {
    it('should return exact match for known address', async () => {
      const result = await geocode('北京市朝阳区建国路');

      expect(result.success).toBe(true);
      expect(result.coordinates).toBeDefined();
      expect(result.location).toBeDefined();
      expect(result.confidence).toBe(1.0);
      expect(result.address).toBe('北京市朝阳区建国路');
    });

    it('should return partial match for similar address', async () => {
      const result = await geocode('朝阳区建国路');

      // Partial match returns success with confidence < 1.0
      // Or it could be an exact match depending on database
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return failure for unknown address', async () => {
      const result = await geocode('完全不存在的地址xyz123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.confidence).toBe(0);
    });
  });

  describe('reverseGeocode', () => {
    it('should return nearest location for coordinates', async () => {
      // Beijing coordinates
      const result = await reverseGeocode({
        latitude: 39.9,
        longitude: 116.4,
      });

      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
      expect(result.address).toBeDefined();
    });

    it('should return higher confidence for closer match', async () => {
      const nearBeijing = await reverseGeocode({
        latitude: 39.9088,
        longitude: 116.3975,
      });

      const farAway = await reverseGeocode({
        latitude: 0,
        longitude: 0,
      });

      expect(nearBeijing.confidence).toBeGreaterThan(farAway.confidence);
    });

    it('should return address from mock database', async () => {
      const result = await reverseGeocode({
        latitude: 39.9088,
        longitude: 116.3975,
      });

      expect(result.address).toBe('北京市朝阳区建国路');
    });
  });

  describe('searchAddresses', () => {
    it('should return matching addresses', async () => {
      const results = await searchAddresses('北京', 10);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toContain('北京');
    });

    it('should return empty for short query', async () => {
      const results = await searchAddresses('北', 10);

      // Query length < 2 should return empty
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const results = await searchAddresses('北京', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty for non-matching query', async () => {
      const results = await searchAddresses('完全不匹配xyz', 10);

      expect(results).toEqual([]);
    });
  });

  describe('isValidCoordinatePair', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinatePair(39.9, 116.4)).toBe(true);
      expect(isValidCoordinatePair(0, 0)).toBe(true);
      expect(isValidCoordinatePair(-90, -180)).toBe(true);
      expect(isValidCoordinatePair(90, 180)).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      expect(isValidCoordinatePair(91, 0)).toBe(false);
      expect(isValidCoordinatePair(-91, 0)).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      expect(isValidCoordinatePair(0, 181)).toBe(false);
      expect(isValidCoordinatePair(0, -181)).toBe(false);
    });
  });

  describe('getDistanceBetweenAddresses', () => {
    it('should calculate distance between two addresses', async () => {
      const distance = await getDistanceBetweenAddresses(
        '北京市朝阳区建国路',
        '上海市浦东新区陆家嘴'
      );

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      // Beijing to Shanghai is approximately 1068 km
      expect(distance).toBeGreaterThan(1000);
    });

    it('should return null when first address not found', async () => {
      const distance = await getDistanceBetweenAddresses(
        '不存在的地址',
        '北京市朝阳区建国路'
      );

      expect(distance).toBeNull();
    });

    it('should return null when second address not found', async () => {
      const distance = await getDistanceBetweenAddresses(
        '北京市朝阳区建国路',
        '不存在的地址'
      );

      expect(distance).toBeNull();
    });
  });
});
