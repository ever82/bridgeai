/**
 * Extraction Validator
 * 提取结果验证系统
 *
 * Provides:
 * - Field completeness checking
 * - Business rule validation
 * - Range validation (budget, etc.)
 * - Enum validity checking
 * - User confirmation flow support
 * - Extraction result correction support
 */

import {
  L2Schema,
  L2Data,
  L2FieldType,
  L2ValidationError,
  L2FieldOption,
  getL2Schema,
} from '@visionshare/shared';
import logger from '../../../utils/logger';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  isComplete: boolean;
  canProceed: boolean;
  errors: L2ValidationError[];
  warnings: L2ValidationError[];
  missingRequired: string[];
  invalidFields: string[];
  suggestions: Array<{
    field: string;
    suggestion: string;
    confidence: number;
  }>;
}

/**
 * Business rule
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: (data: L2Data) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

/**
 * Field validation rule
 */
export interface FieldValidationRule {
  field: string;
  validate: (value: any, data: L2Data) => { valid: boolean; message?: string };
}

/**
 * Confirmation status
 */
export interface ConfirmationStatus {
  extractionId: string;
  confirmed: boolean;
  confirmedFields: string[];
  correctedFields: Array<{
    field: string;
    originalValue: any;
    correctedValue: any;
  }>;
  rejectedFields: string[];
  confirmedAt?: Date;
}

/**
 * Extraction Validator
 */
export class ExtractionValidator {
  private businessRules: Map<string, BusinessRule> = new Map();
  private customRules: Map<string, FieldValidationRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default validation rules
   */
  private registerDefaultRules(): void {
    // Range validation: min <= max
    this.addCustomRule({
      field: 'range_validation',
      validate: (value: any, data: L2Data) => {
        if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
          if (value.min > value.max) {
            return { valid: false, message: 'Minimum value cannot be greater than maximum' };
          }
        }
        return { valid: true };
      },
    });

    // Price reasonableness check
    this.addBusinessRule({
      id: 'price_reasonable',
      name: 'Price Reasonableness',
      description: 'Check if price is within reasonable range',
      condition: (data: L2Data) => {
        const price = this.getNumericValue(data, ['price', 'budget', 'salary', 'amount']);
        if (price === undefined) return true;
        return price >= 0 && price <= 100000000; // Reasonable max: 100 million
      },
      errorMessage: 'Price seems unreasonable (too high or negative)',
      severity: 'warning',
    });

    // Date range validation
    this.addBusinessRule({
      id: 'date_valid',
      name: 'Date Validity',
      description: 'Check if date is valid and not in the distant past',
      condition: (data: L2Data) => {
        const dateStr = this.getStringValue(data, ['date', 'deadline', 'startDate', 'endDate']);
        if (!dateStr) return true;

        try {
          const date = new Date(dateStr);
          const now = new Date();
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const tenYearsLater = new Date();
          tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);

          return date >= oneYearAgo && date <= tenYearsLater;
        } catch {
          return false;
        }
      },
      errorMessage: 'Date is invalid or outside reasonable range',
      severity: 'error',
    });

    // Age validation
    this.addBusinessRule({
      id: 'age_valid',
      name: 'Age Validity',
      description: 'Check if age is within valid range',
      condition: (data: L2Data) => {
        const age = this.getNumericValue(data, ['age', 'minAge', 'maxAge']);
        if (age === undefined) return true;
        return age >= 0 && age <= 150;
      },
      errorMessage: 'Age must be between 0 and 150',
      severity: 'error',
    });
  }

  /**
   * Validate extracted data against schema
   *
   * @param data - Extracted L2 data
   * @param scene - Scene code for schema lookup
   * @returns ValidationResult - Validation result with errors and warnings
   */
  validate(data: L2Data, scene: string): ValidationResult {
    const schema = getL2Schema(scene);

    if (!schema) {
      return {
        valid: false,
        isComplete: false,
        canProceed: false,
        errors: [{
          field: 'scene',
          message: `Schema not found for scene: ${scene}`,
          code: 'SCHEMA_NOT_FOUND',
        }],
        warnings: [],
        missingRequired: [],
        invalidFields: [],
        suggestions: [],
      };
    }

    const errors: L2ValidationError[] = [];
    const warnings: L2ValidationError[] = [];
    const missingRequired: string[] = [];
    const invalidFields: string[] = [];
    const suggestions: Array<{ field: string; suggestion: string; confidence: number }> = [];

    // Check each field
    for (const field of schema.fields) {
      const value = data[field.id];

      // Required field check
      if (field.required && (value === undefined || value === null || value === '')) {
        missingRequired.push(field.id);
        errors.push({
          field: field.id,
          message: `${field.label} is required`,
          code: 'REQUIRED_FIELD_MISSING',
        });
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type-specific validation
      const typeValidation = this.validateFieldType(value, field);
      if (!typeValidation.valid) {
        invalidFields.push(field.id);
        errors.push({
          field: field.id,
          message: typeValidation.message || `${field.label} has invalid format`,
          code: 'INVALID_FIELD_FORMAT',
        });
      }

      // Range validation for numbers
      if (field.type === L2FieldType.NUMBER && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${field.min}`,
            code: 'BELOW_MINIMUM',
          });
        }
        if (field.max !== undefined && value > field.max) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at most ${field.max}`,
            code: 'EXCEEDS_MAXIMUM',
          });
        }
      }

      // Text length validation
      if ((field.type === L2FieldType.TEXT || field.type === L2FieldType.LONG_TEXT) &&
          typeof value === 'string') {
        if (field.minLength !== undefined && value.length < field.minLength) {
          warnings.push({
            field: field.id,
            message: `${field.label} should have at least ${field.minLength} characters`,
            code: 'BELOW_MIN_LENGTH',
          });
        }
        if (field.maxLength !== undefined && value.length > field.maxLength) {
          errors.push({
            field: field.id,
            message: `${field.label} exceeds maximum length of ${field.maxLength}`,
            code: 'EXCEEDS_MAX_LENGTH',
          });
        }
      }

      // Enum validity check
      if (field.type === L2FieldType.ENUM && field.options) {
        const validValues = field.options.map(o => o.value);
        if (!validValues.includes(value as string)) {
          invalidFields.push(field.id);
          errors.push({
            field: field.id,
            message: `${field.label} must be one of: ${validValues.join(', ')}`,
            code: 'INVALID_ENUM_VALUE',
          });
          // Suggest closest match
          const suggestion = this.findClosestMatch(value as string, field.options);
          if (suggestion) {
            suggestions.push({
              field: field.id,
              suggestion: `Did you mean "${suggestion}"?`,
              confidence: 0.8,
            });
          }
        }
      }

      // Multi-select validity check
      if (field.type === L2FieldType.MULTI_SELECT && field.options) {
        if (Array.isArray(value)) {
          const validValues = field.options.map(o => o.value);
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            invalidFields.push(field.id);
            warnings.push({
              field: field.id,
              message: `Invalid values in ${field.label}: ${invalidValues.join(', ')}`,
              code: 'INVALID_MULTI_SELECT_VALUES',
            });
          }
        }
      }

      // Pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.id,
            message: field.validation.message || `${field.label} format is invalid`,
            code: 'PATTERN_MISMATCH',
          });
        }
      }

      // Custom rule validation
      const customRule = this.customRules.get(field.id);
      if (customRule) {
        const customResult = customRule.validate(value, data);
        if (!customResult.valid) {
          errors.push({
            field: field.id,
            message: customResult.message || `${field.label} failed custom validation`,
            code: 'CUSTOM_VALIDATION_FAILED',
          });
        }
      }
    }

    // Run business rules
    for (const rule of this.businessRules.values()) {
      if (!rule.condition(data)) {
        const error = {
          field: 'business_rule',
          message: rule.errorMessage,
          code: rule.id.toUpperCase(),
        };
        if (rule.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
    }

    const valid = errors.length === 0;
    const isComplete = missingRequired.length === 0;
    const canProceed = valid || (isComplete && errors.every(e =>
      !['SCHEMA_NOT_FOUND', 'REQUIRED_FIELD_MISSING'].includes(e.code)
    ));

    return {
      valid,
      isComplete,
      canProceed,
      errors,
      warnings,
      missingRequired,
      invalidFields,
      suggestions,
    };
  }

  /**
   * Validate a single field value based on its type
   */
  private validateFieldType(value: any, field: { type: L2FieldType }): { valid: boolean; message?: string } {
    switch (field.type) {
      case L2FieldType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, message: 'Value must be a number' };
        }
        return { valid: true };

      case L2FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return { valid: false, message: 'Value must be a boolean' };
        }
        return { valid: true };

      case L2FieldType.TEXT:
      case L2FieldType.LONG_TEXT:
        if (typeof value !== 'string') {
          return { valid: false, message: 'Value must be a string' };
        }
        return { valid: true };

      case L2FieldType.ENUM:
        if (typeof value !== 'string') {
          return { valid: false, message: 'Value must be a string' };
        }
        return { valid: true };

      case L2FieldType.MULTI_SELECT:
        if (!Array.isArray(value)) {
          return { valid: false, message: 'Value must be an array' };
        }
        return { valid: true };

      case L2FieldType.RANGE:
        if (typeof value !== 'object' || value === null) {
          return { valid: false, message: 'Value must be an object' };
        }
        if (!('min' in value) || !('max' in value)) {
          return { valid: false, message: 'Range must have min and max' };
        }
        if (value.min > value.max) {
          return { valid: false, message: 'Min cannot be greater than max' };
        }
        return { valid: true };

      case L2FieldType.DATE:
      case L2FieldType.TIME:
      case L2FieldType.DATETIME:
        if (typeof value !== 'string') {
          return { valid: false, message: 'Value must be a string' };
        }
        if (isNaN(Date.parse(value))) {
          return { valid: false, message: 'Invalid date format' };
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  }

  /**
   * Find closest matching option using simple string similarity
   */
  private findClosestMatch(value: string, options: L2FieldOption[]): string | null {
    const lowerValue = value.toLowerCase();
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const option of options) {
      // Check value match
      if (option.value.toLowerCase().includes(lowerValue) ||
          lowerValue.includes(option.value.toLowerCase())) {
        const score = Math.min(option.value.length, lowerValue.length) /
                      Math.max(option.value.length, lowerValue.length);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = option.value;
        }
      }

      // Check label match
      if (option.label.toLowerCase().includes(lowerValue) ||
          lowerValue.includes(option.label.toLowerCase())) {
        const score = Math.min(option.label.length, lowerValue.length) /
                      Math.max(option.label.length, lowerValue.length);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = option.value;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get numeric value from data using possible field names
   */
  private getNumericValue(data: L2Data, possibleNames: string[]): number | undefined {
    for (const name of possibleNames) {
      const value = data[name];
      if (typeof value === 'number') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Get string value from data using possible field names
   */
  private getStringValue(data: L2Data, possibleNames: string[]): string | undefined {
    for (const name of possibleNames) {
      const value = data[name];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Add a business rule
   */
  addBusinessRule(rule: BusinessRule): void {
    this.businessRules.set(rule.id, rule);
    logger.info('Business rule registered', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove a business rule
   */
  removeBusinessRule(ruleId: string): void {
    this.businessRules.delete(ruleId);
    logger.info('Business rule removed', { ruleId });
  }

  /**
   * Add a custom field validation rule
   */
  addCustomRule(rule: FieldValidationRule): void {
    this.customRules.set(rule.field, rule);
  }

  /**
   * Check if data can proceed to next step
   */
  canProceed(data: L2Data, scene: string): boolean {
    const result = this.validate(data, scene);
    return result.canProceed;
  }

  /**
   * Get validation summary for user confirmation
   */
  getConfirmationSummary(data: L2Data, scene: string): {
    isValid: boolean;
    requiresConfirmation: boolean;
    confirmationItems: Array<{
      field: string;
      value: any;
      needsConfirmation: boolean;
      reason: string;
    }>;
  } {
    const schema = getL2Schema(scene);
    if (!schema) {
      return {
        isValid: false,
        requiresConfirmation: true,
        confirmationItems: [],
      };
    }

    const confirmationItems: Array<{
      field: string;
      value: any;
      needsConfirmation: boolean;
      reason: string;
    }> = [];

    for (const field of schema.fields) {
      const value = data[field.id];

      if (value !== undefined && value !== null) {
        // Check if field typically needs confirmation
        const needsConfirmation = this.fieldNeedsConfirmation(field.id, value);
        confirmationItems.push({
          field: field.id,
          value,
          needsConfirmation,
          reason: needsConfirmation ? 'High-impact field - please confirm' : '',
        });
      }
    }

    const validation = this.validate(data, scene);

    return {
      isValid: validation.valid,
      requiresConfirmation: confirmationItems.some(i => i.needsConfirmation) || !validation.valid,
      confirmationItems,
    };
  }

  /**
   * Determine if a field needs confirmation based on its value
   */
  private fieldNeedsConfirmation(fieldId: string, value: any): boolean {
    // Fields that typically need confirmation
    const highImpactFields = ['price', 'budget', 'salary', 'quantity', 'deadline'];

    if (highImpactFields.some(f => fieldId.toLowerCase().includes(f))) {
      return true;
    }

    // Large numeric values need confirmation
    if (typeof value === 'number' && value > 10000) {
      return true;
    }

    return false;
  }

  /**
   * Record confirmation status
   */
  recordConfirmation(status: ConfirmationStatus): void {
    logger.info('Extraction confirmation recorded', {
      extractionId: status.extractionId,
      confirmed: status.confirmed,
      confirmedFields: status.confirmedFields.length,
      correctedFields: status.correctedFields.length,
    });
  }

  /**
   * Apply corrections to data
   */
  applyCorrections(data: L2Data, corrections: Record<string, any>): L2Data {
    return {
      ...data,
      ...corrections,
    };
  }

  /**
   * Get validation errors for specific fields
   */
  getFieldErrors(result: ValidationResult, fieldIds?: string[]): L2ValidationError[] {
    if (!fieldIds) {
      return result.errors;
    }
    return result.errors.filter(e => fieldIds.includes(e.field));
  }

  /**
   * Check if specific fields are valid
   */
  areFieldsValid(result: ValidationResult, fieldIds: string[]): boolean {
    return fieldIds.every(fieldId =>
      !result.errors.some(e => e.field === fieldId)
    );
  }
}

// Export singleton instance
export const extractionValidator = new ExtractionValidator();
