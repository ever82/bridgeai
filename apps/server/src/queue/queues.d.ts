/**
 * Queue Manager
 *
 * Manages BullMQ queue instances with:
 * - Shared connection handling
 * - Multi-queue support
 * - Graceful shutdown
 */
import { Queue, QueueEvents, Worker } from 'bullmq';
import { QueueConfig, QueueName } from './config';
declare class QueueManager {
    private static instance;
    private queues;
    private queueEvents;
    private workers;
    private isInitialized;
    private config;
    private constructor();
    static getInstance(config?: QueueConfig): QueueManager;
    /**
     * Get the Redis connection options for BullMQ
     */
    private getRedisConnection;
    /**
     * Create or get a queue by name
     */
    getQueue(name: QueueName): Queue;
    /**
     * Setup queue events listener
     */
    private setupQueueEvents;
    /**
     * Get queue events for a queue
     */
    getQueueEvents(name: QueueName): QueueEvents | undefined;
    /**
     * Get all registered queues
     */
    getAllQueues(): Map<string, Queue>;
    /**
     * Register a worker for a queue
     */
    registerWorker(name: QueueName, worker: Worker): void;
    /**
     * Get worker for a queue
     */
    getWorker(name: QueueName): Worker | undefined;
    /**
     * Merge default config with queue-specific config
     */
    private mergeConfig;
    /**
     * Initialize all queues
     */
    initialize(): Promise<void>;
    /**
     * Graceful shutdown of all queues
     */
    shutdown(): Promise<void>;
    /**
     * Check if manager is initialized
     */
    isReady(): boolean;
}
export declare function getQueueManager(): QueueManager;
export { QueueManager };
export declare function initializeQueues(): Promise<void>;
export declare function shutdownAllQueues(): Promise<void>;
//# sourceMappingURL=queues.d.ts.map