/**
 * Socket Server Tests
 *
 * Integration tests using real services where feasible:
 * - Real jwtService with test JWT secret for authentic token verification
 * - Mocked rbacService (requires database for role/permission queries)
 * - Mocked messageService (requires database for message persistence)
 * - Mocked Redis adapter (requires Redis instance)
 */
// Set test JWT secret before importing jwtService (singleton reads env at import time)
process.env.JWT_SECRET = 'test-integration-secret-key-for-socket-tests-32ch';

import { createServer } from 'http';

import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import { io as Client } from 'socket.io-client';

import { initializeSocketServer, emitToUser, broadcast } from '../../src/socket';
import { connectionManager } from '../../src/socket/connectionManager';

// Mock services that require external infrastructure (database, Redis)
// rbacService: requires Prisma database for role/permission queries
jest.mock('../../src/services/rbacService', () => ({
  rbacService: {
    getUserRoles: jest.fn().mockResolvedValue([]),
    getUserPermissions: jest.fn().mockResolvedValue([]),
  },
}));

// Redis adapter: requires running Redis instance
jest.mock('../../src/socket/adapter', () => ({
  pubClient: null,
  subClient: null,
}));

// roomService: requires Prisma database for room membership checks
jest.mock('../../src/services/chat/roomService', () => ({
  isUserInRoom: jest.fn().mockResolvedValue(true),
}));

// messageService: requires Prisma database for message persistence
jest.mock('../../src/services/messageService', () => ({
  createChatRoomMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    conversationId: 'room-1',
    senderId: 'user-1',
    sender: { id: 'user-1', name: 'Test User', avatarUrl: null },
    content: 'Hello!',
    type: 'TEXT',
    attachments: null,
    metadata: null,
    status: 'SENT',
    sequenceId: BigInt(1),
    readReceipts: [],
    createdAt: new Date(),
  }),
  getChatRoomMessages: jest.fn().mockResolvedValue([]),
  getOfflineMessages: jest.fn().mockResolvedValue([]),
  markOfflineMessagesDelivered: jest.fn().mockResolvedValue({ count: 0 }),
  syncChatRoomMessages: jest.fn().mockResolvedValue({
    messages: [],
    lastSequenceId: BigInt(0),
    hasMore: false,
  }),
  editChatRoomMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    conversationId: 'room-1',
    content: 'Edited',
    editedAt: new Date(),
  }),
  deleteChatRoomMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    content: '[deleted]',
    metadata: { deleted: true },
  }),
}));

const TEST_JWT_SECRET = process.env.JWT_SECRET;

/**
 * Create a real JWT token signed with the test secret.
 * This exercises the actual jwtService.verifyToken code path.
 */
function createTestToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

describe('Socket Server', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketServer;
  let clientSocket: ReturnType<typeof Client>;
  const TEST_PORT = 3333;

  beforeAll(async () => {
    httpServer = createServer();
    io = await initializeSocketServer(httpServer, {} as any);
    httpServer.listen(TEST_PORT);
  });

  afterAll(async () => {
    connectionManager.destroy();
    await io.close();
    httpServer.close();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should reject connection without token', done => {
      clientSocket = Client(`http://localhost:${TEST_PORT}`);

      clientSocket.on('connect_error', err => {
        expect(err.message).toContain('Authentication');
        done();
      });
    });

    it('should accept connection with valid token', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connected', data => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should reject connection with invalid token', done => {
      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'invalid-token-value' },
      });

      clientSocket.on('connect_error', err => {
        expect(err.message).toContain('Invalid token');
        done();
      });
    });
  });

  describe('Namespaces', () => {
    it('should connect to main namespace', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connected', data => {
        expect(data.namespace).toBe('main');
        done();
      });
    });

    it('should connect to chat namespace', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
      });

      clientSocket.on('connected', data => {
        expect(data.namespace).toBe('chat');
        done();
      });
    });
  });

  describe('Events', () => {
    it('should handle ping/pong', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('ping');
      });

      clientSocket.on('pong', data => {
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should handle chat:join', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('chat:join', { roomId: 'room-1' }, (response: any) => {
          expect(response.success).toBe(true);
          expect(response.data).toHaveProperty('roomId', 'room-1');
          done();
        });
      });
    });

    it('should handle chat:message', done => {
      const token = createTestToken({ userId: 'user-1', email: 'test@example.com' });

      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('chat:join', { roomId: 'room-1' }, () => {
          clientSocket.emit(
            'chat:message',
            { roomId: 'room-1', content: 'Hello!' },
            (response: any) => {
              expect(response.success).toBe(true);
              expect(response.data).toHaveProperty('messageId');
              done();
            }
          );
        });
      });
    });
  });

  describe('Utility Functions', () => {
    it('should emit to user', () => {
      expect(() => emitToUser('user-1', 'event', {})).not.toThrow();
    });

    it('should broadcast to all', () => {
      expect(() => broadcast('event', {})).not.toThrow();
    });
  });
});
