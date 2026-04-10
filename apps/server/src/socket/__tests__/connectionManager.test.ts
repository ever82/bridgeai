/**
 * Connection Manager Tests
 */
import { connectionManager } from '../../src/socket/connectionManager';

// Mock Socket
const createMockSocket = (id: string, userId?: string) => ({
  id,
  user: userId ? { id: userId } : undefined,
  handshake: {
    address: '127.0.0.1',
    headers: { 'user-agent': 'test' },
    query: {},
  },
  join: jest.fn(),
  leave: jest.fn(),
  on: jest.fn(),
  onAny: jest.fn(),
  disconnect: jest.fn(),
  rooms: new Set(),
});

describe('ConnectionManager', () => {
  beforeEach(() => {
    connectionManager.destroy();
    // Re-initialize for each test
    connectionManager.initialize({
      nsps: new Map(),
    } as any);
  });

  afterEach(() => {
    connectionManager.destroy();
  });

  describe('addConnection', () => {
    it('should add a new connection', () => {
      const mockSocket = createMockSocket('socket-1', 'user-1');

      connectionManager.addConnection(mockSocket as any, 'main');

      const conn = connectionManager.getConnection('socket-1');
      expect(conn).toBeDefined();
      expect(conn?.userId).toBe('user-1');
      expect(conn?.namespace).toBe('main');
    });

    it('should add anonymous connection', () => {
      const mockSocket = createMockSocket('socket-2');

      connectionManager.addConnection(mockSocket as any, 'chat');

      const conn = connectionManager.getConnection('socket-2');
      expect(conn).toBeDefined();
      expect(conn?.userId).toBeUndefined();
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      const mockSocket = createMockSocket('socket-1', 'user-1');
      connectionManager.addConnection(mockSocket as any, 'main');

      connectionManager.removeConnection('socket-1');

      const conn = connectionManager.getConnection('socket-1');
      expect(conn).toBeUndefined();
    });
  });

  describe('getUserConnections', () => {
    it('should get connections for a user', () => {
      const mockSocket1 = createMockSocket('socket-1', 'user-1');
      const mockSocket2 = createMockSocket('socket-2', 'user-1');
      const mockSocket3 = createMockSocket('socket-3', 'user-2');

      connectionManager.addConnection(mockSocket1 as any, 'main');
      connectionManager.addConnection(mockSocket2 as any, 'chat');
      connectionManager.addConnection(mockSocket3 as any, 'main');

      const user1Conns = connectionManager.getUserConnections('user-1');
      expect(user1Conns).toHaveLength(2);

      const user2Conns = connectionManager.getUserConnections('user-2');
      expect(user2Conns).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return connection statistics', () => {
      const mockSocket1 = createMockSocket('socket-1', 'user-1');
      const mockSocket2 = createMockSocket('socket-2', 'user-2');
      const mockSocket3 = createMockSocket('socket-3'); // anonymous

      connectionManager.addConnection(mockSocket1 as any, 'main');
      connectionManager.addConnection(mockSocket2 as any, 'chat');
      connectionManager.addConnection(mockSocket3 as any, 'main');

      const stats = connectionManager.getStats();

      expect(stats.totalConnections).toBe(3);
      expect(stats.authenticatedConnections).toBe(2);
      expect(stats.connectionsByNamespace.main).toBe(2);
      expect(stats.connectionsByNamespace.chat).toBe(1);
    });
  });

  describe('isUserOnline', () => {
    it('should return true for online user', () => {
      const mockSocket = createMockSocket('socket-1', 'user-1');
      connectionManager.addConnection(mockSocket as any, 'main');

      expect(connectionManager.isUserOnline('user-1')).toBe(true);
    });

    it('should return false for offline user', () => {
      expect(connectionManager.isUserOnline('user-offline')).toBe(false);
    });
  });

  describe('getOnlineUserCount', () => {
    it('should count unique online users', () => {
      const mockSocket1 = createMockSocket('socket-1', 'user-1');
      const mockSocket2 = createMockSocket('socket-2', 'user-1'); // same user
      const mockSocket3 = createMockSocket('socket-3', 'user-2');

      connectionManager.addConnection(mockSocket1 as any, 'main');
      connectionManager.addConnection(mockSocket2 as any, 'chat');
      connectionManager.addConnection(mockSocket3 as any, 'main');

      expect(connectionManager.getOnlineUserCount()).toBe(2);
    });
  });

  describe('updatePing', () => {
    it('should update last ping time', () => {
      const mockSocket = createMockSocket('socket-1', 'user-1');
      connectionManager.addConnection(mockSocket as any, 'main');

      const before = connectionManager.getConnection('socket-1')?.lastPingAt;

      // Wait a bit
      jest.advanceTimersByTime(1000);
      connectionManager.updatePing('socket-1');

      const after = connectionManager.getConnection('socket-1')?.lastPingAt;
      expect(after?.getTime()).toBeGreaterThan(before?.getTime() || 0);
    });
  });

  describe('cleanupStaleConnections', () => {
    it('should remove stale connections', () => {
      const mockSocket = createMockSocket('socket-1', 'user-1');
      connectionManager.addConnection(mockSocket as any, 'main');

      // Manually set lastPingAt to old time
      const conn = connectionManager.getConnection('socket-1');
      if (conn) {
        conn.lastPingAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      }

      connectionManager.cleanupStaleConnections(5 * 60 * 1000); // 5 minute threshold

      expect(connectionManager.getConnection('socket-1')).toBeUndefined();
    });
  });
});
