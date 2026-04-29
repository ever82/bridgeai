/**
 * Base LLM Adapter Interface
 * 所有LLM提供商适配器的基础接口
 */
/**
 * 抽象基础适配器类
 * 提供通用的适配器功能
 */
export class BaseLLMAdapter {
    initialized = false;
    models = new Map();
    async initialize() {
        await this.loadModels();
        this.initialized = true;
    }
    async healthCheck() {
        try {
            const models = await this.getModels();
            return models.length > 0;
        }
        catch {
            return false;
        }
    }
    async getModels() {
        return Array.from(this.models.values());
    }
    async getModelInfo(modelId) {
        return this.models.get(modelId) || null;
    }
    generateRequestId() {
        return `${this.provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    estimateTokens(text) {
        // 简单估算：英文约4字符/token，中文约1.5字符/token
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;
        return Math.ceil(chineseChars / 1.5 + otherChars / 4);
    }
}
//# sourceMappingURL=base.js.map