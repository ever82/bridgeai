/**
 * Degradation Controller
 * 降级决策控制器 - 健康监控、自动降级判断、渐进式恢复
 */
import { EventEmitter } from 'events';
import { DegradationLevel, DegradationStrategy } from './degradationStrategy';
import { ResilienceMetricsService } from './metricsService';
const DEFAULT_CONFIG = {
    checkIntervalMs: 10000, // 10 seconds
    errorRateThreshold: 0.5, // 50% error rate triggers degradation
    latencyP95ThresholdMs: 10000, // 10s P95 latency triggers degradation
    consecutiveFailureThreshold: 3,
    recoveryErrorRateThreshold: 0.1,
    recoveryLatencyThresholdMs: 3000,
    recoveryConsecutiveSuccessThreshold: 5,
};
export class DegradationController extends EventEmitter {
    config;
    degradationStrategy;
    metricsService;
    healthStatuses = new Map();
    currentLevel = DegradationLevel.NORMAL;
    decisionHistory = [];
    checkTimer;
    consecutiveSuccesses = new Map();
    constructor(degradationStrategy, metricsService, config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.degradationStrategy = degradationStrategy;
        this.metricsService = metricsService;
    }
    /**
     * Start monitoring health and auto-degradation
     */
    startMonitoring(providers) {
        // Initialize health statuses
        for (const provider of providers) {
            this.healthStatuses.set(provider, {
                provider,
                healthy: true,
                errorRate: 0,
                latencyP95Ms: 0,
                lastCheckAt: new Date(),
                consecutiveFailures: 0,
            });
            this.consecutiveSuccesses.set(provider, 0);
        }
        // Start periodic health checks
        this.checkTimer = setInterval(() => this.performHealthCheck(), this.config.checkIntervalMs);
        this.emit('monitoringStarted', { providers });
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
        this.emit('monitoringStopped');
    }
    /**
     * Record a provider success
     */
    recordSuccess(provider, latencyMs) {
        const status = this.healthStatuses.get(provider);
        if (status) {
            status.consecutiveFailures = 0;
        }
        const successes = (this.consecutiveSuccesses.get(provider) ?? 0) + 1;
        this.consecutiveSuccesses.set(provider, successes);
        this.metricsService.recordRequest(provider, {
            success: true,
            latencyMs,
            degradationLevel: this.currentLevel,
        });
        // Check for recovery
        this.checkRecovery(provider);
    }
    /**
     * Record a provider failure
     */
    recordFailure(provider, latencyMs, errorType) {
        const status = this.healthStatuses.get(provider);
        if (status) {
            status.consecutiveFailures++;
        }
        this.consecutiveSuccesses.set(provider, 0);
        this.metricsService.recordRequest(provider, {
            success: false,
            latencyMs,
            errorType,
            degradationLevel: this.currentLevel,
        });
        // Check for degradation
        this.checkDegradation(provider);
    }
    /**
     * Perform health check on all providers
     */
    async performHealthCheck() {
        for (const [provider, status] of this.healthStatuses.entries()) {
            const stats = this.metricsService.getProviderStats(provider);
            if (stats) {
                status.errorRate = stats.errorRate;
                status.latencyP95Ms = stats.latencyP95Ms;
                status.healthy = this.isProviderHealthy(provider);
            }
            status.lastCheckAt = new Date();
        }
        // Evaluate overall system health and adjust degradation level
        this.evaluateSystemHealth();
        this.emit('healthCheckCompleted', {
            statuses: Array.from(this.healthStatuses.values()),
        });
        return this.healthStatuses;
    }
    /**
     * Get current degradation level
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    /**
     * Get health status for all providers
     */
    getHealthStatuses() {
        return Array.from(this.healthStatuses.values());
    }
    /**
     * Get health status for a specific provider
     */
    getProviderHealth(provider) {
        return this.healthStatuses.get(provider);
    }
    /**
     * Get decision history
     */
    getDecisionHistory(limit) {
        const history = [...this.decisionHistory];
        return limit ? history.slice(-limit) : history;
    }
    /**
     * Manually trigger degradation to a specific level
     */
    manualDegradation(level, reason) {
        this.setLevel(level, reason, [], true);
    }
    /**
     * Manually trigger recovery
     */
    manualRecovery() {
        this.setLevel(DegradationLevel.NORMAL, 'Manual recovery triggered', [], true);
    }
    /**
     * Get user impact assessment for current degradation level
     */
    getUserImpact() {
        switch (this.currentLevel) {
            case DegradationLevel.NORMAL:
                return {
                    level: this.currentLevel,
                    description: '所有服务正常运行',
                    affectedFeatures: [],
                };
            case DegradationLevel.L1_BACKUP_MODEL:
                return {
                    level: this.currentLevel,
                    description: '使用备用模型，可能略有质量差异',
                    affectedFeatures: ['AI回复质量可能降低'],
                    estimatedRecoveryTime: '自动恢复中',
                };
            case DegradationLevel.L2_LOW_COST_MODEL:
                return {
                    level: this.currentLevel,
                    description: '使用低成本模型，回复质量可能明显降低',
                    affectedFeatures: ['AI回复质量降低', '复杂任务处理能力下降'],
                    estimatedRecoveryTime: '1-5分钟',
                };
            case DegradationLevel.L3_TEMPLATE:
                return {
                    level: this.currentLevel,
                    description: 'AI生成暂时不可用，使用模板回复',
                    affectedFeatures: ['无法进行AI对话', '使用预设回复'],
                    estimatedRecoveryTime: '5-15分钟',
                };
            case DegradationLevel.L4_ASYNC_QUEUE:
                return {
                    level: this.currentLevel,
                    description: '实时AI服务不可用，请求已排队处理',
                    affectedFeatures: ['无法实时获取回复', '请求延迟处理'],
                    estimatedRecoveryTime: '15-30分钟',
                };
            case DegradationLevel.L5_UNAVAILABLE:
                return {
                    level: this.currentLevel,
                    description: 'AI服务完全不可用',
                    affectedFeatures: ['所有AI功能不可用'],
                    estimatedRecoveryTime: '请联系管理员',
                };
        }
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    isProviderHealthy(provider) {
        const status = this.healthStatuses.get(provider);
        if (!status)
            return false;
        return (status.errorRate < this.config.errorRateThreshold &&
            status.latencyP95Ms < this.config.latencyP95ThresholdMs &&
            status.consecutiveFailures < this.config.consecutiveFailureThreshold);
    }
    checkDegradation(provider) {
        const status = this.healthStatuses.get(provider);
        if (!status)
            return;
        if (status.consecutiveFailures >= this.config.consecutiveFailureThreshold) {
            // Escalate degradation
            const newLevel = Math.min(this.currentLevel + 1, DegradationLevel.L5_UNAVAILABLE);
            if (newLevel > this.currentLevel) {
                this.setLevel(newLevel, `Provider ${provider} consecutive failures: ${status.consecutiveFailures}`, [provider], true);
            }
        }
    }
    checkRecovery(provider) {
        if (this.currentLevel === DegradationLevel.NORMAL)
            return;
        const successes = this.consecutiveSuccesses.get(provider) ?? 0;
        const status = this.healthStatuses.get(provider);
        if (successes >= this.config.recoveryConsecutiveSuccessThreshold &&
            status &&
            status.errorRate < this.config.recoveryErrorRateThreshold) {
            // Progressive recovery: go down one level
            const newLevel = Math.max(this.currentLevel - 1, DegradationLevel.NORMAL);
            if (newLevel < this.currentLevel) {
                this.setLevel(newLevel, `Provider ${provider} recovered: ${successes} consecutive successes`, [provider], true);
            }
        }
    }
    evaluateSystemHealth() {
        const statuses = Array.from(this.healthStatuses.values());
        const unhealthyCount = statuses.filter(s => !s.healthy).length;
        const totalProviders = statuses.length;
        if (totalProviders === 0)
            return;
        // All providers unhealthy -> L5
        if (unhealthyCount === totalProviders) {
            this.setLevel(DegradationLevel.L5_UNAVAILABLE, 'All providers are unhealthy', statuses.map(s => s.provider), true);
            return;
        }
        // Most providers unhealthy -> escalate
        if (unhealthyCount >= totalProviders * 0.5 &&
            this.currentLevel < DegradationLevel.L3_TEMPLATE) {
            this.setLevel(DegradationLevel.L3_TEMPLATE, `${unhealthyCount}/${totalProviders} providers unhealthy`, statuses.filter(s => !s.healthy).map(s => s.provider), true);
        }
    }
    setLevel(level, reason, affectedProviders, autoTriggered) {
        const previousLevel = this.currentLevel;
        this.currentLevel = level;
        this.degradationStrategy.setLevel(level);
        const decision = {
            level,
            reason,
            affectedProviders,
            timestamp: new Date(),
            autoTriggered,
        };
        this.decisionHistory.push(decision);
        // Keep last 100 decisions
        if (this.decisionHistory.length > 100) {
            this.decisionHistory = this.decisionHistory.slice(-100);
        }
        this.metricsService.recordDegradationEvent({
            fromLevel: previousLevel,
            toLevel: level,
            reason,
            affectedProviders,
        });
        this.emit('levelChanged', {
            from: previousLevel,
            to: level,
            reason,
            autoTriggered,
        });
        if (level > previousLevel) {
            this.emit('degraded', decision);
        }
        else if (level < previousLevel) {
            this.emit('recovered', decision);
        }
    }
}
let _degradationController = null;
/**
 * Get the singleton DegradationController instance.
 * Uses lazy initialization to avoid eager side effects at import time.
 */
export function getDegradationController() {
    if (!_degradationController) {
        _degradationController = new DegradationController(new DegradationStrategy(), new ResilienceMetricsService());
    }
    return _degradationController;
}
/**
 * @deprecated Prefer getDegradationController() for lazy initialization.
 * Exported for backwards compatibility only.
 *
 * Uses a Proxy so that no instantiation occurs at import time — the real
 * DegradationController is only created when a property is first accessed.
 */
export const degradationController = new Proxy({}, {
    get(_target, prop, receiver) {
        return Reflect.get(getDegradationController(), prop, receiver);
    },
});
//# sourceMappingURL=degradationController.js.map