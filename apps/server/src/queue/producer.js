/**
 * Queue Producer
 *
 * Provides unified job submission interface with:
 * - Immediate job scheduling
 * - Delayed job scheduling
 * - Cron-based recurring jobs
 */
import { getQueueManager } from './queues';
class QueueProducer {
    static instance = null;
    manager;
    constructor() {
        this.manager = getQueueManager();
    }
    static getInstance() {
        if (!QueueProducer.instance) {
            QueueProducer.instance = new QueueProducer();
        }
        return QueueProducer.instance;
    }
    /**
     * Add a job to a queue
     */
    async add(queueName, data, options) {
        const queue = this.manager.getQueue(queueName);
        const jobOptions = {
            removeOnComplete: true,
            removeOnFail: false, // Keep failed jobs for debugging
        };
        if (options) {
            if (options.priority !== undefined)
                jobOptions.priority = options.priority;
            if (options.delay !== undefined)
                jobOptions.delay = options.delay;
            if (options.timeout !== undefined)
                jobOptions.timeout = options.timeout;
            if (options.attempts !== undefined)
                jobOptions.attempts = options.attempts;
            if (options.jobId)
                jobOptions.jobId = options.jobId;
        }
        const job = await queue.add(queueName, data, jobOptions);
        console.log(`[Producer] Added job ${job.id} to queue ${queueName}`);
        return job;
    }
    /**
     * Add a delayed job (execute after delay)
     */
    async addDelayed(queueName, data, delayMs, options) {
        return this.add(queueName, data, { ...options, delay: delayMs });
    }
    /**
     * Schedule a job at a specific time
     */
    async schedule(queueName, data, date, options) {
        const delay = date.getTime() - Date.now();
        if (delay < 0) {
            throw new Error('Scheduled date must be in the future');
        }
        return this.addDelayed(queueName, data, delay, options);
    }
    /**
     * Create a recurring job (cron-based)
     */
    async addCron(queueName, data, cronExpression, options) {
        const queue = this.manager.getQueue(queueName);
        const jobOptions = {
            repeat: { pattern: cronExpression },
            removeOnComplete: true,
            removeOnFail: false,
        };
        if (options) {
            if (options.priority !== undefined)
                jobOptions.priority = options.priority;
            if (options.attempts !== undefined)
                jobOptions.attempts = options.attempts;
        }
        const job = await queue.add(queueName, data, jobOptions);
        console.log(`[Producer] Added recurring job ${job.id} to queue ${queueName} with cron ${cronExpression}`);
        return job;
    }
    /**
     * Get a job by ID
     */
    async getJob(queueName, jobId) {
        const queue = this.manager.getQueue(queueName);
        return queue.getJob(jobId) || null;
    }
    /**
     * Get job count by state
     */
    async getJobCounts(queueName) {
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
    async removeJob(queueName, jobId) {
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
    async pauseQueue(queueName) {
        const queue = this.manager.getQueue(queueName);
        await queue.pause();
        console.log(`[Producer] Queue ${queueName} paused`);
    }
    /**
     * Resume a queue
     */
    async resumeQueue(queueName) {
        const queue = this.manager.getQueue(queueName);
        await queue.resume();
        console.log(`[Producer] Queue ${queueName} resumed`);
    }
    /**
     * Drain a queue (remove all waiting jobs)
     */
    async drainQueue(queueName) {
        const queue = this.manager.getQueue(queueName);
        await queue.drain();
        console.log(`[Producer] Queue ${queueName} drained`);
    }
}
// Singleton accessor
let producerInstance = null;
export function getQueueProducer() {
    if (!producerInstance) {
        producerInstance = QueueProducer.getInstance();
    }
    return producerInstance;
}
export { QueueProducer };
//# sourceMappingURL=producer.js.map