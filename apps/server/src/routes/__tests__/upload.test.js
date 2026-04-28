"use strict";
/**
 * Upload Routes Tests
 * 上传路由测试
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const upload_1 = __importDefault(require("../upload"));
const auth_1 = require("../../middleware/auth");
// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
    authenticate: jest.fn((req, res, next) => {
        req.user = { userId: 'user-123', email: 'test@example.com', role: 'user' };
        next();
    }),
}));
// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
// Mock sharp
jest.mock('sharp', () => {
    return jest.fn(() => ({
        metadata: jest.fn().mockResolvedValue({ width: 256, height: 256 }),
        jpeg: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
    }));
});
describe('Upload Routes', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/v1/users', upload_1.default);
    });
    describe('POST /api/v1/users/avatar', () => {
        it('should return 401 without authentication', async () => {
            // Create new app with failing auth
            const failingAuthApp = (0, express_1.default)();
            failingAuthApp.use(express_1.default.json());
            // Override the mock for this specific test
            auth_1.authenticate.mockImplementationOnce((_req, res, _next) => {
                res.status(401).json({
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: '未认证' },
                });
            });
            failingAuthApp.use('/api/v1/users', upload_1.default);
            const response = await (0, supertest_1.default)(failingAuthApp)
                .post('/api/v1/users/avatar');
            expect(response.status).toBe(401);
        });
        it('should return 400 for invalid file type (.exe)', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .attach('avatar', Buffer.from('MZ header'), {
                filename: 'malware.exe',
                contentType: 'application/x-msdownload',
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 400 for invalid file type (.pdf)', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .attach('avatar', Buffer.from('%PDF-1.4 fake content'), {
                filename: 'document.pdf',
                contentType: 'application/pdf',
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 413 for file exceeding size limit', async () => {
            // Create a buffer larger than 5MB
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024 + 1);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .attach('avatar', largeBuffer, {
                filename: 'huge.jpg',
                contentType: 'image/jpeg',
            });
            expect(response.status).toBe(413);
            expect(response.body.success).toBe(false);
        });
    });
});
//# sourceMappingURL=upload.test.js.map