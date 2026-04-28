/**
 * Queue Infrastructure Module
 *
 * Provides BullMQ-based task queue system with:
 * - Multi-queue support and isolation
 * - Connection management and graceful shutdown
 * - Exponential backoff retry strategy
 * - Dead letter queue for failed tasks
 * - Queue monitoring and metrics
 */
export { QueueManager, getQueueManager } from './queues';
export { QueueNames, QueueConfig, defaultQueueConfig } from './config';
export { QueueProducer, getQueueProducer } from './producer';
export { QueueWorker, getQueueWorker } from './worker';
export { RetryStrategy, DeadLetterJobData, getRetryStrategy } from './retry';
export { QueueMonitor, getQueueMonitor } from './monitoring';
export { shutdownAllQueues, initializeQueues } from './queues';
export declare function checkQueueHealth(): Promise<{
    healthy: boolean;
    queues: Record<string, boolean>;
}>;
//# sourceMappingURL=index.d.ts.map