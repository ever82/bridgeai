/**
 * Supply to L2 Mapper
 * 供给结构化映射系统
 * 将提取的供给字段映射到 AgentL2Model 属性
 */
import { L2FieldType } from '@bridgeai/shared';
import { logger } from '../../../utils/logger';
// Capability level to numeric score mapping
const CAPABILITY_LEVEL_SCORE = {
    beginner: 25,
    intermediate: 50,
    advanced: 75,
    expert: 100,
};
/**
 * Map capability level to L2-compatible value
 */
function mapCapabilityLevel(level) {
    const levelMap = {
        beginner: 'junior',
        intermediate: 'mid',
        advanced: 'senior',
        expert: 'expert',
    };
    return levelMap[level] || 'mid';
}
/**
 * Supply to L2 Mapper Class
 * 供给到L2模型映射器
 */
export class SupplyToL2Mapper {
    sceneConfigs = new Map();
    /**
     * Map Supply to L2 Data
     * 将提取的供给映射到L2数据结构
     */
    map(supply, schema) {
        const startTime = Date.now();
        const result = {
            success: true,
            data: {},
            mappedFields: [],
            unmappedFields: [],
            inferredFields: [],
            conflicts: [],
            transformations: [],
            generatedTags: [],
        };
        try {
            logger.info('Starting supply to L2 mapping', {
                scene: schema.scene,
                fieldCount: schema.fields.length,
            });
            const sceneConfig = this.sceneConfigs.get(schema.scene);
            for (const field of schema.fields) {
                const mapping = this.mapField(field, supply, sceneConfig);
                if (mapping.mapped) {
                    result.data[field.id] = mapping.value;
                    result.mappedFields.push(field.id);
                    if (mapping.transformed) {
                        result.transformations.push({
                            field: field.id,
                            originalValue: mapping.originalValue,
                            transformedValue: mapping.value,
                            transformation: mapping.transformation || 'unknown',
                        });
                    }
                    if (mapping.inferred) {
                        result.inferredFields.push(field.id);
                    }
                }
                else if (field.required) {
                    result.unmappedFields.push(field.id);
                }
            }
            // Generate tags from capabilities, skills, and qualifications
            result.generatedTags = this.generateTags(supply);
            logger.info('Supply to L2 mapping completed', {
                scene: schema.scene,
                mappedCount: result.mappedFields.length,
                tagCount: result.generatedTags.length,
                latencyMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            logger.error('Supply to L2 mapping failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                scene: schema.scene,
            });
            result.success = false;
            return result;
        }
    }
    /**
     * Map a single field
     */
    mapField(field, supply, sceneConfig) {
        // Try scene-specific mapping first
        if (sceneConfig?.fieldMappings[field.id]) {
            const sourceField = sceneConfig.fieldMappings[field.id];
            const value = this.getValueFromSupply(supply, sourceField);
            if (value !== undefined && value !== null) {
                const transformed = this.transformValue(value, field, sceneConfig);
                return {
                    mapped: true,
                    value: transformed,
                    transformed: transformed !== value,
                    originalValue: value,
                    transformation: field.type,
                };
            }
        }
        // Try default field mapping
        const defaultValue = this.getDefaultFieldValue(field.id, supply);
        if (defaultValue !== undefined) {
            const transformed = this.transformValue(defaultValue, field, sceneConfig);
            return {
                mapped: true,
                value: transformed,
                transformed: transformed !== defaultValue,
                originalValue: defaultValue,
                transformation: field.type,
            };
        }
        // Try capability-based mapping
        const capabilityValue = this.getValueFromCapabilities(field, supply.capabilities);
        if (capabilityValue !== undefined) {
            const transformed = this.transformValue(capabilityValue, field, sceneConfig);
            return {
                mapped: true,
                value: transformed,
                transformed: transformed !== capabilityValue,
                originalValue: capabilityValue,
                transformation: field.type,
            };
        }
        // Try to infer value
        const inferredValue = this.inferFieldValue(field, supply);
        if (inferredValue !== undefined) {
            const transformed = this.transformValue(inferredValue, field, sceneConfig);
            return {
                mapped: true,
                value: transformed,
                transformed: transformed !== inferredValue,
                originalValue: inferredValue,
                transformation: 'inferred',
                inferred: true,
            };
        }
        return { mapped: false };
    }
    /**
     * Get value from supply structured data
     */
    getValueFromSupply(supply, path) {
        const parts = path.split('.');
        let value = supply;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    /**
     * Get default field value mapping
     */
    getDefaultFieldValue(fieldId, supply) {
        const fieldMappings = {
            title: s => s.title || undefined,
            description: s => s.description || '',
            serviceType: s => s.serviceType,
            skills: s => (s.skills?.length ? s.skills : undefined),
            priceMin: s => s.pricing?.minRate,
            priceMax: s => s.pricing?.maxRate,
            priceCurrency: s => s.pricing?.currency || 'CNY',
            priceType: s => s.pricing?.type,
            priceUnit: s => s.pricing?.unit,
            priceRange: s => {
                const p = s.pricing;
                if (p?.minRate !== undefined && p?.maxRate !== undefined) {
                    return { min: p.minRate, max: p.maxRate };
                }
                return undefined;
            },
            locationCity: s => s.location?.city,
            locationCountry: s => s.location?.country,
            locationRemote: s => s.location?.remote,
            locationOnsite: s => s.location?.onsite,
            locationHybrid: s => s.location?.hybrid,
            experienceYears: s => s.experience?.years,
            totalProjects: s => s.experience?.totalProjects,
            relevantProjects: s => s.experience?.relevantProjects,
            certifications: s => s.experience?.certifications?.length ? s.experience.certifications : undefined,
            availabilitySchedule: s => s.availability?.schedule,
            availabilityTimezone: s => s.availability?.timezone,
            responseTime: s => s.availability?.responseTime,
            qualityScore: s => s.quality?.overallScore,
            qualityConfidence: s => s.quality?.confidence,
            qualityCompleteness: s => s.quality?.completenessScore,
            capabilities: s => s.capabilities?.length
                ? s.capabilities.map(c => ({
                    name: c.name,
                    level: mapCapabilityLevel(c.level),
                    category: c.category,
                    score: CAPABILITY_LEVEL_SCORE[c.level] || 50,
                }))
                : undefined,
        };
        const mapper = fieldMappings[fieldId];
        return mapper ? mapper(supply) : undefined;
    }
    /**
     * Get value from capabilities
     */
    getValueFromCapabilities(field, capabilities) {
        if (!capabilities || capabilities.length === 0)
            return undefined;
        const entityTypeMap = {
            serviceSkills: 'capability',
            expertiseLevel: 'capability',
            specializations: 'capability',
            keywords: 'capability',
        };
        const entityType = entityTypeMap[field.id];
        if (!entityType)
            return undefined;
        // Return best capability (highest level)
        const best = capabilities.reduce((best, current) => {
            const bestScore = CAPABILITY_LEVEL_SCORE[best.level] || 50;
            const currentScore = CAPABILITY_LEVEL_SCORE[current.level] || 50;
            return currentScore > bestScore ? current : best;
        });
        return best.name;
    }
    /**
     * Transform value based on field type
     */
    transformValue(value, field, sceneConfig) {
        if (value === undefined || value === null) {
            return field.defaultValue;
        }
        switch (field.type) {
            case L2FieldType.NUMBER:
                return this.transformNumber(value, field);
            case L2FieldType.ENUM:
                return this.transformEnum(value, field, sceneConfig);
            case L2FieldType.MULTI_SELECT:
                return this.transformMultiSelect(value, field, sceneConfig);
            case L2FieldType.RANGE:
                return this.transformRange(value, field);
            case L2FieldType.BOOLEAN:
                return this.transformBoolean(value);
            case L2FieldType.DATE:
            case L2FieldType.DATETIME:
                return this.transformDateTime(value);
            case L2FieldType.TEXT:
            case L2FieldType.LONG_TEXT:
                return this.transformText(value, field);
            default:
                return value;
        }
    }
    /**
     * Transform number value
     */
    transformNumber(value, field) {
        let num;
        if (typeof value === 'number') {
            num = value;
        }
        else if (typeof value === 'string') {
            const match = value.match(/(\d+(?:\.\d+)?)/);
            num = match ? parseFloat(match[1]) : NaN;
        }
        else {
            return undefined;
        }
        if (isNaN(num))
            return undefined;
        if (field.min !== undefined && num < field.min) {
            return field.min;
        }
        if (field.max !== undefined && num > field.max) {
            return field.max;
        }
        return num;
    }
    /**
     * Transform enum value
     */
    transformEnum(value, field, sceneConfig) {
        if (!field.options)
            return undefined;
        const valueStr = String(value).toLowerCase().trim();
        const validValues = field.options.map(o => o.value);
        if (validValues.includes(valueStr)) {
            return valueStr;
        }
        // Check scene-specific enum mappings
        if (sceneConfig?.enumMappings[field.id]) {
            const mapped = sceneConfig.enumMappings[field.id][valueStr];
            if (mapped && validValues.includes(mapped)) {
                return mapped;
            }
        }
        // Fuzzy match by label
        const option = field.options.find(o => o.label.toLowerCase().includes(valueStr) || valueStr.includes(o.label.toLowerCase()));
        return option?.value;
    }
    /**
     * Transform multi-select value
     */
    transformMultiSelect(value, field, sceneConfig) {
        if (!field.options)
            return undefined;
        const values = Array.isArray(value) ? value : [value];
        const validValues = field.options.map(o => o.value);
        const result = [];
        for (const v of values) {
            const vStr = String(v).toLowerCase().trim();
            if (validValues.includes(vStr)) {
                result.push(vStr);
                continue;
            }
            if (sceneConfig?.enumMappings[field.id]?.[vStr]) {
                const mapped = sceneConfig.enumMappings[field.id][vStr];
                if (validValues.includes(mapped)) {
                    result.push(mapped);
                }
                continue;
            }
            const option = field.options.find(o => o.label.toLowerCase().includes(vStr) || vStr.includes(o.label.toLowerCase()));
            if (option) {
                result.push(option.value);
            }
        }
        return result.length > 0 ? result : undefined;
    }
    /**
     * Transform range value
     */
    transformRange(value, field) {
        if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
            return {
                min: Math.max(field.min ?? 0, Number(value.min) || 0),
                max: Math.min(field.max ?? Infinity, Number(value.max) || Infinity),
            };
        }
        if (typeof value === 'number') {
            return { min: 0, max: value };
        }
        if (typeof value === 'string') {
            const rangeMatch = value.match(/(\d+)\s*[-~到至]\s*(\d+)/);
            if (rangeMatch) {
                return {
                    min: Math.max(field.min ?? 0, parseInt(rangeMatch[1], 10)),
                    max: Math.min(field.max ?? Infinity, parseInt(rangeMatch[2], 10)),
                };
            }
            const singleMatch = value.match(/(\d+)/);
            if (singleMatch) {
                return { min: 0, max: parseInt(singleMatch[1], 10) };
            }
        }
        return undefined;
    }
    /**
     * Transform boolean value
     */
    transformBoolean(value) {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'string') {
            const truthy = ['true', 'yes', '是', '对', '1', 'y'];
            const falsy = ['false', 'no', '否', '不对', '0', 'n'];
            const lower = value.toLowerCase().trim();
            if (truthy.includes(lower))
                return true;
            if (falsy.includes(lower))
                return false;
        }
        if (typeof value === 'number')
            return value !== 0;
        return undefined;
    }
    /**
     * Transform datetime value
     */
    transformDateTime(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        return String(value);
    }
    /**
     * Transform text value
     */
    transformText(value, field) {
        let text = String(value).trim();
        if (field.minLength !== undefined && text.length < field.minLength) {
            return undefined;
        }
        if (field.maxLength !== undefined && text.length > field.maxLength) {
            text = text.substring(0, field.maxLength);
        }
        return text || undefined;
    }
    /**
     * Infer field value from supply context
     */
    inferFieldValue(field, supply) {
        // Infer service capabilities from description keywords
        if (field.id === 'serviceCategory' || field.id === 'category') {
            const serviceKeywords = supply.description.toLowerCase();
            const categoryKeywords = [
                { keyword: '摄影', value: 'photography' },
                { keyword: '设计', value: 'design' },
                { keyword: '开发', value: 'development' },
                { keyword: '翻译', value: 'translation' },
                { keyword: '写作', value: 'writing' },
                { keyword: '咨询', value: 'consulting' },
            ];
            for (const cat of categoryKeywords) {
                if (serviceKeywords.includes(cat.keyword)) {
                    return cat.value;
                }
            }
        }
        // Infer currency from location
        if (field.id === 'priceCurrency' && !supply.pricing?.currency) {
            return 'CNY';
        }
        // Infer remote capability from service type
        if (field.id === 'locationRemote' && supply.location === undefined) {
            const remoteFriendly = ['development', 'design', 'writing', 'translation', 'consulting'];
            if (remoteFriendly.includes(supply.serviceType?.toLowerCase() || '')) {
                return true;
            }
            return false;
        }
        return undefined;
    }
    /**
     * Generate tags from supply data
     */
    generateTags(supply) {
        const tags = [];
        // Tags from skills
        for (const skill of supply.skills || []) {
            tags.push(skill);
        }
        // Tags from capabilities
        for (const cap of supply.capabilities) {
            tags.push(cap.name);
            if (cap.keywords) {
                for (const kw of cap.keywords.slice(0, 2)) {
                    tags.push(kw);
                }
            }
        }
        // Tags from experience
        if (supply.experience?.certifications) {
            for (const cert of supply.experience.certifications) {
                tags.push(cert);
            }
        }
        // Service type tag
        if (supply.serviceType) {
            tags.push(supply.serviceType);
        }
        // Deduplicate and clean
        const uniqueTags = [...new Set(tags)]
            .filter(t => t && t.length > 0 && t.length < 50)
            .map(t => t.trim());
        return uniqueTags.slice(0, 20); // Limit to 20 tags
    }
    /**
     * Register scene-specific mapping configuration
     */
    registerSceneConfig(config) {
        this.sceneConfigs.set(config.scene, config);
        logger.info(`Registered supply scene mapping config: ${config.scene}`);
    }
    /**
     * Get scene configuration
     */
    getSceneConfig(scene) {
        return this.sceneConfigs.get(scene);
    }
    /**
     * Validate mapping result against schema
     */
    validateMapping(result, schema) {
        for (const field of schema.fields) {
            if (field.required) {
                const value = result.data[field.id];
                if (!this.isValidFieldValue(value)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Check if a field value is valid (non-empty meaningful value)
     */
    isValidFieldValue(value) {
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === 'object') {
            // Check for range object { min, max }
            if ('min' in value && 'max' in value) {
                const range = value;
                return ((range.min !== undefined && range.min !== null) ||
                    (range.max !== undefined && range.max !== null));
            }
            // Empty object
            return Object.keys(value).length > 0;
        }
        // For numbers and booleans, any value is valid
        return true;
    }
}
// Export singleton instance
export const supplyToL2Mapper = new SupplyToL2Mapper();
//# sourceMappingURL=supplyToL2Mapper.js.map