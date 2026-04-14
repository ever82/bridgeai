/**
 * Queue Configuration
 *
 * Defines queue names and default configurations
 */

// Queue names for different job types
export const QueueNames = {
  // Core job queues
  CREDIT_UPDATE: 'credit-update',
  MATCH_NOTIFICATION: 'match-notification',
  EMAIL_DELIVERY: 'email-delivery',
  PUSH_NOTIFICATION: 'push-notification',
  DATA_EXPORT: 'data-export',

  // AI processing queues
  IMAGE_ANALYSIS: 'image-analysis',
  DEMAND_EXTRACTION: 'demand-extraction',

  // System queues
  DEAD_LETTER: 'dead-letter',
  SCHEDULED_TASK: 'scheduled-task',
} as const;

export type QueueName = typeof QueueNames[keyof typeof QueueNames];

// Queue configuration interface
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

// Default queue configuration
export const defaultQueueConfig: QueueConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  defaultJobOptions: {
    removeCompletedDelay: 60 * 60 * 1000, // 1 hour
    removeFailedDelay: 7 * 24 * 60 * 60 * 1000, // 7 days
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start at 1 second
    },
  },
  worker: {
    concurrency: 10,
    lockDuration: 30 * 1000, // 30 seconds
    rateLimitMax: 100,
    rateLimitWindow: 60 * 1000, // 1 minute
  },
};

// Queue-specific configurations (merge with default config)
export const queueConfigurations: Record<QueueName, {
  worker?: Partial<QueueConfig['worker']>;
  defaultJobOptions?: Partial<QueueConfig['defaultJobOptions']>;
}> = {
  [QueueNames.CREDIT_UPDATE]: {
    worker: {
      concurrency: 5,
      rateLimitMax: 50,
      rateLimitWindow: 60 * 1000,
    },
  },
  [QueueNames.MATCH_NOTIFICATION]: {
    worker: {
      concurrency: 20,
      rateLimitMax: 200,
      rateLimitWindow: 60 * 1000,
    },
    defaultJobOptions: {
      removeCompletedDelay: 30 * 60 * 1000, // 30 minutes
      removeFailedDelay: 24 * 60 * 60 * 1000, // 1 day
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
    },
  },
  [QueueNames.EMAIL_DELIVERY]: {
    worker: {
      concurrency: 10,
      rateLimitMax: 50,
      rateLimitWindow: 60 * 1000,
    },
  },
  [QueueNames.PUSH_NOTIFICATION]: {
    worker: {
      concurrency: 30,
      rateLimitMax: 500,
      rateLimitWindow: 60 * 1000,
    },
  },
  [QueueNames.DATA_EXPORT]: {
    worker: {
      concurrency: 2,
      rateLimitMax: 10,
      rateLimitWindow: 60 * 1000,
    },
    defaultJobOptions: {
      removeCompletedDelay: 24 * 60 * 60 * 1000, // 1 day
      removeFailedDelay: 30 * 24 * 60 * 60 * 1000, // 30 days
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
  [QueueNames.IMAGE_ANALYSIS]: {
    worker: {
      concurrency: 5,
      rateLimitMax: 20,
      rateLimitWindow: 60 * 1000,
    },
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    },
  },
  [QueueNames.DEMAND_EXTRACTION]: {
    worker: {
      concurrency: 10,
      rateLimitMax: 50,
      rateLimitWindow: 60 * 1000,
    },
  },
  [QueueNames.DEAD_LETTER]: {
    worker: {
      concurrency: 1,
      rateLimitMax: 10,
      rateLimitWindow: 60 * 1000,
    },
    defaultJobOptions: {
      removeCompletedDelay: 30 * 24 * 60 * 60 * 1000, // 30 days
      removeFailedDelay: 0, // Never remove
      attempts: 1,
      backoff: {
        type: 'fixed',
        delay: 0,
      },
    },
  },
  [QueueNames.SCHEDULED_TASK]: {
    worker: {
      concurrency: 10,
      rateLimitMax: 100,
      rateLimitWindow: 60 * 1000,
    },
  },
};
