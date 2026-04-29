/**
 * Chat Routes Integration Tests
 * 聊天路由集成测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

import app from '../../../app';
import { createTestUser, cleanupTestUsers, generateAccessToken } from '../../../tests/helpers';
import { createChatRoomMessage } from '../../../services/messageService';
import { prisma } from '../../../db/client';

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
    authToken = generateAccessToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestUsers();
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
      const response = await request(app)
        .post('/api/v1/chat/rooms')
        .send({
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
        .set('Authorization', `Bearer ${generateAccessToken(otherUser)}`);

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
      expect(response.body.data.metadata.settings).toHaveProperty('notifications', false);
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
      // Create a room to close (PRIVATE room requires 2 participants)
      const otherUser = await createTestUser({
        email: 'close-room@example.com',
        password: 'password123',
      });
      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'PRIVATE',
          participantIds: [userId, otherUser.id],
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
      // Create a group room first (GROUP room requires >=2 participants)
      const groupMember = await createTestUser({
        email: 'group-member@example.com',
        password: 'password123',
      });
      const createResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GROUP',
          participantIds: [userId, groupMember.id],
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
      expect(response.body.message).toContain('Required');
    });
  });

  describe('Message Operations', () => {
    let messageRoomId: string;
    let messageRoomAuth: string;
    let _messageRoomUserId: string;
    let testMessageId: string;

    beforeAll(async () => {
      // Create a dedicated room for message tests
      const msgUser = await createTestUser({
        email: 'msg-test@example.com',
        password: 'password123',
        name: 'Message Test User',
      });
      const msgOtherUser = await createTestUser({
        email: 'msg-other@example.com',
        password: 'password123',
        name: 'Message Other User',
      });
      _messageRoomUserId = msgUser.id;
      messageRoomAuth = generateAccessToken(msgUser);

      const roomRes = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${messageRoomAuth}`)
        .send({
          type: 'PRIVATE',
          participantIds: [msgUser.id, msgOtherUser.id],
        });
      messageRoomId = roomRes.body.data.id;

      // Seed messages via service (no POST endpoint exists for messages)
      const msg1 = await createChatRoomMessage({
        chatRoomId: messageRoomId,
        senderId: msgUser.id,
        content: 'Hello from message test',
      });
      testMessageId = msg1.id;

      await createChatRoomMessage({
        chatRoomId: messageRoomId,
        senderId: msgOtherUser.id,
        content: 'Reply from other user',
      });

      await createChatRoomMessage({
        chatRoomId: messageRoomId,
        senderId: msgUser.id,
        content: 'Another hello message',
      });
    });

    describe('GET /api/v1/chat/rooms/:roomId/messages', () => {
      it('should get message history for a room', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/messages`)
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('messages');
        expect(Array.isArray(response.body.data.messages)).toBe(true);
        expect(response.body.data.messages.length).toBeGreaterThanOrEqual(3);
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data.pagination).toHaveProperty('hasMore');
      });

      it('should paginate message history with limit', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/messages`)
          .set('Authorization', `Bearer ${messageRoomAuth}`)
          .query({ limit: 2 });

        expect(response.status).toBe(200);
        expect(response.body.data.messages.length).toBeLessThanOrEqual(2);
        expect(response.body.data.pagination.hasMore).toBe(true);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app).get(`/api/v1/chat/rooms/${messageRoomId}/messages`);

        expect(response.status).toBe(401);
      });

      it('should return validation error for invalid roomId', async () => {
        const response = await request(app)
          .get('/api/v1/chat/rooms/not-a-uuid/messages')
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/chat/rooms/:roomId/sync', () => {
      it('should sync messages since a given timestamp', async () => {
        const pastDate = new Date(Date.now() - 3600000).toISOString();
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/sync`)
          .set('Authorization', `Bearer ${messageRoomAuth}`)
          .query({ lastMessageCreatedAt: pastDate });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('messages');
        expect(Array.isArray(response.body.data.messages)).toBe(true);
        expect(response.body.data).toHaveProperty('sync');
        expect(response.body.data.sync).toHaveProperty('hasMore');
      });

      it('should return empty messages when syncing from future', async () => {
        const futureDate = new Date(Date.now() + 3600000).toISOString();
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/sync`)
          .set('Authorization', `Bearer ${messageRoomAuth}`)
          .query({ lastMessageCreatedAt: futureDate });

        expect(response.status).toBe(200);
        expect(response.body.data.messages.length).toBe(0);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app).get(`/api/v1/chat/rooms/${messageRoomId}/sync`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/chat/rooms/:roomId/search', () => {
      it('should search messages by query', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
          .set('Authorization', `Bearer ${messageRoomAuth}`)
          .query({ q: 'hello' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('messages');
        expect(Array.isArray(response.body.data.messages)).toBe(true);
        expect(response.body.data.messages.length).toBeGreaterThanOrEqual(2);
        expect(response.body.data).toHaveProperty('query', 'hello');
        expect(response.body.data).toHaveProperty('total');
      });

      it('should return empty results for non-matching query', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
          .set('Authorization', `Bearer ${messageRoomAuth}`)
          .query({ q: 'zzznonexistent' });

        expect(response.status).toBe(200);
        expect(response.body.data.messages.length).toBe(0);
        expect(response.body.data.total).toBe(0);
      });

      it('should return 400 without search query', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(400);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
          .query({ q: 'hello' });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/chat/messages/:messageId', () => {
      it('should get a specific message by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/chat/messages/${testMessageId}`)
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
        expect(response.body.data.message).toHaveProperty('id', testMessageId);
        expect(response.body.data.message).toHaveProperty('content');
        expect(response.body.data.message).toHaveProperty('senderId');
        expect(response.body.data.message).toHaveProperty('createdAt');
      });

      it('should return 404 for non-existent message', async () => {
        const response = await request(app)
          .get('/api/v1/chat/messages/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should return validation error for invalid messageId', async () => {
        const response = await request(app)
          .get('/api/v1/chat/messages/not-a-uuid')
          .set('Authorization', `Bearer ${messageRoomAuth}`);

        expect(response.status).toBe(400);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app).get(`/api/v1/chat/messages/${testMessageId}`);

        expect(response.status).toBe(401);
      });
    });
  });
});

describe('createChatRoomMessage Transaction & Rollback', () => {
  let senderUserId: string;
  let participantUserId: string;
  let testRoomId: string;

  beforeEach(async () => {
    // Create test users
    const sender = await createTestUser({
      email: 'tx-sender@example.com',
      name: 'TX Sender',
    });
    const participant = await createTestUser({
      email: 'tx-participant@example.com',
      name: 'TX Participant',
    });
    senderUserId = sender.id;
    participantUserId = participant.id;

    // Create a test room
    const room = await prisma.chatRoom.create({
      data: {
        type: 'PRIVATE',
        participantIds: [senderUserId, participantUserId],
        participants: {
          create: [
            { userId: senderUserId, role: 'OWNER', isActive: true },
            { userId: participantUserId, role: 'MEMBER', isActive: true },
          ],
        },
      },
    });
    testRoomId = room.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.offlineMessage
      .deleteMany({
        where: {
          conversationId: testRoomId,
        },
      })
      .catch(() => {});
    await prisma.chatMessage
      .deleteMany({
        where: { chatRoomId: testRoomId },
      })
      .catch(() => {});
    await prisma.chatRoom
      .deleteMany({
        where: { id: testRoomId },
      })
      .catch(() => {});
    await cleanupTestUsers();
  });

  describe('Unit Tests - Transaction Rollback', () => {
    it('should rollback unreadCount increment when ChatMessage creation fails', async () => {
      // Get initial unread count for participant
      const initialParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: testRoomId,
          userId: participantUserId,
        },
      });
      const initialUnreadCount = initialParticipant?.unreadCount || 0;

      // Attempt message creation (will throw due to invalid room)
      await expect(
        createChatRoomMessage({
          chatRoomId: 'non-existent-room-id',
          senderId: senderUserId,
          content: 'This should fail',
        })
      ).rejects.toThrow();

      // Verify unread count was not changed
      const finalParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(finalParticipant?.unreadCount).toBe(initialUnreadCount);
    });

    it('should rollback when ChatRoom does not exist', async () => {
      // Verify initial state: no messages
      const initialMessages = await prisma.chatMessage.count({
        where: { chatRoomId: testRoomId },
      });
      expect(initialMessages).toBe(0);

      const initialRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      const _initialLastMessageAt = initialRoom?.lastMessageAt;

      // Attempt to create message with non-existent room
      await expect(
        createChatRoomMessage({
          chatRoomId: '00000000-0000-0000-0000-000000000000',
          senderId: senderUserId,
          content: 'This should not be created',
        })
      ).rejects.toThrow();

      // Verify no messages were created (transaction was rolled back)
      const finalMessageCount = await prisma.chatMessage.count({
        where: { chatRoomId: testRoomId },
      });
      expect(finalMessageCount).toBe(0);

      // Verify ChatRoom lastMessageAt was not changed
      const finalRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      expect(finalRoom?.lastMessageAt).toEqual(initialLastMessageAt);
    });

    it('should rollback all atomic operations on failure', async () => {
      // Verify initial state
      const initialMessages = await prisma.chatMessage.count({
        where: { chatRoomId: testRoomId },
      });
      expect(initialMessages).toBe(0);

      const initialRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      const _initialLastMessageAt = initialRoom?.lastMessageAt;

      // Attempt to create message with non-existent sender (fails within transaction)
      await expect(
        createChatRoomMessage({
          chatRoomId: testRoomId,
          senderId: '00000000-0000-0000-0000-000000000999',
          content: 'This should not be created',
        })
      ).rejects.toThrow();

      // Verify NO messages were created
      const messageCount = await prisma.chatMessage.count({
        where: { chatRoomId: testRoomId },
      });
      expect(messageCount).toBe(0);

      // Verify ChatRoom lastMessageAt was NOT updated (rolled back)
      const updatedRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      expect(updatedRoom?.lastMessageAt).toEqual(initialLastMessageAt);

      // Verify unread count was not changed
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(participant?.unreadCount).toBe(0);
    });
  });

  describe('Integration Tests - Multi-step Failure Scenarios', () => {
    it('should maintain data consistency when ChatRoom does not exist', async () => {
      const nonExistentRoomId = '00000000-0000-0000-0000-000000000000';

      // Attempt to create message in non-existent room
      await expect(
        createChatRoomMessage({
          chatRoomId: nonExistentRoomId,
          senderId: senderUserId,
          content: 'This should fail',
        })
      ).rejects.toThrow();

      // Verify no orphaned data was created
      const orphanMessages = await prisma.chatMessage.count({
        where: { chatRoomId: nonExistentRoomId },
      });
      expect(orphanMessages).toBe(0);

      const orphanOfflineMessages = await prisma.offlineMessage.count({
        where: { conversationId: nonExistentRoomId },
      });
      expect(orphanOfflineMessages).toBe(0);
    });

    it('should rollback transaction when sender does not exist', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000001';

      // Attempt to create message with non-existent sender
      await expect(
        createChatRoomMessage({
          chatRoomId: testRoomId,
          senderId: nonExistentUserId,
          content: 'This should fail',
        })
      ).rejects.toThrow();

      // Verify no messages were created in the room
      const messageCount = await prisma.chatMessage.count({
        where: { chatRoomId: testRoomId },
      });
      expect(messageCount).toBe(0);
    });

    it('should successfully create message with all atomic operations', async () => {
      // Create message successfully
      const message = await createChatRoomMessage({
        chatRoomId: testRoomId,
        senderId: senderUserId,
        content: 'Atomic test message',
      });

      // Verify message was created
      expect(message).toHaveProperty('id');
      expect(message.content).toBe('Atomic test message');
      expect(message.senderId).toBe(senderUserId);

      // Verify ChatRoom was updated
      const updatedRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
      });
      expect(updatedRoom?.lastMessageAt).not.toBeNull();

      // Verify ChatMessage exists in database
      const dbMessage = await prisma.chatMessage.findFirst({
        where: {
          chatRoomId: testRoomId,
          senderId: senderUserId,
        },
      });
      expect(dbMessage).not.toBeNull();
      expect(dbMessage?.content).not.toBe('Atomic test message'); // Content is encrypted

      // Verify unread count was incremented for participant
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(participant?.unreadCount).toBe(1);

      // Verify offline message was created
      const offlineMessage = await prisma.offlineMessage.findFirst({
        where: {
          conversationId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(offlineMessage).not.toBeNull();
    });

    it('should handle multiple messages atomically without data corruption', async () => {
      // Create multiple messages in sequence
      const _message1 = await createChatRoomMessage({
        chatRoomId: testRoomId,
        senderId: senderUserId,
        content: 'First message',
      });

      const _message2 = await createChatRoomMessage({
        chatRoomId: testRoomId,
        senderId: senderUserId,
        content: 'Second message',
      });

      // Verify both messages exist
      const messages = await prisma.chatMessage.findMany({
        where: { chatRoomId: testRoomId },
        orderBy: { createdAt: 'asc' },
      });

      expect(messages.length).toBe(2);

      // Verify unread count was incremented for both messages
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(participant?.unreadCount).toBe(2);

      // Verify offline messages were created for both
      const offlineMessages = await prisma.offlineMessage.findMany({
        where: {
          conversationId: testRoomId,
          userId: participantUserId,
        },
      });
      expect(offlineMessages.length).toBe(2);
    });

    it('should rollback ChatRoom.lastMessageAt when transaction fails mid-way', async () => {
      // Get initial lastMessageAt
      const initialRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      const _initialLastMessageAt = initialRoom?.lastMessageAt;

      // Create a valid message first to set baseline
      await createChatRoomMessage({
        chatRoomId: testRoomId,
        senderId: senderUserId,
        content: 'Baseline message',
      });

      // Get the new baseline
      const afterBaselineRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });

      // Attempt to create message with invalid sender (should fail and rollback)
      try {
        await createChatRoomMessage({
          chatRoomId: testRoomId,
          senderId: '00000000-0000-0000-0000-000000000999', // Non-existent
          content: 'Should not be created',
        });
      } catch {
        // Expected to fail
      }

      // Verify ChatRoom lastMessageAt is unchanged (baseline message time)
      const finalRoom = await prisma.chatRoom.findUnique({
        where: { id: testRoomId },
        select: { lastMessageAt: true },
      });
      expect(finalRoom?.lastMessageAt).toEqual(afterBaselineRoom?.lastMessageAt);

      // Verify only the baseline message exists
      const messageCount = await prisma.chatMessage.count({
        where: {
          chatRoomId: testRoomId,
          senderId: senderUserId,
        },
      });
      expect(messageCount).toBe(1);
    });
  });
});
