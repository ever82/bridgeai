/**
 * LLM Metrics Service
 * 监控与指标收集
 */
import { EventEmitter } from 'events';
/**
 * 延迟直方图桶
 */
const LATENCY_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000];
/**
 * Key separator for metrics maps. Uses a string unlikely to appear in
 * provider or model names to avoid parsing ambiguity.
 */
const KEY_SEPARATOR = '::';
/**
 * LLM指标服务
 * 收集和暴露Prometheus指标
 */
export class LLMMetricsService extends EventEmitter {
    // 计数器
    requestCounter = new Map();
    errorCounter = new Map();
    tokenCounter = new Map();
    // 延迟直方图
    latencyHistogram = new Map();
    // 成本追踪
    costCounter = new Map();
    // 熔断器事件
    circuitBreakerEvents = [];
    // 活跃请求
    activeRequests = new Map();
    /**
     * Sanitize a numeric metric value: reject NaN, Infinity, and negative numbers.
     * Returns 0 for invalid values.
     */
    sanitizeNumber(value) {
        if (!Number.isFinite(value) || value < 0)
            return 0;
        return value;
    }
    /**
     * 记录请求指标
     */
    recordRequest(metrics) {
        const provider = metrics.provider;
        const model = metrics.model;
        // 请求总数
        this.incrementCounter('requests_total', provider, model);
        // 成功率/失败率
        if (metrics.success) {
            this.incrementCounter('requests_success', provider, model);
        }
        else {
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
    recordRequestStart(requestId, provider, model) {
        const key = `${provider}${KEY_SEPARATOR}${model}`;
        const current = this.activeRequests.get(key) || 0;
        this.activeRequests.set(key, current + 1);
        this.emit('requestStart', { requestId, provider, model, timestamp: new Date() });
    }
    /**
     * 记录请求结束
     */
    recordRequestEnd(requestId, provider, model) {
        const key = `${provider}${KEY_SEPARATOR}${model}`;
        const current = Math.max(0, (this.activeRequests.get(key) || 0) - 1);
        this.activeRequests.set(key, current);
        this.emit('requestEnd', { requestId, provider, model, timestamp: new Date() });
    }
    /**
     * 记录熔断器事件
     */
    recordCircuitBreakerEvent(event) {
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
    getPrometheusMetrics() {
        const lines = [];
        // 请求总数
        lines.push('# HELP llm_requests_total Total LLM requests');
        lines.push('# TYPE llm_requests_total counter');
        this.requestCounter.forEach((value, key) => {
            if (key.endsWith(`${KEY_SEPARATOR}requests_total`)) {
                const parts = key.split(KEY_SEPARATOR);
                const provider = parts[0];
                const model = parts.slice(1, -1).join(KEY_SEPARATOR) || parts[1];
                lines.push(`llm_requests_total{provider="${provider}",model="${model}"} ${value}`);
            }
        });
        // 成功请求
        lines.push('');
        lines.push('# HELP llm_requests_success Total successful LLM requests');
        lines.push('# TYPE llm_requests_success counter');
        this.requestCounter.forEach((value, key) => {
            if (key.endsWith(`${KEY_SEPARATOR}requests_success`)) {
                const parts = key.split(KEY_SEPARATOR);
                const provider = parts[0];
                const model = parts.slice(1, -1).join(KEY_SEPARATOR) || parts[1];
                lines.push(`llm_requests_success{provider="${provider}",model="${model}"} ${value}`);
            }
        });
        // 失败请求
        lines.push('');
        lines.push('# HELP llm_requests_failed Total failed LLM requests');
        lines.push('# TYPE llm_requests_failed counter');
        this.requestCounter.forEach((value, key) => {
            if (key.endsWith(`${KEY_SEPARATOR}requests_failed`)) {
                const parts = key.split(KEY_SEPARATOR);
                const provider = parts[0];
                const model = parts.slice(1, -1).join(KEY_SEPARATOR) || parts[1];
                lines.push(`llm_requests_failed{provider="${provider}",model="${model}"} ${value}`);
            }
        });
        // 延迟直方图
        lines.push('');
        lines.push('# HELP llm_latency_seconds LLM request latency in seconds');
        lines.push('# TYPE llm_latency_seconds histogram');
        this.latencyHistogram.forEach((buckets, key) => {
            const sepIdx = key.indexOf(KEY_SEPARATOR);
            const provider = key.substring(0, sepIdx);
            const model = key.substring(sepIdx + KEY_SEPARATOR.length);
            for (const bucket of LATENCY_BUCKETS) {
                const count = buckets.filter(l => l <= bucket).length;
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
            const sepIdx = key.indexOf(KEY_SEPARATOR);
            const provider = key.substring(0, sepIdx);
            const model = key.substring(sepIdx + KEY_SEPARATOR.length);
            lines.push(`llm_tokens_used_total{provider="${provider}",model="${model}",type="input"} ${value.input}`);
            lines.push(`llm_tokens_used_total{provider="${provider}",model="${model}",type="output"} ${value.output}`);
        });
        // 成本
        lines.push('');
        lines.push('# HELP llm_cost_usd_total Total cost in USD');
        lines.push('# TYPE llm_cost_usd_total counter');
        this.costCounter.forEach((value, key) => {
            const sepIdx = key.indexOf(KEY_SEPARATOR);
            const provider = key.substring(0, sepIdx);
            const model = key.substring(sepIdx + KEY_SEPARATOR.length);
            lines.push(`llm_cost_usd_total{provider="${provider}",model="${model}"} ${value.toFixed(6)}`);
        });
        // 活跃请求
        lines.push('');
        lines.push('# HELP llm_active_requests Current active requests');
        lines.push('# TYPE llm_active_requests gauge');
        this.activeRequests.forEach((value, key) => {
            const sepIdx = key.indexOf(KEY_SEPARATOR);
            const provider = key.substring(0, sepIdx);
            const model = key.substring(sepIdx + KEY_SEPARATOR.length);
            lines.push(`llm_active_requests{provider="${provider}",model="${model}"} ${value}`);
        });
        // 错误率
        lines.push('');
        lines.push('# HELP llm_errors_total Total errors by type');
        lines.push('# TYPE llm_errors_total counter');
        this.errorCounter.forEach((value, key) => {
            const parts = key.split(KEY_SEPARATOR);
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
    getStats() {
        const totalRequests = Array.from(this.requestCounter.entries())
            .filter(([key]) => key.endsWith(`${KEY_SEPARATOR}requests_total`))
            .reduce((sum, [, val]) => sum + val, 0);
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
    getProviderStats(provider) {
        const providerKeys = Array.from(this.requestCounter.keys())
            .filter(k => k.startsWith(`${provider}${KEY_SEPARATOR}`) && k.endsWith(`${KEY_SEPARATOR}requests_total`));
        if (providerKeys.length === 0)
            return null;
        const requests = providerKeys
            .map(k => this.requestCounter.get(k) || 0)
            .reduce((a, b) => a + b, 0);
        // Extract base keys (provider:model) for other counters
        const baseKeys = providerKeys.map(k => k.replace(`${KEY_SEPARATOR}requests_total`, ''));
        const tokens = baseKeys
            .map(k => this.tokenCounter.get(k) || { input: 0, output: 0 })
            .reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output }));
        const cost = baseKeys
            .map(k => this.costCounter.get(k) || 0)
            .reduce((a, b) => a + b, 0);
        const latencies = baseKeys
            .map(k => this.latencyHistogram.get(k) || [])
            .flat();
        const averageLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;
        const errorCount = Array.from(this.errorCounter.keys())
            .filter(k => k.startsWith(`${provider}${KEY_SEPARATOR}`))
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
    getCircuitBreakerEvents(provider, since) {
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
    reset() {
        this.requestCounter.clear();
        this.errorCounter.clear();
        this.tokenCounter.clear();
        this.latencyHistogram.clear();
        this.costCounter.clear();
        this.circuitBreakerEvents = [];
        this.activeRequests.clear();
        this.emit('reset');
    }
    /**
     * Record LLM call (legacy method for backward compatibility)
     */
    recordLLMCall(name, provider, duration, success) {
        this.recordRequest({
            requestId: name,
            provider: provider,
            model: name,
            latencyMs: duration,
            success,
            tokenUsage: { input: 0, output: 0, total: 0 },
            costUsd: 0,
        });
    }
    incrementCounter(name, provider, model) {
        const key = `${provider}${KEY_SEPARATOR}${model}${KEY_SEPARATOR}${name}`;
        const current = this.requestCounter.get(key) || 0;
        this.requestCounter.set(key, current + 1);
    }
    incrementErrorCounter(provider, model, errorType) {
        const key = `${provider}${KEY_SEPARATOR}${model}${KEY_SEPARATOR}${errorType}`;
        const current = this.errorCounter.get(key) || 0;
        this.errorCounter.set(key, current + 1);
    }
    recordLatency(provider, model, latencyMs) {
        const safeLatency = this.sanitizeNumber(latencyMs);
        const key = `${provider}${KEY_SEPARATOR}${model}`;
        const current = this.latencyHistogram.get(key) || [];
        current.push(safeLatency);
        // 只保留最近1000个样本
        if (current.length > 1000) {
            current.shift();
        }
        this.latencyHistogram.set(key, current);
    }
    recordTokens(provider, model, input, output) {
        const key = `${provider}${KEY_SEPARATOR}${model}`;
        const current = this.tokenCounter.get(key) || { input: 0, output: 0 };
        current.input += this.sanitizeNumber(input);
        current.output += this.sanitizeNumber(output);
        this.tokenCounter.set(key, current);
    }
    incrementCost(provider, model, cost) {
        const key = `${provider}${KEY_SEPARATOR}${model}`;
        const current = this.costCounter.get(key) || 0;
        this.costCounter.set(key, current + this.sanitizeNumber(cost));
    }
}
// Export singleton instance
export const metricsService = new LLMMetricsService();
//# sourceMappingURL=metricsService.js.map