/**
 * Connection Service
 *
 * Manages user connection tracking including multi-device connections,
 * connection history, and device information storage.
 */

import { connectionManager } from '../socket/connectionManager';

/**
 * Device information
 */
export interface DeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web' | 'unknown';
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  appVersion?: string;
  brand?: string;
  model?: string;
}

/**
 * Connection record
 */
export interface ConnectionRecord {
  id: string;
  userId: string;
  socketId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  lastActivityAt: Date;
  duration?: number; // in milliseconds
  namespace: string;
  rooms: string[];
  status: 'active' | 'disconnected' | 'idle';
}

/**
 * Connection history entry
 */
export interface ConnectionHistoryEntry {
  connectionId: string;
  userId: string;
  deviceType: string;
  connectedAt: Date;
  disconnectedAt: Date;
  duration: number;
  ipAddress: string;
}

/**
 * Active connection info
 */
export interface ActiveConnection {
  socketId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  connectedAt: Date;
  lastActivityAt: Date;
  namespace: string;
  rooms: string[];
  isOnline: boolean;
}

/**
 * Connection statistics
 */
export interface ConnectionStatistics {
  totalActiveConnections: number;
  totalActiveUsers: number;
  connectionsByDevice: Record<string, number>;
  connectionsByNamespace: Record<string, number>;
  averageConnectionsPerUser: number;
  idleConnections: number;
}

/**
 * Connection Service class
 */
export class ConnectionService {
  private connections: Map<string, ConnectionRecord> = new Map(); // socketId -> ConnectionRecord
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private connectionHistory: ConnectionHistoryEntry[] = [];
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private historyLimit = 1000; // Max history entries to keep

  /**
   * Register a new connection
   */
  registerConnection(
    socketId: string,
    userId: string,
    deviceInfo: Partial<DeviceInfo>,
    ipAddress: string,
    namespace: string = '/'
  ): ConnectionRecord {
    const connection: ConnectionRecord = {
      id: `${userId}_${socketId}_${Date.now()}`,
      userId,
      socketId,
      deviceInfo: this.normalizeDeviceInfo(deviceInfo),
      ipAddress,
      connectedAt: new Date(),
      lastActivityAt: new Date(),
      namespace,
      rooms: [],
      status: 'active',
    };

    this.connections.set(socketId, connection);

    // Track user's connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socketId);

    console.log(`[ConnectionService] Registered connection: ${socketId} for user: ${userId}`);
    return connection;
  }

  /**
   * Unregister a connection
   */
  unregisterConnection(socketId: string): ConnectionRecord | undefined {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return undefined;
    }

    connection.disconnectedAt = new Date();
    connection.status = 'disconnected';
    connection.duration = connection.disconnectedAt.getTime() - connection.connectedAt.getTime();

    // Add to history
    this.addToHistory(connection);

    // Remove from active connections
    this.connections.delete(socketId);

    // Remove from user's connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(socketId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    console.log(`[ConnectionService] Unregistered connection: ${socketId}`);
    return connection;
  }

  /**
   * Get connection by socket ID
   */
  getConnection(socketId: string): ConnectionRecord | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ConnectionRecord[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections for a user
   */
  getUserConnections(userId: string): ConnectionRecord[] {
    const socketIds = this.userConnections.get(userId);
    if (!socketIds) {
      return [];
    }
    return Array.from(socketIds)
      .map((id) => this.connections.get(id))
      .filter(Boolean) as ConnectionRecord[];
  }

  /**
   * Get active connection count for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size ?? 0;
  }

  /**
   * Check if user has any active connections
   */
  isUserConnected(userId: string): boolean {
    const connections = this.userConnections.get(userId);
    if (!connections) {
      return false;
    }
    return connections.size > 0;
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivityAt = new Date();
      connection.status = 'active';
    }
  }

  /**
   * Update connection rooms
   */
  updateConnectionRooms(socketId: string, rooms: string[]): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms = rooms;
    }
  }

  /**
   * Add room to connection
   */
  addConnectionRoom(socketId: string, roomId: string): void {
    const connection = this.connections.get(socketId);
    if (connection && !connection.rooms.includes(roomId)) {
      connection.rooms.push(roomId);
    }
  }

  /**
   * Remove room from connection
   */
  removeConnectionRoom(socketId: string, roomId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms = connection.rooms.filter((r) => r !== roomId);
    }
  }

  /**
   * Get connections in a room
   */
  getConnectionsInRoom(roomId: string): ConnectionRecord[] {
    return this.getAllConnections().filter((conn) => conn.rooms.includes(roomId));
  }

  /**
   * Get connections by device type
   */
  getConnectionsByDeviceType(deviceType: DeviceInfo['deviceType']): ConnectionRecord[] {
    return this.getAllConnections().filter((conn) => conn.deviceInfo.deviceType === deviceType);
  }

  /**
   * Get connection statistics
   */
  getStatistics(): ConnectionStatistics {
    const connections = this.getAllConnections();
    const connectionsByDevice: Record<string, number> = {};
    const connectionsByNamespace: Record<string, number> = {};
    let idleConnections = 0;
    const now = Date.now();

    for (const conn of connections) {
      // Count by device type
      const deviceType = conn.deviceInfo.deviceType;
      connectionsByDevice[deviceType] = (connectionsByDevice[deviceType] || 0) + 1;

      // Count by namespace
      connectionsByNamespace[conn.namespace] = (connectionsByNamespace[conn.namespace] || 0) + 1;

      // Check idle
      if (now - conn.lastActivityAt.getTime() > this.IDLE_TIMEOUT_MS) {
        idleConnections++;
        conn.status = 'idle';
      }
    }

    const userCount = this.userConnections.size;
    const avgConnectionsPerUser = userCount > 0 ? connections.length / userCount : 0;

    return {
      totalActiveConnections: connections.length,
      totalActiveUsers: userCount,
      connectionsByDevice,
      connectionsByNamespace,
      averageConnectionsPerUser: Math.round(avgConnectionsPerUser * 100) / 100,
      idleConnections,
    };
  }

  /**
   * Get connection history for a user
   */
  getUserConnectionHistory(userId: string): ConnectionHistoryEntry[] {
    return this.connectionHistory.filter((entry) => entry.userId === userId);
  }

  /**
   * Get all connection history
   */
  getAllConnectionHistory(): ConnectionHistoryEntry[] {
    return [...this.connectionHistory];
  }

  /**
   * Get user's active devices
   */
  getUserActiveDevices(userId: string): DeviceInfo[] {
    const connections = this.getUserConnections(userId);
    return connections.map((conn) => conn.deviceInfo);
  }

  /**
   * Get user's primary connection (most recent active)
   */
  getUserPrimaryConnection(userId: string): ConnectionRecord | undefined {
    const connections = this.getUserConnections(userId);
    if (connections.length === 0) {
      return undefined;
    }
    return connections.sort(
      (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
    )[0];
  }

  /**
   * Disconnect all connections for a user
   */
  disconnectAllUserConnections(userId: string): number {
    const connections = this.userConnections.get(userId);
    if (!connections) {
      return 0;
    }

    let count = 0;
    for (const socketId of connections) {
      if (this.unregisterConnection(socketId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Disconnect connections by device type
   */
  disconnectByDeviceType(userId: string, deviceType: DeviceInfo['deviceType']): number {
    const connections = this.getUserConnections(userId);
    let count = 0;

    for (const conn of connections) {
      if (conn.deviceInfo.deviceType === deviceType) {
        if (this.unregisterConnection(conn.socketId)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Clean up idle connections
   */
  cleanupIdleConnections(maxIdleMs: number = this.IDLE_TIMEOUT_MS): number {
    const now = Date.now();
    let count = 0;

    for (const [socketId, connection] of this.connections) {
      if (now - connection.lastActivityAt.getTime() > maxIdleMs) {
        this.unregisterConnection(socketId);
        count++;
      }
    }

    return count;
  }

  /**
   * Clean up old history entries
   */
  private cleanupHistory(): void {
    if (this.connectionHistory.length > this.historyLimit) {
      // Keep only the most recent entries
      this.connectionHistory = this.connectionHistory
        .sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime())
        .slice(0, this.historyLimit);
    }
  }

  /**
   * Add connection to history
   */
  private addToHistory(connection: ConnectionRecord): void {
    if (!connection.disconnectedAt || !connection.duration) {
      return;
    }

    const entry: ConnectionHistoryEntry = {
      connectionId: connection.id,
      userId: connection.userId,
      deviceType: connection.deviceInfo.deviceType,
      connectedAt: connection.connectedAt,
      disconnectedAt: connection.disconnectedAt,
      duration: connection.duration,
      ipAddress: connection.ipAddress,
    };

    this.connectionHistory.push(entry);
    this.cleanupHistory();
  }

  /**
   * Normalize device info
   */
  private normalizeDeviceInfo(info: Partial<DeviceInfo>): DeviceInfo {
    return {
      deviceId: info.deviceId || 'unknown',
      deviceType: info.deviceType || 'unknown',
      os: info.os,
      osVersion: info.osVersion,
      browser: info.browser,
      browserVersion: info.browserVersion,
      appVersion: info.appVersion,
      brand: info.brand,
      model: info.model,
    };
  }

  /**
   * Parse device info from user agent and query params
   */
  parseDeviceInfo(userAgent?: string, query?: Record<string, any>): DeviceInfo {
    const deviceInfo: DeviceInfo = {
      deviceId: query?.deviceId || 'unknown',
      deviceType: 'unknown',
    };

    // Parse from user agent
    if (userAgent) {
      // Mobile detection
      if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        if (/iPad|Tablet/i.test(userAgent)) {
          deviceInfo.deviceType = 'tablet';
        } else {
          deviceInfo.deviceType = 'mobile';
        }
      } else if (/Electron/i.test(userAgent)) {
        deviceInfo.deviceType = 'desktop';
      }

      // OS detection
      if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceInfo.os = 'iOS';
      } else if (/Windows/i.test(userAgent)) {
        deviceInfo.os = 'Windows';
      } else if (/Mac/i.test(userAgent)) {
        deviceInfo.os = 'macOS';
      } else if (/Linux/i.test(userAgent)) {
        deviceInfo.os = 'Linux';
      } else if (/Android/i.test(userAgent)) {
        deviceInfo.os = 'Android';
      }

      // Browser detection
      if (/Chrome/i.test(userAgent)) {
        deviceInfo.browser = 'Chrome';
      } else if (/Firefox/i.test(userAgent)) {
        deviceInfo.browser = 'Firefox';
      } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
        deviceInfo.browser = 'Safari';
      } else if (/Edge/i.test(userAgent)) {
        deviceInfo.browser = 'Edge';
      }
    }

    // Override with query params if provided
    if (query?.deviceType) {
      deviceInfo.deviceType = query.deviceType as DeviceInfo['deviceType'];
    }
    if (query?.os) {
      deviceInfo.os = query.os;
    }
    if (query?.appVersion) {
      deviceInfo.appVersion = query.appVersion;
    }

    return deviceInfo;
  }

  /**
   * Clear all connections (for testing/shutdown)
   */
  clearAllConnections(): void {
    // Move all active to history
    for (const [socketId, connection] of this.connections) {
      connection.disconnectedAt = new Date();
      connection.duration = connection.disconnectedAt.getTime() - connection.connectedAt.getTime();
      this.addToHistory(connection);
    }

    this.connections.clear();
    this.userConnections.clear();
    console.log('[ConnectionService] All connections cleared');
  }

  /**
   * Get total unique users online
   */
  getOnlineUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Check if a specific socket is connected
   */
  isSocketConnected(socketId: string): boolean {
    return this.connections.has(socketId);
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();
export default connectionService;
