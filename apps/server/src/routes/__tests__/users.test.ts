/**
 * User Routes Tests
 * 用户路由测试
 */

import request from 'supertest';
import express from 'express';
import userRoutes from '../users';
import * as userService from '../../services/userService';
import { authenticate } from '../../middleware/auth';

// Mock user service
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

describe('User Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/users', userRoutes);
  });

  describe('GET /api/v1/users/me', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        phone: '13800138000',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userService.getUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      (userService.getUserProfile as jest.Mock).mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
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
        avatarUrl: null,
        phone: '13900139000',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userService.updateUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name', phone: '13900139000' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ phone: 'invalid-phone' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PHONE');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    it('should return 409 when email already exists', async () => {
      (userService.updateUserProfile as jest.Mock).mockRejectedValue(new Error('邮箱已被使用'));

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should delete user account successfully', async () => {
      (userService.deleteUserAccount as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('账号已删除');
    });

    it('should return 404 when user not found', async () => {
      (userService.deleteUserAccount as jest.Mock).mockRejectedValue(new Error('用户不存在'));

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
