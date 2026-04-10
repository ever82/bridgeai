/**
 * LLM Metrics Service Tests
 */

import { LLMMetricsService } from '../metricsService';
import { RequestMetrics } from '../types';

describe('LLMMetricsService', () => {
  let metricsService: LLMMetricsService;

  beforeEach(() => {
    metricsService = new LLMMetricsService();
  });

  describe('Request Recording', () => {
    it('should record successful request', () => {
      const metrics: RequestMetrics = {
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1500,
        success: true,
        tokenUsage: {
          input: 100,
          output: 50,
          total: 150
        },
        costUsd: 0.006
      };

      metricsService.recordRequest(metrics);
      const stats = metricsService.getStats();

      expect(stats.totalRequests).toBe(1);
    });

    it('should record failed request', () => {
      const metrics: RequestMetrics = {
        requestId: 'req-2',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 500,
        success: false,
        errorType: 'TimeoutError',
        tokenUsage: { input: 0, output: 0, total: 0 },
        costUsd: 0
      };

      metricsService.recordRequest(metrics);
      const stats = metricsService.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.errorRate).toBe(1);
    });

    it('should calculate average latency', () => {
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 10, output: 10, total: 20 },
        costUsd: 0.001
      });

      metricsService.recordRequest({
        requestId: 'req-2',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 2000,
        success: true,
        tokenUsage: { input: 10, output: 10, total: 20 },
        costUsd: 0.001
      });

      const stats = metricsService.getStats();
      expect(stats.averageLatency).toBe(1500);
    });

    it('should accumulate token usage', () => {
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 100, output: 50, total: 150 },
        costUsd: 0.001
      });

      metricsService.recordRequest({
        requestId: 'req-2',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 200, output: 100, total: 300 },
        costUsd: 0.002
      });

      const stats = metricsService.getStats();
      expect(stats.totalTokens.input).toBe(300);
      expect(stats.totalTokens.output).toBe(150);
    });

    it('should accumulate costs', () => {
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 10, output: 10, total: 20 },
        costUsd: 0.001
      });

      metricsService.recordRequest({
        requestId: 'req-2',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 10, output: 10, total: 20 },
        costUsd: 0.002
      });

      const stats = metricsService.getStats();
      expect(stats.totalCost).toBe(0.003);
    });
  });

  describe('Active Request Tracking', () => {
    it('should track active requests', () => {
      metricsService.recordRequestStart('req-1', 'openai', 'gpt-4');
      metricsService.recordRequestStart('req-2', 'openai', 'gpt-4');

      const prometheusMetrics = metricsService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('llm_active_requests{provider="openai",model="gpt-4"} 2');

      metricsService.recordRequestEnd('req-1', 'openai', 'gpt-4');
      const updatedMetrics = metricsService.getPrometheusMetrics();
      expect(updatedMetrics).toContain('llm_active_requests{provider="openai",model="gpt-4"} 1');
    });

    it('should not go negative when ending requests', () => {
      metricsService.recordRequestEnd('req-1', 'openai', 'gpt-4');

      const prometheusMetrics = metricsService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('llm_active_requests{provider="openai",model="gpt-4"} 0');
    });
  });

  describe('Prometheus Metrics Format', () => {
    beforeEach(() => {
      // Record some test data
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1500,
        success: true,
        tokenUsage: { input: 100, output: 50, total: 150 },
        costUsd: 0.006
      });

      metricsService.recordRequest({
        requestId: 'req-2',
        provider: 'claude',
        model: 'claude-3-opus',
        latencyMs: 2000,
        success: false,
        errorType: 'RateLimitError',
        tokenUsage: { input: 50, output: 0, total: 50 },
        costUsd: 0
      });
    });

    it('should generate valid Prometheus metrics', () => {
      const prometheusMetrics = metricsService.getPrometheusMetrics();

      // Check for required metrics
      expect(prometheusMetrics).toContain('# HELP llm_requests_total');
      expect(prometheusMetrics).toContain('# TYPE llm_requests_total counter');
      expect(prometheusMetrics).toContain('llm_requests_total{provider="openai",model="gpt-4"}');

      expect(prometheusMetrics).toContain('# HELP llm_latency_seconds');
      expect(prometheusMetrics).toContain('# TYPE llm_latency_seconds histogram');

      expect(prometheusMetrics).toContain('# HELP llm_tokens_used_total');
      expect(prometheusMetrics).toContain('# TYPE llm_tokens_used_total counter');

      expect(prometheusMetrics).toContain('# HELP llm_cost_usd_total');
      expect(prometheusMetrics).toContain('# TYPE llm_cost_usd_total counter');
    });

    it('should include latency histogram buckets', () => {
      const prometheusMetrics = metricsService.getPrometheusMetrics();

      // Check for histogram buckets
      expect(prometheusMetrics).toContain('llm_latency_seconds_bucket{provider="openai",model="gpt-4",le="');
      expect(prometheusMetrics).toContain('llm_latency_seconds_count{provider="openai",model="gpt-4"}');
      expect(prometheusMetrics).toContain('llm_latency_seconds_sum{provider="openai",model="gpt-4"}');
    });

    it('should include error metrics', () => {
      const prometheusMetrics = metricsService.getPrometheusMetrics();

      expect(prometheusMetrics).toContain('# HELP llm_errors_total');
      expect(prometheusMetrics).toContain('llm_errors_total{provider="claude",model="claude-3-opus",type="RateLimitError"}');
    });
  });

  describe('Provider Stats', () => {
    beforeEach(() => {
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 100, output: 50, total: 150 },
        costUsd: 0.006
      });

      metricsService.recordRequest({
        requestId: 'req-2',
        provider: 'openai',
        model: 'gpt-3.5',
        latencyMs: 500,
        success: true,
        tokenUsage: { input: 50, output: 50, total: 100 },
        costUsd: 0.001
      });

      metricsService.recordRequest({
        requestId: 'req-3',
        provider: 'claude',
        model: 'claude-3',
        latencyMs: 1500,
        success: true,
        tokenUsage: { input: 100, output: 100, total: 200 },
        costUsd: 0.01
      });
    });

    it('should return provider-specific stats', () => {
      const openaiStats = metricsService.getProviderStats('openai');

      expect(openaiStats).not.toBeNull();
      expect(openaiStats!.requests).toBe(2);
      expect(openaiStats!.tokens.input).toBe(150);
      expect(openaiStats!.tokens.output).toBe(100);
      expect(openaiStats!.cost).toBe(0.007);
      expect(openaiStats!.averageLatency).toBe(750);
    });

    it('should return null for unknown provider', () => {
      const stats = metricsService.getProviderStats('wenxin');
      expect(stats).toBeNull();
    });
  });

  describe('Circuit Breaker Events', () => {
    it('should record and retrieve circuit breaker events', () => {
      const event = {
        timestamp: new Date(),
        state: 'OPEN' as const,
        provider: 'openai' as const,
        reason: 'Too many failures'
      };

      metricsService.recordCircuitBreakerEvent(event);

      const events = metricsService.getCircuitBreakerEvents();
      expect(events).toHaveLength(1);
      expect(events[0].state).toBe('OPEN');
    });

    it('should filter events by provider', () => {
      metricsService.recordCircuitBreakerEvent({
        timestamp: new Date(),
        state: 'OPEN',
        provider: 'openai',
        reason: 'Test'
      });

      metricsService.recordCircuitBreakerEvent({
        timestamp: new Date(),
        state: 'OPEN',
        provider: 'claude',
        reason: 'Test'
      });

      const openaiEvents = metricsService.getCircuitBreakerEvents('openai');
      expect(openaiEvents).toHaveLength(1);
      expect(openaiEvents[0].provider).toBe('openai');
    });

    it('should filter events by date', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      metricsService.recordCircuitBreakerEvent({
        timestamp: oldDate,
        state: 'OPEN',
        provider: 'openai',
        reason: 'Old event'
      });

      metricsService.recordCircuitBreakerEvent({
        timestamp: newDate,
        state: 'CLOSED',
        provider: 'openai',
        reason: 'New event'
      });

      const recentEvents = metricsService.getCircuitBreakerEvents(undefined, new Date('2024-05-01'));
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].state).toBe('CLOSED');
    });

    it('should limit stored events', () => {
      // Record more than 1000 events
      for (let i = 0; i < 1100; i++) {
        metricsService.recordCircuitBreakerEvent({
          timestamp: new Date(),
          state: 'OPEN',
          provider: 'openai',
          reason: `Event ${i}`
        });
      }

      const events = metricsService.getCircuitBreakerEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Events', () => {
    it('should emit request event', (done) => {
      const metrics: RequestMetrics = {
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 10, output: 10, total: 20 },
        costUsd: 0.001
      };

      metricsService.on('request', (recordedMetrics) => {
        expect(recordedMetrics.requestId).toBe('req-1');
        done();
      });

      metricsService.recordRequest(metrics);
    });

    it('should emit reset event', (done) => {
      metricsService.on('reset', () => {
        done();
      });

      metricsService.reset();
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      metricsService.recordRequest({
        requestId: 'req-1',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 1000,
        success: true,
        tokenUsage: { input: 100, output: 50, total: 150 },
        costUsd: 0.006
      });

      metricsService.recordCircuitBreakerEvent({
        timestamp: new Date(),
        state: 'OPEN',
        provider: 'openai',
        reason: 'Test'
      });

      metricsService.reset();

      const stats = metricsService.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.circuitBreakerEvents).toBe(0);
    });
  });
});
