/**
 * Degradation Controller
 * 降级决策控制器 - 健康监控、自动降级判断、渐进式恢复
 */
import { EventEmitter } from 'events';
import { LLMProvider } from '../types';
import { DegradationLevel, DegradationStrategy } from './degradationStrategy';
import { ResilienceMetricsService } from './metricsService';
export interface HealthStatus {
    provider: LLMProvider;
    healthy: boolean;
    errorRate: number;
    latencyP95Ms: number;
    lastCheckAt: Date;
    consecutiveFailures: number;
}
export interface DegradationDecision {
    level: DegradationLevel;
    reason: string;
    affectedProviders: LLMProvider[];
    timestamp: Date;
    autoTriggered: boolean;
}
export interface DegradationControllerConfig {
    checkIntervalMs: number;
    errorRateThreshold: number;
    latencyP95ThresholdMs: number;
    consecutiveFailureThreshold: number;
    recoveryErrorRateThreshold: number;
    recoveryLatencyThresholdMs: number;
    recoveryConsecutiveSuccessThreshold: number;
}
export declare class DegradationController extends EventEmitter {
    private config;
    private degradationStrategy;
    private metricsService;
    private healthStatuses;
    private currentLevel;
    private decisionHistory;
    private checkTimer?;
    private consecutiveSuccesses;
    constructor(degradationStrategy: DegradationStrategy, metricsService: ResilienceMetricsService, config?: Partial<DegradationControllerConfig>);
    /**
     * Start monitoring health and auto-degradation
     */
    startMonitoring(providers: LLMProvider[]): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Record a provider success
     */
    recordSuccess(provider: LLMProvider, latencyMs: number): void;
    /**
     * Record a provider failure
     */
    recordFailure(provider: LLMProvider, latencyMs: number, errorType?: string): void;
    /**
     * Perform health check on all providers
     */
    performHealthCheck(): Promise<Map<LLMProvider, HealthStatus>>;
    /**
     * Get current degradation level
     */
    getCurrentLevel(): DegradationLevel;
    /**
     * Get health status for all providers
     */
    getHealthStatuses(): HealthStatus[];
    /**
     * Get health status for a specific provider
     */
    getProviderHealth(provider: LLMProvider): HealthStatus | undefined;
    /**
     * Get decision history
     */
    getDecisionHistory(limit?: number): DegradationDecision[];
    /**
     * Manually trigger degradation to a specific level
     */
    manualDegradation(level: DegradationLevel, reason: string): void;
    /**
     * Manually trigger recovery
     */
    manualRecovery(): void;
    /**
     * Get user impact assessment for current degradation level
     */
    getUserImpact(): {
        level: DegradationLevel;
        description: string;
        affectedFeatures: string[];
        estimatedRecoveryTime?: string;
    };
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DegradationControllerConfig>): void;
    private isProviderHealthy;
    private checkDegradation;
    private checkRecovery;
    private evaluateSystemHealth;
    private setLevel;
}
/**
 * Get the singleton DegradationController instance.
 * Uses lazy initialization to avoid eager side effects at import time.
 */
export declare function getDegradationController(): DegradationController;
/**
 * @deprecated Prefer getDegradationController() for lazy initialization.
 * Exported for backwards compatibility only.
 */
export declare const degradationController: DegradationController;
//# sourceMappingURL=degradationController.d.ts.map