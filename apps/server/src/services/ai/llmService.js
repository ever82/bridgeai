/**
 * LLM Service
 * 统一的LLM服务入口
 */
import { logger } from '../../utils/logger';
import { OpenAIAdapter, ClaudeAdapter, WenxinAdapter } from './adapters';
import { CircuitBreakerManager } from './circuitBreaker';
import { LLMRouter } from './llmRouter';
import { LLMMetricsService } from './metricsService';
import { createDefaultFallbackChain } from './fallback';
/**
 * LLM服务
 * 提供统一的LLM接入接口
 */
export class LLMService {
    adapters = new Map();
    circuitBreakerManager;
    router;
    metrics;
    fallbackChain;
    config;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.circuitBreakerManager = new CircuitBreakerManager();
        this.router = new LLMRouter({
            strategy: config.defaultStrategy || 'round-robin',
            fallbackEnabled: true,
            maxRetries: 3,
            timeoutMs: 60000,
        });
        this.metrics = new LLMMetricsService();
        this.fallbackChain = createDefaultFallbackChain();
    }
    /**
     * 初始化服务
     */
    async initialize() {
        if (this.initialized)
            return;
        // 初始化OpenAI适配器
        if (!this.config.openai?.apiKey) {
            logger.warn('OpenAI adapter not configured: OPENAI_API_KEY is missing');
        }
        if (this.config.openai?.apiKey) {
            const adapter = new OpenAIAdapter({
                apiKey: this.config.openai.apiKey,
                apiUrl: this.config.openai.apiUrl,
                organization: this.config.openai.organization,
                timeoutMs: 60000,
            });
            await adapter.initialize();
            this.adapters.set('openai', adapter);
            // 注册模型到路由器
            const models = await adapter.getModels();
            models.forEach(m => this.router.registerModel(m));
            // 配置熔断器
            this.circuitBreakerManager.getCircuitBreaker('openai', {
                failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
                recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000,
            });
        }
        // 初始化Claude适配器
        if (!this.config.claude?.apiKey) {
            logger.warn('Claude adapter not configured: CLAUDE_API_KEY is missing');
        }
        if (this.config.claude?.apiKey) {
            const adapter = new ClaudeAdapter({
                apiKey: this.config.claude.apiKey,
                apiUrl: this.config.claude.apiUrl,
                timeoutMs: 60000,
            });
            await adapter.initialize();
            this.adapters.set('claude', adapter);
            const models = await adapter.getModels();
            models.forEach(m => this.router.registerModel(m));
            this.circuitBreakerManager.getCircuitBreaker('claude', {
                failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
                recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000,
            });
        }
        // 初始化文心一言适配器
        if (!this.config.wenxin?.apiKey || !this.config.wenxin?.secretKey) {
            logger.warn('Wenxin adapter not configured: WENXIN_API_KEY or WENXIN_SECRET_KEY is missing');
        }
        if (this.config.wenxin?.apiKey && this.config.wenxin?.secretKey) {
            const adapter = new WenxinAdapter({
                apiKey: this.config.wenxin.apiKey,
                secretKey: this.config.wenxin.secretKey,
                apiUrl: this.config.wenxin.apiUrl,
                timeoutMs: 60000,
            });
            await adapter.initialize();
            this.adapters.set('wenxin', adapter);
            const models = await adapter.getModels();
            models.forEach(m => this.router.registerModel(m));
            this.circuitBreakerManager.getCircuitBreaker('wenxin', {
                failureThreshold: this.config.circuitBreaker?.failureThreshold || 5,
                recoveryTimeoutMs: this.config.circuitBreaker?.recoveryTimeoutMs || 30000,
            });
        }
        // 设置熔断器事件监听
        this.circuitBreakerManager.getAllStats().forEach(({ provider }) => {
            const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
            breaker.on('stateChange', event => {
                this.metrics.recordCircuitBreakerEvent(event);
            });
        });
        this.initialized = true;
    }
    /**
     * 获取所有可用模型
     */
    async getModels() {
        const allModels = [];
        for (const adapter of this.adapters.values()) {
            const models = await adapter.getModels();
            allModels.push(...models);
        }
        return allModels;
    }
    /**
     * 获取特定模型信息
     */
    async getModelInfo(modelId) {
        for (const adapter of this.adapters.values()) {
            const info = await adapter.getModelInfo(modelId);
            if (info)
                return info;
        }
        return null;
    }
    /**
     * 执行聊天完成
     */
    async chatCompletion(request, preferredProvider) {
        this.ensureInitialized();
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 确定使用哪个提供商
        let provider;
        let model;
        if (preferredProvider && this.adapters.has(preferredProvider)) {
            provider = preferredProvider;
            model = request.model;
        }
        else {
            // 使用路由器选择
            const availableProviders = this.getAvailableProviders();
            const decision = this.router.route(request, availableProviders);
            provider = decision.provider;
            model = decision.model;
        }
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            throw new Error(`No adapter available for provider: ${provider}`);
        }
        const context = {
            requestId,
            provider,
            model,
            startTime: new Date(),
            routingStrategy: this.router.getConfig().strategy,
        };
        // 记录请求开始
        this.metrics.recordRequestStart(requestId, provider, model);
        try {
            // 使用熔断器执行
            const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
            const response = await breaker.execute(() => adapter.chatCompletion({ ...request, model }, context));
            // 计算成本
            const cost = adapter.calculateCost(model, response.usage.promptTokens, response.usage.completionTokens);
            // 记录指标
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: true,
                tokenUsage: {
                    input: response.usage.promptTokens,
                    output: response.usage.completionTokens,
                    total: response.usage.totalTokens,
                },
                costUsd: cost,
            });
            return response;
        }
        catch (error) {
            // 记录失败指标
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: false,
                errorType: error instanceof Error ? error.name : 'unknown',
                tokenUsage: { input: 0, output: 0, total: 0 },
                costUsd: 0,
            });
            // 尝试降级
            const fallbackResult = await this.tryFallback(request, error);
            if (fallbackResult.success && fallbackResult.response) {
                return fallbackResult.response;
            }
            throw error;
        }
        finally {
            this.metrics.recordRequestEnd(requestId, provider, model);
        }
    }
    /**
     * 执行流式聊天完成
     */
    async streamChatCompletion(request, onChunk, preferredProvider) {
        this.ensureInitialized();
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 确定使用哪个提供商
        let provider;
        let model;
        if (preferredProvider && this.adapters.has(preferredProvider)) {
            provider = preferredProvider;
            model = request.model;
        }
        else {
            const availableProviders = this.getAvailableProviders();
            const decision = this.router.route(request, availableProviders);
            provider = decision.provider;
            model = decision.model;
        }
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            throw new Error(`No adapter available for provider: ${provider}`);
        }
        const context = {
            requestId,
            provider,
            model,
            startTime: new Date(),
            routingStrategy: this.router.getConfig().strategy,
        };
        this.metrics.recordRequestStart(requestId, provider, model);
        try {
            const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
            await breaker.execute(() => adapter.streamChatCompletion({ ...request, model }, context, onChunk));
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: true,
                tokenUsage: { input: 0, output: 0, total: 0 }, // 流式请求token在回调中统计
                costUsd: 0,
            });
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: false,
                errorType: error instanceof Error ? error.name : 'unknown',
                tokenUsage: { input: 0, output: 0, total: 0 },
                costUsd: 0,
            });
            throw error;
        }
        finally {
            this.metrics.recordRequestEnd(requestId, provider, model);
        }
    }
    /**
     * 执行嵌入请求
     */
    async createEmbedding(request, preferredProvider) {
        return this.embeddings(request, preferredProvider);
    }
    /**
     * 简单补全接口（用于兼容旧代码）
     */
    async complete(prompt, options) {
        const provider = options?.provider || 'claude';
        const response = await this.chatCompletion({
            model: 'claude-sonnet-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? 0.3,
            maxTokens: options?.maxTokens ?? 2000,
        }, provider);
        return {
            content: response.choices[0]?.message?.content || '',
            provider,
        };
    }
    /**
     * 执行嵌入请求
     */
    async embeddings(request, preferredProvider) {
        this.ensureInitialized();
        const startTime = Date.now();
        const requestId = `emb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 选择支持embeddings的提供商
        let provider;
        let model;
        if (preferredProvider && this.adapters.has(preferredProvider)) {
            provider = preferredProvider;
            model = request.model;
        }
        else {
            // 默认使用OpenAI做embeddings
            provider = 'openai';
            model = request.model || 'text-embedding-3-small';
        }
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            throw new Error(`No adapter available for provider: ${provider}`);
        }
        const context = {
            requestId,
            provider,
            model,
            startTime: new Date(),
            routingStrategy: 'direct',
        };
        try {
            const response = await adapter.embeddings({ ...request, model }, context);
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: true,
                tokenUsage: {
                    input: response.usage.promptTokens,
                    output: 0,
                    total: response.usage.totalTokens,
                },
                costUsd: 0,
            });
            return response;
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            this.recordMetrics({
                requestId,
                provider,
                model,
                latencyMs,
                success: false,
                errorType: error instanceof Error ? error.name : 'unknown',
                tokenUsage: { input: 0, output: 0, total: 0 },
                costUsd: 0,
            });
            throw error;
        }
    }
    /**
     * 设置路由策略
     */
    setRoutingStrategy(strategy) {
        this.router.updateConfig({ strategy });
    }
    /**
     * 获取指标服务
     */
    getMetrics() {
        return this.metrics;
    }
    /**
     * 获取熔断器管理器
     */
    getCircuitBreakerManager() {
        return this.circuitBreakerManager;
    }
    /**
     * 获取路由器
     */
    getRouter() {
        return this.router;
    }
    /**
     * 关闭服务，清理资源
     */
    async shutdown() {
        this.adapters.clear();
        this.initialized = false;
    }
    /**
     * 获取健康状态
     */
    async getHealth() {
        const results = [];
        for (const [provider, adapter] of this.adapters.entries()) {
            const healthy = await adapter.healthCheck();
            results.push({ provider, healthy });
        }
        const healthyCount = results.filter(r => r.healthy).length;
        let status;
        if (results.length === 0) {
            status = 'unhealthy';
        }
        else if (healthyCount === results.length) {
            status = 'healthy';
        }
        else if (healthyCount > 0) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return { status, providers: results };
    }
    getAvailableProviders() {
        return Array.from(this.adapters.keys()).filter(provider => {
            const breaker = this.circuitBreakerManager.getCircuitBreaker(provider);
            return breaker.canExecute();
        });
    }
    async tryFallback(request, error) {
        try {
            const availableProviders = this.getAvailableProviders();
            const models = new Map();
            // Build models map from registered models
            for (const provider of this.adapters.keys()) {
                try {
                    const adapterModels = await this.adapters.get(provider).getModels();
                    for (const m of adapterModels) {
                        models.set(m.id, m);
                    }
                }
                catch {
                    // Skip provider if getModels fails
                }
            }
            const context = {
                availableProviders,
                models,
                attemptCount: 0,
                originalProvider: this.detectProvider(request.model),
            };
            const result = await this.fallbackChain.execute(request, error, context);
            if (result.success) {
                // If the result suggests a different model/provider, make a new call
                if (result.model && result.provider && !result.response) {
                    try {
                        const adapter = this.adapters.get(result.provider);
                        if (adapter) {
                            const response = await adapter.chatCompletion({
                                ...request,
                                model: result.model,
                            });
                            return {
                                success: true,
                                response,
                                strategy: result.strategy,
                                provider: result.provider,
                                model: result.model,
                                message: result.message,
                            };
                        }
                    }
                    catch {
                        // Fallback call also failed
                    }
                }
            }
            return result;
        }
        catch (fallbackError) {
            return {
                success: false,
                strategy: 'none',
                message: `Fallback failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
            };
        }
    }
    detectProvider(model) {
        if (model.includes('claude'))
            return 'claude';
        if (model.includes('ernie') || model.includes('wenxin'))
            return 'wenxin';
        return 'openai';
    }
    recordMetrics(metrics) {
        this.metrics.recordRequest(metrics);
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('LLMService not initialized. Call initialize() first.');
        }
    }
}
// Add generateText method to LLMService prototype
LLMService.prototype.generateText = async function (prompt, options = {}) {
    const startTime = Date.now();
    const response = await this.chatCompletion({
        model: options.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
    }, options.provider);
    const text = response.choices[0]?.message?.content || '';
    const provider = response.model.includes('claude')
        ? 'claude'
        : response.model.includes('ernie')
            ? 'wenxin'
            : 'openai';
    const latencyMs = Date.now() - startTime;
    // Calculate actual cost using the adapter
    let cost = 0;
    const adaptersMap = this.adapters;
    const adapter = adaptersMap?.get(provider);
    if (adapter) {
        cost = adapter.calculateCost(response.model, response.usage.promptTokens, response.usage.completionTokens);
    }
    return {
        text,
        provider,
        model: response.model,
        latencyMs,
        cost,
        usage: {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
        },
    };
};
// Export singleton instance
export const llmService = new LLMService({
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        apiUrl: process.env.OPENAI_API_URL,
    },
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        apiUrl: process.env.CLAUDE_API_URL,
    },
    wenxin: {
        apiKey: process.env.WENXIN_API_KEY || '',
        secretKey: process.env.WENXIN_SECRET_KEY || '',
        apiUrl: process.env.WENXIN_API_URL,
    },
});
//# sourceMappingURL=llmService.js.map