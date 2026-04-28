/**
 * Socket.io Integration Tests
 *
 * Integration-level tests validating real-time communication
 * with real Socket.io server, real JWT authentication,
 * and minimal external service mocking.
 *
 * Only external infrastructure (Redis, Database) is mocked;
 * Socket.io transport, JWT verification, and connection lifecycle
 * use real implementations.
 */

// Set test JWT secret before importing modules that read it at import time
process.env.JWT_SECRET = 'test-integration-secret-for-socket-integration-32ch';

import { createServer } from 'http';

import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

import { initializeSocketServer, emitToUser, broadcast } from '../../socket';
import { connectionManager } from '../../socket/connectionManager';

// Mock only external infrastructure services that need DB/Redis
jest.mock('../../services/rbacService', () => ({
  rbacService: {
    getUserRoles: jest.fn().mockResolvedValue([{ role: { name: 'user', id: 'role-1' } }]),
    getUserPermissions: jest.fn().mockResolvedValue([{ name: 'chat:send' }, { name: 'chat:read' }]),
  },
}));

// Mock expo-server-sdk
jest.mock('expo-server-sdk', () => ({
  Expo: jest.fn(),
}));

jest.mock('../../socket/adapter', () => ({
  pubClient: null,
  subClient: null,
}));

jest.mock('../../services/chat/roomService', () => ({
  isUserInRoom: jest.fn().mockResolvedValue(true),
  getRoomMembers: jest.fn().mockResolvedValue(['user-1', 'user-2']),
}));

jest.mock('../../services/messageService', () => ({
  createChatRoomMessage: jest.fn().mockResolvedValue({
    id: 'msg-integration-1',
    conversationId: 'room-1',
    senderId: 'user-1',
    sender: { id: 'user-1', name: 'Integration User', avatarUrl: null },
    content: 'Integration test message',
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
    id: 'msg-integration-1',
    conversationId: 'room-1',
    content: 'Edited integration message',
    editedAt: new Date(),
  }),
  deleteChatRoomMessage: jest.fn().mockResolvedValue({
    id: 'msg-integration-1',
    content: '[deleted]',
    metadata: { deleted: true },
  }),
}));

const TEST_JWT_SECRET = process.env.JWT_SECRET;
const TEST_PORT = 3334;

function createTestToken(payload: { userId: string; email: string; role?: string }): string {
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function waitForEvent(socket: ClientSocket, event: string, timeout = 5000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket.on(event, resolve);
    setTimeout(() => reject(new Error(`Timeout waiting for event: ${event}`)), timeout);
  });
}

function waitForConnect(socket: ClientSocket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), timeout);
  });
}

describe('Socket.io Integration Tests', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketServer;

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

  describe('Connection Lifecycle', () => {
    it('should complete full connect-communicate-disconnect cycle', async () => {
      const token = createTestToken({ userId: 'lifecycle-user', email: 'lifecycle@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        // 1. Connect
        await waitForConnect(client);
        expect(client.connected).toBe(true);

        // 2. Receive welcome event
        const connectedData = (await waitForEvent(client, 'connected', 3000)) as Record<
          string,
          unknown
        >;
        expect(connectedData).toHaveProperty('socketId');

        // 3. Ping-pong
        client.emit('ping');
        const pongData = (await waitForEvent(client, 'pong', 3000)) as Record<string, unknown>;
        expect(pongData).toHaveProperty('timestamp');

        // 4. Disconnect
        client.disconnect();
        await new Promise(resolve => {
          client.on('disconnect', resolve);
          setTimeout(resolve, 1000);
        });
        expect(client.connected).toBe(false);
      } finally {
        if (client.connected) client.disconnect();
      }
    });

    it('should reject connections with expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'expired-user', email: 'expired@test.com' },
        TEST_JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: expiredToken },
        transports: ['websocket'],
      });

      try {
        const error = (await waitForEvent(client, 'connect_error', 3000)) as Error;
        expect(error.message).toMatch(/token|auth|expir/i);
      } finally {
        client.disconnect();
      }
    });

    it('should reject connections with malformed tokens', async () => {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'not-a-valid-jwt-token' },
        transports: ['websocket'],
      });

      try {
        const error = (await waitForEvent(client, 'connect_error', 3000)) as Error;
        expect(error.message).toMatch(/token|auth|invalid/i);
      } finally {
        client.disconnect();
      }
    });

    it('should reject connections without auth token', async () => {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
      });

      try {
        const error = (await waitForEvent(client, 'connect_error', 3000)) as Error;
        expect(error.message).toMatch(/auth|token|missing/i);
      } finally {
        client.disconnect();
      }
    });
  });

  describe('Namespace Routing', () => {
    it('should route to main namespace by default', async () => {
      const token = createTestToken({ userId: 'ns-user', email: 'ns@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client);
        const data = (await waitForEvent(client, 'connected', 3000)) as Record<string, unknown>;
        expect(data).toHaveProperty('namespace');
        expect(data.namespace).toBe('main');
      } finally {
        client.disconnect();
      }
    });

    it('should route to chat namespace when specified', async () => {
      const token = createTestToken({ userId: 'chat-ns-user', email: 'chatns@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client);
        const data = (await waitForEvent(client, 'connected', 3000)) as Record<string, unknown>;
        expect(data).toHaveProperty('namespace');
        expect(data.namespace).toBe('chat');
      } finally {
        client.disconnect();
      }
    });
  });

  describe('Chat Message Flow', () => {
    it('should handle join-room → send-message → receive-message flow', async () => {
      const token = createTestToken({ userId: 'msg-user', email: 'msg@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client);
        await waitForEvent(client, 'connected', 3000);

        // Join room
        const joinResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          client.emit('chat:join', { roomId: 'room-1' }, (response: Record<string, unknown>) => {
            resolve(response);
          });
          setTimeout(() => reject(new Error('Join timeout')), 5000);
        });

        expect(joinResult.success).toBe(true);

        // Send message
        const sendResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          client.emit(
            'chat:message',
            { roomId: 'room-1', content: 'Hello integration test!', type: 'TEXT' },
            (response: Record<string, unknown>) => {
              resolve(response);
            }
          );
          setTimeout(() => reject(new Error('Send timeout')), 5000);
        });

        expect(sendResult.success).toBe(true);
        expect(sendResult.data).toHaveProperty('messageId');
      } finally {
        client.disconnect();
      }
    });

    it('should handle message editing', async () => {
      const token = createTestToken({ userId: 'edit-user', email: 'edit@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client);
        await waitForEvent(client, 'connected', 3000);

        // Join room
        await new Promise<void>((resolve, reject) => {
          client.emit('chat:join', { roomId: 'room-1' }, () => resolve());
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        // Edit message
        const editResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          client.emit(
            'chat:edit',
            { roomId: 'room-1', messageId: 'msg-integration-1', content: 'Edited content' },
            (response: Record<string, unknown>) => {
              resolve(response);
            }
          );
          setTimeout(() => reject(new Error('Edit timeout')), 5000);
        });

        expect(editResult.success).toBe(true);
      } finally {
        client.disconnect();
      }
    });

    it('should handle message deletion', async () => {
      const token = createTestToken({ userId: 'delete-user', email: 'delete@test.com' });
      const client = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client);
        await waitForEvent(client, 'connected', 3000);

        await new Promise<void>((resolve, reject) => {
          client.emit('chat:join', { roomId: 'room-1' }, () => resolve());
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const deleteResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          client.emit(
            'chat:delete',
            { roomId: 'room-1', messageId: 'msg-integration-1' },
            (response: Record<string, unknown>) => {
              resolve(response);
            }
          );
          setTimeout(() => reject(new Error('Delete timeout')), 5000);
        });

        expect(deleteResult.success).toBe(true);
      } finally {
        client.disconnect();
      }
    });
  });

  describe('Multi-User Communication', () => {
    it('should allow two users to communicate via same room', async () => {
      const token1 = createTestToken({ userId: 'multi-user-1', email: 'multi1@test.com' });
      const token2 = createTestToken({ userId: 'multi-user-2', email: 'multi2@test.com' });

      const client1 = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token: token1 },
        transports: ['websocket'],
      });
      const client2 = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token: token2 },
        transports: ['websocket'],
      });

      try {
        await Promise.all([waitForConnect(client1), waitForConnect(client2)]);
        await Promise.all([
          waitForEvent(client1, 'connected', 3000),
          waitForEvent(client2, 'connected', 3000),
        ]);

        // Both join same room
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            client1.emit('chat:join', { roomId: 'room-shared' }, () => resolve());
            setTimeout(() => reject(new Error('Timeout')), 5000);
          }),
          new Promise<void>((resolve, reject) => {
            client2.emit('chat:join', { roomId: 'room-shared' }, () => resolve());
            setTimeout(() => reject(new Error('Timeout')), 5000);
          }),
        ]);

        // User 1 sends message
        const messagePromise = waitForEvent(client2, 'chat:new_message', 5000);

        await new Promise<void>((resolve, reject) => {
          client1.emit(
            'chat:message',
            { roomId: 'room-shared', content: 'Hello from user 1!', type: 'TEXT' },
            () => resolve()
          );
          setTimeout(() => reject(new Error('Send timeout')), 5000);
        });

        // User 2 should receive the message
        const received = (await messagePromise) as Record<string, unknown>;
        expect(received).toBeDefined();
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    });
  });

  describe('Utility Functions', () => {
    it('emitToUser should not throw', () => {
      expect(() => emitToUser('test-user', 'test-event', { data: 'test' })).not.toThrow();
    });

    it('broadcast should not throw', () => {
      expect(() => broadcast('test-event', { data: 'test' })).not.toThrow();
    });
  });
});
