/**
 * Queue Producer
 *
 * Provides unified job submission interface with:
 * - Immediate job scheduling
 * - Delayed job scheduling
 * - Cron-based recurring jobs
 */
import { Job } from 'bullmq';
import { QueueName } from './config';
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
export type JobData = Record<string, unknown>;
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
declare class QueueProducer {
    private static instance;
    private manager;
    private constructor();
    static getInstance(): QueueProducer;
    /**
     * Add a job to a queue
     */
    add<T extends JobData>(queueName: QueueName, data: T, options?: JobOptions): Promise<Job<T>>;
    /**
     * Add a delayed job (execute after delay)
     */
    addDelayed<T extends JobData>(queueName: QueueName, data: T, delayMs: number, options?: Omit<JobOptions, 'delay'>): Promise<Job<T>>;
    /**
     * Schedule a job at a specific time
     */
    schedule<T extends JobData>(queueName: QueueName, data: T, date: Date, options?: Omit<JobOptions, 'startDate'>): Promise<Job<T>>;
    /**
     * Create a recurring job (cron-based)
     */
    addCron<T extends JobData>(queueName: QueueName, data: T, cronExpression: string, options?: Omit<JobOptions, 'cron'>): Promise<Job<T>>;
    /**
     * Get a job by ID
     */
    getJob(queueName: QueueName, jobId: string): Promise<Job | null>;
    /**
     * Get job count by state
     */
    getJobCounts(queueName: QueueName): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    /**
     * Remove a job from queue
     */
    removeJob(queueName: QueueName, jobId: string): Promise<void>;
    /**
     * Pause a queue
     */
    pauseQueue(queueName: QueueName): Promise<void>;
    /**
     * Resume a queue
     */
    resumeQueue(queueName: QueueName): Promise<void>;
    /**
     * Drain a queue (remove all waiting jobs)
     */
    drainQueue(queueName: QueueName): Promise<void>;
}
export declare function getQueueProducer(): QueueProducer;
export { QueueProducer };
//# sourceMappingURL=producer.d.ts.map