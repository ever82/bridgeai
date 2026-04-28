"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Chat Routes Integration Tests
 * 聊天路由集成测试
 */
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const helpers_1 = require("../../../tests/helpers");
const messageService_1 = require("../../../services/messageService");
(0, globals_1.describe)('Chat Routes Integration', () => {
    let authToken;
    let userId;
    let testRoomId;
    (0, globals_1.beforeAll)(async () => {
        // Create test user and get auth token
        const testUser = await (0, helpers_1.createTestUser)({
            email: 'chat-test@example.com',
            password: 'password123',
            name: 'Chat Test User',
        });
        userId = testUser.id;
        authToken = (0, helpers_1.generateAccessToken)(testUser);
    });
    (0, globals_1.afterAll)(async () => {
        await (0, helpers_1.cleanupTestUsers)();
    });
    (0, globals_1.describe)('POST /api/v1/chat/rooms', () => {
        (0, globals_1.it)('should create a new private room', async () => {
            // Create another user to chat with
            const otherUser = await (0, helpers_1.createTestUser)({
                email: 'other@example.com',
                password: 'password123',
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'PRIVATE',
                participantIds: [userId, otherUser.id],
            });
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('id');
            (0, globals_1.expect)(response.body.data.type).toBe('PRIVATE');
            (0, globals_1.expect)(response.body.data.participantIds).toContain(userId);
            (0, globals_1.expect)(response.body.data.participantIds).toContain(otherUser.id);
            testRoomId = response.body.data.id;
        });
        (0, globals_1.it)('should create a new group room', async () => {
            const user2 = await (0, helpers_1.createTestUser)({
                email: 'user2@example.com',
                password: 'password123',
            });
            const user3 = await (0, helpers_1.createTestUser)({
                email: 'user3@example.com',
                password: 'password123',
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'GROUP',
                participantIds: [userId, user2.id, user3.id],
                metadata: { name: 'Test Group', description: 'A test group' },
            });
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.type).toBe('GROUP');
            (0, globals_1.expect)(response.body.data.metadata).toHaveProperty('name', 'Test Group');
        });
        (0, globals_1.it)('should return 400 for invalid room type', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'INVALID',
                participantIds: [userId],
            });
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.success).toBe(false);
        });
        (0, globals_1.it)('should return 401 without auth token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .send({
                type: 'PRIVATE',
                participantIds: [userId],
            });
            (0, globals_1.expect)(response.status).toBe(401);
        });
    });
    (0, globals_1.describe)('GET /api/v1/chat/rooms', () => {
        (0, globals_1.it)('should get user rooms list', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(Array.isArray(response.body.data)).toBe(true);
            (0, globals_1.expect)(response.body.meta).toHaveProperty('total');
            (0, globals_1.expect)(response.body.meta).toHaveProperty('page');
        });
        (0, globals_1.it)('should filter rooms by type', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ type: 'PRIVATE' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.every((room) => room.type === 'PRIVATE')).toBe(true);
        });
        (0, globals_1.it)('should paginate results', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ page: 1, limit: 10 });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.meta.page).toBe(1);
            (0, globals_1.expect)(response.body.meta.limit).toBe(10);
        });
    });
    (0, globals_1.describe)('GET /api/v1/chat/rooms/search', () => {
        (0, globals_1.it)('should search rooms by query', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms/search')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ q: 'Test' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
        });
        (0, globals_1.it)('should return 400 without search query', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms/search')
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.error).toContain('required');
        });
    });
    (0, globals_1.describe)('GET /api/v1/chat/rooms/:id', () => {
        (0, globals_1.it)('should get room details', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/chat/rooms/${testRoomId}`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('id', testRoomId);
            (0, globals_1.expect)(response.body.data).toHaveProperty('participants');
        });
        (0, globals_1.it)('should return 404 for non-existent room', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/chat/rooms/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(404);
        });
        (0, globals_1.it)('should return 403 for non-member user', async () => {
            // Create a new user who is not in the room
            const otherUser = await (0, helpers_1.createTestUser)({
                email: 'non-member@example.com',
                password: 'password123',
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/chat/rooms/${testRoomId}`)
                .set('Authorization', `Bearer ${(0, helpers_1.generateAccessToken)(otherUser)}`);
            (0, globals_1.expect)(response.status).toBe(403);
        });
    });
    (0, globals_1.describe)('PATCH /api/v1/chat/rooms/:id', () => {
        (0, globals_1.it)('should update room settings', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/chat/rooms/${testRoomId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                settings: { notifications: false },
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.metadata.settings).toHaveProperty('notifications', false);
        });
        (0, globals_1.it)('should update room status', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/chat/rooms/${testRoomId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                status: 'INACTIVE',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.status).toBe('INACTIVE');
        });
    });
    (0, globals_1.describe)('DELETE /api/v1/chat/rooms/:id', () => {
        (0, globals_1.it)('should close room', async () => {
            // Create a room to close (PRIVATE room requires 2 participants)
            const otherUser = await (0, helpers_1.createTestUser)({
                email: 'close-room@example.com',
                password: 'password123',
            });
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'PRIVATE',
                participantIds: [userId, otherUser.id],
            });
            const roomId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/v1/chat/rooms/${roomId}`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.status).toBe('CLOSED');
        });
    });
    (0, globals_1.describe)('POST /api/v1/chat/rooms/:id/read', () => {
        (0, globals_1.it)('should mark room as read', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/chat/rooms/${testRoomId}/read`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.message).toContain('read');
        });
    });
    (0, globals_1.describe)('GET /api/v1/chat/rooms/:id/participants', () => {
        (0, globals_1.it)('should get room participants', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/chat/rooms/${testRoomId}/participants`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(Array.isArray(response.body.data)).toBe(true);
            (0, globals_1.expect)(response.body.data.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('POST /api/v1/chat/rooms/:id/participants', () => {
        (0, globals_1.it)('should add participant to room', async () => {
            // Create a group room first (GROUP room requires >=2 participants)
            const groupMember = await (0, helpers_1.createTestUser)({
                email: 'group-member@example.com',
                password: 'password123',
            });
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'GROUP',
                participantIds: [userId, groupMember.id],
            });
            const roomId = createResponse.body.data.id;
            const newUser = await (0, helpers_1.createTestUser)({
                email: 'new-participant@example.com',
                password: 'password123',
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/chat/rooms/${roomId}/participants`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                userId: newUser.id,
                role: 'MEMBER',
            });
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('id');
        });
        (0, globals_1.it)('should return 403 if non-admin tries to add participant', async () => {
            // This test would require creating a room and adding a regular member
            // who then tries to add another participant
        });
    });
    (0, globals_1.describe)('PATCH /api/v1/chat/rooms/:id/participants/:userId', () => {
        (0, globals_1.it)('should update participant role', async () => {
            // Create group room with another user
            const memberUser = await (0, helpers_1.createTestUser)({
                email: 'member@example.com',
                password: 'password123',
            });
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'GROUP',
                participantIds: [userId, memberUser.id],
            });
            const roomId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/chat/rooms/${roomId}/participants/${memberUser.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                role: 'ADMIN',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.role).toBe('ADMIN');
        });
    });
    (0, globals_1.describe)('DELETE /api/v1/chat/rooms/:id/participants/:userId', () => {
        (0, globals_1.it)('should remove participant from room', async () => {
            const memberUser = await (0, helpers_1.createTestUser)({
                email: 'to-remove@example.com',
                password: 'password123',
            });
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'GROUP',
                participantIds: [userId, memberUser.id],
            });
            const roomId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/v1/chat/rooms/${roomId}/participants/${memberUser.id}`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
        });
    });
    (0, globals_1.describe)('POST /api/v1/chat/rooms/:id/transfer-ownership', () => {
        (0, globals_1.it)('should transfer ownership to another user', async () => {
            const newOwner = await (0, helpers_1.createTestUser)({
                email: 'new-owner@example.com',
                password: 'password123',
            });
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                type: 'GROUP',
                participantIds: [userId, newOwner.id],
            });
            const roomId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/chat/rooms/${roomId}/transfer-ownership`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                userId: newOwner.id,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
        });
        (0, globals_1.it)('should return 400 without new owner userId', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/v1/chat/rooms/${testRoomId}/transfer-ownership`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.message).toContain('Required');
        });
    });
    (0, globals_1.describe)('Message Operations', () => {
        let messageRoomId;
        let messageRoomAuth;
        let _messageRoomUserId;
        let testMessageId;
        (0, globals_1.beforeAll)(async () => {
            // Create a dedicated room for message tests
            const msgUser = await (0, helpers_1.createTestUser)({
                email: 'msg-test@example.com',
                password: 'password123',
                name: 'Message Test User',
            });
            const msgOtherUser = await (0, helpers_1.createTestUser)({
                email: 'msg-other@example.com',
                password: 'password123',
                name: 'Message Other User',
            });
            _messageRoomUserId = msgUser.id;
            messageRoomAuth = (0, helpers_1.generateAccessToken)(msgUser);
            const roomRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${messageRoomAuth}`)
                .send({
                type: 'PRIVATE',
                participantIds: [msgUser.id, msgOtherUser.id],
            });
            messageRoomId = roomRes.body.data.id;
            // Seed messages via service (no POST endpoint exists for messages)
            const msg1 = await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: messageRoomId,
                senderId: msgUser.id,
                content: 'Hello from message test',
            });
            testMessageId = msg1.id;
            await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: messageRoomId,
                senderId: msgOtherUser.id,
                content: 'Reply from other user',
            });
            await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: messageRoomId,
                senderId: msgUser.id,
                content: 'Another hello message',
            });
        });
        (0, globals_1.describe)('GET /api/v1/chat/rooms/:roomId/messages', () => {
            (0, globals_1.it)('should get message history for a room', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/messages`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.success).toBe(true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('messages');
                (0, globals_1.expect)(Array.isArray(response.body.data.messages)).toBe(true);
                (0, globals_1.expect)(response.body.data.messages.length).toBeGreaterThanOrEqual(3);
                (0, globals_1.expect)(response.body.data).toHaveProperty('pagination');
                (0, globals_1.expect)(response.body.data.pagination).toHaveProperty('hasMore');
            });
            (0, globals_1.it)('should paginate message history with limit', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/messages`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`)
                    .query({ limit: 2 });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.data.messages.length).toBeLessThanOrEqual(2);
                (0, globals_1.expect)(response.body.data.pagination.hasMore).toBe(true);
            });
            (0, globals_1.it)('should return 401 without auth token', async () => {
                const response = await (0, supertest_1.default)(app_1.default).get(`/api/v1/chat/rooms/${messageRoomId}/messages`);
                (0, globals_1.expect)(response.status).toBe(401);
            });
            (0, globals_1.it)('should return validation error for invalid roomId', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get('/api/v1/chat/rooms/not-a-uuid/messages')
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(400);
            });
        });
        (0, globals_1.describe)('GET /api/v1/chat/rooms/:roomId/sync', () => {
            (0, globals_1.it)('should sync messages since a given timestamp', async () => {
                const pastDate = new Date(Date.now() - 3600000).toISOString();
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/sync`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`)
                    .query({ lastMessageCreatedAt: pastDate });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.success).toBe(true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('messages');
                (0, globals_1.expect)(Array.isArray(response.body.data.messages)).toBe(true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('sync');
                (0, globals_1.expect)(response.body.data.sync).toHaveProperty('hasMore');
            });
            (0, globals_1.it)('should return empty messages when syncing from future', async () => {
                const futureDate = new Date(Date.now() + 3600000).toISOString();
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/sync`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`)
                    .query({ lastMessageCreatedAt: futureDate });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.data.messages.length).toBe(0);
            });
            (0, globals_1.it)('should return 401 without auth token', async () => {
                const response = await (0, supertest_1.default)(app_1.default).get(`/api/v1/chat/rooms/${messageRoomId}/sync`);
                (0, globals_1.expect)(response.status).toBe(401);
            });
        });
        (0, globals_1.describe)('GET /api/v1/chat/rooms/:roomId/search', () => {
            (0, globals_1.it)('should search messages by query', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`)
                    .query({ q: 'hello' });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.success).toBe(true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('messages');
                (0, globals_1.expect)(Array.isArray(response.body.data.messages)).toBe(true);
                (0, globals_1.expect)(response.body.data.messages.length).toBeGreaterThanOrEqual(2);
                (0, globals_1.expect)(response.body.data).toHaveProperty('query', 'hello');
                (0, globals_1.expect)(response.body.data).toHaveProperty('total');
            });
            (0, globals_1.it)('should return empty results for non-matching query', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`)
                    .query({ q: 'zzznonexistent' });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.data.messages.length).toBe(0);
                (0, globals_1.expect)(response.body.data.total).toBe(0);
            });
            (0, globals_1.it)('should return 400 without search query', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(400);
            });
            (0, globals_1.it)('should return 401 without auth token', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/rooms/${messageRoomId}/search`)
                    .query({ q: 'hello' });
                (0, globals_1.expect)(response.status).toBe(401);
            });
        });
        (0, globals_1.describe)('GET /api/v1/chat/messages/:messageId', () => {
            (0, globals_1.it)('should get a specific message by ID', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get(`/api/v1/chat/messages/${testMessageId}`)
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.success).toBe(true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('message');
                (0, globals_1.expect)(response.body.data.message).toHaveProperty('id', testMessageId);
                (0, globals_1.expect)(response.body.data.message).toHaveProperty('content');
                (0, globals_1.expect)(response.body.data.message).toHaveProperty('senderId');
                (0, globals_1.expect)(response.body.data.message).toHaveProperty('createdAt');
            });
            (0, globals_1.it)('should return 404 for non-existent message', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get('/api/v1/chat/messages/00000000-0000-0000-0000-000000000000')
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(404);
                (0, globals_1.expect)(response.body.success).toBe(false);
            });
            (0, globals_1.it)('should return validation error for invalid messageId', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get('/api/v1/chat/messages/not-a-uuid')
                    .set('Authorization', `Bearer ${messageRoomAuth}`);
                (0, globals_1.expect)(response.status).toBe(400);
            });
            (0, globals_1.it)('should return 401 without auth token', async () => {
                const response = await (0, supertest_1.default)(app_1.default).get(`/api/v1/chat/messages/${testMessageId}`);
                (0, globals_1.expect)(response.status).toBe(401);
            });
        });
    });
});
//# sourceMappingURL=chat.test.js.map