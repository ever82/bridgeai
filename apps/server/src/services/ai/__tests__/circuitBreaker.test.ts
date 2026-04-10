/**
 * Circuit Breaker Tests
 */

import { CircuitBreaker, CircuitBreakerManager } from '../circuitBreaker';
import { CircuitBreakerState } from '../types';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('openai', {
      failureThreshold: 3,
      recoveryTimeoutMs: 1000,
      halfOpenMaxCalls: 2,
      successThreshold: 2
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should allow execution in CLOSED state', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });
  });

  describe('Failure Recording', () => {
    it('should record failures', () => {
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getMetrics().failures).toBe(1);
    });

    it('should transition to OPEN after threshold failures', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should not allow execution in OPEN state', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.canExecute()).toBe(false);
    });
  });

  describe('Success Recording', () => {
    it('should record successes', () => {
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getMetrics().successes).toBe(1);
    });

    it('should reset consecutive failures on success', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      expect(circuitBreaker.getMetrics().consecutiveSuccesses).toBe(1);
    });
  });

  describe('Half-Open State', () => {
    beforeEach(async () => {
      // 触发熔断
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState()).toBe('OPEN');

      // 等待恢复时间
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    it('should transition to HALF_OPEN after recovery timeout', () => {
      // 调用canExecute触发状态检查
      circuitBreaker.canExecute();
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should allow limited calls in HALF_OPEN state', async () => {
      circuitBreaker.canExecute(); // 触发状态转换
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // In HALF_OPEN state, only execute() increments the counter
      // canExecute() just checks if calls are allowed
      expect(circuitBreaker.canExecute()).toBe(true);

      // After 2 execute() calls (that succeed), we transition to CLOSED
      // because successThreshold is 2. So let's verify the state changes.
      await circuitBreaker.execute(async () => 'test1');
      expect(circuitBreaker.getState()).toBe('HALF_OPEN'); // still half-open after 1 success

      await circuitBreaker.execute(async () => 'test2');
      expect(circuitBreaker.getState()).toBe('CLOSED'); // closed after 2 successes

      // In CLOSED state, calls are always allowed
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should transition to CLOSED after success threshold', () => {
      circuitBreaker.canExecute(); // 触发HALF_OPEN

      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure in HALF_OPEN', () => {
      circuitBreaker.canExecute(); // 触发HALF_OPEN

      circuitBreaker.recordFailure();

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Execute Method', () => {
    it('should execute successful function', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getMetrics().successes).toBe(1);
    });

    it('should record failure on exception', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');

      expect(circuitBreaker.getMetrics().failures).toBe(1);
    });

    it('should use fallback when circuit is open', async () => {
      // 触发熔断
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      const fallback = jest.fn().mockResolvedValue('fallback result');
      const result = await circuitBreaker.execute(
        async () => 'success',
        fallback
      );

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('Manual Control', () => {
    beforeEach(() => {
      circuitBreaker.reset();
    });

    it('should allow manual forceOpen', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should allow manual forceClose', () => {
      circuitBreaker.forceOpen();
      circuitBreaker.forceClose();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should reset all metrics', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
      expect(circuitBreaker.getMetrics().successes).toBe(0);
    });
  });

  describe('Stats', () => {
    it('should calculate failure rate', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();

      expect(circuitBreaker.getFailureRate()).toBe(0.5);
    });

    it('should return complete stats', () => {
      const stats = circuitBreaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('failureRate');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('config');
    });
  });

  describe('Events', () => {
    it('should emit stateChange event', (done) => {
      circuitBreaker.on('stateChange', (event) => {
        expect(event.state).toBe('OPEN');
        expect(event.provider).toBe('openai');
        done();
      });

      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
    });

    it('should emit OPEN event', (done) => {
      circuitBreaker.on('open', (event) => {
        expect(event.state).toBe('OPEN');
        done();
      });

      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  describe('Circuit Breaker Management', () => {
    it('should create and get circuit breaker', () => {
      const cb = manager.getCircuitBreaker('openai');
      expect(cb).toBeInstanceOf(CircuitBreaker);
      expect(cb.getProvider()).toBe('openai');
    });

    it('should return same instance for same provider', () => {
      const cb1 = manager.getCircuitBreaker('openai');
      const cb2 = manager.getCircuitBreaker('openai');
      expect(cb1).toBe(cb2);
    });

    it('should remove circuit breaker', () => {
      manager.getCircuitBreaker('openai');
      expect(manager.removeCircuitBreaker('openai')).toBe(true);
      expect(manager.removeCircuitBreaker('openai')).toBe(false);
    });

    it('should reset all circuit breakers', () => {
      const cb1 = manager.getCircuitBreaker('openai');
      const cb2 = manager.getCircuitBreaker('claude');

      cb1.recordFailure();
      cb2.recordFailure();

      manager.resetAll();

      expect(cb1.getMetrics().failures).toBe(0);
      expect(cb2.getMetrics().failures).toBe(0);
    });
  });

  describe('Stats and Monitoring', () => {
    it('should return all stats', () => {
      manager.getCircuitBreaker('openai');
      manager.getCircuitBreaker('claude');

      const stats = manager.getAllStats();
      expect(stats).toHaveLength(2);
      expect(stats[0]).toHaveProperty('provider');
      expect(stats[0]).toHaveProperty('state');
      expect(stats[0]).toHaveProperty('failureRate');
    });

    it('should return available providers', () => {
      manager.getCircuitBreaker('openai');
      manager.getCircuitBreaker('claude');

      const available = manager.getAvailableProviders();
      expect(available).toContain('openai');
      expect(available).toContain('claude');
    });
  });
});
