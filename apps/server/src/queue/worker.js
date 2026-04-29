/**
 * Queue Worker
 *
 * Provides worker process management with:
 * - Concurrency control
 * - Rate limiting
 * - Job timeout handling
 * - Graceful shutdown
 */
import { Worker } from 'bullmq';
import { getQueueManager } from './queues';
import { queueConfigurations } from './config';
import { getRetryStrategy } from './retry';
class QueueWorker {
    static instance = null;
    manager;
    processorRegistry;
    isRunning = false;
    constructor() {
        this.manager = getQueueManager();
        this.processorRegistry = new Map();
    }
    static getInstance() {
        if (!QueueWorker.instance) {
            QueueWorker.instance = new QueueWorker();
        }
        return QueueWorker.instance;
    }
    /**
     * Get Redis connection options
     */
    getRedisConnection() {
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
    registerProcessor(queueName, processor) {
        this.processorRegistry.set(queueName, processor);
        console.log(`[Worker] Processor registered for queue ${queueName}`);
    }
    /**
     * Start processing jobs for a queue
     */
    async startProcessor(queueName, events) {
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
            limiter: {
                max: mergedConfig.worker.rateLimitMax,
                duration: mergedConfig.worker.rateLimitWindow,
            },
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
                worker.on('completed', events.onCompleted);
            }
            if (events.onFailed) {
                worker.on('failed', events.onFailed);
            }
            if (events.onProgress) {
                worker.on('progress', events.onProgress);
            }
            if (events.onError) {
                worker.on('error', events.onError);
            }
        }
        // Default completed handler
        worker.on('completed', (job) => {
            console.log(`[Worker] Job ${job.id} in queue ${queueName} completed`);
        });
        // Default failed handler - send to dead letter queue after BullMQ exhausts retries
        worker.on('failed', (job, err) => {
            const attemptsMade = job?.attemptsMade ?? 0;
            const maxAttempts = job?.opts?.attempts ?? 1;
            console.error(`[Worker] Job ${job?.id} in queue ${queueName} failed (attempt ${attemptsMade}/${maxAttempts}):`, err.message);
            if (attemptsMade >= maxAttempts) {
                getRetryStrategy()
                    .handleFailedJob(job)
                    .catch((handlerErr) => {
                    console.error(`[Worker] Error routing failed job ${job?.id} to DLQ:`, handlerErr.message);
                });
            }
        });
        this.manager.registerWorker(queueName, worker);
        this.isRunning = true;
        console.log(`[Worker] Started processing queue ${queueName}`);
        return worker;
    }
    /**
     * Start processors for all registered queues
     */
    async startAll(events) {
        for (const queueName of this.processorRegistry.keys()) {
            await this.startProcessor(queueName, events);
        }
    }
    /**
     * Stop a specific queue processor
     */
    async stopProcessor(queueName) {
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
    async stopAll() {
        await this.manager.shutdown();
        this.isRunning = false;
        console.log('[Worker] All processors stopped');
    }
    /**
     * Pause a queue processor
     */
    async pauseProcessor(queueName) {
        const worker = this.manager.getWorker(queueName);
        if (worker) {
            await worker.pause();
            console.log(`[Worker] Queue ${queueName} paused`);
        }
    }
    /**
     * Resume a queue processor
     */
    async resumeProcessor(queueName) {
        const worker = this.manager.getWorker(queueName);
        if (worker) {
            await worker.resume();
            console.log(`[Worker] Queue ${queueName} resumed`);
        }
    }
    /**
     * Check if worker is running
     */
    isProcessorRunning() {
        return this.isRunning;
    }
    /**
     * Merge default config with queue-specific config
     */
    mergeConfig(queueConfig) {
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
let workerInstance = null;
export function getQueueWorker() {
    if (!workerInstance) {
        workerInstance = QueueWorker.getInstance();
    }
    return workerInstance;
}
export { QueueWorker };
//# sourceMappingURL=worker.js.map