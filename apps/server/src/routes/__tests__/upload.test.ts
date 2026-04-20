/**
 * Upload Routes Tests
 * 上传路由测试
 */

import request from 'supertest';
import express from 'express';

import uploadRoutes from '../upload';
import { authenticate } from '../../middleware/auth';

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
      (authenticate as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
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

    it('should return 400 for invalid file type (.exe)', async () => {
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
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
