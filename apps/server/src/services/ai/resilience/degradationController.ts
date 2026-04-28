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

const DEFAULT_CONFIG: DegradationControllerConfig = {
  checkIntervalMs: 10000, // 10 seconds
  errorRateThreshold: 0.5, // 50% error rate triggers degradation
  latencyP95ThresholdMs: 10000, // 10s P95 latency triggers degradation
  consecutiveFailureThreshold: 3,
  recoveryErrorRateThreshold: 0.1,
  recoveryLatencyThresholdMs: 3000,
  recoveryConsecutiveSuccessThreshold: 5,
};

export class DegradationController extends EventEmitter {
  private config: DegradationControllerConfig;
  private degradationStrategy: DegradationStrategy;
  private metricsService: ResilienceMetricsService;
  private healthStatuses: Map<LLMProvider, HealthStatus> = new Map();
  private currentLevel: DegradationLevel = DegradationLevel.NORMAL;
  private decisionHistory: DegradationDecision[] = [];
  private checkTimer?: ReturnType<typeof setInterval>;
  private consecutiveSuccesses: Map<LLMProvider, number> = new Map();

  constructor(
    degradationStrategy: DegradationStrategy,
    metricsService: ResilienceMetricsService,
    config: Partial<DegradationControllerConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.degradationStrategy = degradationStrategy;
    this.metricsService = metricsService;
  }

  /**
   * Start monitoring health and auto-degradation
   */
  startMonitoring(providers: LLMProvider[]): void {
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
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
    this.emit('monitoringStopped');
  }

  /**
   * Record a provider success
   */
  recordSuccess(provider: LLMProvider, latencyMs: number): void {
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
  recordFailure(provider: LLMProvider, latencyMs: number, errorType?: string): void {
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
  async performHealthCheck(): Promise<Map<LLMProvider, HealthStatus>> {
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
  getCurrentLevel(): DegradationLevel {
    return this.currentLevel;
  }

  /**
   * Get health status for all providers
   */
  getHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * Get health status for a specific provider
   */
  getProviderHealth(provider: LLMProvider): HealthStatus | undefined {
    return this.healthStatuses.get(provider);
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit?: number): DegradationDecision[] {
    const history = [...this.decisionHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Manually trigger degradation to a specific level
   */
  manualDegradation(level: DegradationLevel, reason: string): void {
    this.setLevel(level, reason, [], true);
  }

  /**
   * Manually trigger recovery
   */
  manualRecovery(): void {
    this.setLevel(DegradationLevel.NORMAL, 'Manual recovery triggered', [], true);
  }

  /**
   * Get user impact assessment for current degradation level
   */
  getUserImpact(): {
    level: DegradationLevel;
    description: string;
    affectedFeatures: string[];
    estimatedRecoveryTime?: string;
  } {
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
  updateConfig(config: Partial<DegradationControllerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private isProviderHealthy(provider: LLMProvider): boolean {
    const status = this.healthStatuses.get(provider);
    if (!status) return false;

    return (
      status.errorRate < this.config.errorRateThreshold &&
      status.latencyP95Ms < this.config.latencyP95ThresholdMs &&
      status.consecutiveFailures < this.config.consecutiveFailureThreshold
    );
  }

  private checkDegradation(provider: LLMProvider): void {
    const status = this.healthStatuses.get(provider);
    if (!status) return;

    if (status.consecutiveFailures >= this.config.consecutiveFailureThreshold) {
      // Escalate degradation
      const newLevel = Math.min(this.currentLevel + 1, DegradationLevel.L5_UNAVAILABLE);
      if (newLevel > this.currentLevel) {
        this.setLevel(
          newLevel as DegradationLevel,
          `Provider ${provider} consecutive failures: ${status.consecutiveFailures}`,
          [provider],
          true
        );
      }
    }
  }

  private checkRecovery(provider: LLMProvider): void {
    if (this.currentLevel === DegradationLevel.NORMAL) return;

    const successes = this.consecutiveSuccesses.get(provider) ?? 0;
    const status = this.healthStatuses.get(provider);

    if (
      successes >= this.config.recoveryConsecutiveSuccessThreshold &&
      status &&
      status.errorRate < this.config.recoveryErrorRateThreshold
    ) {
      // Progressive recovery: go down one level
      const newLevel = Math.max(this.currentLevel - 1, DegradationLevel.NORMAL);
      if (newLevel < this.currentLevel) {
        this.setLevel(
          newLevel as DegradationLevel,
          `Provider ${provider} recovered: ${successes} consecutive successes`,
          [provider],
          true
        );
      }
    }
  }

  private evaluateSystemHealth(): void {
    const statuses = Array.from(this.healthStatuses.values());
    const unhealthyCount = statuses.filter(s => !s.healthy).length;
    const totalProviders = statuses.length;

    if (totalProviders === 0) return;

    // All providers unhealthy -> L5
    if (unhealthyCount === totalProviders) {
      this.setLevel(
        DegradationLevel.L5_UNAVAILABLE,
        'All providers are unhealthy',
        statuses.map(s => s.provider),
        true
      );
      return;
    }

    // Most providers unhealthy -> escalate
    if (
      unhealthyCount >= totalProviders * 0.5 &&
      this.currentLevel < DegradationLevel.L3_TEMPLATE
    ) {
      this.setLevel(
        DegradationLevel.L3_TEMPLATE,
        `${unhealthyCount}/${totalProviders} providers unhealthy`,
        statuses.filter(s => !s.healthy).map(s => s.provider),
        true
      );
    }
  }

  private setLevel(
    level: DegradationLevel,
    reason: string,
    affectedProviders: LLMProvider[],
    autoTriggered: boolean
  ): void {
    const previousLevel = this.currentLevel;
    this.currentLevel = level;
    this.degradationStrategy.setLevel(level);

    const decision: DegradationDecision = {
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
    } else if (level < previousLevel) {
      this.emit('recovered', decision);
    }
  }
}

let _degradationController: DegradationController | null = null;

/**
 * Get the singleton DegradationController instance.
 * Uses lazy initialization to avoid eager side effects at import time.
 */
export function getDegradationController(): DegradationController {
  if (!_degradationController) {
    _degradationController = new DegradationController(
      new DegradationStrategy(),
      new ResilienceMetricsService()
    );
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
export const degradationController: DegradationController = new Proxy({} as DegradationController, {
  get(_target, prop, receiver) {
    return Reflect.get(getDegradationController(), prop, receiver);
  },
});
