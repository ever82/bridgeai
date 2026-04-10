/**
 * LLM Metrics Service
 * 监控与指标收集
 */

import { EventEmitter } from 'events';
import {
  LLMProvider,
  RequestMetrics,
  CircuitBreakerEvent
} from './types';

/**
 * Prometheus指标格式
 */
interface PrometheusMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels?: Record<string, string>;
  value: number;
}

/**
 * 延迟直方图桶
 */
const LATENCY_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000];

/**
 * LLM指标服务
 * 收集和暴露Prometheus指标
 */
export class LLMMetricsService extends EventEmitter {
  // 计数器
  private requestCounter: Map<string, number> = new Map();
  private errorCounter: Map<string, number> = new Map();
  private tokenCounter: Map<string, { input: number; output: number }> = new Map();

  // 延迟直方图
  private latencyHistogram: Map<string, number[]> = new Map();

  // 成本追踪
  private costCounter: Map<string, number> = new Map();

  // 熔断器事件
  private circuitBreakerEvents: CircuitBreakerEvent[] = [];

  // 活跃请求
  private activeRequests: Map<string, number> = new Map();

  /**
   * 记录请求指标
   */
  recordRequest(metrics: RequestMetrics): void {
    const provider = metrics.provider;
    const model = metrics.model;
    const key = `${provider}:${model}`;

    // 请求总数
    this.incrementCounter('requests_total', provider, model);

    // 成功率/失败率
    if (metrics.success) {
      this.incrementCounter('requests_success', provider, model);
    } else {
      this.incrementCounter('requests_failed', provider, model);
      if (metrics.errorType) {
        this.incrementErrorCounter(provider, model, metrics.errorType);
      }
    }

    // 延迟
    this.recordLatency(provider, model, metrics.latencyMs);

    // Token使用量
    this.recordTokens(provider, model, metrics.tokenUsage.input, metrics.tokenUsage.output);

    // 成本
    this.incrementCost(provider, model, metrics.costUsd);

    // 触发事件
    this.emit('request', metrics);
  }

  /**
   * 记录请求开始
   */
  recordRequestStart(requestId: string, provider: LLMProvider, model: string): void {
    const key = `${provider}:${model}`;
    const current = this.activeRequests.get(key) || 0;
    this.activeRequests.set(key, current + 1);

    this.emit('requestStart', { requestId, provider, model, timestamp: new Date() });
  }

  /**
   * 记录请求结束
   */
  recordRequestEnd(requestId: string, provider: LLMProvider, model: string): void {
    const key = `${provider}:${model}`;
    const current = Math.max(0, (this.activeRequests.get(key) || 0) - 1);
    this.activeRequests.set(key, current);

    this.emit('requestEnd', { requestId, provider, model, timestamp: new Date() });
  }

  /**
   * 记录熔断器事件
   */
  recordCircuitBreakerEvent(event: CircuitBreakerEvent): void {
    this.circuitBreakerEvents.push(event);

    // 只保留最近1000个事件
    if (this.circuitBreakerEvents.length > 1000) {
      this.circuitBreakerEvents = this.circuitBreakerEvents.slice(-1000);
    }

    this.emit('circuitBreaker', event);
  }

  /**
   * 获取Prometheus格式的指标
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // 请求总数
    lines.push('# HELP llm_requests_total Total LLM requests');
    lines.push('# TYPE llm_requests_total counter');
    this.requestCounter.forEach((value, key) => {
      const [provider, model] = key.split(':');
      lines.push(`llm_requests_total{provider="${provider}",model="${model}"} ${value}`);
    });

    // 成功请求
    lines.push('');
    lines.push('# HELP llm_requests_success Total successful LLM requests');
    lines.push('# TYPE llm_requests_success counter');
    this.requestCounter.forEach((value, key) => {
      const [provider, model] = key.split(':');
      const successKey = `${provider}:${model}:success`;
      const successValue = this.requestCounter.get(successKey) || 0;
      lines.push(`llm_requests_success{provider="${provider}",model="${model}"} ${successValue}`);
    });

    // 失败请求
    lines.push('');
    lines.push('# HELP llm_requests_failed Total failed LLM requests');
    lines.push('# TYPE llm_requests_failed counter');
    this.requestCounter.forEach((value, key) => {
      const [provider, model] = key.split(':');
      const failedKey = `${provider}:${model}:failed`;
      const failedValue = this.requestCounter.get(failedKey) || 0;
      lines.push(`llm_requests_failed{provider="${provider}",model="${model}"} ${failedValue}`);
    });

    // 延迟直方图
    lines.push('');
    lines.push('# HELP llm_latency_seconds LLM request latency in seconds');
    lines.push('# TYPE llm_latency_seconds histogram');
    this.latencyHistogram.forEach((buckets, key) => {
      const [provider, model] = key.split(':');
      let cumulativeCount = 0;

      for (const bucket of LATENCY_BUCKETS) {
        const count = buckets.filter(l => l <= bucket).length;
        cumulativeCount = count;
        lines.push(`llm_latency_seconds_bucket{provider="${provider}",model="${model}",le="${bucket / 1000}"} ${count}`);
      }

      lines.push(`llm_latency_seconds_bucket{provider="${provider}",model="${model}",le="+Inf"} ${buckets.length}`);
      lines.push(`llm_latency_seconds_count{provider="${provider}",model="${model}"} ${buckets.length}`);

      const sum = buckets.reduce((a, b) => a + b, 0);
      lines.push(`llm_latency_seconds_sum{provider="${provider}",model="${model}"} ${sum / 1000}`);
    });

    // Token使用量
    lines.push('');
    lines.push('# HELP llm_tokens_used_total Total tokens used');
    lines.push('# TYPE llm_tokens_used_total counter');
    this.tokenCounter.forEach((value, key) => {
      const [provider, model] = key.split(':');
      lines.push(`llm_tokens_used_total{provider="${provider}",model="${model}",type="input"} ${value.input}`);
      lines.push(`llm_tokens_used_total{provider="${provider}",model="${model}",type="output"} ${value.output}`);
    });

    // 成本
    lines.push('');
    lines.push('# HELP llm_cost_usd_total Total cost in USD');
    lines.push('# TYPE llm_cost_usd_total counter');
    this.costCounter.forEach((value, key) => {
      const [provider, model] = key.split(':');
      lines.push(`llm_cost_usd_total{provider="${provider}",model="${model}"} ${value.toFixed(6)}`);
    });

    // 活跃请求
    lines.push('');
    lines.push('# HELP llm_active_requests Current active requests');
    lines.push('# TYPE llm_active_requests gauge');
    this.activeRequests.forEach((value, key) => {
      const [provider, model] = key.split(':');
      lines.push(`llm_active_requests{provider="${provider}",model="${model}"} ${value}`);
    });

    // 错误率
    lines.push('');
    lines.push('# HELP llm_errors_total Total errors by type');
    lines.push('# TYPE llm_errors_total counter');
    this.errorCounter.forEach((value, key) => {
      const parts = key.split(':');
      const provider = parts[0];
      const model = parts[1];
      const errorType = parts[2];
      lines.push(`llm_errors_total{provider="${provider}",model="${model}",type="${errorType}"} ${value}`);
    });

    return lines.join('\n');
  }

  /**
   * 获取统计摘要
   */
  getStats(): {
    totalRequests: number;
    totalTokens: { input: number; output: number };
    totalCost: number;
    averageLatency: number;
    errorRate: number;
    circuitBreakerEvents: number;
  } {
    const totalRequests = Array.from(this.requestCounter.values())
      .reduce((sum, val) => sum + val, 0);

    const totalTokens = Array.from(this.tokenCounter.values())
      .reduce((sum, val) => ({
        input: sum.input + val.input,
        output: sum.output + val.output
      }), { input: 0, output: 0 });

    const totalCost = Array.from(this.costCounter.values())
      .reduce((sum, val) => sum + val, 0);

    const allLatencies = Array.from(this.latencyHistogram.values())
      .flat();
    const averageLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;

    const totalErrors = Array.from(this.errorCounter.values())
      .reduce((sum, val) => sum + val, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageLatency,
      errorRate,
      circuitBreakerEvents: this.circuitBreakerEvents.length
    };
  }

  /**
   * 获取提供商统计
   */
  getProviderStats(provider: LLMProvider): {
    requests: number;
    tokens: { input: number; output: number };
    cost: number;
    averageLatency: number;
    errorCount: number;
  } | null {
    const providerKeys = Array.from(this.requestCounter.keys())
      .filter(k => k.startsWith(`${provider}:`));

    if (providerKeys.length === 0) return null;

    const requests = providerKeys
      .map(k => this.requestCounter.get(k) || 0)
      .reduce((a, b) => a + b, 0);

    const tokens = providerKeys
      .map(k => this.tokenCounter.get(k) || { input: 0, output: 0 })
      .reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output }));

    const cost = providerKeys
      .map(k => this.costCounter.get(k) || 0)
      .reduce((a, b) => a + b, 0);

    const latencies = providerKeys
      .map(k => this.latencyHistogram.get(k) || [])
      .flat();
    const averageLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const errorCount = Array.from(this.errorCounter.keys())
      .filter(k => k.startsWith(`${provider}:`))
      .map(k => this.errorCounter.get(k) || 0)
      .reduce((a, b) => a + b, 0);

    return {
      requests,
      tokens,
      cost,
      averageLatency,
      errorCount
    };
  }

  /**
   * 获取熔断器事件
   */
  getCircuitBreakerEvents(
    provider?: LLMProvider,
    since?: Date
  ): CircuitBreakerEvent[] {
    let events = this.circuitBreakerEvents;

    if (provider) {
      events = events.filter(e => e.provider === provider);
    }

    if (since) {
      events = events.filter(e => e.timestamp >= since);
    }

    return [...events];
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.requestCounter.clear();
    this.errorCounter.clear();
    this.tokenCounter.clear();
    this.latencyHistogram.clear();
    this.costCounter.clear();
    this.circuitBreakerEvents = [];
    this.activeRequests.clear();

    this.emit('reset');
  }

  private incrementCounter(name: string, provider: LLMProvider, model: string): void {
    const key = `${provider}:${model}`;
    const current = this.requestCounter.get(key) || 0;
    this.requestCounter.set(key, current + 1);
  }

  private incrementErrorCounter(
    provider: LLMProvider,
    model: string,
    errorType: string
  ): void {
    const key = `${provider}:${model}:${errorType}`;
    const current = this.errorCounter.get(key) || 0;
    this.errorCounter.set(key, current + 1);
  }

  private recordLatency(provider: LLMProvider, model: string, latencyMs: number): void {
    const key = `${provider}:${model}`;
    const current = this.latencyHistogram.get(key) || [];
    current.push(latencyMs);

    // 只保留最近1000个样本
    if (current.length > 1000) {
      current.shift();
    }

    this.latencyHistogram.set(key, current);
  }

  private recordTokens(
    provider: LLMProvider,
    model: string,
    input: number,
    output: number
  ): void {
    const key = `${provider}:${model}`;
    const current = this.tokenCounter.get(key) || { input: 0, output: 0 };
    current.input += input;
    current.output += output;
    this.tokenCounter.set(key, current);
  }

  private incrementCost(provider: LLMProvider, model: string, cost: number): void {
    const key = `${provider}:${model}`;
    const current = this.costCounter.get(key) || 0;
    this.costCounter.set(key, current + cost);
  }
}
