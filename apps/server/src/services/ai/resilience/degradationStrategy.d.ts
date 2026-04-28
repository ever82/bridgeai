/**
 * Degradation Strategy
 * 降级层级策略 - 5级降级方案
 *
 * L1: 主模型 -> 备用模型 (same provider)
 * L2: 高质量 -> 低成本模型 (cross provider)
 * L3: AI生成 -> 模板回复
 * L4: 实时 -> 异步队列
 * L5: 服务完全不可用提示
 */
import { EventEmitter } from 'events';
import { ChatCompletionRequest, ChatCompletionResponse, LLMProvider, ModelInfo } from '../types';
import { AIResponseCacheService } from './responseCacheService';
import { TemplateResponseService } from './templateResponseService';
import { AIAsyncQueueService } from './asyncQueueService';
export declare enum DegradationLevel {
    NORMAL = 0,// 正常服务
    L1_BACKUP_MODEL = 1,// 主模型 -> 备用模型
    L2_LOW_COST_MODEL = 2,// 高质量 -> 低成本模型
    L3_TEMPLATE = 3,// AI -> 模板回复
    L4_ASYNC_QUEUE = 4,// 实时 -> 异步队列
    L5_UNAVAILABLE = 5
}
export interface DegradationLevelHandler {
    level: DegradationLevel;
    name: string;
    description: string;
    handle(request: ChatCompletionRequest, context: DegradationContext): Promise<DegradationResult>;
}
export interface DegradationContext {
    availableProviders: LLMProvider[];
    models: Map<string, ModelInfo>;
    cache: AIResponseCacheService;
    templateService: TemplateResponseService;
    queueService: AIAsyncQueueService;
    scene?: string;
    intent?: string;
    variables?: Record<string, string>;
    error?: Error;
}
export interface DegradationResult {
    success: boolean;
    response?: ChatCompletionResponse;
    level: DegradationLevel;
    strategy: string;
    model?: string;
    provider?: LLMProvider;
    message: string;
    jobId?: string;
}
/**
 * Degradation Strategy
 * Main class that manages the degradation level chain
 */
export declare class DegradationStrategy extends EventEmitter {
    private handlers;
    private currentLevel;
    constructor();
    /**
     * Execute degradation from the specified level
     */
    execute(request: ChatCompletionRequest, context: DegradationContext, startLevel?: DegradationLevel): Promise<DegradationResult>;
    /**
     * Get current degradation level
     */
    getCurrentLevel(): DegradationLevel;
    /**
     * Reset to normal level
     */
    reset(): void;
    /**
     * Set degradation level directly
     */
    setLevel(level: DegradationLevel): void;
    /**
     * Get handler for a specific level
     */
    getHandler(level: DegradationLevel): DegradationLevelHandler | undefined;
    /**
     * Get all registered levels
     */
    getRegisteredLevels(): DegradationLevel[];
}
export declare const degradationStrategy: DegradationStrategy;
//# sourceMappingURL=degradationStrategy.d.ts.map