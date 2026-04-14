/**
 * Queue Infrastructure Tests
 */

import { QueueNames } from '../config';

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

  it('should export queue configuration types', () => {
    expect(typeof QueueNames).toBe('object');
  });
});

describe('Retry Strategy - Pure Functions', () => {
  // Import only the pure functions that don't require module initialization
  const { calculateBackoffDelay, shouldRetry, defaultRetryOptions } = require('../retry');

  it('should calculate exponential backoff delay', () => {
    const options = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 60000,
      exponential: true,
      jitter: 0,
    };

    const delay1 = calculateBackoffDelay(1, options);
    const delay2 = calculateBackoffDelay(2, options);
    const delay3 = calculateBackoffDelay(3, options);

    // With exponential backoff and no jitter
    expect(delay1).toBe(1000); // 1000 * 2^0
    expect(delay2).toBe(2000); // 1000 * 2^1
    expect(delay3).toBe(4000); // 1000 * 2^2
  });

  it('should use fixed delay when exponential is false', () => {
    const options = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 60000,
      exponential: false,
      jitter: 0,
    };

    const delay1 = calculateBackoffDelay(1, options);
    const delay2 = calculateBackoffDelay(2, options);
    const delay3 = calculateBackoffDelay(3, options);

    // Fixed delay
    expect(delay1).toBe(1000);
    expect(delay2).toBe(1000);
    expect(delay3).toBe(1000);
  });

  it('should cap delay at maxDelay', () => {
    const options = {
      maxAttempts: 10,
      baseDelay: 10000,
      maxDelay: 30000,
      exponential: true,
      jitter: 0,
    };

    // 10000 * 2^2 = 40000, but should be capped at 30000
    const delay = calculateBackoffDelay(3, options);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('should add jitter to delay', () => {
    const options = {
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 60000,
      exponential: false,
      jitter: 0.5, // 50% jitter
    };

    // With 50% jitter, delay should vary between 500 and 1500
    const delay = calculateBackoffDelay(1, options);
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThanOrEqual(1500);
  });

  it('should determine if job should retry', () => {
    // shouldRetry receives current attempt number (1-based) and max attempts
    // attemptNumber = job.attemptsMade + 1 (since attemptsMade starts at 0)
    expect(shouldRetry(1, 3)).toBe(true);  // 1st attempt, max 3 - retry
    expect(shouldRetry(2, 3)).toBe(true);  // 2nd attempt, max 3 - retry
    expect(shouldRetry(3, 3)).toBe(false);  // 3rd attempt, max 3 - no more retries
    expect(shouldRetry(1, 1)).toBe(false);  // 1st attempt, max 1 - no retries
    expect(shouldRetry(4, 3)).toBe(false);  // 4th attempt, max 3 - already exceeded
  });

  it('should have default retry options', () => {
    expect(defaultRetryOptions.maxAttempts).toBe(3);
    expect(defaultRetryOptions.baseDelay).toBe(1000);
    expect(defaultRetryOptions.maxDelay).toBe(60000);
    expect(defaultRetryOptions.exponential).toBe(true);
    expect(defaultRetryOptions.jitter).toBe(0.1);
  });
});

describe('Queue Config Structure', () => {
  const { queueConfigurations, defaultQueueConfig } = require('../config');

  it('should have default queue config', () => {
    expect(defaultQueueConfig).toBeDefined();
    expect(defaultQueueConfig.connection).toBeDefined();
    expect(defaultQueueConfig.defaultJobOptions).toBeDefined();
    expect(defaultQueueConfig.worker).toBeDefined();
  });

  it('should have queue-specific configurations', () => {
    expect(queueConfigurations[QueueNames.CREDIT_UPDATE]).toBeDefined();
    expect(queueConfigurations[QueueNames.DEAD_LETTER]).toBeDefined();
    expect(queueConfigurations[QueueNames.DATA_EXPORT]).toBeDefined();
  });

  it('should allow credit update queue to override worker concurrency', () => {
    const creditConfig = queueConfigurations[QueueNames.CREDIT_UPDATE];
    expect(creditConfig.worker?.concurrency).toBe(5);
  });

  it('should have exponential backoff by default', () => {
    expect(defaultQueueConfig.defaultJobOptions.backoff.type).toBe('exponential');
  });
});
