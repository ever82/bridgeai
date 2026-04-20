/**
 * Retry Strategy & Dead Letter Queue
 *
 * Implements:
 * - Exponential backoff retry strategy
 * - Dead letter queue for permanently failed jobs
 * - Retry state tracking
 */

import { Job } from 'bullmq';

import { getQueueManager } from './queues';
import { QueueNames, QueueName } from './config';

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

// Default retry options
export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 60000,
  exponential: true,
  jitter: 0.1,
};

/**
 * Calculate retry delay using exponential backoff
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  options: RetryOptions = defaultRetryOptions
): number {
  let delay: number;

  if (options.exponential) {
    // Exponential: baseDelay * 2^(attempt - 1)
    delay = options.baseDelay * Math.pow(2, attemptNumber - 1);
  } else {
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
export function shouldRetry(
  attemptNumber: number,
  maxAttempts: number
): boolean {
  return attemptNumber < maxAttempts;
}

/**
 * Get the delay for the next retry
 */
export function getRetryDelay(
  attemptNumber: number,
  options: RetryOptions = defaultRetryOptions
): number {
  return calculateBackoffDelay(attemptNumber, options);
}

class RetryStrategy {
  private static instance: RetryStrategy | null = null;
  private manager = getQueueManager();
  private options: RetryOptions;

  private constructor(options: RetryOptions = defaultRetryOptions) {
    this.options = options;
  }

  static getInstance(options?: RetryOptions): RetryStrategy {
    if (!RetryStrategy.instance) {
      RetryStrategy.instance = new RetryStrategy(options);
    }
    return RetryStrategy.instance;
  }

  /**
   * Configure retry options
   */
  configure(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current retry options
   */
  getOptions(): RetryOptions {
    return { ...this.options };
  }

  /**
   * Process a failed job - retry or send to dead letter queue
   */
  async handleFailedJob(job: Job): Promise<void> {
    const { failedReason } = job;
    const attemptNumber = job.attemptsMade + 1;

    console.log(`[Retry] Job ${job.id} failed (attempt ${attemptNumber}/${this.options.maxAttempts})`);

    if (shouldRetry(attemptNumber, this.options.maxAttempts)) {
      // Calculate delay for next retry
      const delay = getRetryDelay(attemptNumber, this.options);
      console.log(`[Retry] Scheduling retry for job ${job.id} in ${delay}ms`);

      // Re-add job with delay using the queue manager
      const queue = this.manager.getQueue(job.queueName as QueueName);
      await queue.add(job.name, job.data, {
        delay,
        attempts: this.options.maxAttempts - attemptNumber,
        jobId: `${job.id}-retry-${attemptNumber}`,
      });
    } else {
      // Max retries exceeded - send to dead letter queue
      console.log(`[Retry] Max retries exceeded for job ${job.id}, sending to dead letter queue`);
      await this.sendToDeadLetterQueue(job, failedReason || 'Unknown error');
    }
  }

  /**
   * Send a failed job to the dead letter queue
   */
  async sendToDeadLetterQueue(job: Job, error: string): Promise<void> {
    const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);

    const deadLetterData: DeadLetterJobData = {
      originalQueue: job.queueName,
      originalJobId: job.id || 'unknown',
      originalJobData: job.data as Record<string, unknown>,
      error,
      errorStack: job.stacktrace?.[0],
      failedAt: new Date().toISOString(),
      attemptNumber: job.attemptsMade,
      originalJobOptions: job.opts as Record<string, unknown>,
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
  async reprocessFromDeadLetter(
    originalQueue: QueueName,
    originalJobId: string,
    jobId: string
  ): Promise<void> {
    const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
    const deadLetterJob = await deadLetterQueue.getJob(jobId);

    if (!deadLetterJob) {
      throw new Error(`Dead letter job ${jobId} not found`);
    }

    const data = deadLetterJob.data as DeadLetterJobData;

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
  async getDeadLetterStats(): Promise<{
    total: number;
    byOriginalQueue: Record<string, number>;
  }> {
    const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
    const jobs = await deadLetterQueue.getJobs();

    const byOriginalQueue: Record<string, number> = {};
    for (const job of jobs) {
      const data = job.data as DeadLetterJobData;
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
  async cleanupDeadLetterJobs(olderThanDays: number = 30): Promise<number> {
    const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
    const jobs = await deadLetterQueue.getJobs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let removed = 0;
    for (const job of jobs) {
      const data = job.data as DeadLetterJobData;
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
let retryInstance: RetryStrategy | null = null;

export function getRetryStrategy(options?: RetryOptions): RetryStrategy {
  if (!retryInstance) {
    retryInstance = RetryStrategy.getInstance(options);
  }
  return retryInstance;
}

export { RetryStrategy };
