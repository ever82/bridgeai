"use strict";
/**
 * Vision API Route Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock the vision adapters before importing the router
jest.mock('../services/ai/adapters/vision/gpt4Vision', () => ({
    GPT4VisionAdapter: jest.fn().mockImplementation(() => ({
        id: 'gpt-4-vision',
        provider: 'OpenAI',
        supportsImages: true,
        initialize: jest.fn().mockResolvedValue(undefined),
        analyzeImage: jest.fn().mockResolvedValue(JSON.stringify({
            sceneDescription: 'A test scene',
            detectedObjects: [{ label: 'person', confidence: 0.92 }],
            activityTags: ['walking'],
            visualFeatures: {
                dominantColors: ['blue'],
                brightness: 65,
                contrast: 55,
                sharpness: 70,
                hasFaces: true,
                faceCount: 1,
            },
        })),
        healthCheck: jest.fn().mockResolvedValue(true),
    })),
}));
jest.mock('../services/ai/adapters/vision/claudeVision', () => ({
    ClaudeVisionAdapter: jest.fn().mockImplementation(() => ({
        id: 'claude-vision',
        provider: 'Anthropic',
        supportsImages: true,
        initialize: jest.fn().mockResolvedValue(undefined),
        analyzeImage: jest.fn().mockResolvedValue('Claude response'),
        healthCheck: jest.fn().mockResolvedValue(true),
    })),
}));
jest.mock('../middleware/auth', () => ({
    authenticate: () => (_req, _res, next) => next(),
}));
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));
const vision_1 = __importDefault(require("../routes/ai/vision"));
describe('Vision API Routes', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/v1/ai/vision', vision_1.default);
    const testImageBase64 = Buffer.from('fake-image-data'.repeat(100)).toString('base64');
    describe('POST /api/v1/ai/vision/analyze', () => {
        it('should analyze image from base64', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/analyze')
                .send({ imageBase64: testImageBase64, mimeType: 'image/jpeg' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('scene_description');
            expect(response.body.data).toHaveProperty('detected_objects');
            expect(response.body.data).toHaveProperty('visual_features');
        });
        it('should return 400 when no image provided', async () => {
            const response = await (0, supertest_1.default)(app).post('/api/v1/ai/vision/analyze').send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('No image provided');
        });
    });
    describe('POST /api/v1/ai/vision/moderate', () => {
        it('should moderate image', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/moderate')
                .send({ imageBase64: testImageBase64 });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('is_safe');
            expect(response.body.data).toHaveProperty('confidence_score');
        });
    });
    describe('POST /api/v1/ai/vision/ocr', () => {
        it('should extract text from image', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/ocr')
                .send({ imageBase64: testImageBase64 });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('extracted_text');
            expect(response.body.data).toHaveProperty('language');
        });
    });
    describe('POST /api/v1/ai/vision/describe', () => {
        it('should generate image description', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/describe')
                .send({ imageBase64: testImageBase64 });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('description');
        });
    });
    describe('POST /api/v1/ai/vision/search', () => {
        it('should search images by text query', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/search')
                .send({ query: 'photos of people' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('query');
            expect(response.body.data).toHaveProperty('results');
        });
        it('should return 400 when query is missing', async () => {
            const response = await (0, supertest_1.default)(app).post('/api/v1/ai/vision/search').send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('POST /api/v1/ai/vision/recommend/confirm', () => {
        it('should confirm recommendation', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/recommend/confirm')
                .send({
                imageIds: ['img1', 'img2'],
                action: 'accept',
                reason: 'Good quality',
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.confirmed).toEqual(['img1', 'img2']);
            expect(response.body.data.action).toBe('accept');
        });
        it('should reject recommendation', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/recommend/confirm')
                .send({
                imageIds: ['img1'],
                action: 'reject',
                reason: 'Low quality',
            });
            expect(response.status).toBe(200);
            expect(response.body.data.action).toBe('reject');
        });
        it('should return 400 when imageIds is missing', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/recommend/confirm')
                .send({ action: 'accept' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('imageIds');
        });
        it('should return 400 for invalid action', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/ai/vision/recommend/confirm')
                .send({
                imageIds: ['img1'],
                action: 'invalid',
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('accept');
        });
    });
    describe('GET /api/v1/ai/vision/health', () => {
        it('should return health status', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/ai/vision/health');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('status');
            expect(response.body.data).toHaveProperty('provider');
        });
    });
});
//# sourceMappingURL=visionRoute.test.js.map