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
export declare class ResilienceMetricsService extends EventEmitter {
    private degradationEvents;
    private providerMetrics;
    private currentLevel;
    private currentLevelSince;
    private alertRules;
    private maxEvents;
    private maxLatencySamples;
    constructor();
    /**
     * Record a degradation level change event
     */
    recordDegradationEvent(event: Omit<DegradationEvent, 'id'>): void;
    /**
     * Record a request result for a provider
     */
    recordRequest(provider: LLMProvider, record: DegradationRequestRecord): void;
    /**
     * Get metrics summary
     */
    getSummary(): ResilienceMetricsSummary;
    /**
     * Get provider-specific stats
     */
    getProviderStats(provider: LLMProvider): {
        errorRate: number;
        latencyP95Ms: number;
        totalRequests: number;
        successRate: number;
    } | null;
    /**
     * Get degradation events
     */
    getDegradationEvents(limit?: number): DegradationEvent[];
    /**
     * Get current degradation duration
     */
    getCurrentLevelDurationMs(): number;
    /**
     * Get Prometheus-compatible metrics output
     */
    getPrometheusMetrics(): string;
    /**
     * Add an alert rule
     */
    addAlertRule(rule: Omit<AlertRule, 'lastTriggeredAt'>): void;
    /**
     * Remove an alert rule
     */
    removeAlertRule(id: string): boolean;
    /**
     * Get all alert rules
     */
    getAlertRules(): AlertRule[];
    /**
     * Reset all metrics
     */
    reset(): void;
    private setupDefaultAlertRules;
    private checkAlerts;
}
export declare const resilienceMetricsService: ResilienceMetricsService;
//# sourceMappingURL=metricsService.d.ts.map