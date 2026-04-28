"use strict";
/**
 * Geo-fencing Service Tests
 * 地理围栏服务测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const geoFencingService_1 = require("../geoFencingService");
describe('GeoFencingService', () => {
    beforeEach(() => {
        const fences = (0, geoFencingService_1.getAllGeoFences)();
        fences.forEach((f) => (0, geoFencingService_1.deleteGeoFence)(f.id));
    });
    describe('createGeoFence', () => {
        it('should create a geo-fence with polygon', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [
                    [[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]],
                ],
            };
            const fence = (0, geoFencingService_1.createGeoFence)('Test Fence', polygon, 'Test description');
            expect(fence).toBeDefined();
            expect(fence.id).toBeDefined();
            expect(fence.name).toBe('Test Fence');
            expect(fence.description).toBe('Test description');
            expect(fence.geometry).toEqual(polygon);
            expect(fence.createdAt).toBeInstanceOf(Date);
        });
    });
    describe('checkGeoFence', () => {
        it('should return inside true for point inside polygon', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [
                    [[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]],
                ],
            };
            const fence = (0, geoFencingService_1.createGeoFence)('Beijing Area', polygon);
            const result = (0, geoFencingService_1.checkGeoFence)({ latitude: 39.9, longitude: 116.4 }, fence.id);
            expect(result.inside).toBe(true);
        });
        it('should return inside false for point outside polygon', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [
                    [[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]],
                ],
            };
            const fence = (0, geoFencingService_1.createGeoFence)('Beijing Area', polygon);
            const result = (0, geoFencingService_1.checkGeoFence)({ latitude: 31.2, longitude: 121.4 }, fence.id);
            expect(result.inside).toBe(false);
        });
        it('should return inside false for non-existent fence', () => {
            const result = (0, geoFencingService_1.checkGeoFence)({ latitude: 39.9, longitude: 116.4 }, 'non-existent-id');
            expect(result.inside).toBe(false);
        });
    });
    describe('createCircularGeoFence', () => {
        it('should create circular fence', () => {
            const fence = (0, geoFencingService_1.createCircularGeoFence)('Circular Area', { latitude: 39.9, longitude: 116.4 }, 1000, 'Test circle', 16);
            expect(fence.name).toBe('Circular Area');
            expect(fence.geometry.type).toBe('Polygon');
            expect(fence.geometry.coordinates[0].length).toBe(18); // 16 + 1 closing from loop + 1 explicit
        });
        it('should contain the center point', () => {
            const center = { latitude: 39.9, longitude: 116.4 };
            const fence = (0, geoFencingService_1.createCircularGeoFence)('Area', center, 5000);
            expect((0, geoFencingService_1.checkGeoFence)(center, fence.id).inside).toBe(true);
        });
    });
    describe('createRectangularGeoFence', () => {
        it('should create rectangular fence with 5 points', () => {
            const fence = (0, geoFencingService_1.createRectangularGeoFence)('Rect', {
                minLat: 39.8, maxLat: 40.0, minLng: 116.3, maxLng: 116.5,
            });
            expect(fence.geometry.coordinates[0].length).toBe(5);
        });
        it('should contain points inside the rectangle', () => {
            const fence = (0, geoFencingService_1.createRectangularGeoFence)('Rect', {
                minLat: 39.8, maxLat: 40.0, minLng: 116.3, maxLng: 116.5,
            });
            expect((0, geoFencingService_1.checkGeoFence)({ latitude: 39.9, longitude: 116.4 }, fence.id).inside).toBe(true);
        });
        it('should not contain points outside', () => {
            const fence = (0, geoFencingService_1.createRectangularGeoFence)('Rect', {
                minLat: 39.8, maxLat: 40.0, minLng: 116.3, maxLng: 116.5,
            });
            expect((0, geoFencingService_1.checkGeoFence)({ latitude: 39.9, longitude: 117.0 }, fence.id).inside).toBe(false);
        });
    });
    describe('validateGeoFencePolygon', () => {
        it('should validate correct polygon', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            expect((0, geoFencingService_1.validateGeoFencePolygon)(polygon).valid).toBe(true);
        });
        it('should reject empty coordinates', () => {
            expect((0, geoFencingService_1.validateGeoFencePolygon)({ type: 'Polygon', coordinates: [] }).valid).toBe(false);
        });
        it('should reject less than 4 points', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.3, 39.8]]],
            };
            const result = (0, geoFencingService_1.validateGeoFencePolygon)(polygon);
            expect(result.errors).toContain('Polygon must have at least 4 points (including closing point)');
        });
        it('should reject unclosed polygon', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0]]],
            };
            const result = (0, geoFencingService_1.validateGeoFencePolygon)(polygon);
            expect(result.errors).toContain('Polygon ring must be closed (first and last points must match)');
        });
        it('should reject invalid coordinates', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 95.0], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            const result = (0, geoFencingService_1.validateGeoFencePolygon)(polygon);
            expect(result.valid).toBe(false);
        });
    });
    describe('CRUD', () => {
        it('should update fence', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            const fence = (0, geoFencingService_1.createGeoFence)('Old', polygon);
            expect((0, geoFencingService_1.updateGeoFence)(fence.id, { name: 'New' }).name).toBe('New');
        });
        it('should delete fence', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            const fence = (0, geoFencingService_1.createGeoFence)('Test', polygon);
            expect((0, geoFencingService_1.deleteGeoFence)(fence.id)).toBe(true);
            expect((0, geoFencingService_1.getGeoFence)(fence.id)).toBeUndefined();
        });
        it('should list all fences', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            (0, geoFencingService_1.createGeoFence)('Fence 1', polygon);
            (0, geoFencingService_1.createGeoFence)('Fence 2', polygon);
            expect((0, geoFencingService_1.getAllGeoFences)().length).toBe(2);
        });
        it('should check multiple fences', () => {
            const polygon1 = {
                type: 'Polygon',
                coordinates: [[[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]],
            };
            const polygon2 = {
                type: 'Polygon',
                coordinates: [[[116.0, 39.5], [116.2, 39.5], [116.2, 39.7], [116.0, 39.7], [116.0, 39.5]]],
            };
            const f1 = (0, geoFencingService_1.createGeoFence)('North', polygon1);
            const f2 = (0, geoFencingService_1.createGeoFence)('South', polygon2);
            const result = (0, geoFencingService_1.checkMultipleGeoFences)({ latitude: 39.9, longitude: 116.4 }, [f1.id, f2.id]);
            expect(result).toContain(f1.id);
            expect(result).not.toContain(f2.id);
        });
        it('should find containing fences', () => {
            const polygon = {
                type: 'Polygon',
                coordinates: [[[116.0, 39.5], [117.0, 39.5], [117.0, 40.5], [116.0, 40.5], [116.0, 39.5]]],
            };
            (0, geoFencingService_1.createGeoFence)('Large', polygon);
            expect((0, geoFencingService_1.findContainingGeoFences)({ latitude: 39.9, longitude: 116.4 }).length).toBe(1);
        });
    });
});
//# sourceMappingURL=geoFencingService.test.js.map