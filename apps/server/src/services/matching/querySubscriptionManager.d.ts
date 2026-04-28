/**
 * Query Subscription Manager
 * Provides WebSocket-based query subscriptions with incremental updates
 */
import { EventEmitter } from 'events';
import { FilterDSL } from '@bridgeai/shared';
export interface Subscription {
    id: string;
    userId: string;
    query: FilterDSL;
    filters?: Record<string, any>;
    createdAt: Date;
    lastPingAt: Date;
    active: boolean;
}
export interface SubscriptionEvent {
    type: 'data' | 'error' | 'heartbeat' | 'subscription_added' | 'subscription_removed';
    subscriptionId: string;
    data?: any;
    error?: string;
    timestamp: Date;
}
export interface IncrementalUpdate {
    subscriptionId: string;
    updateType: 'insert' | 'update' | 'delete';
    affectedIds: string[];
    changedFields?: string[];
    newData?: any[];
}
/**
 * Query Subscription Manager
 * Manages WebSocket subscriptions for real-time query results
 */
export declare class QuerySubscriptionManager extends EventEmitter {
    private subscriptions;
    private userSubscriptions;
    private subscriptionTimers;
    private updateProcessorTimer;
    private updateQueue;
    private isProcessingUpdates;
    private static instance;
    private readonly HEARTBEAT_INTERVAL;
    private readonly SUBSCRIPTION_TIMEOUT;
    private readonly MAX_SUBSCRIPTIONS_PER_USER;
    private readonly UPDATE_BATCH_SIZE;
    private readonly UPDATE_INTERVAL;
    private constructor();
    static getInstance(): QuerySubscriptionManager;
    /**
     * Reset the singleton instance. Mainly used in tests after destroy().
     */
    static resetInstance(): void;
    /**
     * Create a new query subscription
     */
    createSubscription(userId: string, query: FilterDSL, filters?: Record<string, any>): Promise<Subscription>;
    /**
     * Remove a subscription
     */
    removeSubscription(subscriptionId: string): boolean;
    /**
     * Get subscription by ID
     */
    getSubscription(subscriptionId: string): Subscription | undefined;
    /**
     * Get all subscriptions for a user
     */
    getUserSubscriptions(userId: string): Subscription[];
    /**
     * Refresh subscription with new query results
     */
    refreshSubscription(subscriptionId: string): Promise<void>;
    /**
     * Queue an incremental update for processing
     */
    queueIncrementalUpdate(update: IncrementalUpdate): void;
    /**
     * Notify subscribers about data changes
     */
    notifyDataChange(affectedSubscriptions: string[], updateType: 'insert' | 'update' | 'delete', changedData?: any[]): void;
    /**
     * Handle subscription heartbeat (ping)
     */
    handleHeartbeat(subscriptionId: string): boolean;
    /**
     * Get subscription statistics
     */
    getStats(): {
        totalSubscriptions: number;
        activeUsers: number;
        queuedUpdates: number;
        subscriptionByStatus: {
            active: number;
            inactive: number;
        };
    };
    /**
     * Clean up inactive subscriptions
     */
    cleanupInactiveSubscriptions(): number;
    /**
     * Process queued incremental updates
     */
    private startUpdateProcessor;
    /**
     * Shut down the subscription manager: clear update processor timer, all
     * heartbeat timers, and drop all subscriptions. Safe to call multiple times.
     */
    destroy(): void;
    /**
     * Setup heartbeat for subscription
     */
    private setupHeartbeat;
    /**
     * Emit an event to listeners
     */
    private emitEvent;
    /**
     * Generate unique subscription ID
     */
    private generateSubscriptionId;
}
export declare const querySubscriptionManager: QuerySubscriptionManager;
//# sourceMappingURL=querySubscriptionManager.d.ts.map