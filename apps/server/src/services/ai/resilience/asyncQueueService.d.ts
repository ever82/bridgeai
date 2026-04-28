/**
 * AI Async Queue Service
 * 异步队列服务 - 延迟任务队列、优先级管理、失败重试、结果回调
 */
import { EventEmitter } from 'events';
import { ChatCompletionRequest, ChatCompletionResponse } from '../types';
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
export declare class AIAsyncQueueService extends EventEmitter {
    private queue;
    private processing;
    private config;
    private processingTimer?;
    private processor?;
    private stats;
    constructor(config?: Partial<QueueConfig>);
    /**
     * Set the processor function that handles queued requests
     */
    setProcessor(processor: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>): void;
    /**
     * Start processing the queue
     */
    startProcessing(): void;
    /**
     * Stop processing the queue
     */
    stopProcessing(): void;
    /**
     * Enqueue a request for async processing
     */
    enqueue(request: ChatCompletionRequest, options?: {
        priority?: JobPriority;
        maxRetries?: number;
        ttlMs?: number;
        callbackUrl?: string;
        metadata?: Record<string, unknown>;
    }): Promise<AsyncJob>;
    /**
     * Get job status and result
     */
    getJob(jobId: string): AsyncJobResult | null;
    /**
     * Cancel a queued job
     */
    cancel(jobId: string): boolean;
    /**
     * Get queue statistics
     */
    getStats(): {
        queued: number;
        processing: number;
        totalJobs: number;
        enqueued: number;
        completed: number;
        failed: number;
        expired: number;
        retried: number;
    };
    /**
     * Get all jobs, optionally filtered by status
     */
    getJobs(status?: JobStatus): AsyncJob[];
    /**
     * Get queue length
     */
    getQueueLength(): number;
    /**
     * Purge expired jobs
     */
    purgeExpired(): number;
    /**
     * Clear all completed/failed/expired jobs
     */
    clearCompleted(): number;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<QueueConfig>): void;
    private processNext;
    private getNextJob;
}
export declare const asyncQueueService: AIAsyncQueueService;
//# sourceMappingURL=asyncQueueService.d.ts.map