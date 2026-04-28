"use strict";
/**
 * User Routes Tests
 * 用户路由测试
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const users_1 = __importDefault(require("../users"));
const userService = __importStar(require("../../services/userService"));
const storageService = __importStar(require("../../services/storageService"));
// Mock user service
jest.mock('../../services/userService');
// Mock storage service
jest.mock('../../services/storageService');
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
describe('User Routes', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/v1/users', users_1.default);
    });
    describe('GET /api/v1/users/me', () => {
        it('should return user profile successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                displayName: null,
                bio: null,
                website: null,
                location: null,
                avatarUrl: null,
                phone: '13800138000',
                emailVerified: false,
                phoneVerified: false,
                privacySettings: null,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            userService.getUserById.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockUser);
        });
        it('should return 404 when user not found', async () => {
            userService.getUserById.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token');
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('USER_NOT_FOUND');
        });
    });
    describe('PUT /api/v1/users/me', () => {
        it('should update user profile successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'New Name',
                displayName: null,
                bio: null,
                website: null,
                location: null,
                avatarUrl: null,
                phone: '13900139000',
                emailVerified: false,
                phoneVerified: false,
                privacySettings: null,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            userService.updateUser.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(app)
                .put('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'New Name', phone: '13900139000' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('New Name');
        });
        it('should return 400 for invalid profile field length', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: '' });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 400 for bio exceeding max length', async () => {
            const longBio = 'a'.repeat(501);
            const response = await (0, supertest_1.default)(app)
                .put('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token')
                .send({ bio: longBio });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 400 for invalid website URL', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token')
                .send({ website: 'not-a-valid-url' });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('DELETE /api/v1/users/me', () => {
        it('should delete user account successfully', async () => {
            userService.deleteUser.mockResolvedValue(undefined);
            const response = await (0, supertest_1.default)(app)
                .delete('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token')
                .send({ password: 'correct-password' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Account deleted successfully');
        });
        it('should return 400 when password is missing', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete('/api/v1/users/me')
                .set('Authorization', 'Bearer valid-token');
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('PASSWORD_REQUIRED');
        });
    });
    describe('POST /api/v1/users/avatar', () => {
        let avatarApp;
        beforeEach(() => {
            jest.clearAllMocks();
            avatarApp = (0, express_1.default)();
            avatarApp.use(express_1.default.json());
            avatarApp.use('/api/v1/users', users_1.default);
        });
        it('should upload avatar successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                displayName: null,
                bio: null,
                website: null,
                location: null,
                avatarUrl: 'https://cdn.example.com/avatar.jpg',
                phone: null,
                emailVerified: false,
                phoneVerified: false,
                privacySettings: null,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            storageService.uploadAvatar.mockResolvedValue({
                url: 'https://cdn.example.com/avatar.jpg',
                thumbnailUrl: 'https://cdn.example.com/avatar-thumb.jpg',
                size: 12345,
            });
            storageService.deleteFile.mockResolvedValue(undefined);
            userService.updateAvatar.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .attach('avatar', Buffer.from('fake-image'), {
                filename: 'avatar.jpg',
                contentType: 'image/jpeg',
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.avatarUrl).toBe('https://cdn.example.com/avatar.jpg');
        });
        it('should upload avatar via URL bypass with https', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                displayName: null,
                bio: null,
                website: null,
                location: null,
                avatarUrl: 'https://images.example.com/my-avatar.jpg',
                phone: null,
                emailVerified: false,
                phoneVerified: false,
                privacySettings: null,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            storageService.deleteFile.mockResolvedValue(undefined);
            userService.updateAvatar.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .field('avatarUrl', 'https://images.example.com/my-avatar.jpg');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should return 400 when no file and no avatarUrl provided', async () => {
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token');
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('NO_FILE');
        });
        it('should return 400 for invalid avatarUrl protocol (http)', async () => {
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .field('avatarUrl', 'http://evil.com/avatar.jpg');
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_AVATAR_URL');
        });
        it('should return 400 for invalid avatarUrl format', async () => {
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .field('avatarUrl', 'not-a-valid-url');
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_AVATAR_URL');
        });
        it('should clean up old avatar before uploading new one', async () => {
            const oldUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                displayName: null,
                bio: null,
                website: null,
                location: null,
                avatarUrl: 'https://cdn.example.com/old-avatar.jpg',
                phone: null,
                emailVerified: false,
                phoneVerified: false,
                privacySettings: null,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const newUser = { ...oldUser, avatarUrl: 'https://cdn.example.com/new-avatar.jpg' };
            storageService.uploadAvatar.mockResolvedValue({
                url: 'https://cdn.example.com/new-avatar.jpg',
                thumbnailUrl: 'https://cdn.example.com/new-avatar-thumb.jpg',
                size: 12345,
            });
            storageService.deleteFile.mockResolvedValue(undefined);
            userService.updateAvatar.mockResolvedValue(newUser);
            const response = await (0, supertest_1.default)(avatarApp)
                .post('/api/v1/users/avatar')
                .set('Authorization', 'Bearer valid-token')
                .attach('avatar', Buffer.from('new-image'), {
                filename: 'new-avatar.jpg',
                contentType: 'image/jpeg',
            });
            expect(response.status).toBe(200);
            expect(storageService.deleteFile).toHaveBeenCalledWith('https://cdn.example.com/old-avatar.jpg');
        });
    });
});
//# sourceMappingURL=users.test.js.map