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
 * Connection Manager class
 * Implements heartbeat mechanism, disconnect detection, connection pool, and statistics
 */
declare class ConnectionManager {
    private connections;
    private io;
    private statsInterval;
    private heartbeatInterval;
    private readonly STATS_INTERVAL_MS;
    private peakConnections;
    private startTime;
    private readonly config;
    constructor(config?: ConnectionPoolConfig);
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
     * Get connections by IP address
     */
    getConnectionsByIP(ipAddress: string): ConnectionInfo[];
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
     * Update last ping time (heartbeat response)
     */
    updatePing(socketId: string): void;
    /**
     * Update last activity time
     */
    updateActivity(socketId: string): void;
    /**
     * Add room to connection
     */
    addConnectionRoom(socketId: string, room: string): void;
    /**
     * Remove room from connection
     */
    removeConnectionRoom(socketId: string, room: string): void;
    /**
     * Get rooms for a connection
     */
    getConnectionRooms(socketId: string): string[];
    /**
     * Disconnect a specific socket
     */
    disconnectSocket(socketId: string, reason?: string): Promise<void>;
    /**
     * Disconnect all sockets for a user
     */
    disconnectUser(userId: string, reason?: string): Promise<void>;
    /**
     * Disconnect all connections from an IP
     */
    disconnectIP(ipAddress: string, reason?: string): Promise<number>;
    /**
     * Clean up stale connections (idle timeout)
     */
    cleanupStaleConnections(maxAgeMs?: number): void;
    /**
     * Get pool configuration
     */
    getPoolConfig(): ConnectionPoolConfig;
    /**
     * Check if pool allows new connections
     */
    canAcceptConnection(userId?: string, ipAddress?: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Setup heartbeat monitoring for a socket
     */
    private setupHeartbeat;
    /**
     * Setup disconnect detection
     */
    private setupDisconnectDetection;
    /**
     * Start heartbeat broadcast
     */
    private startHeartbeat;
    /**
     * Start statistics collection
     */
    private startStatsCollection;
    /**
     * Stop statistics collection
     */
    stopStatsCollection(): void;
    /**
     * Stop heartbeat
     */
    private stopHeartbeat;
    /**
     * Extract IP address from socket
     */
    private extractIPAddress;
    /**
     * Destroy connection manager
     */
    destroy(): void;
}
export declare const connectionManager: ConnectionManager;
export default connectionManager;
//# sourceMappingURL=connectionManager.d.ts.map