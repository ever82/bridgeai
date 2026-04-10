/**
 * Extraction Validator
 * 提取结果验证系统
 * 验证字段完整性、业务规则和合理性
 */

import { L2Schema, L2Data, L2FieldType, L2ValidationError, L2ValidationResult } from '@visionshare/shared';
import { Demand } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * Validation Rule
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  condition: (data: L2Data, schema: L2Schema, demand?: Demand) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: 'completeness' | 'business' | 'range' | 'format' | 'logic';
}

/**
 * Validation Context
 */
export interface ValidationContext {
  data: L2Data;
  schema: L2Schema;
  demand?: Demand;
  options?: ValidationOptions;
}

/**
 * Validation Options
 */
export interface ValidationOptions {
  checkCompleteness?: boolean;
  checkBusinessRules?: boolean;
  checkRanges?: boolean;
  checkFormats?: boolean;
  strictMode?: boolean;
  allowPartial?: boolean;
}

/**
 * Validation Report
 */
export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    completenessScore: number;
  };
  suggestions: string[];
  confirmationNeeded: boolean;
  confirmationPrompt?: string;
}

/**
 * Validation Issue
 */
export interface ValidationIssue {
  ruleId: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  suggestion?: string;
}

/**
 * Field Validation Result
 */
export interface FieldValidationResult {
  field: string;
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  value?: any;
}

/**
 * Extraction Validator Class
 * 提取结果验证器
 */
export class ExtractionValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private sceneRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Validate extraction result
   * 验证提取结果
   */
  validate(
    data: L2Data,
    schema: L2Schema,
    demand?: Demand,
    options: ValidationOptions = {}
  ): ValidationReport {
    const startTime = Date.now();
    const opts = { ...this.getDefaultOptions(), ...options };

    const context: ValidationContext = {
      data,
      schema,
      demand,
      options: opts,
    };

    const report: ValidationReport = {
      valid: true,
      errors: [],
      warnings: [],
      infos: [],
      summary: {
        totalIssues: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        completenessScore: 0,
      },
      suggestions: [],
      confirmationNeeded: false,
    };

    try {
      logger.info('Starting extraction validation', {
        scene: schema.scene,
        fieldCount: Object.keys(data).length,
      });

      // Step 1: Validate field completeness
      if (opts.checkCompleteness) {
        this.validateCompleteness(context, report);
      }

      // Step 2: Validate individual fields
      this.validateFields(context, report);

      // Step 3: Validate business rules
      if (opts.checkBusinessRules) {
        this.validateBusinessRules(context, report);
      }

      // Step 4: Validate ranges
      if (opts.checkRanges) {
        this.validateRanges(context, report);
      }

      // Step 5: Validate formats
      if (opts.checkFormats) {
        this.validateFormats(context, report);
      }

      // Step 6: Apply custom rules
      this.applyCustomRules(context, report);

      // Step 7: Calculate completeness score
      report.summary.completenessScore = this.calculateCompletenessScore(data, schema);

      // Step 8: Determine if confirmation is needed
      this.determineConfirmationNeeded(report, opts);

      // Step 9: Update summary
      report.summary.errorCount = report.errors.length;
      report.summary.warningCount = report.warnings.length;
      report.summary.infoCount = report.infos.length;
      report.summary.totalIssues = report.summary.errorCount + report.summary.warningCount + report.summary.infoCount;

      // Report is valid if no errors (warnings allowed)
      report.valid = report.errors.length === 0;

      logger.info('Extraction validation completed', {
        scene: schema.scene,
        valid: report.valid,
        errorCount: report.summary.errorCount,
        warningCount: report.summary.warningCount,
        latencyMs: Date.now() - startTime,
      });

      return report;
    } catch (error) {
      logger.error('Extraction validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scene: schema.scene,
      });

      report.valid = false;
      report.errors.push({
        ruleId: 'system_error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        category: 'system',
      });

      return report;
    }
  }

  /**
   * Validate field completeness
   * 字段完整性检查
   */
  private validateCompleteness(context: ValidationContext, report: ValidationReport): void {
    const { data, schema } = context;

    for (const field of schema.fields) {
      if (field.required && (data[field.id] === undefined || data[field.id] === null || data[field.id] === '')) {
        report.errors.push({
          ruleId: 'required_field_missing',
          field: field.id,
          message: `Required field "${field.label}" is missing`,
          severity: 'error',
          category: 'completeness',
          suggestion: `Please provide a value for ${field.label}`,
        });
      }
    }
  }

  /**
   * Validate individual fields
   * 字段级验证
   */
  private validateFields(context: ValidationContext, report: ValidationReport): void {
    const { data, schema } = context;

    for (const field of schema.fields) {
      const value = data[field.id];
      if (value === undefined || value === null) continue;

      // Type validation
      const typeValid = this.validateFieldType(value, field.type);
      if (!typeValid) {
        report.errors.push({
          ruleId: 'invalid_field_type',
          field: field.id,
          message: `Field "${field.label}" has invalid type. Expected ${field.type}`,
          severity: 'error',
          category: 'format',
        });
        continue;
      }

      // Range validation for numbers
      if (field.type === L2FieldType.NUMBER && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          report.errors.push({
            ruleId: 'value_below_minimum',
            field: field.id,
            message: `Value ${value} is below minimum ${field.min}`,
            severity: 'error',
            category: 'range',
          });
        }
        if (field.max !== undefined && value > field.max) {
          report.errors.push({
            ruleId: 'value_above_maximum',
            field: field.id,
            message: `Value ${value} is above maximum ${field.max}`,
            severity: 'error',
            category: 'range',
          });
        }
      }

      // Range validation for range type
      if (field.type === L2FieldType.RANGE && typeof value === 'object') {
        const range = value as { min: number; max: number };
        if (range.min > range.max) {
          report.errors.push({
            ruleId: 'invalid_range',
            field: field.id,
            message: `Invalid range: min (${range.min}) is greater than max (${range.max})`,
            severity: 'error',
            category: 'range',
          });
        }
        if (field.min !== undefined && range.min < field.min) {
          report.warnings.push({
            ruleId: 'range_below_minimum',
            field: field.id,
            message: `Range minimum ${range.min} is below schema minimum ${field.min}`,
            severity: 'warning',
            category: 'range',
          });
        }
        if (field.max !== undefined && range.max > field.max) {
          report.warnings.push({
            ruleId: 'range_above_maximum',
            field: field.id,
            message: `Range maximum ${range.max} is above schema maximum ${field.max}`,
            severity: 'warning',
            category: 'range',
          });
        }
      }

      // Enum validation
      if ((field.type === L2FieldType.ENUM || field.type === L2FieldType.MULTI_SELECT) && field.options) {
        const validValues = field.options.map(o => o.value);

        if (field.type === L2FieldType.ENUM) {
          if (!validValues.includes(value as string)) {
            report.errors.push({
              ruleId: 'invalid_enum_value',
              field: field.id,
              message: `Invalid value "${value}" for field "${field.label}"`,
              severity: 'error',
              category: 'format',
              suggestion: `Valid values are: ${validValues.join(', ')}`,
            });
          }
        } else {
          const values = value as string[];
          const invalidValues = values.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            report.errors.push({
              ruleId: 'invalid_multi_select_values',
              field: field.id,
              message: `Invalid values [${invalidValues.join(', ')}] for field "${field.label}"`,
              severity: 'error',
              category: 'format',
            });
          }
        }
      }

      // Text length validation
      if ((field.type === L2FieldType.TEXT || field.type === L2FieldType.LONG_TEXT) && typeof value === 'string') {
        if (field.minLength !== undefined && value.length < field.minLength) {
          report.warnings.push({
            ruleId: 'text_too_short',
            field: field.id,
            message: `Text is too short (${value.length} chars, minimum ${field.minLength})`,
            severity: 'warning',
            category: 'format',
          });
        }
        if (field.maxLength !== undefined && value.length > field.maxLength) {
          report.warnings.push({
            ruleId: 'text_too_long',
            field: field.id,
            message: `Text is too long (${value.length} chars, maximum ${field.maxLength})`,
            severity: 'warning',
            category: 'format',
          });
        }
      }

      // Pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          report.errors.push({
            ruleId: 'pattern_mismatch',
            field: field.id,
            message: field.validation.message || `Value does not match required pattern`,
            severity: 'error',
            category: 'format',
          });
        }
      }
    }
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: any, type: L2FieldType): boolean {
    switch (type) {
      case L2FieldType.TEXT:
      case L2FieldType.LONG_TEXT:
      case L2FieldType.ENUM:
        return typeof value === 'string';
      case L2FieldType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case L2FieldType.BOOLEAN:
        return typeof value === 'boolean';
      case L2FieldType.MULTI_SELECT:
        return Array.isArray(value) && value.every(v => typeof v === 'string');
      case L2FieldType.RANGE:
        return (
          typeof value === 'object' &&
          value !== null &&
          typeof value.min === 'number' &&
          typeof value.max === 'number'
        );
      case L2FieldType.DATE:
      case L2FieldType.DATETIME:
      case L2FieldType.TIME:
        // Accept strings or Date objects
        return typeof value === 'string' || value instanceof Date;
      default:
        return true;
    }
  }

  /**
   * Validate business rules
   * 业务规则验证
   */
  private validateBusinessRules(context: ValidationContext, report: ValidationReport): void {
    const { data, schema, demand } = context;

    // Rule: Budget reasonableness
    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      const min = Number(data.budgetMin);
      const max = Number(data.budgetMax);

      if (min > max) {
        report.errors.push({
          ruleId: 'invalid_budget_range',
          field: 'budget',
          message: 'Minimum budget cannot be greater than maximum budget',
          severity: 'error',
          category: 'business',
        });
      }

      // Warning if range is too wide (>10x difference)
      if (max / min > 10) {
        report.warnings.push({
          ruleId: 'budget_range_too_wide',
          field: 'budget',
          message: `Budget range (${min} - ${max}) is very wide`,
          severity: 'warning',
          category: 'business',
          suggestion: 'Consider narrowing your budget range for better matching',
        });
      }

      // Warning if budget seems too low or too high
      if (max < 100) {
        report.warnings.push({
          ruleId: 'budget_very_low',
          field: 'budget',
          message: 'Budget seems very low, please confirm',
          severity: 'warning',
          category: 'business',
        });
      }
      if (max > 1000000) {
        report.infos.push({
          ruleId: 'budget_very_high',
          field: 'budget',
          message: 'Budget is very high, premium service may be available',
          severity: 'info',
          category: 'business',
        });
      }
    }

    // Rule: Time reasonableness
    if (data.startTime && data.endTime) {
      const start = new Date(data.startTime as string);
      const end = new Date(data.endTime as string);

      if (start >= end) {
        report.errors.push({
          ruleId: 'invalid_time_range',
          field: 'time',
          message: 'Start time must be before end time',
          severity: 'error',
          category: 'business',
        });
      }

      // Warning if duration is very short (< 30 minutes)
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      if (durationMinutes < 30) {
        report.warnings.push({
          ruleId: 'very_short_duration',
          field: 'time',
          message: `Duration (${Math.round(durationMinutes)} minutes) is very short`,
          severity: 'warning',
          category: 'business',
        });
      }

      // Warning if time is in the past
      if (start < new Date()) {
        report.warnings.push({
          ruleId: 'time_in_past',
          field: 'time',
          message: 'Start time is in the past',
          severity: 'warning',
          category: 'business',
        });
      }
    }

    // Rule: People count reasonableness
    if (data.peopleCount !== undefined) {
      const count = Number(data.peopleCount);
      if (count < 1) {
        report.errors.push({
          ruleId: 'invalid_people_count',
          field: 'peopleCount',
          message: 'People count must be at least 1',
          severity: 'error',
          category: 'business',
        });
      }
      if (count > 1000) {
        report.warnings.push({
          ruleId: 'very_large_group',
          field: 'peopleCount',
          message: `Group size (${count}) is very large`,
          severity: 'warning',
          category: 'business',
          suggestion: 'Please confirm this is correct for your needs',
        });
      }
    }

    // Apply custom business rules
    if (schema.scene) {
      const sceneRules = this.sceneRules.get(schema.scene) || [];
      for (const rule of sceneRules) {
        try {
          const passed = rule.condition(data, schema, demand);
          if (!passed) {
            const issue: ValidationIssue = {
              ruleId: rule.id,
              message: rule.message,
              severity: rule.severity,
              category: rule.category,
            };

            if (rule.severity === 'error') {
              report.errors.push(issue);
            } else if (rule.severity === 'warning') {
              report.warnings.push(issue);
            } else {
              report.infos.push(issue);
            }
          }
        } catch (error) {
          logger.error(`Rule ${rule.id} failed`, { error });
        }
      }
    }
  }

  /**
   * Validate ranges
   * 范围验证
   */
  private validateRanges(context: ValidationContext, report: ValidationReport): void {
    const { data, schema } = context;

    for (const field of schema.fields) {
      const value = data[field.id];
      if (value === undefined || value === null) continue;

      // Schema-level range constraints
      if (field.min !== undefined || field.max !== undefined) {
        if (typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            report.errors.push({
              ruleId: 'below_schema_minimum',
              field: field.id,
              message: `Value ${value} is below schema minimum ${field.min}`,
              severity: 'error',
              category: 'range',
            });
          }
          if (field.max !== undefined && value > field.max) {
            report.errors.push({
              ruleId: 'above_schema_maximum',
              field: field.id,
              message: `Value ${value} is above schema maximum ${field.max}`,
              severity: 'error',
              category: 'range',
            });
          }
        }
      }
    }
  }

  /**
   * Validate formats
   * 格式验证
   */
  private validateFormats(context: ValidationContext, report: ValidationReport): void {
    const { data } = context;

    // Email format
    const emailFields = ['email', 'contactEmail', 'userEmail'];
    for (const field of emailFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          report.errors.push({
            ruleId: 'invalid_email_format',
            field,
            message: `Invalid email format: ${value}`,
            severity: 'error',
            category: 'format',
          });
        }
      }
    }

    // Phone format
    const phoneFields = ['phone', 'contactPhone', 'mobile'];
    const phoneRegex = /^1[3-9]\d{9}$/; // Chinese mobile
    for (const field of phoneFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          report.warnings.push({
            ruleId: 'invalid_phone_format',
            field,
            message: `Phone number format may be invalid: ${value}`,
            severity: 'warning',
            category: 'format',
          });
        }
      }
    }

    // URL format
    const urlFields = ['url', 'website', 'link'];
    const urlRegex = /^https?:\/\/.+/;
    for (const field of urlFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        if (!urlRegex.test(value)) {
          report.warnings.push({
            ruleId: 'invalid_url_format',
            field,
            message: `URL should start with http:// or https://`,
            severity: 'warning',
            category: 'format',
          });
        }
      }
    }

    // Date format validation
    const dateFields = ['startTime', 'endTime', 'deadline'];
    for (const field of dateFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          report.errors.push({
            ruleId: 'invalid_date_format',
            field,
            message: `Invalid date format: ${value}`,
            severity: 'error',
            category: 'format',
          });
        }
      }
    }
  }

  /**
   * Apply custom rules
   */
  private applyCustomRules(context: ValidationContext, report: ValidationReport): void {
    // Global custom rules
    for (const rule of this.rules.values()) {
      try {
        const passed = rule.condition(context.data, context.schema, context.demand);
        if (!passed) {
          const issue: ValidationIssue = {
            ruleId: rule.id,
            message: rule.message,
            severity: rule.severity,
            category: rule.category,
          };

          if (rule.severity === 'error') {
            report.errors.push(issue);
          } else if (rule.severity === 'warning') {
            report.warnings.push(issue);
          } else {
            report.infos.push(issue);
          }
        }
      } catch (error) {
        logger.error(`Custom rule ${rule.id} failed`, { error });
      }
    }
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(data: L2Data, schema: L2Schema): number {
    if (schema.fields.length === 0) return 100;

    const requiredFields = schema.fields.filter(f => f.required);
    const optionalFields = schema.fields.filter(f => !f.required);

    let score = 0;

    // Required fields: 70% of score
    if (requiredFields.length > 0) {
      const filledRequired = requiredFields.filter(f => {
        const value = data[f.id];
        return value !== undefined && value !== null && value !== '';
      }).length;
      score += (filledRequired / requiredFields.length) * 70;
    } else {
      score += 70;
    }

    // Optional fields: 30% of score
    if (optionalFields.length > 0) {
      const filledOptional = optionalFields.filter(f => {
        const value = data[f.id];
        return value !== undefined && value !== null && value !== '';
      }).length;
      score += (filledOptional / optionalFields.length) * 30;
    } else {
      score += 30;
    }

    return Math.round(score);
  }

  /**
   * Determine if user confirmation is needed
   */
  private determineConfirmationNeeded(report: ValidationReport, options: ValidationOptions): void {
    if (options.strictMode && report.errors.length > 0) {
      report.confirmationNeeded = true;
      report.confirmationPrompt = `Found ${report.errors.length} errors. Please review and confirm.`;
      return;
    }

    // Confirmation needed if completeness is low
    if (report.summary.completenessScore < 50) {
      report.confirmationNeeded = true;
      report.confirmationPrompt = 'Information is incomplete. Please review and confirm or provide more details.';
      return;
    }

    // Confirmation needed if there are warnings
    if (report.warnings.length > 2) {
      report.confirmationNeeded = true;
      report.confirmationPrompt = 'There are some items that need attention. Please review before proceeding.';
      return;
    }

    report.confirmationNeeded = false;
  }

  /**
   * Register a custom validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Registered validation rule: ${rule.id}`);
  }

  /**
   * Register scene-specific rules
   */
  registerSceneRules(scene: string, rules: ValidationRule[]): void {
    this.sceneRules.set(scene, rules);
    logger.info(`Registered ${rules.length} rules for scene: ${scene}`);
  }

  /**
   * Get default validation options
   */
  private getDefaultOptions(): ValidationOptions {
    return {
      checkCompleteness: true,
      checkBusinessRules: true,
      checkRanges: true,
      checkFormats: true,
      strictMode: false,
      allowPartial: true,
    };
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Add some built-in rules
    this.rules.set('no_empty_fields', {
      id: 'no_empty_fields',
      name: 'No Empty Fields',
      description: 'Prevents empty string values',
      condition: (data) => {
        return !Object.values(data).some(v => v === '');
      },
      message: 'Empty values are not allowed',
      severity: 'warning',
      category: 'completeness',
    });
  }

  /**
   * Validate a single field
   */
  validateField(
    fieldId: string,
    value: any,
    schema: L2Schema
  ): FieldValidationResult {
    const field = schema.fields.find(f => f.id === fieldId);
    if (!field) {
      return {
        field: fieldId,
        valid: false,
        errors: [{
          ruleId: 'field_not_found',
          field: fieldId,
          message: `Field ${fieldId} not found in schema`,
          severity: 'error',
          category: 'completeness',
        }],
        warnings: [],
      };
    }

    const result: FieldValidationResult = {
      field: fieldId,
      valid: true,
      errors: [],
      warnings: [],
      value,
    };

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      result.errors.push({
        ruleId: 'required_field_missing',
        field: fieldId,
        message: `Field "${field.label}" is required`,
        severity: 'error',
        category: 'completeness',
      });
      result.valid = false;
    }

    // Type check
    if (value !== undefined && value !== null) {
      if (!this.validateFieldType(value, field.type)) {
        result.errors.push({
          ruleId: 'invalid_type',
          field: fieldId,
          message: `Invalid type for field "${field.label}"`,
          severity: 'error',
          category: 'format',
        });
        result.valid = false;
      }
    }

    return result;
  }
}

// Export singleton instance
export const extractionValidator = new ExtractionValidator();
