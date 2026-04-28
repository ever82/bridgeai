/**
 * LLM Router
 * 智能路由与负载均衡
 */
import { LLMProvider, ModelInfo, RoutingConfig, ChatCompletionRequest } from './types';
interface ProviderHealth {
    provider: LLMProvider;
    healthy: boolean;
    latencyMs: number;
    averageLatencyMs: number;
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
export declare class LLMRouter {
    private config;
    private models;
    private providerHealth;
    private roundRobinIndex;
    private providerWeights;
    private activeConnections;
    private healthCheckInterval;
    private healthCheckIntervalMs;
    private providerLatencies;
    constructor(config?: Partial<RoutingConfig>);
    /**
     * 注册模型
     */
    registerModel(model: ModelInfo): void;
    /**
     * 更新提供商健康状态
     */
    updateProviderHealth(health: ProviderHealth): void;
    /**
     * 设置提供商权重（用于加权负载均衡）
     */
    setProviderWeight(provider: LLMProvider, weight: number): void;
    /**
     * 路由决策
     */
    route(request: ChatCompletionRequest, availableProviders: LLMProvider[]): RoutingDecision;
    /**
     * 根据成本路由
     * 选择最便宜的模型
     */
    private routeByCost;
    /**
     * 根据延迟路由
     * 选择延迟最低的模型
     */
    private routeByLatency;
    /**
     * 根据质量路由
     * 选择质量分数最高的模型
     */
    private routeByQuality;
    /**
     * 轮询路由
     */
    private routeByRoundRobin;
    /**
     * 加权路由
     */
    private routeByWeighted;
    /**
     * 最小连接数路由
     * 选择活跃连接数最少的提供商
     */
    private routeByLeastConnections;
    /**
     * 释放连接
     * 当请求完成时调用
     */
    releaseConnection(provider: LLMProvider): void;
    /**
     * 根据模型能力匹配路由
     */
    routeByCapabilities(requiredCapabilities: {
        chatCompletion?: boolean;
        embeddings?: boolean;
        streaming?: boolean;
        maxTokens?: number;
    }, availableProviders: LLMProvider[]): RoutingDecision[];
    /**
     * 根据语言支持路由
     */
    routeByLanguage(language: string, availableProviders: LLMProvider[]): RoutingDecision[];
    /**
     * 获取配置
     */
    getConfig(): RoutingConfig;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<RoutingConfig>): void;
    /**
     * 获取健康状态摘要
     */
    getHealthSummary(): {
        total: number;
        healthy: number;
        unhealthy: number;
        details: ProviderHealth[];
    };
    /**
     * 启动健康检查
     * 定期探测提供商健康状态
     * @param providers 要检查的提供商列表
     * @param probeFn 探测函数，返回延迟(ms)，失败时抛出异常
     */
    startHealthCheck(providers: LLMProvider[], probeFn: (provider: LLMProvider) => Promise<number>): void;
    /**
     * 停止健康检查
     */
    stopHealthCheck(): void;
    /**
     * 获取提供商的平均延迟
     * @param provider 提供商
     * @returns 平均延迟(ms)，无数据时返回0
     */
    getAverageLatency(provider: LLMProvider): number;
    /**
     * 重置轮询计数器
     */
    resetRoundRobin(): void;
    private getModelsForProviders;
    private getHealthyProviders;
}
export {};
//# sourceMappingURL=llmRouter.d.ts.map