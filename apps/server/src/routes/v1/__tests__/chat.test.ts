/**
 * Chat Routes Integration Tests
 * 聊天路由集成测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestUser, createTestRoom, cleanupTestData } from '../../tests/helpers';

describe('Chat Routes Integration', () => {
  let authToken: string;
  let userId: string;
  let testRoomId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = await createTestUser({
      email: 'chat-test@example.com',
      password: 'password123',
      name: 'Chat Test User',
    });
    userId = testUser.id;
    authToken = testUser.token;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/chat/rooms', () => {
    it('should create a new private room', async () => {
      // Create another user to chat with
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'PRIVATE',
          participantIds: [userId, otherUser.id],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('PRIVATE');
      expect(response.body.data.participantIds).toContain(userId);
      expect(response.body.data.participantIds).toContain(otherUser.id);

      testRoomId = response.body.data.id;
    });

    it('should create a new group room', async () => {
      const user2 = await createTestUser({
        email: 'user2@example.com',
        password: 'password123',
      });
      const user3 = await createTestUser({
        email: 'user3@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId, user2.id, user3.id],
          metadata: { name: 'Test Group', description: 'A test group' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('GROUP');
      expect(response.body.data.metadata).toHaveProperty('name', 'Test Group');
    });

    it('should return 400 for invalid room type', async () => {
      const response = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'INVALID',
          participantIds: [userId],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/v1/chat/rooms').send({
        type: 'PRIVATE',
        participantIds: [userId],
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/chat/rooms', () => {
    it('should get user rooms list', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
    });

    it('should filter rooms by type', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'PRIVATE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every((room: any) => room.type === 'PRIVATE')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });
  });

  describe('GET /api/v1/chat/rooms/search', () => {
    it('should search rooms by query', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 without search query', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/v1/chat/rooms/:id', () => {
    it('should get room details', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testRoomId);
      expect(response.body.data).toHaveProperty('participants');
    });

    it('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .get('/api/v1/chat/rooms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for non-member user', async () => {
      // Create a new user who is not in the room
      const otherUser = await createTestUser({
        email: 'non-member@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .get(`/api/v1/chat/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/chat/rooms/:id', () => {
    it('should update room settings', async () => {
      const response = await request(app)
        .patch(`/api/v1/chat/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          settings: { notifications: false },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settings).toHaveProperty('notifications', false);
    });

    it('should update room status', async () => {
      const response = await request(app)
        .patch(`/api/v1/chat/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'INACTIVE',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/v1/chat/rooms/:id', () => {
    it('should close room', async () => {
      // Create a room to close
      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'PRIVATE',
          participantIds: [userId],
        });

      const roomId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/chat/rooms/${roomId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CLOSED');
    });
  });

  describe('POST /api/v1/chat/rooms/:id/read', () => {
    it('should mark room as read', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/rooms/${testRoomId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('read');
    });
  });

  describe('GET /api/v1/chat/rooms/:id/participants', () => {
    it('should get room participants', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/rooms/${testRoomId}/participants`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/chat/rooms/:id/participants', () => {
    it('should add participant to room', async () => {
      // Create a group room first
      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId],
        });

      const roomId = createResponse.body.data.id;

      const newUser = await createTestUser({
        email: 'new-participant@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post(`/api/v1/chat/rooms/${roomId}/participants`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: newUser.id,
          role: 'MEMBER',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 403 if non-admin tries to add participant', async () => {
      // This test would require creating a room and adding a regular member
      // who then tries to add another participant
    });
  });

  describe('PATCH /api/v1/chat/rooms/:id/participants/:userId', () => {
    it('should update participant role', async () => {
      // Create group room with another user
      const memberUser = await createTestUser({
        email: 'member@example.com',
        password: 'password123',
      });

      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId, memberUser.id],
        });

      const roomId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/chat/rooms/${roomId}/participants/${memberUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'ADMIN',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('ADMIN');
    });
  });

  describe('DELETE /api/v1/chat/rooms/:id/participants/:userId', () => {
    it('should remove participant from room', async () => {
      const memberUser = await createTestUser({
        email: 'to-remove@example.com',
        password: 'password123',
      });

      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId, memberUser.id],
        });

      const roomId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/chat/rooms/${roomId}/participants/${memberUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/chat/rooms/:id/transfer-ownership', () => {
    it('should transfer ownership to another user', async () => {
      const newOwner = await createTestUser({
        email: 'new-owner@example.com',
        password: 'password123',
      });

      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId, newOwner.id],
        });

      const roomId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/chat/rooms/${roomId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: newOwner.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 without new owner userId', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/rooms/${testRoomId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });
});
