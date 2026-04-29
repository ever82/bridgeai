/**
 * Presence Service
 *
 * Manages online/offline status, last activity time, status change notifications,
 * and status subscriptions.
 */
import { getIO } from '../socket';
import { connectionService } from './connectionService';
const VALID_PRESENCE_STATUSES = new Set([
    'online',
    'offline',
    'away',
    'busy',
    'invisible',
]);
/**
 * Presence Service class
 */
export class PresenceService {
    presenceData = new Map();
    subscriptions = new Map(); // targetUserId -> Set of subscriberUserIds
    subscribers = new Map(); // subscriberUserId -> Set of targetUserIds
    statusCallbacks = new Map(); // userId -> callbacks
    AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    statusCheckInterval = null;
    intervalStarted = false;
    constructor() {
        // Lazy init: interval starts on first use, not at import time
    }
    /**
     * Ensure the status check interval is running (lazy init)
     */
    ensureIntervalStarted() {
        if (!this.intervalStarted) {
            this.intervalStarted = true;
            this.startStatusCheckInterval();
        }
    }
    /**
     * Set user presence
     */
    setPresence(userId, status, customStatus) {
        if (!VALID_PRESENCE_STATUSES.has(status)) {
            throw new Error(`Invalid presence status: ${status}. Must be one of: ${Array.from(VALID_PRESENCE_STATUSES).join(', ')}`);
        }
        this.ensureIntervalStarted();
        const previousPresence = this.presenceData.get(userId);
        const previousStatus = previousPresence?.status ?? 'offline';
        // Get device count
        const deviceCount = connectionService.getUserConnectionCount(userId);
        // Update presence
        const presence = {
            userId,
            status,
            lastActivityAt: new Date(),
            lastOnlineAt: status === 'online' ? new Date() : previousPresence?.lastOnlineAt,
            customStatus,
            deviceCount,
        };
        this.presenceData.set(userId, presence);
        // Notify if status changed
        if (previousStatus !== status) {
            this.notifyStatusChange({
                userId,
                previousStatus,
                currentStatus: status,
                timestamp: new Date(),
            });
        }
        console.log(`[PresenceService] User ${userId} status: ${status}`);
        return presence;
    }
    /**
     * Get user presence
     */
    getPresence(userId) {
        const existing = this.presenceData.get(userId);
        if (existing) {
            // Update device count
            existing.deviceCount = connectionService.getUserConnectionCount(userId);
            return existing;
        }
        // Return default offline presence
        return {
            userId,
            status: 'offline',
            lastActivityAt: new Date(0),
            deviceCount: 0,
        };
    }
    /**
     * Get presence for multiple users
     */
    getPresenceForUsers(userIds) {
        return userIds.map(id => this.getPresence(id));
    }
    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        const presence = this.presenceData.get(userId);
        return presence?.status === 'online' || presence?.status === 'away';
    }
    /**
     * Get online users count
     */
    getOnlineUsersCount() {
        let count = 0;
        for (const presence of this.presenceData.values()) {
            if (presence.status === 'online' || presence.status === 'away') {
                count++;
            }
        }
        return count;
    }
    /**
     * Get all online users
     */
    getOnlineUsers() {
        return Array.from(this.presenceData.values()).filter(p => p.status === 'online' || p.status === 'away');
    }
    /**
     * Update user activity
     */
    updateActivity(userId) {
        const presence = this.presenceData.get(userId);
        if (presence) {
            const previousStatus = presence.status;
            presence.lastActivityAt = new Date();
            // If was away, set back to online
            if (previousStatus === 'away') {
                presence.status = 'online';
                this.notifyStatusChange({
                    userId,
                    previousStatus,
                    currentStatus: 'online',
                    timestamp: new Date(),
                });
            }
        }
    }
    /**
     * Mark user as offline
     */
    markOffline(userId) {
        const presence = this.presenceData.get(userId);
        if (presence && presence.status !== 'offline') {
            const previousStatus = presence.status;
            presence.status = 'offline';
            presence.lastOnlineAt = new Date();
            presence.deviceCount = 0;
            this.notifyStatusChange({
                userId,
                previousStatus,
                currentStatus: 'offline',
                timestamp: new Date(),
            });
            console.log(`[PresenceService] User ${userId} marked offline`);
        }
    }
    /**
     * Subscribe to a user's presence
     */
    subscribeToPresence(subscriberUserId, targetUserId) {
        // Initialize subscription tracking
        if (!this.subscriptions.has(targetUserId)) {
            this.subscriptions.set(targetUserId, new Set());
        }
        this.subscriptions.get(targetUserId).add(subscriberUserId);
        // Initialize subscriber tracking
        if (!this.subscribers.has(subscriberUserId)) {
            this.subscribers.set(subscriberUserId, new Set());
        }
        this.subscribers.get(subscriberUserId).add(targetUserId);
        console.log(`[PresenceService] User ${subscriberUserId} subscribed to ${targetUserId}`);
        return true;
    }
    /**
     * Unsubscribe from a user's presence
     */
    unsubscribeFromPresence(subscriberUserId, targetUserId) {
        this.subscriptions.get(targetUserId)?.delete(subscriberUserId);
        this.subscribers.get(subscriberUserId)?.delete(targetUserId);
        // Cleanup empty sets
        if (this.subscriptions.get(targetUserId)?.size === 0) {
            this.subscriptions.delete(targetUserId);
        }
        if (this.subscribers.get(subscriberUserId)?.size === 0) {
            this.subscribers.delete(subscriberUserId);
        }
        return true;
    }
    /**
     * Unsubscribe from all presence updates
     */
    unsubscribeAll(subscriberUserId) {
        const targets = this.subscribers.get(subscriberUserId);
        if (targets) {
            for (const targetUserId of targets) {
                this.subscriptions.get(targetUserId)?.delete(subscriberUserId);
            }
            this.subscribers.delete(subscriberUserId);
        }
    }
    /**
     * Get subscribers for a user
     */
    getSubscribers(userId) {
        return Array.from(this.subscriptions.get(userId) ?? []);
    }
    /**
     * Get subscriptions for a user
     */
    getSubscriptions(userId) {
        return Array.from(this.subscribers.get(userId) ?? []);
    }
    /**
     * Register a callback for presence changes
     */
    onPresenceChange(userId, callback) {
        if (!this.statusCallbacks.has(userId)) {
            this.statusCallbacks.set(userId, new Set());
        }
        this.statusCallbacks.get(userId).add(callback);
        // Return unsubscribe function
        return () => {
            this.statusCallbacks.get(userId)?.delete(callback);
        };
    }
    /**
     * Notify status change to subscribers
     */
    notifyStatusChange(event) {
        // Notify local callbacks
        const callbacks = this.statusCallbacks.get(event.userId);
        if (callbacks) {
            const presence = this.getPresence(event.userId);
            callbacks.forEach(cb => {
                try {
                    cb(presence);
                }
                catch (error) {
                    console.error('[PresenceService] Error in presence callback:', error);
                }
            });
        }
        // Notify subscribers via socket
        const subscribers = this.subscriptions.get(event.userId);
        if (subscribers) {
            try {
                const io = getIO();
                for (const subscriberId of subscribers) {
                    io.to(`user:${subscriberId}`).emit('presence:update', {
                        userId: event.userId,
                        status: event.currentStatus,
                        previousStatus: event.previousStatus,
                        timestamp: event.timestamp.toISOString(),
                    });
                }
            }
            catch (error) {
                // Socket.io not initialized, skip
            }
        }
        // Broadcast to user's own room
        try {
            const io = getIO();
            io.to(`user:${event.userId}`).emit('user:status_update', {
                userId: event.userId,
                status: event.currentStatus,
                previousStatus: event.previousStatus,
                timestamp: event.timestamp.toISOString(),
            });
        }
        catch (error) {
            // Socket.io not initialized, skip
        }
    }
    /**
     * Broadcast presence to all
     */
    broadcastPresence(userId) {
        try {
            const presence = this.getPresence(userId);
            const io = getIO();
            io.emit('presence:broadcast', {
                userId,
                status: presence.status,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            // Socket.io not initialized
        }
    }
    /**
     * Start interval to check and update away status
     */
    startStatusCheckInterval() {
        this.statusCheckInterval = setInterval(() => {
            const now = Date.now();
            for (const [userId, presence] of this.presenceData) {
                // Check if user has active connections
                const hasConnections = connectionService.isUserConnected(userId);
                if (!hasConnections && presence.status !== 'offline') {
                    this.markOffline(userId);
                }
                else if (hasConnections &&
                    presence.status === 'online' &&
                    now - presence.lastActivityAt.getTime() > this.AWAY_TIMEOUT_MS) {
                    // Mark as away due to inactivity
                    presence.status = 'away';
                    this.notifyStatusChange({
                        userId,
                        previousStatus: 'online',
                        currentStatus: 'away',
                        timestamp: new Date(),
                    });
                }
            }
        }, 60000); // Check every minute
    }
    /**
     * Stop status check interval
     */
    stopStatusCheckInterval() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
    /**
     * Get presence statistics
     */
    getStatistics() {
        const stats = {
            online: 0,
            away: 0,
            busy: 0,
            offline: 0,
            invisible: 0,
            total: this.presenceData.size,
        };
        for (const presence of this.presenceData.values()) {
            stats[presence.status]++;
        }
        return stats;
    }
    /**
     * Clear all presence data
     */
    clearAll() {
        this.presenceData.clear();
        this.subscriptions.clear();
        this.subscribers.clear();
        this.statusCallbacks.clear();
        console.log('[PresenceService] All presence data cleared');
    }
    /**
     * Destroy service
     */
    destroy() {
        this.stopStatusCheckInterval();
        this.clearAll();
        console.log('[PresenceService] Destroyed');
    }
}
// Export singleton instance
export const presenceService = new PresenceService();
export default presenceService;
//# sourceMappingURL=presenceService.js.map