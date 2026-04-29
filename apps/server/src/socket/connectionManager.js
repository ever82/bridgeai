/**
 * Default pool configuration
 */
const DEFAULT_POOL_CONFIG = {
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
    connections = new Map();
    io = null;
    statsInterval = null;
    heartbeatInterval = null;
    STATS_INTERVAL_MS = 60000; // 1 minute
    peakConnections = 0;
    startTime = Date.now();
    config;
    constructor(config = DEFAULT_POOL_CONFIG) {
        this.config = config;
    }
    /**
     * Initialize connection manager
     */
    initialize(io) {
        this.io = io;
        this.startTime = Date.now();
        this.startStatsCollection();
        this.startHeartbeat();
        console.log('[ConnectionManager] Initialized with config:', this.config);
    }
    /**
     * Add a new connection
     */
    addConnection(socket, namespace) {
        const info = {
            socketId: socket.id,
            userId: socket.user?.id,
            namespace,
            connectedAt: new Date(),
            lastPingAt: new Date(),
            lastActivityAt: new Date(),
            ipAddress: this.extractIPAddress(socket),
            userAgent: socket.handshake.headers['user-agent'],
            deviceInfo: socket.handshake.query?.deviceInfo,
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
        console.log(`[ConnectionManager] Added connection: ${socket.id} (user: ${info.userId}, ns: ${namespace}, ip: ${info.ipAddress})`);
    }
    /**
     * Remove a connection
     */
    removeConnection(socketId) {
        const info = this.connections.get(socketId);
        if (info) {
            const duration = Date.now() - info.connectedAt.getTime();
            this.connections.delete(socketId);
            console.log(`[ConnectionManager] Removed connection: ${socketId} (user: ${info.userId}, duration: ${Math.round(duration / 1000)}s)`);
        }
    }
    /**
     * Get connection info
     */
    getConnection(socketId) {
        return this.connections.get(socketId);
    }
    /**
     * Get all connections
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Get connections by user ID
     */
    getUserConnections(userId) {
        return this.getAllConnections().filter(conn => conn.userId === userId);
    }
    /**
     * Get connections by namespace
     */
    getNamespaceConnections(namespace) {
        return this.getAllConnections().filter(conn => conn.namespace === namespace);
    }
    /**
     * Get connections by IP address
     */
    getConnectionsByIP(ipAddress) {
        return this.getAllConnections().filter(conn => conn.ipAddress === ipAddress);
    }
    /**
     * Get connection statistics
     */
    getStats() {
        const connections = this.getAllConnections();
        const connectionsByNamespace = {};
        const connectionsByUser = {};
        for (const conn of connections) {
            // Count by namespace
            connectionsByNamespace[conn.namespace] = (connectionsByNamespace[conn.namespace] || 0) + 1;
            // Count by user
            if (conn.userId) {
                connectionsByUser[conn.userId] = (connectionsByUser[conn.userId] || 0) + 1;
            }
        }
        const uniqueUsers = new Set(connections.filter(c => c.userId).map(c => c.userId));
        const totalAuthenticated = uniqueUsers.size;
        const avgConnectionsPerUser = totalAuthenticated > 0 ? connections.length / totalAuthenticated : 0;
        return {
            totalConnections: connections.length,
            authenticatedConnections: connections.filter(c => c.userId).length,
            anonymousConnections: connections.filter(c => !c.userId).length,
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
    isUserOnline(userId) {
        return this.getUserConnections(userId).length > 0;
    }
    /**
     * Get online user count
     */
    getOnlineUserCount() {
        const userIds = new Set(this.getAllConnections()
            .map(c => c.userId)
            .filter(Boolean));
        return userIds.size;
    }
    /**
     * Update last ping time (heartbeat response)
     */
    updatePing(socketId) {
        const info = this.connections.get(socketId);
        if (info) {
            info.lastPingAt = new Date();
            info.lastActivityAt = new Date();
        }
    }
    /**
     * Update last activity time
     */
    updateActivity(socketId) {
        const info = this.connections.get(socketId);
        if (info) {
            info.lastActivityAt = new Date();
        }
    }
    /**
     * Add room to connection
     */
    addConnectionRoom(socketId, room) {
        const info = this.connections.get(socketId);
        if (info && !info.rooms.includes(room)) {
            info.rooms.push(room);
        }
    }
    /**
     * Remove room from connection
     */
    removeConnectionRoom(socketId, room) {
        const info = this.connections.get(socketId);
        if (info) {
            info.rooms = info.rooms.filter(r => r !== room);
        }
    }
    /**
     * Get rooms for a connection
     */
    getConnectionRooms(socketId) {
        return this.connections.get(socketId)?.rooms || [];
    }
    /**
     * Disconnect a specific socket
     */
    async disconnectSocket(socketId, reason) {
        if (!this.io)
            return;
        // Try to find and disconnect socket in all namespaces
        for (const nsp of this.io.nsps.values()) {
            const socket = nsp.sockets.get(socketId);
            if (socket) {
                socket.disconnect(true);
                console.log(`[ConnectionManager] Disconnected socket: ${socketId} (reason: ${reason || 'admin action'})`);
                break;
            }
        }
        this.removeConnection(socketId);
    }
    /**
     * Disconnect all sockets for a user
     */
    async disconnectUser(userId, reason) {
        const connections = this.getUserConnections(userId);
        for (const conn of connections) {
            await this.disconnectSocket(conn.socketId, reason);
        }
        console.log(`[ConnectionManager] Disconnected all sockets for user: ${userId} (reason: ${reason || 'admin action'})`);
    }
    /**
     * Disconnect all connections from an IP
     */
    async disconnectIP(ipAddress, reason) {
        const connections = this.getConnectionsByIP(ipAddress);
        let count = 0;
        for (const conn of connections) {
            await this.disconnectSocket(conn.socketId, reason || 'IP limit exceeded');
            count++;
        }
        console.log(`[ConnectionManager] Disconnected ${count} connections from IP: ${ipAddress}`);
        return count;
    }
    /**
     * Clean up stale connections (idle timeout)
     */
    cleanupStaleConnections(maxAgeMs = this.config.idleTimeoutMs) {
        const now = Date.now();
        const staleSockets = [];
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
    getPoolConfig() {
        return { ...this.config };
    }
    /**
     * Check if pool allows new connections
     */
    canAcceptConnection(userId, ipAddress) {
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
    setupHeartbeat(socket) {
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
    setupDisconnectDetection(socket) {
        socket.on('disconnect', reason => {
            // Log disconnect reason for debugging
            if (reason === 'ping timeout' || reason === 'transport close') {
                console.log(`[ConnectionManager] Client disconnect detected: ${socket.id} (reason: ${reason})`);
            }
            this.removeConnection(socket.id);
        });
        socket.on('error', error => {
            console.error(`[ConnectionManager] Socket error: ${socket.id}`, error);
            this.removeConnection(socket.id);
        });
    }
    /**
     * Start heartbeat broadcast
     */
    startHeartbeat() {
        if (this.heartbeatInterval)
            return;
        this.heartbeatInterval = setInterval(() => {
            if (!this.io)
                return;
            // Broadcast heartbeat to all connections
            this.io.emit('heartbeat', {
                timestamp: new Date().toISOString(),
                serverTime: Date.now(),
            });
            // Check for missed heartbeats
            const now = Date.now();
            const heartbeatTimeout = this.config.heartbeatIntervalMs * this.config.maxHeartbeatMisses;
            for (const [socketId, info] of this.connections) {
                const missedTime = now - info.lastPingAt.getTime();
                if (missedTime > heartbeatTimeout) {
                    console.log(`[ConnectionManager] Client missed heartbeats: ${socketId} (missed: ${Math.floor(missedTime / this.config.heartbeatIntervalMs)})`);
                    this.disconnectSocket(socketId, 'heartbeat timeout');
                }
            }
        }, this.config.heartbeatIntervalMs);
    }
    /**
     * Start statistics collection
     */
    startStatsCollection() {
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
    stopStatsCollection() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Extract IP address from socket
     */
    extractIPAddress(socket) {
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
    destroy() {
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
//# sourceMappingURL=connectionManager.js.map