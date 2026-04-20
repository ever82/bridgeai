/**
 * Resilience Metrics Service
 * 降级监控指标服务 - 降级事件统计、持续时间、用户影响评估、告警
 */

import { EventEmitter } from 'events';

import { LLMProvider } from '../types';

import { DegradationLevel } from './degradationStrategy';

export interface DegradationEvent {
  id: string;
  fromLevel: DegradationLevel;
  toLevel: DegradationLevel;
  reason: string;
  affectedProviders: LLMProvider[];
  timestamp: Date;
}

export interface DegradationRequestRecord {
  success: boolean;
  latencyMs: number;
  errorType?: string;
  degradationLevel: DegradationLevel;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: ResilienceMetricsSummary) => boolean;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  cooldownMs: number;
  lastTriggeredAt?: Date;
}

export interface ResilienceMetricsSummary {
  totalDegradationEvents: number;
  currentLevel: DegradationLevel;
  currentLevelDurationMs: number;
  degradedProviders: LLMProvider[];
  errorRates: Record<string, number>;
  latencyP95: Record<string, number>;
  requestsInDegradation: number;
  totalRequests: number;
}

interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  latencies: number[];
  errorsByType: Map<string, number>;
  degradationRequests: number;
}

export class ResilienceMetricsService extends EventEmitter {
  private degradationEvents: DegradationEvent[] = [];
  private providerMetrics: Map<string, ProviderMetrics> = new Map();
  private currentLevel: DegradationLevel = DegradationLevel.NORMAL;
  private currentLevelSince: Date = new Date();
  private alertRules: Map<string, AlertRule> = new Map();
  private maxEvents = 1000;
  private maxLatencySamples = 500;

  constructor() {
    super();
    this.setupDefaultAlertRules();
  }

  /**
   * Record a degradation level change event
   */
  recordDegradationEvent(event: Omit<DegradationEvent, 'id'>): void {
    const fullEvent: DegradationEvent = {
      ...event,
      id: `degr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    this.degradationEvents.push(fullEvent);
    if (this.degradationEvents.length > this.maxEvents) {
      this.degradationEvents = this.degradationEvents.slice(-this.maxEvents);
    }

    if (event.toLevel !== this.currentLevel) {
      this.currentLevel = event.toLevel;
      this.currentLevelSince = new Date();
    }

    this.emit('degradationEvent', fullEvent);

    // Check alerts
    this.checkAlerts();
  }

  /**
   * Record a request result for a provider
   */
  recordRequest(provider: LLMProvider, record: DegradationRequestRecord): void {
    const key = provider;
    let metrics = this.providerMetrics.get(key);

    if (!metrics) {
      metrics = {
        requests: 0,
        successes: 0,
        failures: 0,
        latencies: [],
        errorsByType: new Map(),
        degradationRequests: 0,
      };
      this.providerMetrics.set(key, metrics);
    }

    metrics.requests++;
    if (record.success) {
      metrics.successes++;
    } else {
      metrics.failures++;
      if (record.errorType) {
        const count = metrics.errorsByType.get(record.errorType) ?? 0;
        metrics.errorsByType.set(record.errorType, count + 1);
      }
    }

    metrics.latencies.push(record.latencyMs);
    if (metrics.latencies.length > this.maxLatencySamples) {
      metrics.latencies.shift();
    }

    if (record.degradationLevel > DegradationLevel.NORMAL) {
      metrics.degradationRequests++;
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): ResilienceMetricsSummary {
    const errorRates: Record<string, number> = {};
    const latencyP95: Record<string, number> = {};
    const degradedProviders: LLMProvider[] = [];
    let totalRequests = 0;
    let requestsInDegradation = 0;

    for (const [provider, metrics] of this.providerMetrics.entries()) {
      totalRequests += metrics.requests;
      requestsInDegradation += metrics.degradationRequests;

      // Error rate
      errorRates[provider] = metrics.requests > 0
        ? metrics.failures / metrics.requests
        : 0;

      // P95 latency
      if (metrics.latencies.length > 0) {
        const sorted = [...metrics.latencies].sort((a, b) => a - b);
        const idx = Math.ceil(sorted.length * 0.95) - 1;
        latencyP95[provider] = sorted[Math.max(0, idx)];
      } else {
        latencyP95[provider] = 0;
      }

      // Check if degraded
      if (errorRates[provider] > 0.3) {
        degradedProviders.push(provider as LLMProvider);
      }
    }

    return {
      totalDegradationEvents: this.degradationEvents.length,
      currentLevel: this.currentLevel,
      currentLevelDurationMs: Date.now() - this.currentLevelSince.getTime(),
      degradedProviders,
      errorRates,
      latencyP95,
      requestsInDegradation,
      totalRequests,
    };
  }

  /**
   * Get provider-specific stats
   */
  getProviderStats(provider: LLMProvider): {
    errorRate: number;
    latencyP95Ms: number;
    totalRequests: number;
    successRate: number;
  } | null {
    const metrics = this.providerMetrics.get(provider);
    if (!metrics || metrics.requests === 0) return null;

    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * 0.95) - 1;

    return {
      errorRate: metrics.failures / metrics.requests,
      latencyP95Ms: sorted[Math.max(0, idx)] ?? 0,
      totalRequests: metrics.requests,
      successRate: metrics.successes / metrics.requests,
    };
  }

  /**
   * Get degradation events
   */
  getDegradationEvents(limit?: number): DegradationEvent[] {
    const events = [...this.degradationEvents];
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get current degradation duration
   */
  getCurrentLevelDurationMs(): number {
    return Date.now() - this.currentLevelSince.getTime();
  }

  /**
   * Get Prometheus-compatible metrics output
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const summary = this.getSummary();

    // Degradation events total
    lines.push('# HELP ai_degradation_events_total Total degradation events');
    lines.push('# TYPE ai_degradation_events_total counter');
    lines.push(`ai_degradation_events_total ${summary.totalDegradationEvents}`);

    // Current degradation level
    lines.push('');
    lines.push('# HELP ai_degradation_level Current degradation level');
    lines.push('# TYPE ai_degradation_level gauge');
    lines.push(`ai_degradation_level ${summary.currentLevel}`);

    // Degradation duration
    lines.push('');
    lines.push('# HELP ai_degradation_duration_seconds Current degradation duration');
    lines.push('# TYPE ai_degradation_duration_seconds gauge');
    lines.push(`ai_degradation_duration_seconds ${(summary.currentLevelDurationMs / 1000).toFixed(2)}`);

    // Per-provider error rates
    lines.push('');
    lines.push('# HELP ai_provider_error_rate Provider error rate');
    lines.push('# TYPE ai_provider_error_rate gauge');
    for (const [provider, rate] of Object.entries(summary.errorRates)) {
      lines.push(`ai_provider_error_rate{provider="${provider}"} ${rate.toFixed(4)}`);
    }

    // Per-provider P95 latency
    lines.push('');
    lines.push('# HELP ai_provider_latency_p95_seconds Provider P95 latency');
    lines.push('# TYPE ai_provider_latency_p95_seconds gauge');
    for (const [provider, latency] of Object.entries(summary.latencyP95)) {
      lines.push(`ai_provider_latency_p95_seconds{provider="${provider}"} ${(latency / 1000).toFixed(3)}`);
    }

    // Requests during degradation
    lines.push('');
    lines.push('# HELP ai_requests_in_degradation_total Requests processed during degradation');
    lines.push('# TYPE ai_requests_in_degradation_total counter');
    lines.push(`ai_requests_in_degradation_total ${summary.requestsInDegradation}`);

    return lines.join('\n');
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'lastTriggeredAt'>): void {
    this.alertRules.set(rule.id, { ...rule, lastTriggeredAt: undefined });
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(id: string): boolean {
    return this.alertRules.delete(id);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.degradationEvents = [];
    this.providerMetrics.clear();
    this.currentLevel = DegradationLevel.NORMAL;
    this.currentLevelSince = new Date();
    this.emit('reset');
  }

  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (m) =>
        Object.values(m.errorRates).some(r => r > 0.5),
      message: 'AI服务错误率超过50%',
      severity: 'critical',
      cooldownMs: 60000,
    });

    // Degradation too long alert
    this.addAlertRule({
      id: 'long-degradation',
      name: 'Long Degradation',
      condition: (m) =>
        m.currentLevel >= 3 && m.currentLevelDurationMs > 5 * 60 * 1000,
      message: 'AI服务降级状态已超过5分钟',
      severity: 'warning',
      cooldownMs: 5 * 60000,
    });

    // All providers degraded
    this.addAlertRule({
      id: 'all-degraded',
      name: 'All Providers Degraded',
      condition: (m) => m.degradedProviders.length >= 3,
      message: '所有AI服务提供商都处于降级状态',
      severity: 'critical',
      cooldownMs: 30000,
    });
  }

  private checkAlerts(): void {
    const summary = this.getSummary();
    const now = new Date();

    for (const rule of this.alertRules.values()) {
      // Check cooldown
      if (rule.lastTriggeredAt) {
        const timeSinceLastTrigger = now.getTime() - rule.lastTriggeredAt.getTime();
        if (timeSinceLastTrigger < rule.cooldownMs) continue;
      }

      if (rule.condition(summary)) {
        rule.lastTriggeredAt = now;
        this.emit('alert', {
          rule,
          summary,
          timestamp: now,
        });
      }
    }
  }
}

export const resilienceMetricsService = new ResilienceMetricsService();
