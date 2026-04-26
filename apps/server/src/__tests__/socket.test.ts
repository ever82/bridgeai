/**
 * Socket Server Tests
 */
import { createServer } from 'http';

import { Server as SocketServer } from 'socket.io';
import { io as Client } from 'socket.io-client';

import { initializeSocketServer, emitToUser, broadcast } from '../../src/socket';
import { connectionManager } from '../../src/socket/connectionManager';
import { jwtService } from '../../src/services/jwtService';

// Mock services
jest.mock('../../src/services/rbacService', () => ({
  rbacService: {
    getUserRoles: jest.fn().mockResolvedValue([]),
    getUserPermissions: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/services/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('../../src/socket/adapter', () => ({
  pubClient: null,
  subClient: null,
}));

// Mock messageService used by chat handlers
jest.mock('../../src/services/messageService', () => ({
  createMessage: jest.fn().mockResolvedValue({
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
  getMessagesByConversation: jest.fn().mockResolvedValue([]),
  createReadReceipt: jest.fn().mockResolvedValue({
    messageId: 'msg-1',
    userId: 'user-1',
    readAt: new Date(),
  }),
  getOfflineMessages: jest.fn().mockResolvedValue([]),
  markOfflineMessagesDelivered: jest.fn().mockResolvedValue({ count: 0 }),
  syncMessages: jest.fn().mockResolvedValue({
    messages: [],
    lastSequenceId: BigInt(0),
    hasMore: false,
  }),
  editMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    conversationId: 'room-1',
    content: 'Edited',
    editedAt: new Date(),
  }),
  deleteMessage: jest.fn().mockResolvedValue({
    id: 'msg-1',
    content: '[deleted]',
    metadata: { deleted: true },
  }),
}));

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
      (jwtService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        email: 'test@example.com',
      });

      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('connected', data => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });
  });

  describe('Namespaces', () => {
    beforeEach(() => {
      (jwtService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
    });

    it('should connect to main namespace', done => {
      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('connected', data => {
        expect(data.namespace).toBe('main');
        done();
      });
    });

    it('should connect to chat namespace', done => {
      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token: 'valid-token' },
      });

      clientSocket.on('connected', data => {
        expect(data.namespace).toBe('chat');
        done();
      });
    });
  });

  describe('Events', () => {
    beforeEach(() => {
      (jwtService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
    });

    it('should handle ping/pong', done => {
      clientSocket = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'valid-token' },
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
      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token: 'valid-token' },
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
      clientSocket = Client(`http://localhost:${TEST_PORT}/chat`, {
        auth: { token: 'valid-token' },
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
