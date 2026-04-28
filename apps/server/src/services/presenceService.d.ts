/**
 * Presence Service
 *
 * Manages online/offline status, last activity time, status change notifications,
 * and status subscriptions.
 */
/**
 * User presence status
 */
export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';
/**
 * User presence data
 */
export interface UserPresence {
    userId: string;
    status: PresenceStatus;
    lastActivityAt: Date;
    lastOnlineAt?: Date;
    customStatus?: string;
    deviceCount: number;
}
/**
 * Presence subscription callback
 */
export type PresenceCallback = (presence: UserPresence) => void;
/**
 * Presence change event
 */
export interface PresenceChangeEvent {
    userId: string;
    previousStatus: PresenceStatus;
    currentStatus: PresenceStatus;
    timestamp: Date;
}
/**
 * Presence Service class
 */
export declare class PresenceService {
    private presenceData;
    private subscriptions;
    private subscribers;
    private statusCallbacks;
    private readonly AWAY_TIMEOUT_MS;
    private statusCheckInterval;
    private intervalStarted;
    constructor();
    /**
     * Ensure the status check interval is running (lazy init)
     */
    private ensureIntervalStarted;
    /**
     * Set user presence
     */
    setPresence(userId: string, status: PresenceStatus, customStatus?: string): UserPresence;
    /**
     * Get user presence
     */
    getPresence(userId: string): UserPresence;
    /**
     * Get presence for multiple users
     */
    getPresenceForUsers(userIds: string[]): UserPresence[];
    /**
     * Check if user is online
     */
    isUserOnline(userId: string): boolean;
    /**
     * Get online users count
     */
    getOnlineUsersCount(): number;
    /**
     * Get all online users
     */
    getOnlineUsers(): UserPresence[];
    /**
     * Update user activity
     */
    updateActivity(userId: string): void;
    /**
     * Mark user as offline
     */
    markOffline(userId: string): void;
    /**
     * Subscribe to a user's presence
     */
    subscribeToPresence(subscriberUserId: string, targetUserId: string): boolean;
    /**
     * Unsubscribe from a user's presence
     */
    unsubscribeFromPresence(subscriberUserId: string, targetUserId: string): boolean;
    /**
     * Unsubscribe from all presence updates
     */
    unsubscribeAll(subscriberUserId: string): void;
    /**
     * Get subscribers for a user
     */
    getSubscribers(userId: string): string[];
    /**
     * Get subscriptions for a user
     */
    getSubscriptions(userId: string): string[];
    /**
     * Register a callback for presence changes
     */
    onPresenceChange(userId: string, callback: PresenceCallback): () => void;
    /**
     * Notify status change to subscribers
     */
    private notifyStatusChange;
    /**
     * Broadcast presence to all
     */
    broadcastPresence(userId: string): void;
    /**
     * Start interval to check and update away status
     */
    private startStatusCheckInterval;
    /**
     * Stop status check interval
     */
    stopStatusCheckInterval(): void;
    /**
     * Get presence statistics
     */
    getStatistics(): {
        online: number;
        away: number;
        busy: number;
        offline: number;
        total: number;
    };
    /**
     * Clear all presence data
     */
    clearAll(): void;
    /**
     * Destroy service
     */
    destroy(): void;
}
export declare const presenceService: PresenceService;
export default presenceService;
//# sourceMappingURL=presenceService.d.ts.map