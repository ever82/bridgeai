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
declare class ConnectionManager {
    private connections;
    private io;
    private statsInterval;
    private readonly STATS_INTERVAL_MS;
    /**
     * Initialize connection manager
     */
    initialize(io: SocketServer): void;
    /**
     * Add a new connection
     */
    addConnection(socket: Socket, namespace: string): void;
    /**
     * Remove a connection
     */
    removeConnection(socketId: string): void;
    /**
     * Get connection info
     */
    getConnection(socketId: string): ConnectionInfo | undefined;
    /**
     * Get all connections
     */
    getAllConnections(): ConnectionInfo[];
    /**
     * Get connections by user ID
     */
    getUserConnections(userId: string): ConnectionInfo[];
    /**
     * Get connections by namespace
     */
    getNamespaceConnections(namespace: string): ConnectionInfo[];
    /**
     * Get connection statistics
     */
    getStats(): ConnectionStats;
    /**
     * Check if user is online
     */
    isUserOnline(userId: string): boolean;
    /**
     * Get online user count
     */
    getOnlineUserCount(): number;
    /**
     * Update last ping time
     */
    updatePing(socketId: string): void;
    /**
     * Disconnect a specific socket
     */
    disconnectSocket(socketId: string, reason?: string): Promise<void>;
    /**
     * Disconnect all sockets for a user
     */
    disconnectUser(userId: string, reason?: string): Promise<void>;
    /**
     * Clean up stale connections
     */
    cleanupStaleConnections(maxAgeMs?: number): void;
    /**
     * Setup heartbeat monitoring for a socket
     */
    private setupHeartbeat;
    /**
     * Start statistics collection
     */
    private startStatsCollection;
    /**
     * Stop statistics collection
     */
    stopStatsCollection(): void;
    /**
     * Destroy connection manager
     */
    destroy(): void;
}
export declare const connectionManager: ConnectionManager;
export default connectionManager;
//# sourceMappingURL=connectionManager.d.ts.map