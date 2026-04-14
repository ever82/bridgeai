/**
 * Queue Producer
 *
 * Provides unified job submission interface with:
 * - Immediate job scheduling
 * - Delayed job scheduling
 * - Cron-based recurring jobs
 */

import { Queue, Job } from 'bullmq';
import { getQueueManager, QueueManager } from './queues';
import { QueueName } from './config';

// Job data types for different queue types
export interface CreditUpdateJobData {
  userId?: string;
  batchSize?: number;
  source: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'match' | 'message' | 'system';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface ExportJobData {
  userId: string;
  exportType: 'csv' | 'json' | 'pdf';
  filters?: Record<string, unknown>;
}

export interface ImageAnalysisJobData {
  imageUrl: string;
  analysisType: 'moderation' | 'ocr' | 'scene';
  options?: Record<string, unknown>;
}

export interface DemandExtractionJobData {
  text: string;
  source: string;
  priority?: 'low' | 'normal' | 'high';
}

// Generic job data type
export type JobData =
  | CreditUpdateJobData
  | NotificationJobData
  | EmailJobData
  | ExportJobData
  | ImageAnalysisJobData
  | DemandExtractionJobData
  | Record<string, unknown>;

// Job options
export interface JobOptions {
  /** Priority (higher = more priority) */
  priority?: number;
  /** Delay before job can be processed (ms) */
  delay?: number;
  /** Job timeout (ms) */
  timeout?: number;
  /** Number of attempts */
  attempts?: number;
  /** Cron expression for recurring jobs */
  cron?: string;
  /** Start date for scheduled jobs */
  startDate?: Date;
  /** End date for scheduled jobs */
  endDate?: Date;
  /** Custom job ID (must be unique) */
  jobId?: string;
}

class QueueProducer {
  private static instance: QueueProducer | null = null;
  private manager: QueueManager;

  private constructor() {
    this.manager = getQueueManager();
  }

  static getInstance(): QueueProducer {
    if (!QueueProducer.instance) {
      QueueProducer.instance = new QueueProducer();
    }
    return QueueProducer.instance;
  }

  /**
   * Add a job to a queue
   */
  async add<T extends JobData>(
    queueName: QueueName,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.manager.getQueue(queueName);

    const jobOptions: {
      priority?: number;
      delay?: number;
      timeout?: number;
      attempts?: number;
      jobId?: string;
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    } = {
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for debugging
    };

    if (options) {
      if (options.priority !== undefined) jobOptions.priority = options.priority;
      if (options.delay !== undefined) jobOptions.delay = options.delay;
      if (options.timeout !== undefined) jobOptions.timeout = options.timeout;
      if (options.attempts !== undefined) jobOptions.attempts = options.attempts;
      if (options.jobId) jobOptions.jobId = options.jobId;
    }

    const job = await queue.add(queueName, data, jobOptions);
    console.log(`[Producer] Added job ${job.id} to queue ${queueName}`);
    return job as Job<T>;
  }

  /**
   * Add a delayed job (execute after delay)
   */
  async addDelayed<T extends JobData>(
    queueName: QueueName,
    data: T,
    delayMs: number,
    options?: Omit<JobOptions, 'delay'>
  ): Promise<Job<T>> {
    return this.add(queueName, data, { ...options, delay: delayMs });
  }

  /**
   * Schedule a job at a specific time
   */
  async schedule<T extends JobData>(
    queueName: QueueName,
    data: T,
    date: Date,
    options?: Omit<JobOptions, 'startDate'>
  ): Promise<Job<T>> {
    const delay = date.getTime() - Date.now();
    if (delay < 0) {
      throw new Error('Scheduled date must be in the future');
    }
    return this.addDelayed(queueName, data, delay, options);
  }

  /**
   * Create a recurring job (cron-based)
   */
  async addCron<T extends JobData>(
    queueName: QueueName,
    data: T,
    cronExpression: string,
    options?: Omit<JobOptions, 'cron'>
  ): Promise<Job<T>> {
    const queue = this.manager.getQueue(queueName);

    const jobOptions: {
      priority?: number;
      attempts?: number;
      repeat: { pattern: string };
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    } = {
      repeat: { pattern: cronExpression },
      removeOnComplete: true,
      removeOnFail: false,
    };

    if (options) {
      if (options.priority !== undefined) jobOptions.priority = options.priority;
      if (options.attempts !== undefined) jobOptions.attempts = options.attempts;
    }

    const job = await queue.add(queueName, data, jobOptions);
    console.log(`[Producer] Added recurring job ${job.id} to queue ${queueName} with cron ${cronExpression}`);
    return job as Job<T>;
  }

  /**
   * Get a job by ID
   */
  async getJob(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.manager.getQueue(queueName);
    return queue.getJob(jobId) || null;
  }

  /**
   * Get job count by state
   */
  async getJobCounts(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.manager.getQueue(queueName);
    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.manager.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[Producer] Removed job ${jobId} from queue ${queueName}`);
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.manager.getQueue(queueName);
    await queue.pause();
    console.log(`[Producer] Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.manager.getQueue(queueName);
    await queue.resume();
    console.log(`[Producer] Queue ${queueName} resumed`);
  }

  /**
   * Drain a queue (remove all waiting jobs)
   */
  async drainQueue(queueName: QueueName): Promise<void> {
    const queue = this.manager.getQueue(queueName);
    await queue.drain();
    console.log(`[Producer] Queue ${queueName} drained`);
  }
}

// Singleton accessor
let producerInstance: QueueProducer | null = null;

export function getQueueProducer(): QueueProducer {
  if (!producerInstance) {
    producerInstance = QueueProducer.getInstance();
  }
  return producerInstance;
}

export { QueueProducer };
