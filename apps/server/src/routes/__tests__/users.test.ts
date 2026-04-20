/**
 * User Routes Tests
 * 用户路由测试
 */

import request from 'supertest';
import express from 'express';

import userRoutes from '../users';
import * as userService from '../../services/userService';
import * as storageService from '../../services/storageService';

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

      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);

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

      (userService.updateUser as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name', phone: '13900139000' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 400 for invalid profile field length', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for bio exceeding max length', async () => {
      const longBio = 'a'.repeat(501);
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ bio: longBio });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid website URL', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ website: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should delete user account successfully', async () => {
      (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ password: 'correct-password' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PASSWORD_REQUIRED');
    });
  });

  describe('POST /api/v1/users/avatar', () => {
    let avatarApp: express.Application;

    beforeEach(() => {
      jest.clearAllMocks();
      avatarApp = express();
      avatarApp.use(express.json());
      avatarApp.use('/api/v1/users', userRoutes);
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

      (storageService.uploadAvatar as jest.Mock).mockResolvedValue({
        url: 'https://cdn.example.com/avatar.jpg',
        thumbnailUrl: 'https://cdn.example.com/avatar-thumb.jpg',
        size: 12345,
      });
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (userService.updateAvatar as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(avatarApp)
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

      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (userService.updateAvatar as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(avatarApp)
        .post('/api/v1/users/avatar')
        .set('Authorization', 'Bearer valid-token')
        .field('avatarUrl', 'https://images.example.com/my-avatar.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when no file and no avatarUrl provided', async () => {
      const response = await request(avatarApp)
        .post('/api/v1/users/avatar')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    it('should return 400 for invalid avatarUrl protocol (http)', async () => {
      const response = await request(avatarApp)
        .post('/api/v1/users/avatar')
        .set('Authorization', 'Bearer valid-token')
        .field('avatarUrl', 'http://evil.com/avatar.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_AVATAR_URL');
    });

    it('should return 400 for invalid avatarUrl format', async () => {
      const response = await request(avatarApp)
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

      (storageService.uploadAvatar as jest.Mock).mockResolvedValue({
        url: 'https://cdn.example.com/new-avatar.jpg',
        thumbnailUrl: 'https://cdn.example.com/new-avatar-thumb.jpg',
        size: 12345,
      });
      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (userService.updateAvatar as jest.Mock).mockResolvedValue(newUser);

      const response = await request(avatarApp)
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
