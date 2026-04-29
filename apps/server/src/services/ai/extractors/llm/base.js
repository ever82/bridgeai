/**
 * Scene-Specific Extractors
 * 场景特定提取器 - 为不同业务场景提供专门的需求提取能力
 */
import { llmService } from '../../llmService';
import { logger } from '../../../../utils/logger';
/**
 * Base Scene Extractor
 * 场景提取器基类
 */
export class BaseSceneExtractor {
    version = '1.0.0';
    getSceneType() {
        return this.sceneType;
    }
    validateExtraction(demand) {
        const missingFields = [];
        const structured = demand.structured || {};
        for (const field of this.requiredFields) {
            const value = this.getNestedValue(structured, field);
            if (value === undefined ||
                value === null ||
                (typeof value === 'object' && Object.keys(value).length === 0) ||
                (Array.isArray(value) && value.length === 0)) {
                missingFields.push(field);
            }
        }
        return {
            valid: missingFields.length === 0,
            missingFields,
        };
    }
    getNestedValue(obj, path) {
        return path
            .split('.')
            .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj);
    }
    async callLLM(prompt, options = {}) {
        const startTime = Date.now();
        const response = await llmService.generateText(prompt, {
            temperature: options.temperature ?? 0.3,
            maxTokens: options.maxTokens ?? 1000,
        });
        return {
            text: response.text,
            provider: response.provider,
            model: response.model,
            latencyMs: Date.now() - startTime,
        };
    }
    parseJSONResponse(text, defaultValue) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return defaultValue;
            }
            return JSON.parse(jsonMatch[0]);
        }
        catch (error) {
            logger.error('Failed to parse JSON response', { error, text });
            return defaultValue;
        }
    }
    buildBaseDemand(rawText, scene) {
        return {
            rawText,
            scene,
            intent: {
                intent: 'create_demand',
                confidence: 1.0,
                alternatives: [],
            },
            entities: [],
            structured: {
                title: undefined,
                description: rawText,
                location: {},
                time: {},
                people: {},
                budget: {},
                requirements: [],
                preferences: [],
                constraints: [],
            },
            confidence: 0,
            clarificationNeeded: false,
            clarificationQuestions: [],
            metadata: {
                processedAt: new Date(),
                provider: 'openai',
                model: 'gpt-4',
                latencyMs: 0,
                version: this.version,
            },
        };
    }
}
//# sourceMappingURL=base.js.map