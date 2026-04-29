/**
 * Demand to L2 Mapper
 * 需求结构化映射系统
 * 将提取的需求字段映射到 AgentL2Model 属性
 */
import { L2FieldType } from '@bridgeai/shared';
import { logger } from '../../../utils/logger';
/**
 * Demand to L2 Mapper Class
 * 需求到L2模型映射器
 */
export class DemandToL2Mapper {
    sceneConfigs = new Map();
    defaultRules = [];
    constructor() {
        this.initializeDefaultRules();
    }
    /**
     * Map Demand to L2 Data
     * 将提取的需求映射到L2数据结构
     */
    map(demand, schema) {
        const startTime = Date.now();
        const result = {
            success: true,
            data: {},
            mappedFields: [],
            unmappedFields: [],
            inferredFields: [],
            conflicts: [],
            transformations: [],
        };
        try {
            logger.info('Starting demand to L2 mapping', {
                scene: schema.scene,
                fieldCount: schema.fields.length,
            });
            // Get scene-specific config
            const sceneConfig = this.sceneConfigs.get(schema.scene);
            // Process each schema field
            for (const field of schema.fields) {
                const mapping = this.mapField(field, demand, sceneConfig, result);
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
            // Resolve conflicts
            this.resolveConflicts(result, schema);
            logger.info('Demand to L2 mapping completed', {
                scene: schema.scene,
                mappedCount: result.mappedFields.length,
                conflictCount: result.conflicts.length,
                latencyMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            logger.error('Demand to L2 mapping failed', {
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
    mapField(field, demand, sceneConfig, _result) {
        // Try scene-specific mapping first
        if (sceneConfig?.fieldMappings[field.id]) {
            const sourceField = sceneConfig.fieldMappings[field.id];
            const value = this.getValueFromDemand(demand, sourceField);
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
        const defaultValue = this.getDefaultFieldValue(field.id, demand);
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
        // Try entity-based mapping
        const entityValue = this.getValueFromEntities(field, demand.entities);
        if (entityValue !== undefined) {
            const transformed = this.transformValue(entityValue, field, sceneConfig);
            return {
                mapped: true,
                value: transformed,
                transformed: transformed !== entityValue,
                originalValue: entityValue,
                transformation: field.type,
            };
        }
        // Try matching entities to field options (for ENUM/MULTI_SELECT fields)
        if (field.options && field.options.length > 0) {
            const optionValue = this.matchEntitiesToFieldOptions(field, demand.entities, demand.rawText, sceneConfig);
            if (optionValue !== undefined) {
                return {
                    mapped: true,
                    value: optionValue,
                    transformed: true,
                    originalValue: demand.rawText,
                    transformation: 'entity_option_match',
                };
            }
        }
        // Try to infer value
        const inferredValue = this.inferFieldValue(field, demand);
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
     * Get value from demand structured data
     */
    getValueFromDemand(demand, path) {
        const parts = path.split('.');
        let value = demand.structured;
        for (const part of parts) {
            if (value && typeof value === 'object') {
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
    getDefaultFieldValue(fieldId, demand) {
        const fieldMappings = {
            title: d => d.structured.title || this.generateTitle(d),
            description: d => d.structured.description || d.rawText,
            location: d => d.structured.location?.city || d.structured.location?.address,
            city: d => d.structured.location?.city,
            district: d => d.structured.location?.district,
            address: d => d.structured.location?.address,
            startTime: d => d.structured.time?.startTime,
            endTime: d => d.structured.time?.endTime,
            duration: d => d.structured.time?.duration,
            timeFlexibility: d => d.structured.time?.flexibility,
            peopleCount: d => d.structured.people?.count,
            peopleRoles: d => d.structured.people?.roles,
            budgetMin: d => d.structured.budget?.min,
            budgetMax: d => d.structured.budget?.max,
            budgetCurrency: d => d.structured.budget?.currency || 'CNY',
            priceRange: d => {
                if (d.structured.budget?.min !== undefined && d.structured.budget?.max !== undefined) {
                    return { min: d.structured.budget.min, max: d.structured.budget.max };
                }
                return undefined;
            },
            requirements: d => d.structured.requirements,
            preferences: d => d.structured.preferences,
            constraints: d => d.structured.constraints,
            intent: d => d.intent.intent,
            confidence: d => d.confidence,
            // Common L2 schema field aliases
            budgetRange: d => {
                if (d.structured.budget?.min !== undefined && d.structured.budget?.max !== undefined) {
                    return { min: d.structured.budget.min, max: d.structured.budget.max };
                }
                if (d.structured.budget?.max !== undefined) {
                    return { min: 0, max: d.structured.budget.max };
                }
                return undefined;
            },
            adDescription: d => d.structured.description || d.rawText,
            timeline: d => d.structured.time?.startTime,
            additionalInfo: d => d.rawText,
        };
        const mapper = fieldMappings[fieldId];
        return mapper ? mapper(demand) : undefined;
    }
    /**
     * Get value from entities
     */
    getValueFromEntities(field, entities) {
        const entityTypeMap = {
            location: 'location',
            city: 'location',
            district: 'location',
            address: 'location',
            time: 'time',
            startTime: 'time',
            endTime: 'time',
            duration: 'time',
            people: 'person',
            peopleCount: 'person',
            budget: 'budget',
            budgetMin: 'budget',
            budgetMax: 'budget',
            budgetRange: 'budget',
            requirements: 'requirement',
            preferences: 'preference',
            // Schema-specific field ID to entity type mappings
            timeline: 'time',
            campaignDuration: 'time',
            adDescription: 'requirement',
            additionalInfo: 'requirement',
        };
        const entityType = entityTypeMap[field.id];
        if (!entityType)
            return undefined;
        const matchingEntities = entities.filter(e => e.type === entityType);
        if (matchingEntities.length === 0)
            return undefined;
        // For MULTI_SELECT and TAGS fields, collect all matching entity values
        if (field.type === L2FieldType.MULTI_SELECT || field.type === L2FieldType.TAGS) {
            return matchingEntities.map(e => e.value);
        }
        // Return highest confidence entity value
        const bestEntity = matchingEntities.reduce((best, current) => current.confidence > best.confidence ? current : best);
        return bestEntity.normalizedValue ?? bestEntity.value;
    }
    /**
     * Match entities and raw text to field options (for ENUM/MULTI_SELECT fields)
     */
    matchEntitiesToFieldOptions(field, entities, rawText, sceneConfig) {
        if (!field.options || field.options.length === 0)
            return undefined;
        const matchedOptions = [];
        const textToSearch = rawText.toLowerCase();
        const allEntityValues = entities.map(e => e.value.toLowerCase());
        for (const option of field.options) {
            const optionLabel = option.label.toLowerCase();
            const optionValue = option.value.toLowerCase();
            const optionDesc = (option.description || '').toLowerCase();
            // Check if any entity value matches the option label or value
            const entityMatches = allEntityValues.some(ev => ev.includes(optionLabel) || optionLabel.includes(ev) ||
                ev.includes(optionValue) || optionValue.includes(ev));
            // Check if raw text mentions the option label or description keywords
            const textMatches = optionLabel.length >= 2 && textToSearch.includes(optionLabel);
            // Check scene-specific enum mappings against entity values
            let enumMapMatches = false;
            if (sceneConfig?.enumMappings[field.id]) {
                for (const entityValue of allEntityValues) {
                    const mapped = sceneConfig.enumMappings[field.id][entityValue];
                    if (mapped === option.value) {
                        enumMapMatches = true;
                        break;
                    }
                }
            }
            if (entityMatches || textMatches || enumMapMatches) {
                matchedOptions.push(option.value);
            }
        }
        if (matchedOptions.length === 0)
            return undefined;
        if (field.type === L2FieldType.MULTI_SELECT || field.type === L2FieldType.TAGS) {
            return matchedOptions;
        }
        // For ENUM, return the first (best) match
        return matchedOptions[0];
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
            // Extract number from string (e.g., "1000元" -> 1000)
            const match = value.match(/(\d+(?:\.\d+)?)/);
            num = match ? parseFloat(match[1]) : NaN;
        }
        else {
            return undefined;
        }
        if (isNaN(num))
            return undefined;
        // Apply min/max constraints
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
        // Direct match
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
            // Direct match
            if (validValues.includes(vStr)) {
                result.push(vStr);
                continue;
            }
            // Check scene-specific enum mappings
            if (sceneConfig?.enumMappings[field.id]?.[vStr]) {
                const mapped = sceneConfig.enumMappings[field.id][vStr];
                if (validValues.includes(mapped)) {
                    result.push(mapped);
                }
                continue;
            }
            // Fuzzy match by label
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
            // Parse range from string (e.g., "1000-2000", "1000到2000", "1000~2000")
            const rangeMatch = value.match(/(\d+)\s*[-~到至]\s*(\d+)/);
            if (rangeMatch) {
                return {
                    min: Math.max(field.min ?? 0, parseInt(rangeMatch[1], 10)),
                    max: Math.min(field.max ?? Infinity, parseInt(rangeMatch[2], 10)),
                };
            }
            // Single value as max
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
            // Try to parse and normalize
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
        // Apply length constraints
        if (field.minLength !== undefined && text.length < field.minLength) {
            return undefined;
        }
        if (field.maxLength !== undefined && text.length > field.maxLength) {
            text = text.substring(0, field.maxLength);
        }
        return text || undefined;
    }
    /**
     * Infer field value from demand context
     */
    inferFieldValue(field, demand) {
        const isUrgentField = field.id === 'urgency' || field.id === 'priority' || field.id === 'urgent';
        // Infer based on intent
        if (isUrgentField) {
            if (demand.intent.intent === 'create_demand' && demand.confidence > 0.8) {
                return field.type === L2FieldType.BOOLEAN ? true : 'high';
            }
        }
        // Infer based on text patterns
        if (isUrgentField) {
            const urgentPatterns = ['急', ' ASAP', '尽快', '马上', '立即'];
            if (urgentPatterns.some(p => demand.rawText.includes(p))) {
                return field.type === L2FieldType.BOOLEAN ? true : 'high';
            }
        }
        // Infer budget currency from location
        if (field.id === 'budgetCurrency' && !demand.structured.budget?.currency) {
            const location = demand.structured.location?.city || '';
            if (/北京|上海|广州|深圳|中国/.test(location)) {
                return 'CNY';
            }
            return 'CNY'; // Default
        }
        return undefined;
    }
    /**
     * Generate title from demand content
     */
    generateTitle(demand) {
        // Extract keywords from entities
        const keywords = [];
        for (const entity of demand.entities) {
            if (['location', 'time', 'requirement'].includes(entity.type)) {
                keywords.push(entity.value);
            }
        }
        if (keywords.length > 0) {
            return keywords.slice(0, 3).join(' ');
        }
        if (!demand.rawText || !demand.rawText.trim()) {
            return undefined;
        }
        // Fallback: use first part of raw text
        const words = demand.rawText.split(/[，。？！,.?!]/);
        return words[0].substring(0, 20) || undefined;
    }
    /**
     * Resolve conflicts in mapped data
     */
    resolveConflicts(result, _schema) {
        for (const conflict of result.conflicts) {
            // For now, use highest confidence/value
            if (conflict.values.length > 0) {
                // Prefer non-null values
                const validValues = conflict.values.filter(v => v !== null && v !== undefined);
                if (validValues.length > 0) {
                    conflict.resolution = 'highest_confidence';
                    conflict.resolvedValue = validValues[0];
                    result.data[conflict.field] = validValues[0];
                }
            }
        }
    }
    /**
     * Register scene-specific mapping configuration
     */
    registerSceneConfig(config) {
        this.sceneConfigs.set(config.scene, config);
        logger.info(`Registered scene mapping config: ${config.scene}`);
    }
    /**
     * Get scene configuration
     */
    getSceneConfig(scene) {
        return this.sceneConfigs.get(scene);
    }
    /**
     * Initialize default mapping rules
     */
    initializeDefaultRules() {
        this.defaultRules = [
            {
                sourceField: 'structured.location.city',
                targetField: 'location',
                priority: 1,
            },
            {
                sourceField: 'structured.time.startTime',
                targetField: 'startTime',
                priority: 1,
            },
            {
                sourceField: 'structured.budget.max',
                targetField: 'budget',
                priority: 1,
            },
        ];
    }
    /**
     * Add custom mapping rule
     */
    addMappingRule(rule) {
        this.defaultRules.push(rule);
        // Sort by priority
        this.defaultRules.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Validate mapping result against schema
     */
    validateMapping(result, schema) {
        // Check required fields
        for (const field of schema.fields) {
            if (field.required && !result.data[field.id]) {
                return false;
            }
        }
        return true;
    }
}
// Export singleton instance
export const demandToL2Mapper = new DemandToL2Mapper();
//# sourceMappingURL=demandToL2Mapper.js.map