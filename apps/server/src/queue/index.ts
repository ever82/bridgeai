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

// Re-export all queue modules
export { QueueManager, getQueueManager } from './queues';
export { QueueNames, QueueConfig, defaultQueueConfig } from './config';
export { QueueProducer, getQueueProducer } from './producer';
export { QueueWorker, getQueueWorker } from './worker';
export { RetryStrategy, DeadLetterJobData, getRetryStrategy } from './retry';
export { QueueMonitor, getQueueMonitor } from './monitoring';
export { shutdownAllQueues, initializeQueues } from './queues';

// Health check function
export async function checkQueueHealth(): Promise<{
  healthy: boolean;
  queues: Record<string, boolean>;
}> {
  const { getQueueManager } = await import('./queues');
  const manager = getQueueManager();
  const queueHealth: Record<string, boolean> = {};
  let allHealthy = true;

  for (const [name, queue] of manager.getAllQueues()) {
    try {
      const client = await queue.client;
      await client.ping();
      queueHealth[name] = true;
    } catch {
      queueHealth[name] = false;
      allHealthy = false;
    }
  }

  return { healthy: allHealthy, queues: queueHealth };
}
