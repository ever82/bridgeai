/**
 * Queue Worker
 *
 * Provides worker process management with:
 * - Concurrency control
 * - Rate limiting
 * - Job timeout handling
 * - Graceful shutdown
 */

import { Worker, Job, ConnectionOptions } from 'bullmq';

import { getQueueManager, QueueManager } from './queues';
import { QueueName, QueueConfig, queueConfigurations } from './config';

// Job processor function type
export type JobProcessor<T = unknown> = (job: Job<T>) => Promise<void>;

// Worker events
export interface WorkerEvents {
  onCompleted?: (job: Job) => void;
  onFailed?: (job: Job, error: Error) => void;
  onProgress?: (job: Job, progress: number) => void;
  onError?: (error: Error) => void;
}

class QueueWorker {
  private static instance: QueueWorker | null = null;
  private manager: QueueManager;
  private processorRegistry: Map<QueueName, JobProcessor>;
  private isRunning = false;

  private constructor() {
    this.manager = getQueueManager();
    this.processorRegistry = new Map();
  }

  static getInstance(): QueueWorker {
    if (!QueueWorker.instance) {
      QueueWorker.instance = new QueueWorker();
    }
    return QueueWorker.instance;
  }

  /**
   * Get Redis connection options
   */
  private getRedisConnection(): ConnectionOptions {
    const conn = this.manager['config'].connection;
    return {
      host: conn.host,
      port: conn.port,
      password: conn.password,
      db: conn.db || 0,
      maxRetriesPerRequest: null,
    };
  }

  /**
   * Register a job processor for a queue
   */
  registerProcessor<T>(queueName: QueueName, processor: JobProcessor<T>): void {
    this.processorRegistry.set(queueName, processor as JobProcessor);
    console.log(`[Worker] Processor registered for queue ${queueName}`);
  }

  /**
   * Start processing jobs for a queue
   */
  async startProcessor(
    queueName: QueueName,
    events?: WorkerEvents
  ): Promise<Worker> {
    const queueConfig = queueConfigurations[queueName] || {};
    const mergedConfig = this.mergeConfig(queueConfig);

    const processor = this.processorRegistry.get(queueName);
    if (!processor) {
      throw new Error(`No processor registered for queue ${queueName}`);
    }

    const worker = new Worker(queueName, processor, {
      connection: this.getRedisConnection(),
      concurrency: mergedConfig.worker.concurrency,
      lockDuration: mergedConfig.worker.lockDuration,
      removeOnComplete: {
        age: mergedConfig.defaultJobOptions.removeCompletedDelay / 1000,
        count: 1000,
      },
      removeOnFail: {
        age: mergedConfig.defaultJobOptions.removeFailedDelay / 1000,
        count: 5000,
      },
    });

    // Setup event handlers
    if (events) {
      if (events.onCompleted) {
        worker.on('completed', events.onCompleted as (job: any) => void);
      }
      if (events.onFailed) {
        worker.on('failed', events.onFailed as (job: any, err: Error) => void);
      }
      if (events.onProgress) {
        worker.on('progress', events.onProgress as (job: any, progress: number) => void);
      }
      if (events.onError) {
        worker.on('error', events.onError);
      }
    }

    // Default completed handler
    worker.on('completed', (job: any) => {
      console.log(`[Worker] Job ${job.id} in queue ${queueName} completed`);
    });

    // Default failed handler
    worker.on('failed', (job: any, err: Error) => {
      console.error(`[Worker] Job ${job?.id} in queue ${queueName} failed:`, err.message);
    });

    this.manager.registerWorker(queueName, worker);
    this.isRunning = true;
    console.log(`[Worker] Started processing queue ${queueName}`);
    return worker;
  }

  /**
   * Start processors for all registered queues
   */
  async startAll(events?: WorkerEvents): Promise<void> {
    for (const queueName of this.processorRegistry.keys()) {
      await this.startProcessor(queueName, events);
    }
  }

  /**
   * Stop a specific queue processor
   */
  async stopProcessor(queueName: QueueName): Promise<void> {
    const worker = this.manager.getWorker(queueName);
    if (worker) {
      await worker.close();
      this.manager['workers'].delete(queueName);
      console.log(`[Worker] Stopped processing queue ${queueName}`);
    }
  }

  /**
   * Stop all processors gracefully
   */
  async stopAll(): Promise<void> {
    await this.manager.shutdown();
    this.isRunning = false;
    console.log('[Worker] All processors stopped');
  }

  /**
   * Pause a queue processor
   */
  async pauseProcessor(queueName: QueueName): Promise<void> {
    const worker = this.manager.getWorker(queueName);
    if (worker) {
      await worker.pause();
      console.log(`[Worker] Queue ${queueName} paused`);
    }
  }

  /**
   * Resume a queue processor
   */
  async resumeProcessor(queueName: QueueName): Promise<void> {
    const worker = this.manager.getWorker(queueName);
    if (worker) {
      await worker.resume();
      console.log(`[Worker] Queue ${queueName} resumed`);
    }
  }

  /**
   * Check if worker is running
   */
  isProcessorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Merge default config with queue-specific config
   */
  private mergeConfig(
    queueConfig: {
      worker?: Partial<QueueConfig['worker']>;
      defaultJobOptions?: Partial<QueueConfig['defaultJobOptions']>;
    }
  ): QueueConfig {
    const defaultConfig = this.manager['config'];
    return {
      connection: defaultConfig.connection,
      defaultJobOptions: {
        ...defaultConfig.defaultJobOptions,
        ...queueConfig.defaultJobOptions,
        backoff: {
          ...defaultConfig.defaultJobOptions.backoff,
          ...(queueConfig.defaultJobOptions?.backoff || {}),
        },
      },
      worker: {
        ...defaultConfig.worker,
        ...queueConfig.worker,
      },
    };
  }
}

// Singleton accessor
let workerInstance: QueueWorker | null = null;

export function getQueueWorker(): QueueWorker {
  if (!workerInstance) {
    workerInstance = QueueWorker.getInstance();
  }
  return workerInstance;
}

export { QueueWorker };
