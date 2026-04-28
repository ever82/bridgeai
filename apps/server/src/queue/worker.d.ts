/**
 * Queue Worker
 *
 * Provides worker process management with:
 * - Concurrency control
 * - Rate limiting
 * - Job timeout handling
 * - Graceful shutdown
 */
import { Worker, Job } from 'bullmq';
import { QueueName } from './config';
export type JobProcessor<T = any> = (job: Job<T>) => Promise<void>;
export interface WorkerEvents {
    onCompleted?: (job: Job) => void;
    onFailed?: (job: Job, error: Error) => void;
    onProgress?: (job: Job, progress: number) => void;
    onError?: (error: Error) => void;
}
declare class QueueWorker {
    private static instance;
    private manager;
    private processorRegistry;
    private isRunning;
    private constructor();
    static getInstance(): QueueWorker;
    /**
     * Get Redis connection options
     */
    private getRedisConnection;
    /**
     * Register a job processor for a queue
     */
    registerProcessor<T>(queueName: QueueName, processor: JobProcessor<T>): void;
    /**
     * Start processing jobs for a queue
     */
    startProcessor(queueName: QueueName, events?: WorkerEvents): Promise<Worker>;
    /**
     * Start processors for all registered queues
     */
    startAll(events?: WorkerEvents): Promise<void>;
    /**
     * Stop a specific queue processor
     */
    stopProcessor(queueName: QueueName): Promise<void>;
    /**
     * Stop all processors gracefully
     */
    stopAll(): Promise<void>;
    /**
     * Pause a queue processor
     */
    pauseProcessor(queueName: QueueName): Promise<void>;
    /**
     * Resume a queue processor
     */
    resumeProcessor(queueName: QueueName): Promise<void>;
    /**
     * Check if worker is running
     */
    isProcessorRunning(): boolean;
    /**
     * Merge default config with queue-specific config
     */
    private mergeConfig;
}
export declare function getQueueWorker(): QueueWorker;
export { QueueWorker };
//# sourceMappingURL=worker.d.ts.map