/**
 * LLM Router
 * 智能路由与负载均衡
 */

import {
  LLMProvider,
  ModelInfo,
  RoutingStrategy,
  RoutingConfig,
  ChatCompletionRequest,
  RequestContext
} from './types';

interface ProviderHealth {
  provider: LLMProvider;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  lastChecked: Date;
}

interface RoutingDecision {
  provider: LLMProvider;
  model: string;
  reason: string;
}

/**
 * LLM路由器
 * 提供智能路由和负载均衡功能
 */
export class LLMRouter {
  private config: RoutingConfig;
  private models: Map<string, ModelInfo> = new Map();
  private providerHealth: Map<LLMProvider, ProviderHealth> = new Map();
  private roundRobinIndex: number = 0;
  private providerWeights: Map<LLMProvider, number> = new Map();

  constructor(config: Partial<RoutingConfig> = {}) {
    this.config = {
      strategy: 'round-robin',
      fallbackEnabled: true,
      maxRetries: 3,
      timeoutMs: 60000,
      ...config
    };

    // 初始化默认权重
    this.providerWeights.set('openai', 40);
    this.providerWeights.set('claude', 35);
    this.providerWeights.set('wenxin', 25);
  }

  /**
   * 注册模型
   */
  registerModel(model: ModelInfo): void {
    this.models.set(model.id, model);
  }

  /**
   * 更新提供商健康状态
   */
  updateProviderHealth(health: ProviderHealth): void {
    this.providerHealth.set(health.provider, health);
  }

  /**
   * 设置提供商权重（用于加权负载均衡）
   */
  setProviderWeight(provider: LLMProvider, weight: number): void {
    this.providerWeights.set(provider, Math.max(0, weight));
  }

  /**
   * 路由决策
   */
  route(
    request: ChatCompletionRequest,
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const strategy = this.config.strategy;

    switch (strategy) {
      case 'cost':
        return this.routeByCost(request, availableProviders);
      case 'latency':
        return this.routeByLatency(request, availableProviders);
      case 'quality':
        return this.routeByQuality(request, availableProviders);
      case 'round-robin':
        return this.routeByRoundRobin(availableProviders);
      case 'weighted':
        return this.routeByWeighted(availableProviders);
      default:
        return this.routeByRoundRobin(availableProviders);
    }
  }

  /**
   * 根据成本路由
   * 选择最便宜的模型
   */
  private routeByCost(
    request: ChatCompletionRequest,
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const models = this.getModelsForProviders(availableProviders);

    // 按成本排序
    const sortedModels = models
      .filter(m => m.capabilities.chatCompletion)
      .sort((a, b) => {
        const costA = a.costPer1KTokens.input + a.costPer1KTokens.output;
        const costB = b.costPer1KTokens.input + b.costPer1KTokens.output;
        return costA - costB;
      });

    const selected = sortedModels[0];

    return {
      provider: selected.provider,
      model: request.model || selected.id,
      reason: `Lowest cost: $${(selected.costPer1KTokens.input + selected.costPer1KTokens.output).toFixed(4)}/1K tokens`
    };
  }

  /**
   * 根据延迟路由
   * 选择延迟最低的模型
   */
  private routeByLatency(
    request: ChatCompletionRequest,
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const models = this.getModelsForProviders(availableProviders);

    // 按延迟排序
    const sortedModels = models
      .filter(m => m.capabilities.chatCompletion)
      .sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);

    const selected = sortedModels[0];

    return {
      provider: selected.provider,
      model: request.model || selected.id,
      reason: `Lowest latency: ${selected.averageLatencyMs}ms average`
    };
  }

  /**
   * 根据质量路由
   * 选择质量分数最高的模型
   */
  private routeByQuality(
    request: ChatCompletionRequest,
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const models = this.getModelsForProviders(availableProviders);

    // 按质量分数排序
    const sortedModels = models
      .filter(m => m.capabilities.chatCompletion)
      .sort((a, b) => b.qualityScore - a.qualityScore);

    const selected = sortedModels[0];

    return {
      provider: selected.provider,
      model: request.model || selected.id,
      reason: `Highest quality: ${selected.qualityScore}/100 score`
    };
  }

  /**
   * 轮询路由
   */
  private routeByRoundRobin(
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const healthyProviders = this.getHealthyProviders(availableProviders);

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    const index = this.roundRobinIndex % healthyProviders.length;
    const provider = healthyProviders[index];
    const models = this.getModelsForProviders([provider]);

    this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyProviders.length;

    return {
      provider,
      model: models[0]?.id || '',
      reason: `Round-robin selection (${this.roundRobinIndex}/${healthyProviders.length})`
    };
  }

  /**
   * 加权路由
   */
  private routeByWeighted(
    availableProviders: LLMProvider[]
  ): RoutingDecision {
    const healthyProviders = this.getHealthyProviders(availableProviders);

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // 计算总权重
    const totalWeight = healthyProviders.reduce((sum, p) => {
      return sum + (this.providerWeights.get(p) || 10);
    }, 0);

    // 随机选择（基于权重）
    let random = Math.random() * totalWeight;

    for (const provider of healthyProviders) {
      const weight = this.providerWeights.get(provider) || 10;
      random -= weight;

      if (random <= 0) {
        const models = this.getModelsForProviders([provider]);
        return {
          provider,
          model: models[0]?.id || '',
          reason: `Weighted selection (weight: ${weight}/${totalWeight})`
        };
      }
    }

    // 回退到最后一个
    const lastProvider = healthyProviders[healthyProviders.length - 1];
    const models = this.getModelsForProviders([lastProvider]);
    return {
      provider: lastProvider,
      model: models[0]?.id || '',
      reason: 'Weighted fallback'
    };
  }

  /**
   * 根据模型能力匹配路由
   */
  routeByCapabilities(
    requiredCapabilities: {
      chatCompletion?: boolean;
      embeddings?: boolean;
      streaming?: boolean;
      maxTokens?: number;
    },
    availableProviders: LLMProvider[]
  ): RoutingDecision[] {
    const models = this.getModelsForProviders(availableProviders);

    const matches = models.filter(model => {
      const caps = model.capabilities;

      if (requiredCapabilities.chatCompletion && !caps.chatCompletion) return false;
      if (requiredCapabilities.embeddings && !caps.embeddings) return false;
      if (requiredCapabilities.streaming && !caps.streaming) return false;
      if (requiredCapabilities.maxTokens && caps.maxTokens < requiredCapabilities.maxTokens) {
        return false;
      }

      return true;
    });

    return matches.map(model => ({
      provider: model.provider,
      model: model.id,
      reason: `Matches required capabilities: ${Object.keys(requiredCapabilities).join(', ')}`
    }));
  }

  /**
   * 根据语言支持路由
   */
  routeByLanguage(
    language: string,
    availableProviders: LLMProvider[]
  ): RoutingDecision[] {
    const models = this.getModelsForProviders(availableProviders);

    const matches = models.filter(model =>
      model.capabilities.supportedLanguages.includes(language.toLowerCase())
    );

    return matches.map(model => ({
      provider: model.provider,
      model: model.id,
      reason: `Supports language: ${language}`
    }));
  }

  /**
   * 获取配置
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取健康状态摘要
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    details: ProviderHealth[];
  } {
    const details = Array.from(this.providerHealth.values());
    const healthy = details.filter(h => h.healthy).length;

    return {
      total: details.length,
      healthy,
      unhealthy: details.length - healthy,
      details
    };
  }

  /**
   * 重置轮询计数器
   */
  resetRoundRobin(): void {
    this.roundRobinIndex = 0;
  }

  private getModelsForProviders(providers: LLMProvider[]): ModelInfo[] {
    return Array.from(this.models.values())
      .filter(m => providers.includes(m.provider));
  }

  private getHealthyProviders(providers: LLMProvider[]): LLMProvider[] {
    return providers.filter(provider => {
      const health = this.providerHealth.get(provider);
      return !health || health.healthy;
    });
  }
}
