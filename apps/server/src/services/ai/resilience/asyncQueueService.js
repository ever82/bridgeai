/**
 * AI Async Queue Service
 * 异步队列服务 - 延迟任务队列、优先级管理、失败重试、结果回调
 */
import { EventEmitter } from 'events';
const DEFAULT_QUEUE_CONFIG = {
    maxConcurrentJobs: 10,
    defaultMaxRetries: 3,
    defaultTtlMs: 30 * 60 * 1000, // 30 minutes
    retryDelayMs: 5000,
    processingIntervalMs: 1000,
};
const PRIORITY_ORDER = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
};
export class AIAsyncQueueService extends EventEmitter {
    queue = new Map();
    processing = new Set();
    config;
    processingTimer;
    processor;
    stats = {
        enqueued: 0,
        completed: 0,
        failed: 0,
        expired: 0,
        retried: 0,
    };
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    }
    /**
     * Set the processor function that handles queued requests
     */
    setProcessor(processor) {
        this.processor = processor;
    }
    /**
     * Start processing the queue
     */
    startProcessing() {
        if (this.processingTimer)
            return;
        this.processingTimer = setInterval(() => this.processNext(), this.config.processingIntervalMs);
        this.emit('processingStarted');
    }
    /**
     * Stop processing the queue
     */
    stopProcessing() {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = undefined;
        }
        this.emit('processingStopped');
    }
    /**
     * Enqueue a request for async processing
     */
    async enqueue(request, options = {}) {
        const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const job = {
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
    getJob(jobId) {
        const job = this.queue.get(jobId);
        if (!job)
            return null;
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
    cancel(jobId) {
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
        const queued = Array.from(this.queue.values()).filter(j => j.status === 'queued').length;
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
    getJobs(status) {
        const jobs = Array.from(this.queue.values());
        if (status) {
            return jobs.filter(j => j.status === status);
        }
        return jobs;
    }
    /**
     * Get queue length
     */
    getQueueLength() {
        return Array.from(this.queue.values()).filter(j => j.status === 'queued').length;
    }
    /**
     * Purge expired jobs
     */
    purgeExpired() {
        const now = Date.now();
        let count = 0;
        for (const [id, job] of this.queue.entries()) {
            if (job.status === 'queued' && job.expiresAt && now > job.expiresAt.getTime()) {
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
    clearCompleted() {
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
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    async processNext() {
        if (!this.processor)
            return;
        if (this.processing.size >= this.config.maxConcurrentJobs)
            return;
        // Find next job by priority
        const nextJob = this.getNextJob();
        if (!nextJob)
            return;
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
        }
        catch (error) {
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
            }
            else {
                // Max retries exhausted
                nextJob.status = 'failed';
                nextJob.completedAt = new Date();
                this.stats.failed++;
                this.emit('jobFailed', { id: nextJob.id, error: nextJob.error });
            }
        }
        finally {
            this.processing.delete(nextJob.id);
        }
    }
    getNextJob() {
        const now = Date.now();
        const queued = Array.from(this.queue.values())
            .filter(j => {
            if (j.status !== 'queued')
                return false;
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
            if (priorityDiff !== 0)
                return priorityDiff;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return queued[0] ?? null;
    }
}
export const asyncQueueService = new AIAsyncQueueService();
//# sourceMappingURL=asyncQueueService.js.map