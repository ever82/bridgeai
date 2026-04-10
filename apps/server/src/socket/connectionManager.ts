/**
 * Socket.io Connection Manager
 *
 * Manages socket connections with heartbeat monitoring,
 * connection statistics, and cleanup.
 */
import type { Socket, Server as SocketServer } from 'socket.io';

/**
 * Connection info
 */
interface ConnectionInfo {
  socketId: string;
  userId?: string;
  namespace: string;
  connectedAt: Date;
  lastPingAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

/**
 * Connection statistics
 */
interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  connectionsByNamespace: Record<string, number>;
  connectionsByUser: Record<string, number>;
}

/**
 * Connection Manager class
 */
class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private io: SocketServer | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private readonly STATS_INTERVAL_MS = 60000; // 1 minute

  /**
   * Initialize connection manager
   */
  initialize(io: SocketServer): void {
    this.io = io;
    this.startStatsCollection();
    console.log('[ConnectionManager] Initialized');
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
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      deviceInfo: socket.handshake.query?.deviceInfo as Record<string, any>,
    };

    this.connections.set(socket.id, info);

    // Setup ping/pong monitoring
    this.setupHeartbeat(socket);

    console.log(
      `[ConnectionManager] Added connection: ${socket.id} (user: ${info.userId}, ns: ${namespace})`
    );
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      this.connections.delete(socketId);
      console.log(
        `[ConnectionManager] Removed connection: ${socketId} (user: ${info.userId})`
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

    return {
      totalConnections: connections.length,
      authenticatedConnections: connections.filter((c) => c.userId).length,
      connectionsByNamespace,
      connectionsByUser,
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
   * Update last ping time
   */
  updatePing(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastPingAt = new Date();
    }
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
   * Clean up stale connections
   */
  cleanupStaleConnections(maxAgeMs: number = 300000): void {
    // Default: 5 minutes
    const now = Date.now();
    const staleSockets: string[] = [];

    for (const [socketId, info] of this.connections) {
      const lastPingAge = now - info.lastPingAt.getTime();
      if (lastPingAge > maxAgeMs) {
        staleSockets.push(socketId);
      }
    }

    for (const socketId of staleSockets) {
      this.disconnectSocket(socketId, 'stale connection');
    }

    if (staleSockets.length > 0) {
      console.log(`[ConnectionManager] Cleaned up ${staleSockets.length} stale connections`);
    }
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
      });
    });

    // Update ping on any activity
    socket.onAny(() => {
      this.updatePing(socket.id);
    });
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
        byNamespace: stats.connectionsByNamespace,
      });

      // Cleanup stale connections every 5 minutes
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
   * Destroy connection manager
   */
  destroy(): void {
    this.stopStatsCollection();
    this.connections.clear();
    this.io = null;
    console.log('[ConnectionManager] Destroyed');
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;
