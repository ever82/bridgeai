/**
 * Supply to L2 Mapper
 * 供给结构化映射系统
 * 将提取的供给字段映射到 AgentL2Model 属性
 */

import { L2Schema, L2Data, L2FieldType } from '@bridgeai/shared';

import { Supply, Capability } from '../supplyExtractionService';
import { logger } from '../../../utils/logger';

/**
 * Mapping Result
 */
export interface SupplyMappingResult {
  success: boolean;
  data: L2Data;
  mappedFields: string[];
  unmappedFields: string[];
  inferredFields: string[];
  conflicts: SupplyFieldConflict[];
  transformations: SupplyFieldTransformation[];
  generatedTags: string[];
}

/**
 * Field Conflict
 */
export interface SupplyFieldConflict {
  field: string;
  values: any[];
  sources: string[];
  resolution?: 'first' | 'last' | 'highest_confidence' | 'manual';
  resolvedValue?: any;
}

/**
 * Field Transformation
 */
export interface SupplyFieldTransformation {
  field: string;
  originalValue: any;
  transformedValue: any;
  transformation: string;
}

/**
 * Mapping Rule
 */
export interface SupplyMappingRule {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  condition?: (supply: Supply) => boolean;
  priority: number;
}

/**
 * Scene-specific mapping configuration
 */
export interface SupplySceneMappingConfig {
  scene: string;
  rules: SupplyMappingRule[];
  fieldMappings: Record<string, string>;
  enumMappings: Record<string, Record<string, string>>;
}

// Capability level to numeric score mapping
const CAPABILITY_LEVEL_SCORE: Record<string, number> = {
  beginner: 25,
  intermediate: 50,
  advanced: 75,
  expert: 100,
};

/**
 * Map capability level to L2-compatible value
 */
function mapCapabilityLevel(level: string): string {
  const levelMap: Record<string, string> = {
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
  private sceneConfigs: Map<string, SupplySceneMappingConfig> = new Map();
  private defaultRules: SupplyMappingRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Map Supply to L2 Data
   * 将提取的供给映射到L2数据结构
   */
  map(supply: Supply, schema: L2Schema): SupplyMappingResult {
    const startTime = Date.now();
    const result: SupplyMappingResult = {
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
        } else if (field.required) {
          result.unmappedFields.push(field.id);
        }
      }

      // Generate tags from capabilities, skills, and qualifications
      result.generatedTags = this.generateTags(supply);

      this.resolveConflicts(result, schema);

      logger.info('Supply to L2 mapping completed', {
        scene: schema.scene,
        mappedCount: result.mappedFields.length,
        conflictCount: result.conflicts.length,
        tagCount: result.generatedTags.length,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
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
  private mapField(
    field: L2Schema['fields'][0],
    supply: Supply,
    sceneConfig?: SupplySceneMappingConfig
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
  private getValueFromSupply(supply: Supply, path: string): any {
    const parts = path.split('.');
    let value: any = supply;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
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
  private getDefaultFieldValue(fieldId: string, supply: Supply): any {
    const fieldMappings: Record<string, (s: Supply) => any> = {
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
      certifications: s =>
        s.experience?.certifications?.length ? s.experience.certifications : undefined,
      availabilitySchedule: s => s.availability?.schedule,
      availabilityTimezone: s => s.availability?.timezone,
      responseTime: s => s.availability?.responseTime,
      qualityScore: s => s.quality?.overallScore,
      qualityConfidence: s => s.quality?.confidence,
      qualityCompleteness: s => s.quality?.completenessScore,
      capabilities: s =>
        s.capabilities?.length
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
  private getValueFromCapabilities(field: L2Schema['fields'][0], capabilities: Capability[]): any {
    if (!capabilities || capabilities.length === 0) return undefined;

    const entityTypeMap: Record<string, string> = {
      serviceSkills: 'capability',
      expertiseLevel: 'capability',
      specializations: 'capability',
      keywords: 'capability',
    };

    const entityType = entityTypeMap[field.id];
    if (!entityType) return undefined;

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
  private transformValue(
    value: any,
    field: L2Schema['fields'][0],
    sceneConfig?: SupplySceneMappingConfig
  ): any {
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
      const match = value.match(/(\d+(?:\.\d+)?)/);
      num = match ? parseFloat(match[1]) : NaN;
    } else {
      return undefined;
    }

    if (isNaN(num)) return undefined;

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
    sceneConfig?: SupplySceneMappingConfig
  ): string | undefined {
    if (!field.options) return undefined;

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
    const option = field.options.find(
      o => o.label.toLowerCase().includes(valueStr) || valueStr.includes(o.label.toLowerCase())
    );

    return option?.value;
  }

  /**
   * Transform multi-select value
   */
  private transformMultiSelect(
    value: any,
    field: L2Schema['fields'][0],
    sceneConfig?: SupplySceneMappingConfig
  ): string[] | undefined {
    if (!field.options) return undefined;

    const values = Array.isArray(value) ? value : [value];
    const validValues = field.options.map(o => o.value);
    const result: string[] = [];

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

      const option = field.options.find(
        o => o.label.toLowerCase().includes(vStr) || vStr.includes(o.label.toLowerCase())
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
  private inferFieldValue(field: L2Schema['fields'][0], supply: Supply): any {
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
  private generateTags(supply: Supply): string[] {
    const tags: string[] = [];

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
   * Resolve conflicts in mapped data
   */
  private resolveConflicts(result: SupplyMappingResult, _schema: L2Schema): void {
    for (const conflict of result.conflicts) {
      if (conflict.values.length > 0) {
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
  registerSceneConfig(config: SupplySceneMappingConfig): void {
    this.sceneConfigs.set(config.scene, config);
    logger.info(`Registered supply scene mapping config: ${config.scene}`);
  }

  /**
   * Get scene configuration
   */
  getSceneConfig(scene: string): SupplySceneMappingConfig | undefined {
    return this.sceneConfigs.get(scene);
  }

  /**
   * Initialize default mapping rules
   */
  private initializeDefaultRules(): void {
    this.defaultRules = [
      {
        sourceField: 'location.city',
        targetField: 'locationCity',
        priority: 1,
      },
      {
        sourceField: 'pricing.minRate',
        targetField: 'priceMin',
        priority: 1,
      },
      {
        sourceField: 'pricing.maxRate',
        targetField: 'priceMax',
        priority: 1,
      },
    ];
  }

  /**
   * Add custom mapping rule
   */
  addMappingRule(rule: SupplyMappingRule): void {
    this.defaultRules.push(rule);
    this.defaultRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate mapping result against schema
   */
  validateMapping(result: SupplyMappingResult, schema: L2Schema): boolean {
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
  private isValidFieldValue(value: any): boolean {
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
        const range = value as { min?: number; max?: number };
        return (range.min !== undefined && range.min !== null) ||
               (range.max !== undefined && range.max !== null);
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
