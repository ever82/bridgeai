/**
 * Connection Service
 *
 * Manages user connection tracking including multi-device connections,
 * connection history, and device information storage.
 */
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
    duration?: number;
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
export declare class ConnectionService {
    private connections;
    private userConnections;
    private connectionHistory;
    private readonly IDLE_TIMEOUT_MS;
    private historyLimit;
    /**
     * Register a new connection
     */
    registerConnection(socketId: string, userId: string, deviceInfo: Partial<DeviceInfo>, ipAddress: string, namespace?: string): ConnectionRecord;
    /**
     * Unregister a connection
     */
    unregisterConnection(socketId: string): ConnectionRecord | undefined;
    /**
     * Get connection by socket ID
     */
    getConnection(socketId: string): ConnectionRecord | undefined;
    /**
     * Get all active connections
     */
    getAllConnections(): ConnectionRecord[];
    /**
     * Get connections for a user
     */
    getUserConnections(userId: string): ConnectionRecord[];
    /**
     * Get active connection count for a user
     */
    getUserConnectionCount(userId: string): number;
    /**
     * Check if user has any active connections
     */
    isUserConnected(userId: string): boolean;
    /**
     * Update connection activity
     */
    updateActivity(socketId: string): void;
    /**
     * Update connection rooms
     */
    updateConnectionRooms(socketId: string, rooms: string[]): void;
    /**
     * Add room to connection
     */
    addConnectionRoom(socketId: string, roomId: string): void;
    /**
     * Remove room from connection
     */
    removeConnectionRoom(socketId: string, roomId: string): void;
    /**
     * Get connections in a room
     */
    getConnectionsInRoom(roomId: string): ConnectionRecord[];
    /**
     * Get connections by device type
     */
    getConnectionsByDeviceType(deviceType: DeviceInfo['deviceType']): ConnectionRecord[];
    /**
     * Get connection statistics
     */
    getStatistics(): ConnectionStatistics;
    /**
     * Get connection history for a user
     */
    getUserConnectionHistory(userId: string): ConnectionHistoryEntry[];
    /**
     * Get all connection history
     */
    getAllConnectionHistory(): ConnectionHistoryEntry[];
    /**
     * Get user's active devices
     */
    getUserActiveDevices(userId: string): DeviceInfo[];
    /**
     * Get user's primary connection (most recent active)
     */
    getUserPrimaryConnection(userId: string): ConnectionRecord | undefined;
    /**
     * Disconnect all connections for a user
     */
    disconnectAllUserConnections(userId: string): number;
    /**
     * Disconnect connections by device type
     */
    disconnectByDeviceType(userId: string, deviceType: DeviceInfo['deviceType']): number;
    /**
     * Clean up idle connections
     */
    cleanupIdleConnections(maxIdleMs?: number): number;
    /**
     * Clean up old history entries
     */
    private cleanupHistory;
    /**
     * Add connection to history
     */
    private addToHistory;
    /**
     * Normalize device info
     */
    private normalizeDeviceInfo;
    /**
     * Parse device info from user agent and query params
     */
    parseDeviceInfo(userAgent?: string, query?: Record<string, any>): DeviceInfo;
    /**
     * Clear all connections (for testing/shutdown)
     */
    clearAllConnections(): void;
    /**
     * Get total unique users online
     */
    getOnlineUserCount(): number;
    /**
     * Check if a specific socket is connected
     */
    isSocketConnected(socketId: string): boolean;
}
export declare const connectionService: ConnectionService;
export default connectionService;
//# sourceMappingURL=connectionService.d.ts.map