import { connectionService, ConnectionService, DeviceInfo } from '../connectionService';

describe('ConnectionService', () => {
  let service: ConnectionService;

  beforeEach(() => {
    service = new ConnectionService();
  });

  afterEach(() => {
    service.clearAllConnections();
  });

  describe('registerConnection', () => {
    it('should register a new connection', () => {
      const deviceInfo: Partial<DeviceInfo> = {
        deviceId: 'device-1',
        deviceType: 'mobile',
      };

      const connection = service.registerConnection(
        'socket-1',
        'user-1',
        deviceInfo,
        '192.168.1.1',
        '/chat'
      );

      expect(connection.socketId).toBe('socket-1');
      expect(connection.userId).toBe('user-1');
      expect(connection.deviceInfo.deviceType).toBe('mobile');
      expect(connection.ipAddress).toBe('192.168.1.1');
      expect(connection.namespace).toBe('/chat');
      expect(connection.status).toBe('active');
    });

    it('should track multiple connections for same user', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.1');

      const connections = service.getUserConnections('user-1');
      expect(connections).toHaveLength(2);
    });
  });

  describe('unregisterConnection', () => {
    beforeEach(() => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
    });

    it('should unregister connection', () => {
      const connection = service.unregisterConnection('socket-1');

      expect(connection).toBeDefined();
      expect(connection?.disconnectedAt).toBeDefined();
      expect(connection?.status).toBe('disconnected');
      expect(service.getConnection('socket-1')).toBeUndefined();
    });

    it('should return undefined for non-existent connection', () => {
      const connection = service.unregisterConnection('non-existent');
      expect(connection).toBeUndefined();
    });

    it('should track connection in history', () => {
      service.unregisterConnection('socket-1');
      const history = service.getAllConnectionHistory();

      expect(history).toHaveLength(1);
      expect(history[0].deviceType).toBe('mobile');
    });
  });

  describe('getConnection', () => {
    it('should return connection by socket ID', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');

      const connection = service.getConnection('socket-1');

      expect(connection).toBeDefined();
      expect(connection?.socketId).toBe('socket-1');
    });

    it('should return undefined for non-existent connection', () => {
      const connection = service.getConnection('non-existent');
      expect(connection).toBeUndefined();
    });
  });

  describe('getUserConnections', () => {
    it('should return all connections for user', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');
      service.registerConnection('socket-3', 'user-2', { deviceType: 'web' }, '192.168.1.3');

      const connections = service.getUserConnections('user-1');

      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.socketId)).toContain('socket-1');
      expect(connections.map((c) => c.socketId)).toContain('socket-2');
    });

    it('should return empty array for user with no connections', () => {
      const connections = service.getUserConnections('non-existent');
      expect(connections).toEqual([]);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return correct count', () => {
      expect(service.getUserConnectionCount('user-1')).toBe(0);

      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      expect(service.getUserConnectionCount('user-1')).toBe(1);

      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');
      expect(service.getUserConnectionCount('user-1')).toBe(2);
    });
  });

  describe('isUserConnected', () => {
    it('should return true when user has connections', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      expect(service.isUserConnected('user-1')).toBe(true);
    });

    it('should return false when user has no connections', () => {
      expect(service.isUserConnected('user-1')).toBe(false);
    });

    it('should return false after all connections unregistered', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.unregisterConnection('socket-1');
      expect(service.isUserConnected('user-1')).toBe(false);
    });
  });

  describe('updateActivity', () => {
    it('should update last activity time', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      const oldActivity = service.getConnection('socket-1')?.lastActivityAt;

      // Wait a bit
      jest.advanceTimersByTime(1000);
      service.updateActivity('socket-1');

      const newActivity = service.getConnection('socket-1')?.lastActivityAt;
      expect(newActivity?.getTime()).toBeGreaterThan(oldActivity?.getTime() || 0);
    });
  });

  describe('connection rooms', () => {
    beforeEach(() => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
    });

    it('should add room to connection', () => {
      service.addConnectionRoom('socket-1', 'room-1');
      service.addConnectionRoom('socket-1', 'room-2');

      const connection = service.getConnection('socket-1');
      expect(connection?.rooms).toContain('room-1');
      expect(connection?.rooms).toContain('room-2');
    });

    it('should not add duplicate rooms', () => {
      service.addConnectionRoom('socket-1', 'room-1');
      service.addConnectionRoom('socket-1', 'room-1');

      const connection = service.getConnection('socket-1');
      expect(connection?.rooms).toHaveLength(1);
    });

    it('should remove room from connection', () => {
      service.addConnectionRoom('socket-1', 'room-1');
      service.addConnectionRoom('socket-1', 'room-2');
      service.removeConnectionRoom('socket-1', 'room-1');

      const connection = service.getConnection('socket-1');
      expect(connection?.rooms).not.toContain('room-1');
      expect(connection?.rooms).toContain('room-2');
    });

    it('should update all rooms', () => {
      service.updateConnectionRooms('socket-1', ['room-1', 'room-2', 'room-3']);

      const connection = service.getConnection('socket-1');
      expect(connection?.rooms).toHaveLength(3);
    });
  });

  describe('getConnectionsInRoom', () => {
    it('should return connections in room', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', { deviceType: 'desktop' }, '192.168.1.2');
      service.registerConnection('socket-3', 'user-3', { deviceType: 'web' }, '192.168.1.3');

      service.addConnectionRoom('socket-1', 'room-1');
      service.addConnectionRoom('socket-2', 'room-1');
      service.addConnectionRoom('socket-3', 'room-2');

      const connections = service.getConnectionsInRoom('room-1');

      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.socketId)).toContain('socket-1');
      expect(connections.map((c) => c.socketId)).toContain('socket-2');
    });
  });

  describe('getConnectionsByDeviceType', () => {
    it('should filter by device type', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', { deviceType: 'mobile' }, '192.168.1.2');
      service.registerConnection('socket-3', 'user-3', { deviceType: 'desktop' }, '192.168.1.3');

      const mobileConnections = service.getConnectionsByDeviceType('mobile');

      expect(mobileConnections).toHaveLength(2);
      expect(mobileConnections.map((c) => c.socketId)).toContain('socket-1');
      expect(mobileConnections.map((c) => c.socketId)).toContain('socket-2');
    });
  });

  describe('getUserActiveDevices', () => {
    it('should return all active devices for user', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile', deviceId: 'mobile-1' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop', deviceId: 'desktop-1' }, '192.168.1.2');

      const devices = service.getUserActiveDevices('user-1');

      expect(devices).toHaveLength(2);
      expect(devices.map((d) => d.deviceType)).toContain('mobile');
      expect(devices.map((d) => d.deviceType)).toContain('desktop');
    });
  });

  describe('getUserPrimaryConnection', () => {
    it('should return most recent active connection', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');

      // Update activity on first connection
      service.updateActivity('socket-1');

      const primary = service.getUserPrimaryConnection('user-1');
      expect(primary?.socketId).toBe('socket-1');
    });

    it('should return undefined when no connections', () => {
      const primary = service.getUserPrimaryConnection('user-1');
      expect(primary).toBeUndefined();
    });
  });

  describe('disconnectAllUserConnections', () => {
    it('should disconnect all connections for user', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');

      const count = service.disconnectAllUserConnections('user-1');

      expect(count).toBe(2);
      expect(service.isUserConnected('user-1')).toBe(false);
    });
  });

  describe('disconnectByDeviceType', () => {
    it('should disconnect only specified device type', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');
      service.registerConnection('socket-3', 'user-1', { deviceType: 'mobile' }, '192.168.1.3');

      const count = service.disconnectByDeviceType('user-1', 'mobile');

      expect(count).toBe(2);
      expect(service.getUserConnectionCount('user-1')).toBe(1);
    });
  });

  describe('parseDeviceInfo', () => {
    it('should parse mobile user agent', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      const deviceInfo = service.parseDeviceInfo(userAgent, {});

      expect(deviceInfo.deviceType).toBe('mobile');
      expect(deviceInfo.os).toBe('iOS');
    });

    it('should parse desktop user agent', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124';
      const deviceInfo = service.parseDeviceInfo(userAgent, {});

      expect(deviceInfo.os).toBe('Windows');
      expect(deviceInfo.browser).toBe('Chrome');
    });

    it('should use query params when provided', () => {
      const deviceInfo = service.parseDeviceInfo('', { deviceType: 'tablet', os: 'Android', appVersion: '1.0.0' });

      expect(deviceInfo.deviceType).toBe('tablet');
      expect(deviceInfo.os).toBe('Android');
      expect(deviceInfo.appVersion).toBe('1.0.0');
    });
  });

  describe('isSocketConnected', () => {
    it('should return true for connected socket', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      expect(service.isSocketConnected('socket-1')).toBe(true);
    });

    it('should return false for disconnected socket', () => {
      expect(service.isSocketConnected('non-existent')).toBe(false);
    });
  });

  describe('getOnlineUserCount', () => {
    it('should return unique online users', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', { deviceType: 'desktop' }, '192.168.1.2');
      service.registerConnection('socket-3', 'user-2', { deviceType: 'web' }, '192.168.1.3');

      expect(service.getOnlineUserCount()).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should return connection statistics', () => {
      service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', { deviceType: 'desktop' }, '192.168.1.2');

      const stats = service.getStatistics();

      expect(stats.totalActiveConnections).toBe(2);
      expect(stats.totalActiveUsers).toBe(2);
      expect(stats.connectionsByDevice.mobile).toBe(1);
      expect(stats.connectionsByDevice.desktop).toBe(1);
    });
  });
});
