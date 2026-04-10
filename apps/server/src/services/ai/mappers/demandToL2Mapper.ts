/**
 * Demand to L2 Mapper
 * 需求结构化映射服务
 *
 * Maps extracted demand fields to Agent L2 model properties with:
 * - Field mapping from extraction to L2 model
 * - Attribute standardization (price, time formats)
 * - Enum value matching
 * - Missing field inference
 * - Conflict detection and hints
 */

import { Demand, ExtractedEntities } from '../demandExtractionService';
import {
  L2Schema,
  L2Data,
  L2FieldType,
  L2FieldOption,
  getL2Schema,
  L2ValidationError,
} from '@visionshare/shared';
import logger from '../../../utils/logger';

/**
 * Mapping result
 */
export interface MappingResult {
  success: boolean;
  data: L2Data;
  mappedFields: string[];
  unmappedFields: string[];
  standardizedFields: Array<{
    field: string;
    original: any;
    standardized: any;
    transformation: string;
  }>;
  inferredFields: Array<{
    field: string;
    value: any;
    reasoning: string;
    confidence: number;
  }>;
  conflicts: Array<{
    field: string;
    message: string;
    severity: 'warning' | 'error';
    suggestions: string[];
  }>;
  errors: L2ValidationError[];
}

/**
 * Price range structure
 */
export interface PriceRange {
  min: number;
  max: number;
  currency?: string;
}

/**
 * Time specification
 */
export interface TimeSpec {
  type: 'absolute' | 'relative' | 'recurring';
  value: string;
  display: string;
}

/**
 * Demand to L2 Mapper
 */
export class DemandToL2Mapper {
  /**
   * Map extracted demand to L2 model
   *
   * @param demand - Extracted demand object
   * @returns MappingResult - Mapping result with standardized L2 data
   */
  map(demand: Demand): MappingResult {
    const startTime = Date.now();
    const schema = getL2Schema(demand.scene);

    if (!schema) {
      return {
        success: false,
        data: {},
        mappedFields: [],
        unmappedFields: Object.keys(demand.attributes),
        standardizedFields: [],
        inferredFields: [],
        conflicts: [{
          field: 'scene',
          message: `Schema not found for scene: ${demand.scene}`,
          severity: 'error',
          suggestions: [],
        }],
        errors: [{
          field: 'scene',
          message: `Schema not found for scene: ${demand.scene}`,
          code: 'SCHEMA_NOT_FOUND',
        }],
      };
    }

    const result: MappingResult = {
      success: true,
      data: {},
      mappedFields: [],
      unmappedFields: [],
      standardizedFields: [],
      inferredFields: [],
      conflicts: [],
      errors: [],
    };

    try {
      // Map extracted attributes to L2 fields
      for (const [fieldId, value] of Object.entries(demand.attributes)) {
        const field = schema.fields.find(f => f.id === fieldId);

        if (!field) {
          result.unmappedFields.push(fieldId);
          continue;
        }

        // Map and standardize value
        const mappedValue = this.mapFieldValue(value, field);

        if (mappedValue !== undefined) {
          result.data[fieldId] = mappedValue;
          result.mappedFields.push(fieldId);

          // Track standardization if value was transformed
          if (JSON.stringify(mappedValue) !== JSON.stringify(value)) {
            result.standardizedFields.push({
              field: fieldId,
              original: value,
              standardized: mappedValue,
              transformation: this.getTransformationType(field.type),
            });
          }
        } else {
          result.conflicts.push({
            field: fieldId,
            message: `Failed to map value for field ${fieldId}`,
            severity: 'warning',
            suggestions: [`Check ${field.label} format`],
          });
        }
      }

      // Infer missing fields from entities
      const inferred = this.inferFieldsFromEntities(demand.entities, schema, result.data);
      result.inferredFields = inferred;
      for (const inf of inferred) {
        if (result.data[inf.field] === undefined) {
          result.data[inf.field] = inf.value;
          result.mappedFields.push(inf.field);
        }
      }

      // Detect conflicts
      const conflicts = this.detectConflicts(result.data, schema);
      result.conflicts.push(...conflicts);

      // Validate required fields
      for (const field of schema.fields) {
        if (field.required && result.data[field.id] === undefined) {
          result.errors.push({
            field: field.id,
            message: `Required field ${field.label} is missing`,
            code: 'REQUIRED_FIELD_MISSING',
          });
          result.success = false;
        }
      }

      logger.info('Demand to L2 mapping completed', {
        scene: demand.scene,
        mappedFields: result.mappedFields.length,
        inferredFields: result.inferredFields.length,
        conflicts: result.conflicts.length,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Demand to L2 mapping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scene: demand.scene,
      });

      return {
        success: false,
        data: result.data,
        mappedFields: result.mappedFields,
        unmappedFields: result.unmappedFields,
        standardizedFields: result.standardizedFields,
        inferredFields: result.inferredFields,
        conflicts: result.conflicts,
        errors: [
          ...result.errors,
          {
            field: 'general',
            message: error instanceof Error ? error.message : 'Mapping failed',
            code: 'MAPPING_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Map a single field value based on field type
   */
  private mapFieldValue(value: any, field: { type: L2FieldType; options?: L2FieldOption[] }): any {
    if (value === null || value === undefined) {
      return undefined;
    }

    switch (field.type) {
      case L2FieldType.NUMBER:
        return this.standardizeNumber(value);

      case L2FieldType.BOOLEAN:
        return this.standardizeBoolean(value);

      case L2FieldType.ENUM:
        return this.matchEnumValue(value, field.options);

      case L2FieldType.MULTI_SELECT:
        return this.matchMultiSelectValues(value, field.options);

      case L2FieldType.RANGE:
        return this.standardizeRange(value);

      case L2FieldType.DATE:
        return this.standardizeDate(value);

      case L2FieldType.TIME:
        return this.standardizeTime(value);

      case L2FieldType.DATETIME:
        return this.standardizeDateTime(value);

      case L2FieldType.TEXT:
      case L2FieldType.LONG_TEXT:
        return String(value).trim();

      default:
        return value;
    }
  }

  /**
   * Standardize number value
   */
  private standardizeNumber(value: any): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Handle price formats like "1000元", "$100", "1.5k"
      const cleaned = value
        .replace(/[\s,]/g, '')
        .replace(/[\u4e00-\u9fa5]/g, '') // Remove Chinese characters
        .replace(/[^\d.kmM\-+.]/g, ''); // Keep digits, dots, k, m

      if (cleaned.toLowerCase().endsWith('k')) {
        return parseFloat(cleaned.slice(0, -1)) * 1000;
      }
      if (cleaned.toLowerCase().endsWith('m')) {
        return parseFloat(cleaned.slice(0, -1)) * 1000000;
      }

      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    }

    return undefined;
  }

  /**
   * Standardize boolean value
   */
  private standardizeBoolean(value: any): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      const truthy = ['yes', 'true', '是', '1', 'y', 'on'];
      const falsy = ['no', 'false', '否', '0', 'n', 'off'];

      if (truthy.includes(lower)) return true;
      if (falsy.includes(lower)) return false;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return undefined;
  }

  /**
   * Match enum value
   */
  private matchEnumValue(value: any, options?: L2FieldOption[]): string | undefined {
    if (!options || value === undefined) {
      return undefined;
    }

    const strValue = String(value).toLowerCase().trim();

    // Direct match
    const exactMatch = options.find(o => o.value.toLowerCase() === strValue);
    if (exactMatch) return exactMatch.value;

    // Label match
    const labelMatch = options.find(o => o.label.toLowerCase() === strValue);
    if (labelMatch) return labelMatch.value;

    // Partial match
    const partialMatch = options.find(o =>
      o.label.toLowerCase().includes(strValue) ||
      strValue.includes(o.label.toLowerCase())
    );
    if (partialMatch) return partialMatch.value;

    return undefined;
  }

  /**
   * Match multi-select values
   */
  private matchMultiSelectValues(value: any, options?: L2FieldOption[]): string[] | undefined {
    if (!options || value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value
        .map(v => this.matchEnumValue(v, options))
        .filter((v): v is string => v !== undefined);
    }

    if (typeof value === 'string') {
      // Split by common delimiters
      const parts = value.split(/[,，;；/\s]+/);
      return parts
        .map(p => this.matchEnumValue(p.trim(), options))
        .filter((v): v is string => v !== undefined);
    }

    return undefined;
  }

  /**
   * Standardize range value
   */
  private standardizeRange(value: any): { min: number; max: number } | undefined {
    if (typeof value === 'object' && value !== null) {
      const min = this.standardizeNumber(value.min);
      const max = this.standardizeNumber(value.max);

      if (min !== undefined && max !== undefined) {
        return { min, max };
      }
    }

    if (typeof value === 'string') {
      // Parse formats like "1000-2000", "1000到2000", "1000~2000"
      const match = value.match(/(\d+)\s*[\-到~\s]\s*(\d+)/);
      if (match) {
        return {
          min: parseInt(match[1], 10),
          max: parseInt(match[2], 10),
        };
      }

      // Parse formats like "1000+", "above 1000"
      const aboveMatch = value.match(/(\d+)\s*\+/) ||
                         value.match(/above\s+(\d+)/i) ||
                         value.match(/(\d+)\s*以上/);
      if (aboveMatch) {
        const min = parseInt(aboveMatch[1], 10);
        return { min, max: min * 10 }; // Set max as 10x for open-ended ranges
      }
    }

    return undefined;
  }

  /**
   * Standardize date value
   */
  private standardizeDate(value: any): string | undefined {
    if (value === undefined) return undefined;

    // If already ISO format, return as is
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.split('T')[0];
    }

    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Parse relative dates
      if (typeof value === 'string') {
        const today = new Date();
        const lower = value.toLowerCase();

        if (lower.includes('today') || lower.includes('今天')) {
          return today.toISOString().split('T')[0];
        }
        if (lower.includes('tomorrow') || lower.includes('明天')) {
          today.setDate(today.getDate() + 1);
          return today.toISOString().split('T')[0];
        }
      }
    }

    return undefined;
  }

  /**
   * Standardize time value
   */
  private standardizeTime(value: any): string | undefined {
    if (value === undefined) return undefined;

    if (typeof value === 'string') {
      // Handle 24h format
      const match24 = value.match(/(\d{1,2}):(\d{2})/);
      if (match24) {
        return `${match24[1].padStart(2, '0')}:${match24[2]}`;
      }

      // Handle 12h format
      const match12 = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (match12) {
        let hour = parseInt(match12[1], 10);
        const isPm = match12[3].toLowerCase() === 'pm';
        if (isPm && hour !== 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:${match12[2]}`;
      }
    }

    return undefined;
  }

  /**
   * Standardize datetime value
   */
  private standardizeDateTime(value: any): string | undefined {
    if (value === undefined) return undefined;

    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Return as is if can't parse
    }

    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Infer fields from entities
   */
  private inferFieldsFromEntities(
    entities: ExtractedEntities,
    schema: L2Schema,
    existingData: L2Data
  ): Array<{ field: string; value: any; reasoning: string; confidence: number }> {
    const inferred: Array<{ field: string; value: any; reasoning: string; confidence: number }> = [];

    for (const field of schema.fields) {
      // Skip if already has value
      if (existingData[field.id] !== undefined) continue;

      // Infer based on field id patterns
      const fieldId = field.id.toLowerCase();

      // Time-related fields
      if ((fieldId.includes('time') || fieldId.includes('date') || fieldId.includes('when')) &&
          entities.time.length > 0) {
        inferred.push({
          field: field.id,
          value: entities.time[0].normalized || entities.time[0].text,
          reasoning: `Inferred from time entity: ${entities.time[0].text}`,
          confidence: 70,
        });
      }

      // Location-related fields
      if ((fieldId.includes('location') || fieldId.includes('place') || fieldId.includes('where') ||
           fieldId.includes('city') || fieldId.includes('address')) &&
          entities.location.length > 0) {
        inferred.push({
          field: field.id,
          value: entities.location[0].normalized || entities.location[0].text,
          reasoning: `Inferred from location entity: ${entities.location[0].text}`,
          confidence: 65,
        });
      }

      // People-related fields
      if ((fieldId.includes('people') || fieldId.includes('person') || fieldId.includes('group')) &&
          entities.people.length > 0) {
        inferred.push({
          field: field.id,
          value: entities.people.map(p => p.normalized || p.text),
          reasoning: `Inferred from people entities`,
          confidence: 60,
        });
      }
    }

    return inferred;
  }

  /**
   * Detect conflicts in mapped data
   */
  private detectConflicts(data: L2Data, schema: L2Schema): Array<{
    field: string;
    message: string;
    severity: 'warning' | 'error';
    suggestions: string[];
  }> {
    const conflicts: Array<{
      field: string;
      message: string;
      severity: 'warning' | 'error';
      suggestions: string[];
    }> = [];

    for (const [fieldId, value] of Object.entries(data)) {
      const field = schema.fields.find(f => f.id === fieldId);
      if (!field) continue;

      // Check range constraints
      if (field.type === L2FieldType.NUMBER) {
        const num = value as number;
        if (field.min !== undefined && num < field.min) {
          conflicts.push({
            field: fieldId,
            message: `Value ${num} is below minimum ${field.min}`,
            severity: 'error',
            suggestions: [`Adjust ${field.label} to be at least ${field.min}`],
          });
        }
        if (field.max !== undefined && num > field.max) {
          conflicts.push({
            field: fieldId,
            message: `Value ${num} exceeds maximum ${field.max}`,
            severity: 'error',
            suggestions: [`Adjust ${field.label} to be at most ${field.max}`],
          });
        }
      }

      // Check text length constraints
      if ((field.type === L2FieldType.TEXT || field.type === L2FieldType.LONG_TEXT) &&
          typeof value === 'string') {
        if (field.minLength !== undefined && value.length < field.minLength) {
          conflicts.push({
            field: fieldId,
            message: `Text length ${value.length} is below minimum ${field.minLength}`,
            severity: 'warning',
            suggestions: [`Add more details to ${field.label}`],
          });
        }
        if (field.maxLength !== undefined && value.length > field.maxLength) {
          conflicts.push({
            field: fieldId,
            message: `Text length ${value.length} exceeds maximum ${field.maxLength}`,
            severity: 'error',
            suggestions: [`Shorten ${field.label} to ${field.maxLength} characters`],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get transformation type description
   */
  private getTransformationType(fieldType: L2FieldType): string {
    const transformations: Record<L2FieldType, string> = {
      [L2FieldType.NUMBER]: 'number_standardization',
      [L2FieldType.BOOLEAN]: 'boolean_normalization',
      [L2FieldType.ENUM]: 'enum_matching',
      [L2FieldType.MULTI_SELECT]: 'multi_select_parsing',
      [L2FieldType.RANGE]: 'range_parsing',
      [L2FieldType.DATE]: 'date_standardization',
      [L2FieldType.TIME]: 'time_standardization',
      [L2FieldType.DATETIME]: 'datetime_standardization',
      [L2FieldType.TEXT]: 'text_trim',
      [L2FieldType.LONG_TEXT]: 'text_trim',
    };

    return transformations[fieldType] || 'value_mapping';
  }

  /**
   * Apply user corrections to mapped data
   *
   * @param mappedData - Current mapped data
   * @param corrections - User-provided corrections
   * @returns L2Data - Updated data with corrections applied
   */
  applyCorrections(mappedData: L2Data, corrections: L2Data): L2Data {
    return {
      ...mappedData,
      ...corrections,
    };
  }

  /**
   * Get mapping statistics
   *
   * @param result - Mapping result
   * @returns Statistics about the mapping
   */
  getMappingStats(result: MappingResult): {
    totalFields: number;
    mappedRatio: number;
    inferredRatio: number;
    conflictCount: number;
    hasErrors: boolean;
  } {
    const totalFields = result.mappedFields.length + result.unmappedFields.length;
    return {
      totalFields,
      mappedRatio: totalFields > 0 ? result.mappedFields.length / totalFields : 0,
      inferredRatio: totalFields > 0 ? result.inferredFields.length / totalFields : 0,
      conflictCount: result.conflicts.length,
      hasErrors: result.errors.length > 0 || !result.success,
    };
  }
}

// Export singleton instance
export const demandToL2Mapper = new DemandToL2Mapper();
