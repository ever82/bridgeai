/**
 * AI Async Queue Service
 * 异步队列服务 - 延迟任务队列、优先级管理、失败重试、结果回调
 */

import { EventEmitter } from 'events';

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types';

export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export interface AsyncJob {
  id: string;
  request: ChatCompletionRequest;
  status: JobStatus;
  priority: JobPriority;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  result?: ChatCompletionResponse;
  error?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface AsyncJobResult {
  id: string;
  status: JobStatus;
  result?: ChatCompletionResponse;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface QueueConfig {
  maxConcurrentJobs: number;
  defaultMaxRetries: number;
  defaultTtlMs: number;
  retryDelayMs: number;
  processingIntervalMs: number;
}

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrentJobs: 10,
  defaultMaxRetries: 3,
  defaultTtlMs: 30 * 60 * 1000, // 30 minutes
  retryDelayMs: 5000,
  processingIntervalMs: 1000,
};

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class AIAsyncQueueService extends EventEmitter {
  private queue: Map<string, AsyncJob> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private processingTimer?: ReturnType<typeof setInterval>;
  private processor?: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
  private stats = {
    enqueued: 0,
    completed: 0,
    failed: 0,
    expired: 0,
    retried: 0,
  };

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Set the processor function that handles queued requests
   */
  setProcessor(
    processor: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>
  ): void {
    this.processor = processor;
  }

  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(
      () => this.processNext(),
      this.config.processingIntervalMs
    );

    this.emit('processingStarted');
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
    this.emit('processingStopped');
  }

  /**
   * Enqueue a request for async processing
   */
  async enqueue(
    request: ChatCompletionRequest,
    options: {
      priority?: JobPriority;
      maxRetries?: number;
      ttlMs?: number;
      callbackUrl?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<AsyncJob> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const job: AsyncJob = {
      id,
      request,
      status: 'queued',
      priority: options.priority ?? 'normal',
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      createdAt: now,
      expiresAt: new Date(now.getTime() + (options.ttlMs ?? this.config.defaultTtlMs)),
      callbackUrl: options.callbackUrl,
      metadata: options.metadata,
    };

    this.queue.set(id, job);
    this.stats.enqueued++;

    this.emit('jobEnqueued', { id, priority: job.priority });

    return job;
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string): AsyncJobResult | null {
    const job = this.queue.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Cancel a queued job
   */
  cancel(jobId: string): boolean {
    const job = this.queue.get(jobId);
    if (!job || job.status === 'processing' || job.status === 'completed') {
      return false;
    }

    job.status = 'expired';
    this.stats.expired++;
    this.emit('jobCancelled', { id: jobId });
    return true;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const queued = Array.from(this.queue.values())
      .filter(j => j.status === 'queued').length;
    const processing = this.processing.size;

    return {
      ...this.stats,
      queued,
      processing,
      totalJobs: this.queue.size,
    };
  }

  /**
   * Get all jobs, optionally filtered by status
   */
  getJobs(status?: JobStatus): AsyncJob[] {
    const jobs = Array.from(this.queue.values());
    if (status) {
      return jobs.filter(j => j.status === status);
    }
    return jobs;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return Array.from(this.queue.values())
      .filter(j => j.status === 'queued').length;
  }

  /**
   * Purge expired jobs
   */
  purgeExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [id, job] of this.queue.entries()) {
      if (
        job.status === 'queued' &&
        job.expiresAt &&
        now > job.expiresAt.getTime()
      ) {
        job.status = 'expired';
        this.stats.expired++;
        count++;
        this.emit('jobExpired', { id });
      }
    }

    return count;
  }

  /**
   * Clear all completed/failed/expired jobs
   */
  clearCompleted(): number {
    let count = 0;

    for (const [id, job] of this.queue.entries()) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') {
        this.queue.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async processNext(): Promise<void> {
    if (!this.processor) return;
    if (this.processing.size >= this.config.maxConcurrentJobs) return;

    // Find next job by priority
    const nextJob = this.getNextJob();
    if (!nextJob) return;

    this.processing.add(nextJob.id);
    nextJob.status = 'processing';
    nextJob.startedAt = new Date();

    this.emit('jobStarted', { id: nextJob.id });

    try {
      const result = await this.processor(nextJob.request);

      nextJob.status = 'completed';
      nextJob.result = result;
      nextJob.completedAt = new Date();
      this.stats.completed++;

      this.emit('jobCompleted', { id: nextJob.id, result });

      // Callback notification
      if (nextJob.callbackUrl) {
        this.emit('callback', {
          url: nextJob.callbackUrl,
          jobId: nextJob.id,
          result,
        });
      }
    } catch (error) {
      nextJob.error = error instanceof Error ? error.message : 'Unknown error';

      if (nextJob.retryCount < nextJob.maxRetries) {
        // Retry
        nextJob.retryCount++;
        nextJob.status = 'queued';
        this.stats.retried++;
        this.emit('jobRetrying', {
          id: nextJob.id,
          retryCount: nextJob.retryCount,
          error: nextJob.error,
        });
      } else {
        // Max retries exhausted
        nextJob.status = 'failed';
        nextJob.completedAt = new Date();
        this.stats.failed++;
        this.emit('jobFailed', { id: nextJob.id, error: nextJob.error });
      }
    } finally {
      this.processing.delete(nextJob.id);
    }
  }

  private getNextJob(): AsyncJob | null {
    const now = Date.now();

    const queued = Array.from(this.queue.values())
      .filter(j => {
        if (j.status !== 'queued') return false;
        if (j.expiresAt && now > j.expiresAt.getTime()) {
          j.status = 'expired';
          this.stats.expired++;
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return queued[0] ?? null;
  }
}

export const asyncQueueService = new AIAsyncQueueService();
