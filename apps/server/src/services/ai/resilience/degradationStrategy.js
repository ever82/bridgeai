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
export var DegradationLevel;
(function (DegradationLevel) {
    DegradationLevel[DegradationLevel["NORMAL"] = 0] = "NORMAL";
    DegradationLevel[DegradationLevel["L1_BACKUP_MODEL"] = 1] = "L1_BACKUP_MODEL";
    DegradationLevel[DegradationLevel["L2_LOW_COST_MODEL"] = 2] = "L2_LOW_COST_MODEL";
    DegradationLevel[DegradationLevel["L3_TEMPLATE"] = 3] = "L3_TEMPLATE";
    DegradationLevel[DegradationLevel["L4_ASYNC_QUEUE"] = 4] = "L4_ASYNC_QUEUE";
    DegradationLevel[DegradationLevel["L5_UNAVAILABLE"] = 5] = "L5_UNAVAILABLE";
})(DegradationLevel || (DegradationLevel = {}));
/**
 * L1: Switch to backup model from same provider
 */
class BackupModelHandler {
    level = DegradationLevel.L1_BACKUP_MODEL;
    name = 'backup-model';
    description = 'Switch to backup model from same provider';
    async handle(request, context) {
        const currentModel = context.models.get(request.model);
        if (!currentModel) {
            return {
                success: false,
                level: this.level,
                strategy: this.name,
                message: 'Current model not found in registry',
            };
        }
        // Find alternative model from same provider
        const alternatives = Array.from(context.models.values())
            .filter(m => m.provider === currentModel.provider &&
            m.id !== currentModel.id &&
            m.capabilities.chatCompletion)
            .sort((a, b) => b.qualityScore - a.qualityScore);
        if (alternatives.length === 0) {
            return {
                success: false,
                level: this.level,
                strategy: this.name,
                message: 'No backup model available',
            };
        }
        const backup = alternatives[0];
        return {
            success: true,
            level: this.level,
            strategy: this.name,
            provider: backup.provider,
            model: backup.id,
            message: `L1: Switched from ${request.model} to ${backup.id}`,
        };
    }
}
/**
 * L2: Switch to low-cost model across providers
 */
class LowCostModelHandler {
    level = DegradationLevel.L2_LOW_COST_MODEL;
    name = 'low-cost-model';
    description = 'Switch to lower cost model across providers';
    async handle(request, context) {
        const currentCost = this.getModelCost(request.model, context.models);
        // Find the cheapest model across all available providers
        const candidates = Array.from(context.models.values())
            .filter(m => m.capabilities.chatCompletion &&
            context.availableProviders.includes(m.provider) &&
            this.getModelCost(m.id, context.models) < currentCost)
            .sort((a, b) => a.costPer1KTokens.input +
            a.costPer1KTokens.output -
            (b.costPer1KTokens.input + b.costPer1KTokens.output));
        if (candidates.length === 0) {
            return {
                success: false,
                level: this.level,
                strategy: this.name,
                message: 'No lower cost model available',
            };
        }
        const model = candidates[0];
        return {
            success: true,
            level: this.level,
            strategy: this.name,
            provider: model.provider,
            model: model.id,
            message: `L2: Switched to low-cost model ${model.id}`,
        };
    }
    getModelCost(modelId, models) {
        const model = models.get(modelId);
        if (!model)
            return Infinity;
        return model.costPer1KTokens.input + model.costPer1KTokens.output;
    }
}
/**
 * L3: Fall back to template responses
 */
class TemplateResponseHandler {
    level = DegradationLevel.L3_TEMPLATE;
    name = 'template-response';
    description = 'Fall back to template responses';
    async handle(request, context) {
        const scene = context.scene ?? 'general';
        const intent = context.intent ?? 'degradation';
        const variables = context.variables ?? {};
        const result = context.templateService.renderMatch(scene, intent, variables);
        if (!result) {
            // Try generic degradation template
            const fallback = context.templateService.render('degradation-partial', {
                original_summary: '你的请求已记录',
            });
            if (!fallback) {
                return {
                    success: false,
                    level: this.level,
                    strategy: this.name,
                    message: 'No suitable template found',
                };
            }
            return {
                success: true,
                level: this.level,
                strategy: this.name,
                response: fallback,
                message: 'L3: Using generic degradation template',
            };
        }
        return {
            success: true,
            level: this.level,
            strategy: this.name,
            response: result,
            message: `L3: Using template ${result._meta.templateId}`,
        };
    }
}
/**
 * L4: Queue request for async processing
 */
class AsyncQueueHandler {
    level = DegradationLevel.L4_ASYNC_QUEUE;
    name = 'async-queue';
    description = 'Queue request for async processing';
    async handle(request, context) {
        const job = await context.queueService.enqueue(request, {
            scene: context.scene,
            intent: context.intent,
            priority: 'normal',
        });
        return {
            success: true,
            level: this.level,
            strategy: this.name,
            jobId: job.id,
            response: {
                id: `async-${job.id}`,
                model: request.model,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: '你的请求已加入异步处理队列，稍后将通过通知返回结果。',
                        },
                        finishReason: 'stop',
                    },
                ],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                createdAt: new Date(),
            },
            message: `L4: Request queued as job ${job.id}`,
        };
    }
}
/**
 * L5: Service completely unavailable
 */
class UnavailableHandler {
    level = DegradationLevel.L5_UNAVAILABLE;
    name = 'unavailable';
    description = 'Service completely unavailable';
    async handle(_request, _context) {
        return {
            success: false,
            level: this.level,
            strategy: this.name,
            message: 'L5: AI服务暂时完全不可用，请稍后重试',
        };
    }
}
/**
 * Degradation Strategy
 * Main class that manages the degradation level chain
 */
export class DegradationStrategy extends EventEmitter {
    handlers = new Map();
    currentLevel = DegradationLevel.NORMAL;
    constructor() {
        super();
        this.handlers.set(DegradationLevel.L1_BACKUP_MODEL, new BackupModelHandler());
        this.handlers.set(DegradationLevel.L2_LOW_COST_MODEL, new LowCostModelHandler());
        this.handlers.set(DegradationLevel.L3_TEMPLATE, new TemplateResponseHandler());
        this.handlers.set(DegradationLevel.L4_ASYNC_QUEUE, new AsyncQueueHandler());
        this.handlers.set(DegradationLevel.L5_UNAVAILABLE, new UnavailableHandler());
    }
    /**
     * Execute degradation from the specified level
     */
    async execute(request, context, startLevel = DegradationLevel.L1_BACKUP_MODEL) {
        for (let level = startLevel; level <= DegradationLevel.L5_UNAVAILABLE; level++) {
            const handler = this.handlers.get(level);
            if (!handler)
                continue;
            try {
                const result = await handler.handle(request, context);
                this.emit('degradationAttempt', {
                    level,
                    handler: handler.name,
                    success: result.success,
                });
                if (result.success) {
                    this.currentLevel = level;
                    this.emit('degraded', {
                        level,
                        handler: handler.name,
                        message: result.message,
                    });
                    return result;
                }
            }
            catch (error) {
                this.emit('degradationError', {
                    level,
                    handler: handler.name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        // All levels failed
        this.currentLevel = DegradationLevel.L5_UNAVAILABLE;
        return {
            success: false,
            level: DegradationLevel.L5_UNAVAILABLE,
            strategy: 'all-failed',
            message: 'All degradation levels exhausted',
        };
    }
    /**
     * Get current degradation level
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    /**
     * Reset to normal level
     */
    reset() {
        this.currentLevel = DegradationLevel.NORMAL;
        this.emit('recovered', { level: DegradationLevel.NORMAL });
    }
    /**
     * Set degradation level directly
     */
    setLevel(level) {
        const oldLevel = this.currentLevel;
        this.currentLevel = level;
        this.emit('levelChanged', { from: oldLevel, to: level });
    }
    /**
     * Get handler for a specific level
     */
    getHandler(level) {
        return this.handlers.get(level);
    }
    /**
     * Get all registered levels
     */
    getRegisteredLevels() {
        return Array.from(this.handlers.keys()).sort((a, b) => a - b);
    }
}
export const degradationStrategy = new DegradationStrategy();
//# sourceMappingURL=degradationStrategy.js.map