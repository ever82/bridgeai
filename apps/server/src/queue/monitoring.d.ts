/**
 * Queue Monitoring
 *
 * Provides queue status and metrics including:
 * - Queue health status
 * - Job counts by state
 * - Worker status
 * - Failed job details
 * - Queue statistics
 */
import { Job } from 'bullmq';
import { QueueName } from './config';
export interface QueueMetrics {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
}
export interface QueueHealth {
    queueName: string;
    healthy: boolean;
    connected: boolean;
    error?: string;
}
export interface QueueStats {
    totalJobsProcessed: number;
    totalJobsFailed: number;
    averageProcessingTime: number;
    jobsPerMinute: number;
    failureRate: number;
}
declare class QueueMonitor {
    private static instance;
    private manager;
    private metricsInterval;
    private constructor();
    static getInstance(): QueueMonitor;
    /**
     * Get metrics for a specific queue
     */
    getQueueMetrics(queueName: QueueName): Promise<QueueMetrics>;
    /**
     * Get metrics for all queues
     */
    getAllQueueMetrics(): Promise<QueueMetrics[]>;
    /**
     * Get health status for all queues
     */
    getQueueHealth(): Promise<QueueHealth[]>;
    /**
     * Get failed jobs from a queue
     */
    getFailedJobs(queueName: QueueName, start?: number, end?: number): Promise<Job[]>;
    /**
     * Get dead letter queue contents
     */
    getDeadLetterJobs(start?: number, end?: number): Promise<Array<Job<any>>>;
    /**
     * Get dead letter queue statistics
     */
    getDeadLetterStats(): Promise<{
        total: number;
        jobs: Array<{
            originalQueue: string;
            originalJobId: string;
            error: string;
            failedAt: string;
            attemptNumber: number;
        }>;
    }>;
    /**
     * Get worker status for all queues
     */
    getWorkerStatus(): Promise<Array<{
        queueName: string;
        running: boolean;
        paused: boolean;
        concurrency: number;
        activeCount: number;
    }>>;
    /**
     * Get statistics summary
     */
    getStats(): Promise<QueueStats>;
    /**
     * Calculate jobs per minute from history
     */
    private calculateJobsPerMinute;
    /**
     * Start collecting metrics periodically
     */
    private startMetricsCollection;
    /**
     * Stop metrics collection
     */
    stopMetricsCollection(): void;
    /**
     * Get queue overview for monitoring panel
     */
    getQueueOverview(): Promise<{
        queues: QueueMetrics[];
        health: QueueHealth[];
        stats: QueueStats;
        workers: Array<{
            queueName: string;
            running: boolean;
            paused: boolean;
        }>;
    }>;
}
export declare function getQueueMonitor(): QueueMonitor;
export { QueueMonitor };
//# sourceMappingURL=monitoring.d.ts.map