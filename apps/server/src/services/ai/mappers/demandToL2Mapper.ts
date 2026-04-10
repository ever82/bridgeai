/**
 * Demand to L2 Mapper
 * 需求结构化映射系统
 * 将提取的需求字段映射到 AgentL2Model 属性
 */

import { L2Schema, L2Data, L2FieldType } from '@visionshare/shared';
import { Demand, ExtractedEntity } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * Mapping Result
 */
export interface MappingResult {
  success: boolean;
  data: L2Data;
  mappedFields: string[];
  unmappedFields: string[];
  inferredFields: string[];
  conflicts: FieldConflict[];
  transformations: FieldTransformation[];
}

/**
 * Field Conflict
 */
export interface FieldConflict {
  field: string;
  values: any[];
  sources: string[];
  resolution?: 'first' | 'last' | 'highest_confidence' | 'manual';
  resolvedValue?: any;
}

/**
 * Field Transformation
 */
export interface FieldTransformation {
  field: string;
  originalValue: any;
  transformedValue: any;
  transformation: string;
}

/**
 * Mapping Rule
 */
export interface MappingRule {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  condition?: (demand: Demand) => boolean;
  priority: number;
}

/**
 * Scene-specific mapping configuration
 */
export interface SceneMappingConfig {
  scene: string;
  rules: MappingRule[];
  fieldMappings: Record<string, string>;
  enumMappings: Record<string, Record<string, string>>;
}

/**
 * Demand to L2 Mapper Class
 * 需求到L2模型映射器
 */
export class DemandToL2Mapper {
  private sceneConfigs: Map<string, SceneMappingConfig> = new Map();
  private defaultRules: MappingRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Map Demand to L2 Data
   * 将提取的需求映射到L2数据结构
   */
  map(demand: Demand, schema: L2Schema): MappingResult {
    const startTime = Date.now();
    const result: MappingResult = {
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
        } else if (field.required) {
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
    } catch (error) {
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
  private mapField(
    field: L2Schema['fields'][0],
    demand: Demand,
    sceneConfig?: SceneMappingConfig,
    result?: MappingResult
  ): {
    mapped: boolean;
    value?: any;
    transformed?: boolean;
    originalValue?: any;
    transformation?: string;
    inferred?: boolean;
  } {
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
  private getValueFromDemand(demand: Demand, path: string): any {
    const parts = path.split('.');
    let value: any = demand.structured;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get default field value mapping
   */
  private getDefaultFieldValue(fieldId: string, demand: Demand): any {
    const fieldMappings: Record<string, (d: Demand) => any> = {
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
      requirements: d => d.structured.requirements,
      preferences: d => d.structured.preferences,
      constraints: d => d.structured.constraints,
      intent: d => d.intent.intent,
      confidence: d => d.confidence,
    };

    const mapper = fieldMappings[fieldId];
    return mapper ? mapper(demand) : undefined;
  }

  /**
   * Get value from entities
   */
  private getValueFromEntities(field: L2Schema['fields'][0], entities: ExtractedEntity[]): any {
    const entityTypeMap: Record<string, EntityType> = {
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
      requirements: 'requirement',
      preferences: 'preference',
    };

    const entityType = entityTypeMap[field.id];
    if (!entityType) return undefined;

    const matchingEntities = entities.filter(e => e.type === entityType);
    if (matchingEntities.length === 0) return undefined;

    // Return highest confidence entity value
    const bestEntity = matchingEntities.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return bestEntity.normalizedValue ?? bestEntity.value;
  }

  /**
   * Transform value based on field type
   */
  private transformValue(value: any, field: L2Schema['fields'][0], sceneConfig?: SceneMappingConfig): any {
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
  private transformNumber(value: any, field: L2Schema['fields'][0]): number | undefined {
    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Extract number from string (e.g., "1000元" -> 1000)
      const match = value.match(/(\d+(?:\.\d+)?)/);
      num = match ? parseFloat(match[1]) : NaN;
    } else {
      return undefined;
    }

    if (isNaN(num)) return undefined;

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
  private transformEnum(
    value: any,
    field: L2Schema['fields'][0],
    sceneConfig?: SceneMappingConfig
  ): string | undefined {
    if (!field.options) return undefined;

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
    const option = field.options.find(o =>
      o.label.toLowerCase().includes(valueStr) ||
      valueStr.includes(o.label.toLowerCase())
    );

    return option?.value;
  }

  /**
   * Transform multi-select value
   */
  private transformMultiSelect(
    value: any,
    field: L2Schema['fields'][0],
    sceneConfig?: SceneMappingConfig
  ): string[] | undefined {
    if (!field.options) return undefined;

    const values = Array.isArray(value) ? value : [value];
    const validValues = field.options.map(o => o.value);
    const result: string[] = [];

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
      const option = field.options.find(o =>
        o.label.toLowerCase().includes(vStr) ||
        vStr.includes(o.label.toLowerCase())
      );

      if (option) {
        result.push(option.value);
      }
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Transform range value
   */
  private transformRange(
    value: any,
    field: L2Schema['fields'][0]
  ): { min: number; max: number } | undefined {
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
  private transformBoolean(value: any): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const truthy = ['true', 'yes', '是', '对', '1', 'y'];
      const falsy = ['false', 'no', '否', '不对', '0', 'n'];
      const lower = value.toLowerCase().trim();
      if (truthy.includes(lower)) return true;
      if (falsy.includes(lower)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  }

  /**
   * Transform datetime value
   */
  private transformDateTime(value: any): string | undefined {
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
  private transformText(value: any, field: L2Schema['fields'][0]): string | undefined {
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
  private inferFieldValue(field: L2Schema['fields'][0], demand: Demand): any {
    // Infer based on intent
    if (field.id === 'urgency' || field.id === 'priority') {
      if (demand.intent.intent === 'create_demand' && demand.confidence > 0.8) {
        return 'high';
      }
    }

    // Infer based on text patterns
    if (field.id === 'urgency') {
      const urgentPatterns = ['急', ' ASAP', '尽快', '马上', '立即'];
      if (urgentPatterns.some(p => demand.rawText.includes(p))) {
        return 'high';
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
  private generateTitle(demand: Demand): string {
    // Extract keywords from entities
    const keywords: string[] = [];

    for (const entity of demand.entities) {
      if (['location', 'time', 'requirement'].includes(entity.type)) {
        keywords.push(entity.value);
      }
    }

    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(' ');
    }

    // Fallback: use first part of raw text
    const words = demand.rawText.split(/[，。？！,\.?!]/);
    return words[0].substring(0, 20) || '未命名需求';
  }

  /**
   * Resolve conflicts in mapped data
   */
  private resolveConflicts(result: MappingResult, schema: L2Schema): void {
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
  registerSceneConfig(config: SceneMappingConfig): void {
    this.sceneConfigs.set(config.scene, config);
    logger.info(`Registered scene mapping config: ${config.scene}`);
  }

  /**
   * Get scene configuration
   */
  getSceneConfig(scene: string): SceneMappingConfig | undefined {
    return this.sceneConfigs.get(scene);
  }

  /**
   * Initialize default mapping rules
   */
  private initializeDefaultRules(): void {
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
  addMappingRule(rule: MappingRule): void {
    this.defaultRules.push(rule);
    // Sort by priority
    this.defaultRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate mapping result against schema
   */
  validateMapping(result: MappingResult, schema: L2Schema): boolean {
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
