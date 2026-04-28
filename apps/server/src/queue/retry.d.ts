/**
 * Retry Strategy & Dead Letter Queue
 *
 * Implements:
 * - Exponential backoff retry strategy
 * - Dead letter queue for permanently failed jobs
 * - Retry state tracking
 */
export {};
import { Job } from 'bullmq';
import { QueueName } from './config';
export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxAttempts: number;
    /** Base delay for exponential backoff (ms) */
    baseDelay: number;
    /** Maximum delay between retries (ms) */
    maxDelay: number;
    /** Whether to use exponential backoff or fixed delay */
    exponential: boolean;
    /** Jitter factor (0-1) to add randomness */
    jitter: number;
}
export interface DeadLetterJobData {
    originalQueue: string;
    originalJobId: string;
    originalJobData: Record<string, unknown>;
    error: string;
    errorStack?: string;
    failedAt: string;
    attemptNumber: number;
    originalJobOptions?: Record<string, unknown>;
}
export declare const defaultRetryOptions: RetryOptions;
/**
 * Calculate retry delay using exponential backoff
 */
export declare function calculateBackoffDelay(attemptNumber: number, options?: RetryOptions): number;
/**
 * Check if a job should be retried
 */
export declare function shouldRetry(attemptNumber: number, maxAttempts: number): boolean;
/**
 * Get the delay for the next retry
 */
export declare function getRetryDelay(attemptNumber: number, options?: RetryOptions): number;
declare class RetryStrategy {
    private static instance;
    private manager;
    private options;
    private constructor();
    static getInstance(options?: RetryOptions): RetryStrategy;
    /**
     * Configure retry options
     */
    configure(options: Partial<RetryOptions>): void;
    /**
     * Get current retry options
     */
    getOptions(): RetryOptions;
    /**
     * Process a permanently failed job - send to dead letter queue.
     * BullMQ handles retries via attempts+backoff config; this is called
     * only after all built-in retries have been exhausted.
     */
    handleFailedJob(job: Job): Promise<void>;
    /**
     * Send a failed job to the dead letter queue
     */
    sendToDeadLetterQueue(job: Job, error: string): Promise<void>;
    /**
     * Reprocess a job from the dead letter queue
     */
    reprocessFromDeadLetter(originalQueue: QueueName, originalJobId: string, jobId: string): Promise<void>;
    /**
     * Get dead letter queue statistics
     */
    getDeadLetterStats(): Promise<{
        total: number;
        byOriginalQueue: Record<string, number>;
    }>;
    /**
     * Clean up old dead letter jobs
     */
    cleanupDeadLetterJobs(olderThanDays?: number): Promise<number>;
}
export declare function getRetryStrategy(options?: RetryOptions): RetryStrategy;
export { RetryStrategy };
//# sourceMappingURL=retry.d.ts.map