/**
 * Query Subscription Manager
 * Provides WebSocket-based query subscriptions with incremental updates
 */

import { EventEmitter } from 'events';

import { FilterDSL } from '@bridgeai/shared';

import { logger } from '../../utils/logger';

import { queryEngine } from './queryEngine';

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
export class QuerySubscriptionManager extends EventEmitter {
  private subscriptions = new Map<string, Subscription>();
  private userSubscriptions = new Map<string, Set<string>>(); // userId -> Set<subscriptionId>
  private subscriptionTimers = new Map<string, NodeJS.Timeout>();
  private updateProcessorTimer: NodeJS.Timeout | null = null;
  private updateQueue: IncrementalUpdate[] = [];
  private isProcessingUpdates = false;
  private static instance: QuerySubscriptionManager;

  // Configuration
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly SUBSCRIPTION_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_SUBSCRIPTIONS_PER_USER = 20;
  private readonly UPDATE_BATCH_SIZE = 100;
  private readonly UPDATE_INTERVAL = 1000; // 1 second

  private constructor() {
    super();
    this.startUpdateProcessor();
  }

  static getInstance(): QuerySubscriptionManager {
    if (!QuerySubscriptionManager.instance) {
      QuerySubscriptionManager.instance = new QuerySubscriptionManager();
    }
    return QuerySubscriptionManager.instance;
  }

  /**
   * Reset the singleton instance. Mainly used in tests after destroy().
   */
  static resetInstance(): void {
    if (QuerySubscriptionManager.instance) {
      QuerySubscriptionManager.instance.destroy();
      QuerySubscriptionManager.instance = undefined as unknown as QuerySubscriptionManager;
    }
  }

  /**
   * Create a new query subscription
   */
  async createSubscription(
    userId: string,
    query: FilterDSL,
    filters?: Record<string, any>
  ): Promise<Subscription> {
    // Check subscription limit
    const userSubs = this.userSubscriptions.get(userId) || new Set();
    if (userSubs.size >= this.MAX_SUBSCRIPTIONS_PER_USER) {
      throw new Error(`Maximum subscriptions (${this.MAX_SUBSCRIPTIONS_PER_USER}) reached`);
    }

    // Create subscription
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      userId,
      query,
      filters,
      createdAt: new Date(),
      lastPingAt: new Date(),
      active: true,
    };

    // Store subscription
    this.subscriptions.set(subscription.id, subscription);

    // Add to user's subscriptions
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId)!.add(subscription.id);

    // Setup heartbeat
    this.setupHeartbeat(subscription.id);

    // Execute initial query and send results
    try {
      const result = await queryEngine.execute(query, { userId, useCache: true });
      this.emitEvent({
        type: 'data',
        subscriptionId: subscription.id,
        data: {
          results: result.data,
          total: result.data.length,
          cached: result.cached,
        },
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Query execution failed',
      });
    }

    this.emitEvent({
      type: 'subscription_added',
      subscriptionId: subscription.id,
    });

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      userId,
    });

    return subscription;
  }

  /**
   * Remove a subscription
   */
  removeSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Clear heartbeat timer
    const timer = this.subscriptionTimers.get(subscriptionId);
    if (timer) {
      clearInterval(timer);
      this.subscriptionTimers.delete(subscriptionId);
    }

    // Remove from user's subscriptions
    const userSubs = this.userSubscriptions.get(subscription.userId);
    if (userSubs) {
      userSubs.delete(subscriptionId);
      if (userSubs.size === 0) {
        this.userSubscriptions.delete(subscription.userId);
      }
    }

    // Remove subscription
    this.subscriptions.delete(subscriptionId);

    this.emitEvent({
      type: 'subscription_removed',
      subscriptionId,
    });

    logger.info('Subscription removed', { subscriptionId });

    return true;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Subscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions for a user
   */
  getUserSubscriptions(userId: string): Subscription[] {
    const subIds = this.userSubscriptions.get(userId);
    if (!subIds) return [];

    return Array.from(subIds)
      .map(id => this.subscriptions.get(id))
      .filter((sub): sub is Subscription => sub !== undefined && sub.active);
  }

  /**
   * Refresh subscription with new query results
   */
  async refreshSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.active) {
      return;
    }

    try {
      const result = await queryEngine.execute(subscription.query, {
        userId: subscription.userId,
        useCache: false, // Always get fresh data for refresh
      });

      this.emitEvent({
        type: 'data',
        subscriptionId: subscription.id,
        data: {
          results: result.data,
          total: result.data.length,
          cached: false,
        },
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Query refresh failed',
      });
    }
  }

  /**
   * Queue an incremental update for processing
   */
  queueIncrementalUpdate(update: IncrementalUpdate): void {
    this.updateQueue.push(update);

    // Limit queue size
    if (this.updateQueue.length > this.UPDATE_BATCH_SIZE) {
      this.updateQueue = this.updateQueue.slice(-this.UPDATE_BATCH_SIZE);
    }
  }

  /**
   * Notify subscribers about data changes
   */
  notifyDataChange(
    affectedSubscriptions: string[],
    updateType: 'insert' | 'update' | 'delete',
    changedData?: any[]
  ): void {
    const affectedIds = changedData?.map((d: any) => d.id) || [];

    for (const subscriptionId of affectedSubscriptions) {
      this.queueIncrementalUpdate({
        subscriptionId,
        updateType,
        affectedIds,
        changedFields: changedData ? Object.keys(changedData[0] || {}) : undefined,
        newData: updateType !== 'delete' ? changedData : undefined,
      });
    }
  }

  /**
   * Handle subscription heartbeat (ping)
   */
  handleHeartbeat(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.lastPingAt = new Date();
    return true;
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    activeUsers: number;
    queuedUpdates: number;
    subscriptionByStatus: { active: number; inactive: number };
  } {
    let active = 0;
    let inactive = 0;

    for (const sub of this.subscriptions.values()) {
      if (sub.active) active++;
      else inactive++;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      activeUsers: this.userSubscriptions.size,
      queuedUpdates: this.updateQueue.length,
      subscriptionByStatus: { active, inactive },
    };
  }

  /**
   * Clean up inactive subscriptions
   */
  cleanupInactiveSubscriptions(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, subscription] of this.subscriptions.entries()) {
      const inactiveTime = now.getTime() - subscription.lastPingAt.getTime();

      if (inactiveTime > this.SUBSCRIPTION_TIMEOUT) {
        subscription.active = false;
        this.removeSubscription(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up inactive subscriptions', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Process queued incremental updates
   */
  private startUpdateProcessor(): void {
    this.updateProcessorTimer = setInterval(async () => {
      if (this.isProcessingUpdates || this.updateQueue.length === 0) {
        return;
      }

      this.isProcessingUpdates = true;

      try {
        const updates = this.updateQueue.splice(0, this.UPDATE_BATCH_SIZE);

        // Group updates by subscription
        const updatesBySubscription = new Map<string, IncrementalUpdate[]>();
        for (const update of updates) {
          if (!updatesBySubscription.has(update.subscriptionId)) {
            updatesBySubscription.set(update.subscriptionId, []);
          }
          updatesBySubscription.get(update.subscriptionId)!.push(update);
        }

        // Process each subscription's updates
        for (const [subscriptionId, subUpdates] of updatesBySubscription) {
          const subscription = this.subscriptions.get(subscriptionId);
          if (!subscription || !subscription.active) {
            continue;
          }

          // Send incremental update
          this.emitEvent({
            type: 'data',
            subscriptionId,
            data: {
              incremental: true,
              updates: subUpdates,
            },
          });

          // Optionally refresh full results
          if (subUpdates.length >= 5) {
            await this.refreshSubscription(subscriptionId);
          }
        }
      } catch (error) {
        logger.error('Error processing updates', { error });
      } finally {
        this.isProcessingUpdates = false;
      }
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Shut down the subscription manager: clear update processor timer, all
   * heartbeat timers, and drop all subscriptions. Safe to call multiple times.
   */
  destroy(): void {
    if (this.updateProcessorTimer) {
      clearInterval(this.updateProcessorTimer);
      this.updateProcessorTimer = null;
    }

    for (const timer of this.subscriptionTimers.values()) {
      clearInterval(timer);
    }
    this.subscriptionTimers.clear();

    this.subscriptions.clear();
    this.userSubscriptions.clear();
    this.updateQueue = [];
    this.removeAllListeners();
  }

  /**
   * Setup heartbeat for subscription
   */
  private setupHeartbeat(subscriptionId: string): void {
    const timer = setInterval(() => {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription || !subscription.active) {
        clearInterval(timer);
        this.subscriptionTimers.delete(subscriptionId);
        return;
      }

      this.emitEvent({
        type: 'heartbeat',
        subscriptionId,
      });
    }, this.HEARTBEAT_INTERVAL);

    this.subscriptionTimers.set(subscriptionId, timer);
  }

  /**
   * Emit an event to listeners
   */
  private emitEvent(event: SubscriptionEvent): void {
    event.timestamp = new Date();
    this.emit('event', event);
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const querySubscriptionManager = QuerySubscriptionManager.getInstance();
