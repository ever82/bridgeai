/**
 * Connection Service
 *
 * Manages user connection tracking including multi-device connections,
 * connection history, and device information storage.
 */
/**
 * Connection Service class
 */
export class ConnectionService {
    connections = new Map(); // socketId -> ConnectionRecord
    userConnections = new Map(); // userId -> Set of socketIds
    connectionHistory = [];
    IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    historyLimit = 1000; // Max history entries to keep
    /**
     * Register a new connection
     */
    registerConnection(socketId, userId, deviceInfo, ipAddress, namespace = '/') {
        // Clean up any stale registration of this socketId under a different user
        const existing = this.connections.get(socketId);
        if (existing) {
            const prevUserConnections = this.userConnections.get(existing.userId);
            if (prevUserConnections) {
                prevUserConnections.delete(socketId);
                if (prevUserConnections.size === 0) {
                    this.userConnections.delete(existing.userId);
                }
            }
        }
        const connection = {
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
        this.userConnections.get(userId).add(socketId);
        console.log(`[ConnectionService] Registered connection: ${socketId} for user: ${userId}`);
        return connection;
    }
    /**
     * Unregister a connection
     */
    unregisterConnection(socketId) {
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
    getConnection(socketId) {
        return this.connections.get(socketId);
    }
    /**
     * Get all active connections
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Get connections for a user
     */
    getUserConnections(userId) {
        const socketIds = this.userConnections.get(userId);
        if (!socketIds) {
            return [];
        }
        return Array.from(socketIds)
            .map(id => this.connections.get(id))
            .filter(Boolean);
    }
    /**
     * Get active connection count for a user
     */
    getUserConnectionCount(userId) {
        return this.userConnections.get(userId)?.size ?? 0;
    }
    /**
     * Check if user has any active connections
     */
    isUserConnected(userId) {
        const connections = this.userConnections.get(userId);
        if (!connections) {
            return false;
        }
        return connections.size > 0;
    }
    /**
     * Update connection activity
     */
    updateActivity(socketId) {
        const connection = this.connections.get(socketId);
        if (connection) {
            connection.lastActivityAt = new Date();
            connection.status = 'active';
        }
    }
    /**
     * Update connection rooms
     */
    updateConnectionRooms(socketId, rooms) {
        const connection = this.connections.get(socketId);
        if (connection) {
            connection.rooms = rooms;
        }
    }
    /**
     * Add room to connection
     */
    addConnectionRoom(socketId, roomId) {
        const connection = this.connections.get(socketId);
        if (connection && !connection.rooms.includes(roomId)) {
            connection.rooms.push(roomId);
        }
    }
    /**
     * Remove room from connection
     */
    removeConnectionRoom(socketId, roomId) {
        const connection = this.connections.get(socketId);
        if (connection) {
            connection.rooms = connection.rooms.filter(r => r !== roomId);
        }
    }
    /**
     * Get connections in a room
     */
    getConnectionsInRoom(roomId) {
        return this.getAllConnections().filter(conn => conn.rooms.includes(roomId));
    }
    /**
     * Get connections by device type
     */
    getConnectionsByDeviceType(deviceType) {
        return this.getAllConnections().filter(conn => conn.deviceInfo.deviceType === deviceType);
    }
    /**
     * Get connection statistics
     */
    getStatistics() {
        const connections = this.getAllConnections();
        const connectionsByDevice = {};
        const connectionsByNamespace = {};
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
    getUserConnectionHistory(userId) {
        return this.connectionHistory.filter(entry => entry.userId === userId);
    }
    /**
     * Get all connection history
     */
    getAllConnectionHistory() {
        return [...this.connectionHistory];
    }
    /**
     * Get user's active devices
     */
    getUserActiveDevices(userId) {
        const connections = this.getUserConnections(userId);
        return connections.map(conn => conn.deviceInfo);
    }
    /**
     * Get user's primary connection (most recent active)
     */
    getUserPrimaryConnection(userId) {
        const connections = this.getUserConnections(userId);
        if (connections.length === 0) {
            return undefined;
        }
        return connections.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())[0];
    }
    /**
     * Disconnect all connections for a user
     */
    disconnectAllUserConnections(userId) {
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
    disconnectByDeviceType(userId, deviceType) {
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
    cleanupIdleConnections(maxIdleMs = this.IDLE_TIMEOUT_MS) {
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
    cleanupHistory() {
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
    addToHistory(connection) {
        if (!connection.disconnectedAt || connection.duration === undefined) {
            return;
        }
        const entry = {
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
    normalizeDeviceInfo(info) {
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
    parseDeviceInfo(userAgent, query) {
        const deviceInfo = {
            deviceId: query?.deviceId || 'unknown',
            deviceType: 'unknown',
        };
        // Parse from user agent
        if (userAgent) {
            // Mobile detection
            if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
                if (/iPad|Tablet/i.test(userAgent)) {
                    deviceInfo.deviceType = 'tablet';
                }
                else {
                    deviceInfo.deviceType = 'mobile';
                }
            }
            else if (/Electron/i.test(userAgent)) {
                deviceInfo.deviceType = 'desktop';
            }
            // OS detection
            if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
                deviceInfo.os = 'iOS';
            }
            else if (/Windows/i.test(userAgent)) {
                deviceInfo.os = 'Windows';
            }
            else if (/Mac/i.test(userAgent)) {
                deviceInfo.os = 'macOS';
            }
            else if (/Linux/i.test(userAgent)) {
                deviceInfo.os = 'Linux';
            }
            else if (/Android/i.test(userAgent)) {
                deviceInfo.os = 'Android';
            }
            // Browser detection
            if (/Chrome/i.test(userAgent)) {
                deviceInfo.browser = 'Chrome';
            }
            else if (/Firefox/i.test(userAgent)) {
                deviceInfo.browser = 'Firefox';
            }
            else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
                deviceInfo.browser = 'Safari';
            }
            else if (/Edge/i.test(userAgent)) {
                deviceInfo.browser = 'Edge';
            }
        }
        // Override with query params if provided
        if (query?.deviceType) {
            deviceInfo.deviceType = query.deviceType;
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
    clearAllConnections() {
        // Move all active to history
        for (const [, connection] of this.connections) {
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
    getOnlineUserCount() {
        return this.userConnections.size;
    }
    /**
     * Check if a specific socket is connected
     */
    isSocketConnected(socketId) {
        return this.connections.has(socketId);
    }
}
// Export singleton instance
export const connectionService = new ConnectionService();
export default connectionService;
//# sourceMappingURL=connectionService.js.map