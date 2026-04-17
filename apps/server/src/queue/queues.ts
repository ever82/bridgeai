/**
 * Queue Manager
 *
 * Manages BullMQ queue instances with:
 * - Shared connection handling
 * - Multi-queue support
 * - Graceful shutdown
 */

import { Queue, QueueEvents, Worker, ConnectionOptions } from 'bullmq';

import {
  QueueNames,
  QueueConfig,
  defaultQueueConfig,
  queueConfigurations,
  QueueName,
} from './config';

// Singleton queue manager
class QueueManager {
  private static instance: QueueManager | null = null;
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isInitialized = false;
  private config: QueueConfig;

  private constructor(config: QueueConfig = defaultQueueConfig) {
    this.config = config;
  }

  static getInstance(config?: QueueConfig): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(config);
    }
    return QueueManager.instance;
  }

  /**
   * Get the Redis connection options for BullMQ
   */
  private getRedisConnection(): ConnectionOptions {
    const conn = this.config.connection;
    return {
      host: conn.host,
      port: conn.port,
      password: conn.password,
      db: conn.db || 0,
      maxRetriesPerRequest: null,
    };
  }

  /**
   * Create or get a queue by name
   */
  getQueue(name: QueueName): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queueConfig = queueConfigurations[name] || {};
    const mergedConfig = this.mergeConfig(queueConfig);

    const queue = new Queue(name, {
      connection: this.getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          age: mergedConfig.defaultJobOptions.removeCompletedDelay / 1000,
          count: 1000,
        },
        removeOnFail: {
          age: mergedConfig.defaultJobOptions.removeFailedDelay / 1000,
          count: 5000,
        },
        attempts: mergedConfig.defaultJobOptions.attempts,
        backoff: mergedConfig.defaultJobOptions.backoff,
      },
    });

    this.queues.set(name, queue);
    this.setupQueueEvents(name, queue);

    return queue;
  }

  /**
   * Setup queue events listener
   */
  private setupQueueEvents(name: string, _queue: Queue): void {
    const events = new QueueEvents(name, {
      connection: this.getRedisConnection(),
    });

    this.queueEvents.set(name, events);
  }

  /**
   * Get queue events for a queue
   */
  getQueueEvents(name: QueueName): QueueEvents | undefined {
    return this.queueEvents.get(name);
  }

  /**
   * Get all registered queues
   */
  getAllQueues(): Map<string, Queue> {
    return this.queues;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker(name: QueueName, worker: Worker): void {
    this.workers.set(name, worker);
  }

  /**
   * Get worker for a queue
   */
  getWorker(name: QueueName): Worker | undefined {
    return this.workers.get(name);
  }

  /**
   * Merge default config with queue-specific config
   */
  private mergeConfig(queueConfig: {
    worker?: Partial<QueueConfig['worker']>;
    defaultJobOptions?: Partial<QueueConfig['defaultJobOptions']>;
  }): QueueConfig {
    return {
      connection: this.config.connection,
      defaultJobOptions: {
        ...this.config.defaultJobOptions,
        ...queueConfig.defaultJobOptions,
        backoff: {
          ...this.config.defaultJobOptions.backoff,
          ...(queueConfig.defaultJobOptions?.backoff || {}),
        },
      },
      worker: {
        ...this.config.worker,
        ...queueConfig.worker,
      },
    };
  }

  /**
   * Initialize all queues
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize all named queues
    for (const name of Object.values(QueueNames)) {
      this.getQueue(name);
    }

    this.isInitialized = true;
    console.log('[QueueManager] All queues initialized');
  }

  /**
   * Graceful shutdown of all queues
   */
  async shutdown(): Promise<void> {
    console.log('[QueueManager] Starting graceful shutdown...');

    // Close all workers first
    for (const [name, worker] of this.workers.entries()) {
      try {
        await worker.close();
        console.log(`[QueueManager] Worker ${name} closed`);
      } catch (error) {
        console.error(`[QueueManager] Error closing worker ${name}:`, error);
      }
    }
    this.workers.clear();

    // Close all queue events
    for (const [name, events] of this.queueEvents.entries()) {
      try {
        await events.close();
        console.log(`[QueueManager] Queue events ${name} closed`);
      } catch (error) {
        console.error(`[QueueManager] Error closing events ${name}:`, error);
      }
    }
    this.queueEvents.clear();

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      try {
        await queue.close();
        console.log(`[QueueManager] Queue ${name} closed`);
      } catch (error) {
        console.error(`[QueueManager] Error closing queue ${name}:`, error);
      }
    }
    this.queues.clear();

    this.isInitialized = false;
    console.log('[QueueManager] Shutdown complete');
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton accessor
let managerInstance: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!managerInstance) {
    managerInstance = QueueManager.getInstance();
  }
  return managerInstance;
}

// Export for testing
export { QueueManager };

// Convenience function to initialize all queues
export async function initializeQueues(): Promise<void> {
  const manager = getQueueManager();
  await manager.initialize();
}

// Convenience function to shutdown all queues
export async function shutdownAllQueues(): Promise<void> {
  if (managerInstance) {
    await managerInstance.shutdown();
    managerInstance = null;
  }
}
