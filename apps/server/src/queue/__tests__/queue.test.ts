/**
 * Queue Infrastructure Tests
 *
 * Tests the Queue infrastructure with focus on:
 * - Pure functions (config, retry backoff logic)
 * - Worker limiter config (NP-822/NP-1400: rate limits applied)
 * - Monitoring paused await fix (NP-823: worker.isPaused() is async)
 * - HandleFailedJob wiring (NP-1401: DLQ routing on retry exhaustion)
 * - No duplicate retry (NP-824/NP-1402: BullMQ handles retries)
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import { QueueNames } from '../config';

// ============================================================
// MOCK BULLMQ - single shared mock function per method
// ============================================================

const mockQueueAdd = jest.fn();
const mockQueueGetJobCounts = jest.fn();
const mockQueueGetJobs = jest.fn();
const mockQueueGetJob = jest.fn();
const mockQueueIsPaused = jest.fn();
const mockQueuePause = jest.fn();
const mockQueueResume = jest.fn();
const mockQueueDrain = jest.fn();
const mockQueueClose = jest.fn();
const mockWorkerClose = jest.fn();
const mockWorkerIsPaused = jest.fn();
const mockWorkerPause = jest.fn();
const mockWorkerResume = jest.fn();
const mockQueueEventsClose = jest.fn();

function resetAllMocks(): void {
  mockQueueAdd.mockReset();
  mockQueueAdd.mockImplementation(async (name: string, data: any, opts?: any) => ({
    id: `job-${Date.now()}`,
    name,
    data,
    opts,
    queueName: name,
  }));
  mockQueueGetJobCounts.mockReset();
  mockQueueGetJobCounts.mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  });
  mockQueueGetJobs.mockReset();
  mockQueueGetJobs.mockResolvedValue([]);
  mockQueueGetJob.mockReset();
  mockQueueIsPaused.mockReset();
  mockQueueIsPaused.mockResolvedValue(false);
  mockQueuePause.mockReset();
  mockQueuePause.mockResolvedValue(undefined);
  mockQueueResume.mockReset();
  mockQueueResume.mockResolvedValue(undefined);
  mockQueueDrain.mockReset();
  mockQueueDrain.mockResolvedValue(undefined);
  mockQueueClose.mockReset();
  mockQueueClose.mockResolvedValue(undefined);
  mockWorkerClose.mockReset();
  mockWorkerClose.mockResolvedValue(undefined);
  mockWorkerIsPaused.mockReset();
  mockWorkerIsPaused.mockResolvedValue(false);
  mockWorkerPause.mockReset();
  mockWorkerPause.mockResolvedValue(undefined);
  mockWorkerResume.mockReset();
  mockWorkerResume.mockResolvedValue(undefined);
  mockQueueEventsClose.mockReset();
  mockQueueEventsClose.mockResolvedValue(undefined);
}

// Module-level reference to the last created Worker mock instance
let lastCreatedWorkerMock: any = null;

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation((name: string) => ({
    name,
    add: mockQueueAdd,
    getJobCounts: mockQueueGetJobCounts,
    getJobs: mockQueueGetJobs,
    getJob: mockQueueGetJob,
    isPaused: mockQueueIsPaused,
    pause: mockQueuePause,
    resume: mockQueueResume,
    drain: mockQueueDrain,
    close: mockQueueClose,
    client: Promise.resolve({ ping: jest.fn().mockResolvedValue('PONG') }),
  })),
  Worker: jest.fn().mockImplementation((name: string, _proc: any, opts?: any) => {
    const handlers: Record<string, Function[]> = {};
    const workerMock = {
      name,
      concurrency: opts?.concurrency || 10,
      isPaused: mockWorkerIsPaused,
      pause: mockWorkerPause,
      resume: mockWorkerResume,
      close: mockWorkerClose,
      on: jest.fn().mockImplementation((event: string, handler: Function) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
      }),
      _handlers: handlers,
      _options: opts,
    };
    lastCreatedWorkerMock = workerMock;
    return workerMock;
  }),
  QueueEvents: jest.fn().mockImplementation(() => ({ close: mockQueueEventsClose })),
  Job: jest.fn(),
}));

// ============================================================
// SINGLETON RESET HELPERS
// ============================================================

const { QueueManager } = require('../queues');
const { QueueProducer } = require('../producer');
const { QueueWorker } = require('../worker');
const { QueueMonitor } = require('../monitoring');
const { RetryStrategy } = require('../retry');

function resetAllSingletons(): void {
  // Clear QueueManager internal maps first
  try {
    const mgr = QueueManager.getInstance();
    const queues = (mgr as any).queues;
    if (queues && queues instanceof Map) {
      for (const [, q] of queues) {
        try {
          (q as any).close?.();
        } catch {
          /* */
        }
      }
      queues.clear();
    }
    const queueEvents = (mgr as any).queueEvents;
    if (queueEvents && queueEvents instanceof Map) {
      for (const [, e] of queueEvents) {
        try {
          (e as any).close?.();
        } catch {
          /* */
        }
      }
      queueEvents.clear();
    }
    (mgr as any).workers?.clear?.();
    (mgr as any).isInitialized = false;
  } catch {
    /* */
  }

  (QueueManager as any).instance = null;
  (QueueWorker as any).instance = null;
  (QueueMonitor as any).instance = null;
  (QueueProducer as any).instance = null;
  (RetryStrategy as any).instance = null;

  // Reset module-level managerInstance
  try {
    (require('../queues') as any).managerInstance = null;
    (require('../producer') as any).producerInstance = null;
    (require('../worker') as any).workerInstance = null;
    (require('../monitoring') as any).monitorInstance = null;
    (require('../retry') as any).retryInstance = null;
  } catch {
    /* */
  }
}

// ============================================================
// TESTS
// ============================================================

describe('Queue Config', () => {
  it('should have all required queue names', () => {
    expect(QueueNames.CREDIT_UPDATE).toBe('credit-update');
    expect(QueueNames.MATCH_NOTIFICATION).toBe('match-notification');
    expect(QueueNames.EMAIL_DELIVERY).toBe('email-delivery');
    expect(QueueNames.PUSH_NOTIFICATION).toBe('push-notification');
    expect(QueueNames.DATA_EXPORT).toBe('data-export');
    expect(QueueNames.IMAGE_ANALYSIS).toBe('image-analysis');
    expect(QueueNames.DEMAND_EXTRACTION).toBe('demand-extraction');
    expect(QueueNames.DEAD_LETTER).toBe('dead-letter');
    expect(QueueNames.SCHEDULED_TASK).toBe('scheduled-task');
  });
});

describe('Retry Strategy - Pure Functions', () => {
  const { calculateBackoffDelay, shouldRetry, defaultRetryOptions } = require('../retry');

  it('should calculate exponential backoff delay', () => {
    const opts = { maxAttempts: 3, baseDelay: 1000, maxDelay: 60000, exponential: true, jitter: 0 };
    expect(calculateBackoffDelay(1, opts)).toBe(1000);
    expect(calculateBackoffDelay(2, opts)).toBe(2000);
    expect(calculateBackoffDelay(3, opts)).toBe(4000);
  });

  it('should cap delay at maxDelay', () => {
    const opts = {
      maxAttempts: 10,
      baseDelay: 10000,
      maxDelay: 30000,
      exponential: true,
      jitter: 0,
    };
    expect(calculateBackoffDelay(3, opts)).toBeLessThanOrEqual(30000);
  });

  it('should determine if job should retry', () => {
    expect(shouldRetry(1, 3)).toBe(true);
    expect(shouldRetry(2, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
    expect(shouldRetry(4, 3)).toBe(false);
  });

  it('should have default retry options', () => {
    expect(defaultRetryOptions.maxAttempts).toBe(3);
    expect(defaultRetryOptions.baseDelay).toBe(1000);
    expect(defaultRetryOptions.exponential).toBe(true);
  });
});

describe('Queue Config Structure', () => {
  const { queueConfigurations, defaultQueueConfig } = require('../config');

  it('should have default queue config with rate limiting fields', () => {
    expect(defaultQueueConfig.worker).toBeDefined();
    expect(defaultQueueConfig.worker.rateLimitMax).toBe(100);
    expect(defaultQueueConfig.worker.rateLimitWindow).toBe(60000);
  });

  it('should have queue-specific rate limits', () => {
    const creditCfg = queueConfigurations[QueueNames.CREDIT_UPDATE];
    expect(creditCfg.worker?.rateLimitMax).toBe(50);

    const matchCfg = queueConfigurations[QueueNames.MATCH_NOTIFICATION];
    expect(matchCfg.worker?.rateLimitMax).toBe(200);

    const dataExportCfg = queueConfigurations[QueueNames.DATA_EXPORT];
    expect(dataExportCfg.worker?.rateLimitMax).toBe(10);
  });

  it('should allow credit update queue to override worker concurrency', () => {
    const creditConfig = queueConfigurations[QueueNames.CREDIT_UPDATE];
    expect(creditConfig.worker?.concurrency).toBe(5);
  });
});

describe('QueueManager', () => {
  beforeEach(() => {
    resetAllMocks();
    resetAllSingletons();
  });
  afterEach(async () => {
    resetAllSingletons();
  });

  it('should return the same queue instance for the same name', () => {
    const manager = QueueManager.getInstance();
    const q1 = manager.getQueue(QueueNames.CREDIT_UPDATE);
    const q2 = manager.getQueue(QueueNames.CREDIT_UPDATE);
    expect(q1).toBe(q2);
  });

  it('should initialize all queues', async () => {
    const manager = QueueManager.getInstance();
    await manager.initialize();
    expect(manager.isReady()).toBe(true);
  });

  it('should gracefully shutdown and clear all resources', async () => {
    const manager = QueueManager.getInstance();
    await manager.initialize();
    const mockWorker = { close: jest.fn().mockResolvedValue(undefined) };
    manager.registerWorker(QueueNames.CREDIT_UPDATE, mockWorker as any);
    await manager.shutdown();
    expect(manager.isReady()).toBe(false);
    expect(mockWorker.close).toHaveBeenCalled();
  });
});

describe('QueueProducer', () => {
  let producer: any;
  beforeEach(() => {
    resetAllMocks();
    resetAllSingletons();
    producer = QueueProducer.getInstance();
  });
  afterEach(() => {
    resetAllSingletons();
  });

  it('should add a job to a queue', async () => {
    const job = await producer.add(QueueNames.CREDIT_UPDATE, { source: 'test' });
    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(mockQueueAdd).toHaveBeenCalled();
  });

  it('should add a delayed job', async () => {
    await producer.addDelayed(QueueNames.EMAIL_DELIVERY, { userId: 'u1' }, 5000);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      QueueNames.EMAIL_DELIVERY,
      { userId: 'u1' },
      expect.objectContaining({ delay: 5000 })
    );
  });

  it('should throw when scheduling in the past', async () => {
    const pastDate = new Date(Date.now() - 60000);
    await expect(
      producer.schedule(QueueNames.SCHEDULED_TASK, { userId: 'u1' }, pastDate)
    ).rejects.toThrow('Scheduled date must be in the future');
  });

  it('should get job counts by state', async () => {
    mockQueueGetJobCounts.mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 1,
      delayed: 3,
    });
    const counts = await producer.getJobCounts(QueueNames.CREDIT_UPDATE);
    expect(counts.waiting).toBe(5);
    expect(counts.completed).toBe(100);
    expect(counts.failed).toBe(1);
  });

  it('should remove a job from queue', async () => {
    const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
    mockQueueGetJob.mockResolvedValue(mockJob);
    await producer.removeJob(QueueNames.CREDIT_UPDATE, 'job-1');
    expect(mockQueueGetJob).toHaveBeenCalledWith('job-1');
    expect(mockJob.remove).toHaveBeenCalled();
  });
});

describe('QueueWorker', () => {
  beforeEach(() => {
    resetAllMocks();
    resetAllSingletons();
  });
  afterEach(() => {
    resetAllSingletons();
  });

  // CRITICAL: NP-822/NP-1400 - Worker must be created with limiter config
  it('should create Worker with limiter option (rate limits applied)', async () => {
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.CREDIT_UPDATE, jest.fn());
    await worker.startProcessor(QueueNames.CREDIT_UPDATE);

    const { Worker: MockWorker } = require('bullmq');
    expect(MockWorker).toHaveBeenCalledWith(
      QueueNames.CREDIT_UPDATE,
      expect.any(Function),
      expect.objectContaining({
        limiter: expect.objectContaining({
          max: expect.any(Number),
          duration: expect.any(Number),
        }),
        concurrency: expect.any(Number),
        lockDuration: expect.any(Number),
      })
    );
  });

  it('should apply queue-specific rate limits (50 for CREDIT_UPDATE, 200 for MATCH_NOTIFICATION)', async () => {
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.MATCH_NOTIFICATION, jest.fn());
    await worker.startProcessor(QueueNames.MATCH_NOTIFICATION);

    const { Worker: MockWorker } = require('bullmq');
    const lastCall = MockWorker.mock.calls[MockWorker.mock.calls.length - 1];
    const options = lastCall[2];
    expect(options.limiter).toEqual({ max: 200, duration: 60000 });
  });

  // CRITICAL: NP-1401 - handleFailedJob must be called after BullMQ exhausts retries
  it('should call handleFailedJob when BullMQ exhausts all retries', async () => {
    lastCreatedWorkerMock = null;
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.CREDIT_UPDATE, jest.fn());
    await worker.startProcessor(QueueNames.CREDIT_UPDATE);

    const retryStrategy = require('../retry').getRetryStrategy();
    const handleSpy = jest.spyOn(retryStrategy, 'handleFailedJob').mockResolvedValue(undefined);

    const failedJob = {
      id: 'job-1',
      queueName: QueueNames.CREDIT_UPDATE,
      attemptsMade: 3,
      opts: { attempts: 3 },
      data: { source: 'test' },
      name: QueueNames.CREDIT_UPDATE,
    };

    const handlers = lastCreatedWorkerMock?._handlers?.['failed'] || [];
    expect(handlers.length).toBeGreaterThan(0);
    for (const h of handlers) await h(failedJob, new Error('Test failure'));

    expect(handleSpy).toHaveBeenCalled();
    handleSpy.mockRestore();
  });

  // CRITICAL: NP-1401 - handleFailedJob must NOT be called when retries remain
  it('should NOT call handleFailedJob when BullMQ retries remain', async () => {
    lastCreatedWorkerMock = null;
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.CREDIT_UPDATE, jest.fn());
    await worker.startProcessor(QueueNames.CREDIT_UPDATE);

    const retryStrategy = require('../retry').getRetryStrategy();
    const handleSpy = jest.spyOn(retryStrategy, 'handleFailedJob').mockResolvedValue(undefined);

    const failedJob = {
      id: 'job-1',
      queueName: QueueNames.CREDIT_UPDATE,
      attemptsMade: 1,
      opts: { attempts: 3 },
      data: { source: 'test' },
      name: QueueNames.CREDIT_UPDATE,
    };

    const handlers = lastCreatedWorkerMock?._handlers?.['failed'] || [];
    for (const h of handlers) await h(failedJob, new Error('Test failure'));

    expect(handleSpy).not.toHaveBeenCalled();
    handleSpy.mockRestore();
  });

  it('should start processors for all registered queues', async () => {
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.CREDIT_UPDATE, jest.fn());
    worker.registerProcessor(QueueNames.EMAIL_DELIVERY, jest.fn());
    await worker.startAll();

    const { Worker: MockWorker } = require('bullmq');
    expect(MockWorker).toHaveBeenCalledTimes(2);
  });

  it('should stop all processors gracefully', async () => {
    const worker = QueueWorker.getInstance();
    worker.registerProcessor(QueueNames.CREDIT_UPDATE, jest.fn());
    await worker.startAll();
    await worker.stopAll();
    expect(worker.isProcessorRunning()).toBe(false);
  });
});

describe('QueueMonitor', () => {
  let monitorInstance: any = null;
  beforeEach(() => {
    resetAllMocks();
    resetAllSingletons();
  });
  afterEach(() => {
    if (monitorInstance) monitorInstance.stopMetricsCollection();
    resetAllSingletons();
    monitorInstance = null;
  });

  // CRITICAL: NP-823 - worker.isPaused() returns Promise<boolean>, must be awaited
  it('should get worker status with correct paused boolean value (not Promise)', async () => {
    mockWorkerIsPaused.mockResolvedValue(true);
    const { getQueueManager } = require('../queues');
    const manager = getQueueManager();
    await manager.initialize();

    const mockWorker = { isPaused: mockWorkerIsPaused, concurrency: 5 };
    manager.registerWorker(QueueNames.CREDIT_UPDATE, mockWorker as any);

    monitorInstance = QueueMonitor.getInstance();
    const workers = await monitorInstance.getWorkerStatus();
    const creditWorker = workers.find((w: any) => w.queueName === QueueNames.CREDIT_UPDATE);

    expect(creditWorker).toBeDefined();
    expect(creditWorker?.paused).toBe(true);
    expect(creditWorker?.paused).not.toBeInstanceOf(Promise);
    expect(creditWorker?.concurrency).toBe(5);
    expect(creditWorker?.running).toBe(true);
  });

  it('should get metrics for a specific queue', async () => {
    mockQueueGetJobCounts.mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 1,
      delayed: 3,
    });
    mockQueueIsPaused.mockResolvedValue(false);

    monitorInstance = QueueMonitor.getInstance();
    const metrics = await monitorInstance.getQueueMetrics(QueueNames.CREDIT_UPDATE);

    expect(metrics).toEqual({
      name: QueueNames.CREDIT_UPDATE,
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 1,
      delayed: 3,
      paused: false,
    });
  });

  it('should get health status for all queues', async () => {
    monitorInstance = QueueMonitor.getInstance();
    const health = await monitorInstance.getQueueHealth();
    expect(health.length).toBe(Object.values(QueueNames).length);
    expect(health[0]).toEqual({
      queueName: expect.any(String),
      healthy: true,
      connected: true,
    });
  });

  it('should get queue overview with all sections', async () => {
    monitorInstance = QueueMonitor.getInstance();
    const overview = await monitorInstance.getQueueOverview();
    expect(overview).toHaveProperty('queues');
    expect(overview).toHaveProperty('health');
    expect(overview).toHaveProperty('stats');
    expect(overview).toHaveProperty('workers');
  });
});

describe('RetryStrategy', () => {
  let retryStrategy: any;
  beforeEach(() => {
    resetAllMocks();
    resetAllSingletons();
  });
  afterEach(() => {
    resetAllSingletons();
  });

  beforeEach(() => {
    retryStrategy = require('../retry').getRetryStrategy();
  });

  // CRITICAL: NP-824/NP-1402 - handleFailedJob must NOT re-add jobs (BullMQ handles retries)
  it('should send to DLQ directly without re-adding to original queue', async () => {
    const failedJob = {
      id: 'job-1',
      queueName: QueueNames.CREDIT_UPDATE,
      attemptsMade: 3,
      failedReason: 'Permanent failure',
      data: { source: 'test' },
      name: QueueNames.CREDIT_UPDATE,
      stacktrace: ['Error: Permanent failure'],
      opts: { attempts: 3 },
    };

    await retryStrategy.handleFailedJob(failedJob as any);

    // Should call DLQ add (first call)
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'dead-letter',
      expect.objectContaining({
        originalQueue: QueueNames.CREDIT_UPDATE,
        originalJobId: 'job-1',
        error: 'Permanent failure',
      }),
      expect.objectContaining({
        jobId: expect.stringContaining('dlq-job-1'),
        removeOnComplete: false,
        removeOnFail: false,
      })
    );
  });

  it('should throw when dead letter job not found', async () => {
    mockQueueGetJob.mockResolvedValue(null);
    await expect(
      retryStrategy.reprocessFromDeadLetter(QueueNames.CREDIT_UPDATE, 'job-1', 'dlq-1')
    ).rejects.toThrow('Dead letter job dlq-1 not found');
  });

  it('should reprocess a job from dead letter queue', async () => {
    const dlqJob = {
      id: 'dlq-1',
      data: {
        originalQueue: QueueNames.CREDIT_UPDATE,
        originalJobId: 'job-1',
        originalJobData: { source: 'test' },
      },
      remove: jest.fn().mockResolvedValue(undefined),
    };
    mockQueueGetJob.mockResolvedValue(dlqJob);

    await retryStrategy.reprocessFromDeadLetter(QueueNames.CREDIT_UPDATE, 'job-1', 'dlq-1');

    expect(mockQueueAdd).toHaveBeenCalledWith(
      QueueNames.CREDIT_UPDATE,
      { source: 'test' },
      expect.objectContaining({ attempts: 1 })
    );
    expect((dlqJob as any).remove).toHaveBeenCalled();
  });

  it('should get dead letter queue statistics', async () => {
    mockQueueGetJobs.mockResolvedValue([
      { data: { originalQueue: QueueNames.CREDIT_UPDATE } },
      { data: { originalQueue: QueueNames.CREDIT_UPDATE } },
      { data: { originalQueue: QueueNames.EMAIL_DELIVERY } },
    ]);

    const stats = await retryStrategy.getDeadLetterStats();
    expect(stats.total).toBe(3);
    expect(stats.byOriginalQueue[QueueNames.CREDIT_UPDATE]).toBe(2);
    expect(stats.byOriginalQueue[QueueNames.EMAIL_DELIVERY]).toBe(1);
  });

  it('should clean up old dead letter jobs', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);

    const mockJobs = [
      { data: { failedAt: oldDate.toISOString() }, remove: jest.fn().mockResolvedValue(undefined) },
      {
        data: { failedAt: new Date().toISOString() },
        remove: jest.fn().mockResolvedValue(undefined),
      },
    ];
    mockQueueGetJobs.mockResolvedValue(mockJobs);

    const removed = await retryStrategy.cleanupDeadLetterJobs(30);
    expect(removed).toBe(1);
    expect(mockJobs[0].remove).toHaveBeenCalled();
    expect(mockJobs[1].remove).not.toHaveBeenCalled();
  });

  it('should configure retry options', () => {
    retryStrategy.configure({ maxAttempts: 5, baseDelay: 2000 });
    const options = retryStrategy.getOptions();
    expect(options.maxAttempts).toBe(5);
    expect(options.baseDelay).toBe(2000);
  });
});
