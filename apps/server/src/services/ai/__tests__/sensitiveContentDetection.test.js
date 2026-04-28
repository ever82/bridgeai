"use strict";
/**
 * Sensitive Content Detection Service Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
const sensitiveContentDetection_1 = require("../sensitiveContentDetection");
// Helper to create a test image buffer
async function createTestImage(width = 100, height = 100) {
    return await (0, sharp_1.default)({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 128, g: 128, b: 128 },
        },
    })
        .jpeg()
        .toBuffer();
}
describe('Sensitive Content Detection Service', () => {
    describe('calculatePrivacyRisk', () => {
        it('should return 0 for empty detections', () => {
            expect((0, sensitiveContentDetection_1.calculatePrivacyRisk)([])).toBe(0);
        });
        it('should calculate risk for face detections', () => {
            const detections = [
                {
                    type: 'face',
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    confidence: 0.9,
                },
            ];
            const risk = (0, sensitiveContentDetection_1.calculatePrivacyRisk)(detections);
            expect(risk).toBeGreaterThan(0);
            expect(risk).toBeLessThanOrEqual(100);
        });
        it('should weight faces higher than barcodes', () => {
            const faceDetections = [
                {
                    type: 'face',
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    confidence: 0.9,
                },
            ];
            const barcodeDetections = [
                {
                    type: 'barcode',
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    confidence: 0.9,
                },
            ];
            const faceRisk = (0, sensitiveContentDetection_1.calculatePrivacyRisk)(faceDetections);
            const barcodeRisk = (0, sensitiveContentDetection_1.calculatePrivacyRisk)(barcodeDetections);
            expect(faceRisk).toBeGreaterThan(barcodeRisk);
        });
        it('should increase risk with more detections', () => {
            const single = [
                {
                    type: 'face',
                    boundingBox: { x: 0, y: 0, width: 50, height: 50 },
                    confidence: 0.8,
                },
            ];
            const multiple = [
                {
                    type: 'face',
                    boundingBox: { x: 0, y: 0, width: 50, height: 50 },
                    confidence: 0.8,
                },
                {
                    type: 'license_plate',
                    boundingBox: { x: 100, y: 100, width: 50, height: 50 },
                    confidence: 0.8,
                },
                {
                    type: 'address',
                    boundingBox: { x: 200, y: 200, width: 50, height: 50 },
                    confidence: 0.8,
                },
            ];
            const singleRisk = (0, sensitiveContentDetection_1.calculatePrivacyRisk)(single);
            const multiRisk = (0, sensitiveContentDetection_1.calculatePrivacyRisk)(multiple);
            expect(multiRisk).toBeGreaterThan(singleRisk);
        });
        it('should not exceed 100', () => {
            const manyDetections = Array(20)
                .fill(null)
                .map(() => ({
                type: 'face',
                boundingBox: { x: 0, y: 0, width: 10, height: 10 },
                confidence: 1.0,
            }));
            expect((0, sensitiveContentDetection_1.calculatePrivacyRisk)(manyDetections)).toBeLessThanOrEqual(100);
        });
    });
    describe('getRiskLevel', () => {
        it('should return low for score < 30', () => {
            expect((0, sensitiveContentDetection_1.getRiskLevel)(0)).toBe('low');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(15)).toBe('low');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(29)).toBe('low');
        });
        it('should return medium for score 30-59', () => {
            expect((0, sensitiveContentDetection_1.getRiskLevel)(30)).toBe('medium');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(45)).toBe('medium');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(59)).toBe('medium');
        });
        it('should return high for score 60-84', () => {
            expect((0, sensitiveContentDetection_1.getRiskLevel)(60)).toBe('high');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(75)).toBe('high');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(84)).toBe('high');
        });
        it('should return critical for score >= 85', () => {
            expect((0, sensitiveContentDetection_1.getRiskLevel)(85)).toBe('critical');
            expect((0, sensitiveContentDetection_1.getRiskLevel)(100)).toBe('critical');
        });
    });
    describe('stripExifFromImage', () => {
        it('should return cleaned buffer without EXIF', async () => {
            const buffer = await createTestImage();
            const result = await (0, sensitiveContentDetection_1.stripExifFromImage)(buffer);
            expect(result.cleanedBuffer).toBeInstanceOf(Buffer);
            expect(result.cleanedBuffer.length).toBeGreaterThan(0);
        });
        it('should report no GPS data for clean images', async () => {
            const buffer = await createTestImage();
            const result = await (0, sensitiveContentDetection_1.stripExifFromImage)(buffer);
            // Our simple test image doesn't have GPS data
            expect(result.hadGpsData).toBe(false);
        });
    });
});
//# sourceMappingURL=sensitiveContentDetection.test.js.map