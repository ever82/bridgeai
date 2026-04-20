/**
 * Socket.io Connection Manager
 *
 * Manages socket connections with heartbeat monitoring,
 * disconnect detection, connection pool management, and statistics.
 */
import type { Socket, Server as SocketServer } from 'socket.io';

/**
 * Connection info
 */
export interface ConnectionInfo {
  socketId: string;
  userId?: string;
  namespace: string;
  connectedAt: Date;
  lastPingAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  rooms: string[];
  metadata?: Record<string, any>;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  anonymousConnections: number;
  connectionsByNamespace: Record<string, number>;
  connectionsByUser: Record<string, number>;
  onlineUserCount: number;
  averageConnectionsPerUser: number;
  peakConnections: number;
  uptime: number;
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxTotalConnections: number;
  maxConnectionsPerUser: number;
  maxConnectionsPerIP: number;
  idleTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxHeartbeatMisses: number;
}

/**
 * Default pool configuration
 */
const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxTotalConnections: parseInt(process.env.SOCKET_MAX_TOTAL_CONNECTIONS || '10000', 10),
  maxConnectionsPerUser: parseInt(process.env.SOCKET_MAX_CONNECTIONS_PER_USER || '5', 10),
  maxConnectionsPerIP: parseInt(process.env.SOCKET_MAX_CONNECTIONS_PER_IP || '20', 10),
  idleTimeoutMs: parseInt(process.env.SOCKET_IDLE_TIMEOUT_MS || '300000', 10), // 5 minutes
  heartbeatIntervalMs: parseInt(process.env.SOCKET_HEARTBEAT_INTERVAL_MS || '25000', 10), // 25 seconds
  maxHeartbeatMisses: 3,
};

/**
 * Connection Manager class
 * Implements heartbeat mechanism, disconnect detection, connection pool, and statistics
 */
class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private io: SocketServer | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly STATS_INTERVAL_MS = 60000; // 1 minute
  private peakConnections = 0;
  private startTime = Date.now();
  private readonly config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig = DEFAULT_POOL_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize connection manager
   */
  initialize(io: SocketServer): void {
    this.io = io;
    this.startTime = Date.now();
    this.startStatsCollection();
    this.startHeartbeat();
    console.log('[ConnectionManager] Initialized with config:', this.config);
  }

  /**
   * Add a new connection
   */
  addConnection(socket: Socket, namespace: string): void {
    const info: ConnectionInfo = {
      socketId: socket.id,
      userId: socket.user?.id,
      namespace,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      lastActivityAt: new Date(),
      ipAddress: this.extractIPAddress(socket),
      userAgent: socket.handshake.headers['user-agent'],
      deviceInfo: socket.handshake.query?.deviceInfo as Record<string, any>,
      rooms: [],
      metadata: {
        connectedVia: socket.conn?.transport?.name || 'unknown',
      },
    };

    this.connections.set(socket.id, info);

    // Update peak connections
    if (this.connections.size > this.peakConnections) {
      this.peakConnections = this.connections.size;
    }

    // Setup heartbeat monitoring
    this.setupHeartbeat(socket);

    // Setup disconnect detection
    this.setupDisconnectDetection(socket);

    console.log(
      `[ConnectionManager] Added connection: ${socket.id} (user: ${info.userId}, ns: ${namespace}, ip: ${info.ipAddress})`
    );
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      const duration = Date.now() - info.connectedAt.getTime();
      this.connections.delete(socketId);
      console.log(
        `[ConnectionManager] Removed connection: ${socketId} (user: ${info.userId}, duration: ${Math.round(duration / 1000)}s)`
      );
    }
  }

  /**
   * Get connection info
   */
  getConnection(socketId: string): ConnectionInfo | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by user ID
   */
  getUserConnections(userId: string): ConnectionInfo[] {
    return this.getAllConnections().filter((conn) => conn.userId === userId);
  }

  /**
   * Get connections by namespace
   */
  getNamespaceConnections(namespace: string): ConnectionInfo[] {
    return this.getAllConnections().filter((conn) => conn.namespace === namespace);
  }

  /**
   * Get connections by IP address
   */
  getConnectionsByIP(ipAddress: string): ConnectionInfo[] {
    return this.getAllConnections().filter((conn) => conn.ipAddress === ipAddress);
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const connections = this.getAllConnections();
    const connectionsByNamespace: Record<string, number> = {};
    const connectionsByUser: Record<string, number> = {};

    for (const conn of connections) {
      // Count by namespace
      connectionsByNamespace[conn.namespace] =
        (connectionsByNamespace[conn.namespace] || 0) + 1;

      // Count by user
      if (conn.userId) {
        connectionsByUser[conn.userId] = (connectionsByUser[conn.userId] || 0) + 1;
      }
    }

    const uniqueUsers = new Set(
      connections.filter((c) => c.userId).map((c) => c.userId)
    );

    const totalAuthenticated = uniqueUsers.size;
    const avgConnectionsPerUser =
      totalAuthenticated > 0 ? connections.length / totalAuthenticated : 0;

    return {
      totalConnections: connections.length,
      authenticatedConnections: connections.filter((c) => c.userId).length,
      anonymousConnections: connections.filter((c) => !c.userId).length,
      connectionsByNamespace,
      connectionsByUser,
      onlineUserCount: uniqueUsers.size,
      averageConnectionsPerUser: Math.round(avgConnectionsPerUser * 100) / 100,
      peakConnections: this.peakConnections,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.getUserConnections(userId).length > 0;
  }

  /**
   * Get online user count
   */
  getOnlineUserCount(): number {
    const userIds = new Set(
      this.getAllConnections().map((c) => c.userId).filter(Boolean)
    );
    return userIds.size;
  }

  /**
   * Update last ping time (heartbeat response)
   */
  updatePing(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastPingAt = new Date();
      info.lastActivityAt = new Date();
    }
  }

  /**
   * Update last activity time
   */
  updateActivity(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastActivityAt = new Date();
    }
  }

  /**
   * Add room to connection
   */
  addConnectionRoom(socketId: string, room: string): void {
    const info = this.connections.get(socketId);
    if (info && !info.rooms.includes(room)) {
      info.rooms.push(room);
    }
  }

  /**
   * Remove room from connection
   */
  removeConnectionRoom(socketId: string, room: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.rooms = info.rooms.filter((r) => r !== room);
    }
  }

  /**
   * Get rooms for a connection
   */
  getConnectionRooms(socketId: string): string[] {
    return this.connections.get(socketId)?.rooms || [];
  }

  /**
   * Disconnect a specific socket
   */
  async disconnectSocket(socketId: string, reason?: string): Promise<void> {
    if (!this.io) return;

    // Try to find and disconnect socket in all namespaces
    for (const nsp of this.io.nsps.values()) {
      const socket = nsp.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        console.log(
          `[ConnectionManager] Disconnected socket: ${socketId} (reason: ${reason || 'admin action'})`
        );
        break;
      }
    }

    this.removeConnection(socketId);
  }

  /**
   * Disconnect all sockets for a user
   */
  async disconnectUser(userId: string, reason?: string): Promise<void> {
    const connections = this.getUserConnections(userId);

    for (const conn of connections) {
      await this.disconnectSocket(conn.socketId, reason);
    }

    console.log(
      `[ConnectionManager] Disconnected all sockets for user: ${userId} (reason: ${reason || 'admin action'})`
    );
  }

  /**
   * Disconnect all connections from an IP
   */
  async disconnectIP(ipAddress: string, reason?: string): Promise<number> {
    const connections = this.getConnectionsByIP(ipAddress);
    let count = 0;

    for (const conn of connections) {
      await this.disconnectSocket(conn.socketId, reason || 'IP limit exceeded');
      count++;
    }

    console.log(
      `[ConnectionManager] Disconnected ${count} connections from IP: ${ipAddress}`
    );

    return count;
  }

  /**
   * Clean up stale connections (idle timeout)
   */
  cleanupStaleConnections(maxAgeMs: number = this.config.idleTimeoutMs): void {
    const now = Date.now();
    const staleSockets: string[] = [];

    for (const [socketId, info] of this.connections) {
      const lastPingAge = now - info.lastPingAt.getTime();
      if (lastPingAge > maxAgeMs) {
        staleSockets.push(socketId);
      }
    }

    for (const socketId of staleSockets) {
      this.disconnectSocket(socketId, 'stale connection (idle timeout)');
    }

    if (staleSockets.length > 0) {
      console.log(`[ConnectionManager] Cleaned up ${staleSockets.length} stale connections`);
    }
  }

  /**
   * Get pool configuration
   */
  getPoolConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  /**
   * Check if pool allows new connections
   */
  canAcceptConnection(userId?: string, ipAddress?: string): {
    allowed: boolean;
    reason?: string;
  } {
    const stats = this.getStats();

    // Check total limit
    if (stats.totalConnections >= this.config.maxTotalConnections) {
      return { allowed: false, reason: 'Server at maximum capacity' };
    }

    // Check per-user limit
    if (userId) {
      const userConnections = this.getUserConnections(userId).length;
      if (userConnections >= this.config.maxConnectionsPerUser) {
        return {
          allowed: false,
          reason: `Maximum ${this.config.maxConnectionsPerUser} connections per user exceeded`,
        };
      }
    }

    // Check per-IP limit
    if (ipAddress) {
      const ipConnections = this.getConnectionsByIP(ipAddress).length;
      if (ipConnections >= this.config.maxConnectionsPerIP) {
        return {
          allowed: false,
          reason: `Maximum ${this.config.maxConnectionsPerIP} connections per IP exceeded`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Setup heartbeat monitoring for a socket
   */
  private setupHeartbeat(socket: Socket): void {
    // Listen for custom ping from client
    socket.on('ping', () => {
      this.updatePing(socket.id);
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      });
    });

    // Update ping on any activity
    socket.onAny(() => {
      this.updateActivity(socket.id);
    });

    // Listen for heartbeat response
    socket.on('heartbeat:ack', () => {
      this.updatePing(socket.id);
    });
  }

  /**
   * Setup disconnect detection
   */
  private setupDisconnectDetection(socket: Socket): void {
    socket.on('disconnect', (reason) => {
      // Log disconnect reason for debugging
      if (reason === 'ping timeout' || reason === 'transport close') {
        console.log(
          `[ConnectionManager] Client disconnect detected: ${socket.id} (reason: ${reason})`
        );
      }
      this.removeConnection(socket.id);
    });

    socket.on('error', (error) => {
      console.error(`[ConnectionManager] Socket error: ${socket.id}`, error);
      this.removeConnection(socket.id);
    });
  }

  /**
   * Start heartbeat broadcast
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (!this.io) return;

      // Broadcast heartbeat to all connections
      this.io.emit('heartbeat', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      });

      // Check for missed heartbeats
      const now = Date.now();
      const heartbeatTimeout =
        this.config.heartbeatIntervalMs * this.config.maxHeartbeatMisses;

      for (const [socketId, info] of this.connections) {
        const missedTime = now - info.lastPingAt.getTime();
        if (missedTime > heartbeatTimeout) {
          console.log(
            `[ConnectionManager] Client missed heartbeats: ${socketId} (missed: ${Math.floor(missedTime / this.config.heartbeatIntervalMs)})`
          );
          this.disconnectSocket(socketId, 'heartbeat timeout');
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      console.log('[ConnectionManager] Stats:', {
        total: stats.totalConnections,
        authenticated: stats.authenticatedConnections,
        onlineUsers: stats.onlineUserCount,
        peak: stats.peakConnections,
        byNamespace: stats.connectionsByNamespace,
      });

      // Cleanup stale connections
      this.cleanupStaleConnections();
    }, this.STATS_INTERVAL_MS);
  }

  /**
   * Stop statistics collection
   */
  stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Extract IP address from socket
   */
  private extractIPAddress(socket: Socket): string {
    // Check for forwarded IP (behind proxy)
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }

    // Check for real IP header
    const realIP = socket.handshake.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    // Fall back to socket address
    return socket.handshake.address || 'unknown';
  }

  /**
   * Destroy connection manager
   */
  destroy(): void {
    this.stopStatsCollection();
    this.stopHeartbeat();
    this.connections.clear();
    this.io = null;
    console.log('[ConnectionManager] Destroyed');
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;
