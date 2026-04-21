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

import { getQueueManager } from './queues';
import { QueueNames, QueueName } from './config';
import { DeadLetterJobData, getRetryStrategy } from './retry';

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

// Metrics history for calculating rates
const metricsHistory: Map<string, { timestamp: number; completed: number; failed: number }[]> = new Map();
const METRICS_HISTORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const METRICS_SAMPLE_INTERVAL_MS = 60 * 1000; // 1 minute

class QueueMonitor {
  private static instance: QueueMonitor | null = null;
  private manager = getQueueManager();
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMetricsCollection();
  }

  static getInstance(): QueueMonitor {
    if (!QueueMonitor.instance) {
      QueueMonitor.instance = new QueueMonitor();
    }
    return QueueMonitor.instance;
  }

  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(queueName: QueueName): Promise<QueueMetrics> {
    const queue = this.manager.getQueue(queueName);
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();

    return {
      name: queueName,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: isPaused,
    };
  }

  /**
   * Get metrics for all queues
   */
  async getAllQueueMetrics(): Promise<QueueMetrics[]> {
    const metrics: QueueMetrics[] = [];
    for (const name of Object.values(QueueNames)) {
      try {
        const queueMetrics = await this.getQueueMetrics(name);
        metrics.push(queueMetrics);
      } catch (error) {
        console.error(`[Monitor] Error getting metrics for queue ${name}:`, error);
      }
    }
    return metrics;
  }

  /**
   * Get health status for all queues
   */
  async getQueueHealth(): Promise<QueueHealth[]> {
    const health: QueueHealth[] = [];

    for (const name of Object.values(QueueNames)) {
      try {
        const queue = this.manager.getQueue(name);
        const client = await (queue as any).client;
        await client.ping();

        health.push({
          queueName: name,
          healthy: true,
          connected: true,
        });
      } catch (error) {
        health.push({
          queueName: name,
          healthy: false,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return health;
  }

  /**
   * Get failed jobs from a queue
   */
  async getFailedJobs(
    queueName: QueueName,
    start: number = 0,
    end: number = 10
  ): Promise<Job[]> {
    const queue = this.manager.getQueue(queueName);
    const counts = await queue.getJobCounts();

    if (counts.failed === 0) {
      return [];
    }

    return queue.getJobs(['failed'], start, start + end);
  }

  /**
   * Get dead letter queue contents
   */
  async getDeadLetterJobs(
    start: number = 0,
    end: number = 10
  ): Promise<Array<Job<any>>> {
    const deadLetterQueue = this.manager.getQueue(QueueNames.DEAD_LETTER);
    return deadLetterQueue.getJobs([], start, start + end) as Promise<Job<any>[]>;
  }

  /**
   * Get dead letter queue statistics
   */
  async getDeadLetterStats(): Promise<{
    total: number;
    jobs: Array<{
      originalQueue: string;
      originalJobId: string;
      error: string;
      failedAt: string;
      attemptNumber: number;
    }>;
  }> {
    const jobs = await this.getDeadLetterJobs(0, 100);

    return {
      total: jobs.length,
      jobs: jobs.map((job) => {
        const data = job.data as DeadLetterJobData;
        return {
          originalQueue: data.originalQueue,
          originalJobId: data.originalJobId,
          error: data.error,
          failedAt: data.failedAt,
          attemptNumber: data.attemptNumber,
        };
      }),
    };
  }

  /**
   * Get worker status for all queues
   */
  async getWorkerStatus(): Promise<
    Array<{
      queueName: string;
      running: boolean;
      paused: boolean;
      concurrency: number;
      activeCount: number;
    }>
  > {
    const workers: Array<{
      queueName: string;
      running: boolean;
      paused: boolean;
      concurrency: number;
      activeCount: number;
    }> = [];

    for (const name of Object.values(QueueNames)) {
      const worker = this.manager.getWorker(name);
      if (worker) {
        const queue = this.manager.getQueue(name);
        const counts = await queue.getJobCounts();

        workers.push({
          queueName: name,
          running: true,
          paused: worker.isPaused(),
          concurrency: worker.concurrency,
          activeCount: counts.active,
        });
      }
    }

    return workers;
  }

  /**
   * Get statistics summary
   */
  async getStats(): Promise<QueueStats> {
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalProcessingTime = 0;
    let processingCount = 0;

    for (const name of Object.values(QueueNames)) {
      try {
        const queue = this.manager.getQueue(name);
        const counts = await queue.getJobCounts();

        totalCompleted += Number(counts.completed || 0);
        totalFailed += Number(counts.failed || 0);

        // Get recent completed jobs to estimate processing time
        const jobs = await queue.getJobs(['completed'], 0, 100);
        for (const job of jobs) {
          if (job.processedOn && job.finishedOn) {
            totalProcessingTime += job.finishedOn - job.processedOn;
            processingCount++;
          }
        }
      } catch (error) {
        console.error(`[Monitor] Error getting stats for queue ${name}:`, error);
      }
    }

    const averageProcessingTime = processingCount > 0 ? totalProcessingTime / processingCount : 0;
    const totalJobs = totalCompleted + totalFailed;
    const failureRate = totalJobs > 0 ? (totalFailed / totalJobs) * 100 : 0;

    return {
      totalJobsProcessed: totalCompleted,
      totalJobsFailed: totalFailed,
      averageProcessingTime: Math.round(averageProcessingTime),
      jobsPerMinute: this.calculateJobsPerMinute(),
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * Calculate jobs per minute from history
   */
  private calculateJobsPerMinute(): number {
    const now = Date.now();
    let totalJobs = 0;

    for (const [, history] of metricsHistory) {
      const recentHistory = history.filter((h) => now - h.timestamp < METRICS_SAMPLE_INTERVAL_MS * 5);
      for (const h of recentHistory) {
        totalJobs += h.completed + h.failed;
      }
    }

    return Math.round(totalJobs / 5);
  }

  /**
   * Start collecting metrics periodically
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const now = Date.now();

      for (const name of Object.values(QueueNames)) {
        try {
          const queue = this.manager.getQueue(name);
          const counts = await queue.getJobCounts();

          if (!metricsHistory.has(name)) {
            metricsHistory.set(name, []);
          }

          const history = metricsHistory.get(name)!;
          history.push({
            timestamp: now,
            completed: counts.completed,
            failed: counts.failed,
          });

          // Clean old entries
          const cutoff = now - METRICS_HISTORY_WINDOW_MS;
          const filtered = history.filter((h) => h.timestamp > cutoff);
          metricsHistory.set(name, filtered);
        } catch {
          // Ignore errors in metrics collection
        }
      }
    }, METRICS_SAMPLE_INTERVAL_MS);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Get queue overview for monitoring panel
   */
  async getQueueOverview(): Promise<{
    queues: QueueMetrics[];
    health: QueueHealth[];
    stats: QueueStats;
    workers: Array<{
      queueName: string;
      running: boolean;
      paused: boolean;
    }>;
  }> {
    const [queues, health, stats, workers] = await Promise.all([
      this.getAllQueueMetrics(),
      this.getQueueHealth(),
      this.getStats(),
      this.getWorkerStatus(),
    ]);

    return {
      queues,
      health,
      stats,
      workers: workers.map((w) => ({
        queueName: w.queueName,
        running: w.running,
        paused: w.paused,
      })),
    };
  }
}

// Singleton accessor
let monitorInstance: QueueMonitor | null = null;

export function getQueueMonitor(): QueueMonitor {
  if (!monitorInstance) {
    monitorInstance = QueueMonitor.getInstance();
  }
  return monitorInstance;
}

export { QueueMonitor };
