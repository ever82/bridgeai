/**
 * Retry Strategy & Dead Letter Queue
 *
 * Implements:
 * - Exponential backoff retry strategy
 * - Dead letter queue for permanently failed jobs
 * - Retry state tracking
 */
import { getQueueManager } from './queues';
import { QueueNames } from './config';
// Default retry options
export const defaultRetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    exponential: true,
    jitter: 0.1,
};
/**
 * Calculate retry delay using exponential backoff
 */
export function calculateBackoffDelay(attemptNumber, options = defaultRetryOptions) {
    let delay;
    if (options.exponential) {
        // Exponential: baseDelay * 2^(attempt - 1)
        delay = options.baseDelay * Math.pow(2, attemptNumber - 1);
    }
    else {
        // Fixed delay
        delay = options.baseDelay;
    }
    // Cap at max delay
    delay = Math.min(delay, options.maxDelay);
    // Add jitter to prevent thundering herd
    if (options.jitter > 0) {
        const jitterAmount = delay * options.jitter;
        delay += Math.random() * jitterAmount * 2 - jitterAmount;
    }
    return Math.floor(delay);
}
/**
 * Check if a job should be retried
 */
export function shouldRetry(attemptNumber, maxAttempts) {
    return attemptNumber < maxAttempts;
}
/**
 * Get the delay for the next retry
 */
export function getRetryDelay(attemptNumber, options = defaultRetryOptions) {
    return calculateBackoffDelay(attemptNumber, options);
}
class RetryStrategy {
    static instance = null;
    manager = getQueueManager();
    options;
    constructor(options = defaultRetryOptions) {
        this.options = options;
    }
    static getInstance(options) {
        if (!RetryStrategy.instance) {
            RetryStrategy.instance = new RetryStrategy(options);
        }
        return RetryStrategy.instance;
    }
    /**
     * Configure retry options
     */
    configure(options) {
        this.options = { ...this.options, ...options };
    }
    /**
     * Get current retry options
     */
    getOptions() {
        return { ...this.options };
    }
    /**
     * Process a permanently failed job - send to dead letter queue.
     * BullMQ handles retries via attempts+backoff config; this is called
     * only after all built-in retries have been exhausted.
     */
    async handleFailedJob(job) {
        const { failedReason } = job;
        console.log(`[Retry] Job ${job.id} permanently failed after ${job.attemptsMade} attempts, sending to dead letter queue`);
        await this.sendToDeadLetterQueue(job, failedReason || 'Unknown error');
    }
    /**
     * Send a failed job to the dead letter queue
     */
    async sendToDeadLetterQueue(job, error) {
        const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
        const deadLetterData = {
            originalQueue: job.queueName,
            originalJobId: job.id || 'unknown',
            originalJobData: job.data,
            error,
            errorStack: job.stacktrace?.[0],
            failedAt: new Date().toISOString(),
            attemptNumber: job.attemptsMade,
            originalJobOptions: job.opts,
        };
        await deadLetterQueue.add('dead-letter', deadLetterData, {
            jobId: `dlq-${job.id}-${Date.now()}`,
            removeOnComplete: false,
            removeOnFail: false,
        });
        console.log(`[Retry] Job ${job.id} sent to dead letter queue`);
    }
    /**
     * Reprocess a job from the dead letter queue
     */
    async reprocessFromDeadLetter(originalQueue, originalJobId, jobId) {
        const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
        const deadLetterJob = await deadLetterQueue.getJob(jobId);
        if (!deadLetterJob) {
            throw new Error(`Dead letter job ${jobId} not found`);
        }
        const data = deadLetterJob.data;
        // Add job back to original queue
        const originalQueueInstance = this.manager.getQueue(originalQueue);
        await originalQueueInstance.add(originalQueue, data.originalJobData, {
            attempts: 1, // Single attempt when reprocessing
            jobId: `${data.originalJobId}-reprocessed-${Date.now()}`,
        });
        // Remove from dead letter queue
        await deadLetterJob.remove();
        console.log(`[Retry] Reprocessed job ${jobId} back to queue ${originalQueue}`);
    }
    /**
     * Get dead letter queue statistics
     */
    async getDeadLetterStats() {
        const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
        const jobs = await deadLetterQueue.getJobs([]);
        const byOriginalQueue = {};
        for (const job of jobs) {
            const data = job.data;
            byOriginalQueue[data.originalQueue] = (byOriginalQueue[data.originalQueue] || 0) + 1;
        }
        return {
            total: jobs.length,
            byOriginalQueue,
        };
    }
    /**
     * Clean up old dead letter jobs
     */
    async cleanupDeadLetterJobs(olderThanDays = 30) {
        const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
        const jobs = await deadLetterQueue.getJobs([]);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        let removed = 0;
        for (const job of jobs) {
            const data = job.data;
            const failedAt = new Date(data.failedAt);
            if (failedAt < cutoffDate) {
                await job.remove();
                removed++;
            }
        }
        console.log(`[Retry] Cleaned up ${removed} dead letter jobs older than ${olderThanDays} days`);
        return removed;
    }
}
// Singleton accessor
let retryInstance = null;
export function getRetryStrategy(options) {
    if (!retryInstance) {
        retryInstance = RetryStrategy.getInstance(options);
    }
    return retryInstance;
}
export { RetryStrategy };
//# sourceMappingURL=retry.js.map