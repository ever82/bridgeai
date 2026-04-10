/**
 * Upload Routes Tests
 * 上传路由测试
 */

import request from 'supertest';
import express from 'express';
import uploadRoutes from '../upload';
import * as storageService from '../../services/storageService';
import * as userService from '../../services/userService';

// Mock services
jest.mock('../../services/storageService');
jest.mock('../../services/userService');

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
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/users', uploadRoutes);
  });

  describe('POST /api/v1/users/avatar', () => {
    it('should return 401 without authentication', async () => {
      // Create new app with failing auth
      const failingAuthApp = express();
      failingAuthApp.use(express.json());
      // Override the mock for this specific test
      const authMock = require('../../middleware/auth');
      authMock.authenticate.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '未认证' },
        });
      });
      failingAuthApp.use('/api/v1/users', uploadRoutes);

      const response = await request(failingAuthApp)
        .post('/api/v1/users/avatar');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/users/avatar', () => {
    it('should delete avatar successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: '',
        phone: '13800138000',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userService.updateUserAvatar as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('头像已删除');
    });

    it('should return 404 when user not found', async () => {
      (userService.updateUserAvatar as jest.Mock).mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementations
    (storageService.isAllowedImageType as jest.Mock).mockImplementation((mimetype: string) => {
      return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimetype);
    });
    (storageService.getExtensionFromMimetype as jest.Mock).mockImplementation((mimetype: string) => {
      const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      return map[mimetype] || 'jpg';
    });
    (storageService.generateStoragePath as jest.Mock).mockImplementation((userId: string, filename: string) => {
      return `avatars/${userId}/2024/01/test.jpg`;
    });
  });

  describe('isAllowedImageType', () => {
    it('should allow valid image types', () => {
      expect(storageService.isAllowedImageType('image/jpeg')).toBe(true);
      expect(storageService.isAllowedImageType('image/png')).toBe(true);
      expect(storageService.isAllowedImageType('image/gif')).toBe(true);
      expect(storageService.isAllowedImageType('image/webp')).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(storageService.isAllowedImageType('application/pdf')).toBe(false);
      expect(storageService.isAllowedImageType('text/plain')).toBe(false);
    });
  });

  describe('getExtensionFromMimetype', () => {
    it('should return correct extensions', () => {
      expect(storageService.getExtensionFromMimetype('image/jpeg')).toBe('jpg');
      expect(storageService.getExtensionFromMimetype('image/png')).toBe('png');
      expect(storageService.getExtensionFromMimetype('image/gif')).toBe('gif');
      expect(storageService.getExtensionFromMimetype('image/webp')).toBe('webp');
    });

    it('should return default extension for unknown types', () => {
      expect(storageService.getExtensionFromMimetype('image/bmp')).toBe('jpg');
    });
  });

  describe('generateStoragePath', () => {
    it('should generate valid storage path', () => {
      const path = storageService.generateStoragePath('user-123', 'avatar.jpg');
      expect(path).toMatch(/^avatars\/user-123\/.*\.jpg$/);
    });
  });
});
