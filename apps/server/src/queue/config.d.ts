/**
 * Queue Configuration
 *
 * Defines queue names and default configurations
 */
export declare const QueueNames: {
    readonly CREDIT_UPDATE: "credit-update";
    readonly MATCH_NOTIFICATION: "match-notification";
    readonly EMAIL_DELIVERY: "email-delivery";
    readonly PUSH_NOTIFICATION: "push-notification";
    readonly DATA_EXPORT: "data-export";
    readonly MESSAGE_DELIVERY: "message-delivery";
    readonly IMAGE_ANALYSIS: "image-analysis";
    readonly DEMAND_EXTRACTION: "demand-extraction";
    readonly DEAD_LETTER: "dead-letter";
    readonly SCHEDULED_TASK: "scheduled-task";
};
export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
export interface QueueConfig {
    /** Redis connection URL */
    connection: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    /** Default job options */
    defaultJobOptions: {
        /** Remove completed jobs after this time (ms) */
        removeCompletedDelay: number;
        /** Remove failed jobs after this time (ms) */
        removeFailedDelay: number;
        /** Maximum number of attempts */
        attempts: number;
        /** Backoff type */
        backoff: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
    };
    /** Worker configuration */
    worker: {
        /** Maximum concurrent jobs */
        concurrency: number;
        /** Lock duration for jobs (ms) */
        lockDuration: number;
        /** Rate limit max jobs per time window */
        rateLimitMax: number;
        /** Rate limit time window (ms) */
        rateLimitWindow: number;
    };
}
export declare const defaultQueueConfig: QueueConfig;
export declare const queueConfigurations: Record<QueueName, {
    worker?: Partial<QueueConfig['worker']>;
    defaultJobOptions?: Partial<QueueConfig['defaultJobOptions']>;
}>;
//# sourceMappingURL=config.d.ts.map