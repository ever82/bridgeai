/**
 * LLM Router
 * 智能路由与负载均衡
 */
/**
 * LLM路由器
 * 提供智能路由和负载均衡功能
 */
export class LLMRouter {
    config;
    models = new Map();
    providerHealth = new Map();
    roundRobinIndex = 0;
    providerWeights = new Map();
    activeConnections = new Map();
    healthCheckInterval = null;
    healthCheckIntervalMs = 30000;
    providerLatencies = new Map();
    constructor(config = {}) {
        this.config = {
            strategy: 'round-robin',
            fallbackEnabled: true,
            maxRetries: 3,
            timeoutMs: 60000,
            healthCheckIntervalMs: 30000,
            ...config,
        };
        if (this.config.healthCheckIntervalMs) {
            this.healthCheckIntervalMs = this.config.healthCheckIntervalMs;
        }
        // 初始化默认权重
        this.providerWeights.set('openai', 40);
        this.providerWeights.set('claude', 35);
        this.providerWeights.set('wenxin', 25);
    }
    /**
     * 注册模型
     */
    registerModel(model) {
        this.models.set(model.id, model);
    }
    /**
     * 更新提供商健康状态
     */
    updateProviderHealth(health) {
        this.providerHealth.set(health.provider, health);
    }
    /**
     * 设置提供商权重（用于加权负载均衡）
     */
    setProviderWeight(provider, weight) {
        this.providerWeights.set(provider, Math.max(0, weight));
    }
    /**
     * 路由决策
     */
    route(request, availableProviders) {
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
            case 'least-connections':
                return this.routeByLeastConnections(availableProviders);
            default:
                return this.routeByRoundRobin(availableProviders);
        }
    }
    /**
     * 根据成本路由
     * 选择最便宜的模型
     */
    routeByCost(request, availableProviders) {
        const models = this.getModelsForProviders(availableProviders);
        // 按成本排序
        const sortedModels = models
            .filter(m => m.capabilities.chatCompletion)
            .sort((a, b) => {
            const costA = a.costPer1KTokens.input + a.costPer1KTokens.output;
            const costB = b.costPer1KTokens.input + b.costPer1KTokens.output;
            return costA - costB;
        });
        if (sortedModels.length === 0) {
            throw new Error('No suitable model found for cost-based routing');
        }
        const selected = sortedModels[0];
        return {
            provider: selected.provider,
            model: request.model || selected.id,
            reason: `Lowest cost: $${(selected.costPer1KTokens.input + selected.costPer1KTokens.output).toFixed(4)}/1K tokens`,
        };
    }
    /**
     * 根据延迟路由
     * 选择延迟最低的模型
     */
    routeByLatency(request, availableProviders) {
        const models = this.getModelsForProviders(availableProviders);
        // 按延迟排序
        const sortedModels = models
            .filter(m => m.capabilities.chatCompletion)
            .sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
        if (sortedModels.length === 0) {
            throw new Error('No suitable model found for latency-based routing');
        }
        const selected = sortedModels[0];
        return {
            provider: selected.provider,
            model: request.model || selected.id,
            reason: `Lowest latency: ${selected.averageLatencyMs}ms average`,
        };
    }
    /**
     * 根据质量路由
     * 选择质量分数最高的模型
     */
    routeByQuality(request, availableProviders) {
        const models = this.getModelsForProviders(availableProviders);
        // 按质量分数排序
        const sortedModels = models
            .filter(m => m.capabilities.chatCompletion)
            .sort((a, b) => b.qualityScore - a.qualityScore);
        if (sortedModels.length === 0) {
            throw new Error('No suitable model found for quality-based routing');
        }
        const selected = sortedModels[0];
        return {
            provider: selected.provider,
            model: request.model || selected.id,
            reason: `Highest quality: ${selected.qualityScore}/100 score`,
        };
    }
    /**
     * 轮询路由
     */
    routeByRoundRobin(availableProviders) {
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
            reason: `Round-robin selection (${this.roundRobinIndex}/${healthyProviders.length})`,
        };
    }
    /**
     * 加权路由
     */
    routeByWeighted(availableProviders) {
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
            if (random < 0) {
                const models = this.getModelsForProviders([provider]);
                return {
                    provider,
                    model: models[0]?.id || '',
                    reason: `Weighted selection (weight: ${weight}/${totalWeight})`,
                };
            }
        }
        // 回退到最后一个
        const lastProvider = healthyProviders[healthyProviders.length - 1];
        const models = this.getModelsForProviders([lastProvider]);
        return {
            provider: lastProvider,
            model: models[0]?.id || '',
            reason: 'Weighted fallback',
        };
    }
    /**
     * 最小连接数路由
     * 选择活跃连接数最少的提供商
     */
    routeByLeastConnections(availableProviders) {
        const healthyProviders = this.getHealthyProviders(availableProviders);
        if (healthyProviders.length === 0) {
            throw new Error('No healthy providers available');
        }
        // 查找连接数最少的提供商
        let minConnections = Infinity;
        let selectedProvider = healthyProviders[0];
        for (const provider of healthyProviders) {
            const connections = this.activeConnections.get(provider) || 0;
            if (connections < minConnections) {
                minConnections = connections;
                selectedProvider = provider;
            }
        }
        // 增加该提供商的活跃连接数
        this.activeConnections.set(selectedProvider, minConnections + 1);
        const models = this.getModelsForProviders([selectedProvider]);
        return {
            provider: selectedProvider,
            model: models[0]?.id || '',
            reason: `Least connections: ${minConnections} active (now ${minConnections + 1})`,
        };
    }
    /**
     * 释放连接
     * 当请求完成时调用
     */
    releaseConnection(provider) {
        const current = this.activeConnections.get(provider) || 0;
        if (current > 0) {
            this.activeConnections.set(provider, current - 1);
        }
    }
    /**
     * 根据模型能力匹配路由
     */
    routeByCapabilities(requiredCapabilities, availableProviders) {
        const models = this.getModelsForProviders(availableProviders);
        const matches = models.filter(model => {
            const caps = model.capabilities;
            if (requiredCapabilities.chatCompletion && !caps.chatCompletion)
                return false;
            if (requiredCapabilities.embeddings && !caps.embeddings)
                return false;
            if (requiredCapabilities.streaming && !caps.streaming)
                return false;
            if (requiredCapabilities.maxTokens && caps.maxTokens < requiredCapabilities.maxTokens) {
                return false;
            }
            return true;
        });
        return matches.map(model => ({
            provider: model.provider,
            model: model.id,
            reason: `Matches required capabilities: ${Object.keys(requiredCapabilities).join(', ')}`,
        }));
    }
    /**
     * 根据语言支持路由
     */
    routeByLanguage(language, availableProviders) {
        const models = this.getModelsForProviders(availableProviders);
        const matches = models.filter(model => model.capabilities.supportedLanguages.includes(language.toLowerCase()));
        return matches.map(model => ({
            provider: model.provider,
            model: model.id,
            reason: `Supports language: ${language}`,
        }));
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * 获取健康状态摘要
     */
    getHealthSummary() {
        const details = Array.from(this.providerHealth.values());
        const healthy = details.filter(h => h.healthy).length;
        return {
            total: details.length,
            healthy,
            unhealthy: details.length - healthy,
            details,
        };
    }
    /**
     * 启动健康检查
     * 定期探测提供商健康状态
     * @param providers 要检查的提供商列表
     * @param probeFn 探测函数，返回延迟(ms)，失败时抛出异常
     */
    startHealthCheck(providers, probeFn) {
        if (this.healthCheckInterval) {
            this.stopHealthCheck();
        }
        const checkProvider = async (provider) => {
            const timeout = 10000; // 10秒超时
            try {
                const latency = await Promise.race([
                    probeFn(provider),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), timeout)),
                ]);
                // 更新延迟记录
                const latencies = this.providerLatencies.get(provider) || [];
                latencies.push(latency);
                // 保留最近10个延迟记录
                if (latencies.length > 10) {
                    latencies.shift();
                }
                this.providerLatencies.set(provider, latencies);
                const avgLatency = this.getAverageLatency(provider);
                // 更新健康状态
                this.providerHealth.set(provider, {
                    provider,
                    healthy: true,
                    latencyMs: latency,
                    averageLatencyMs: avgLatency,
                    successRate: this.providerHealth.get(provider)?.successRate ?? 1.0,
                    lastChecked: new Date(),
                });
            }
            catch (error) {
                // 提供商不健康
                this.providerHealth.set(provider, {
                    provider,
                    healthy: false,
                    latencyMs: this.providerHealth.get(provider)?.latencyMs ?? 0,
                    averageLatencyMs: this.getAverageLatency(provider),
                    successRate: this.providerHealth.get(provider)?.successRate ?? 0,
                    lastChecked: new Date(),
                });
            }
        };
        // 立即执行一次检查
        providers.forEach(checkProvider);
        // 启动定期检查
        this.healthCheckInterval = setInterval(() => {
            providers.forEach(checkProvider);
        }, this.healthCheckIntervalMs);
    }
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    /**
     * 获取提供商的平均延迟
     * @param provider 提供商
     * @returns 平均延迟(ms)，无数据时返回0
     */
    getAverageLatency(provider) {
        const latencies = this.providerLatencies.get(provider);
        if (!latencies || latencies.length === 0) {
            return 0;
        }
        const sum = latencies.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / latencies.length);
    }
    /**
     * 重置轮询计数器
     */
    resetRoundRobin() {
        this.roundRobinIndex = 0;
    }
    getModelsForProviders(providers) {
        return Array.from(this.models.values()).filter(m => providers.includes(m.provider));
    }
    getHealthyProviders(providers) {
        return providers.filter(provider => {
            const health = this.providerHealth.get(provider);
            return !health || health.healthy;
        });
    }
}
//# sourceMappingURL=llmRouter.js.map