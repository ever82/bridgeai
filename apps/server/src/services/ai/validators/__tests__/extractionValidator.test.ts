/**
 * Extraction Validator Tests
 */

import { ExtractionValidator, ValidationResult, BusinessRule } from '../validators/extractionValidator';
import { L2Data } from '@visionshare/shared';

describe('ExtractionValidator', () => {
  let validator: ExtractionValidator;

  beforeEach(() => {
    validator = new ExtractionValidator();
  });

  describe('validate', () => {
    it('should validate required fields', () => {
      // VISIONSHARE requires contentType, purpose, skillLevel
      const data: L2Data = {
        // Missing required fields
        additionalInfo: 'some info',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.valid).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
    });

    it('should validate field types', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        // Invalid number type
        someNumber: 'not-a-number',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      // Should have validation errors for invalid types if the field exists in schema
      expect(result).toBeDefined();
    });

    it('should validate number ranges', () => {
      const data: L2Data = {
        // Using AGENTJOB which might have salary fields with ranges
        salaryMin: -1000,
        salaryMax: 999999999, // Unreasonably high
      };

      const result = validator.validate(data, 'AGENTJOB');

      // Should have business rule warnings
      expect(result.warnings.some(w => w.code === 'PRICE_REASONABLE')).toBe(true);
    });

    it('should validate enum values', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'invalid_purpose', // Not in enum options
        skillLevel: 'intermediate',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ENUM_VALUE')).toBe(true);
    });

    it('should validate multi-select values', () => {
      const data: L2Data = {
        contentType: ['photography', 'invalid_type'], // One invalid value
        purpose: 'share',
        skillLevel: 'intermediate',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      // Should have warnings for invalid multi-select values
      expect(result.warnings.some(w => w.code === 'INVALID_MULTI_SELECT_VALUES')).toBe(true);
    });

    it('should validate date format', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        deadline: 'invalid-date',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      // Should have errors for invalid dates
      expect(result.errors.some(e => e.field === 'deadline')).toBe(true);
    });

    it('should return valid for correct data', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.valid).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid scene', () => {
      const data: L2Data = { field: 'value' };
      const result = validator.validate(data, 'INVALID_SCENE');

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SCHEMA_NOT_FOUND');
    });

    it('should provide suggestions for invalid enum values', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'shar', // Typo of 'share'
        skillLevel: 'intermediate',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should validate text length constraints', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        additionalInfo: 'a'.repeat(1000), // Exceeds maxLength
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.errors.some(e => e.code === 'EXCEEDS_MAX_LENGTH')).toBe(true);
    });
  });

  describe('canProceed', () => {
    it('should return true for valid data', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
      };

      expect(validator.canProceed(data, 'VISIONSHARE')).toBe(true);
    });

    it('should return false for data with schema not found', () => {
      const data: L2Data = {};
      expect(validator.canProceed(data, 'INVALID_SCENE')).toBe(false);
    });
  });

  describe('getConfirmationSummary', () => {
    it('should return confirmation summary for data', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        budget: 50000, // High value that needs confirmation
      };

      const summary = validator.getConfirmationSummary(data, 'VISIONSHARE');

      expect(summary.isValid).toBe(true);
      expect(summary.confirmationItems.length).toBeGreaterThan(0);
      expect(summary.requiresConfirmation).toBe(true);
    });

    it('should mark high-value fields as needing confirmation', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        price: 100000, // High value
      };

      const summary = validator.getConfirmationSummary(data, 'VISIONSHARE');

      const priceItem = summary.confirmationItems.find(i => i.field === 'price');
      expect(priceItem?.needsConfirmation).toBe(true);
    });
  });

  describe('business rules', () => {
    it('should validate price reasonableness', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        price: -100, // Negative price
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.warnings.some(w => w.code === 'PRICE_REASONABLE')).toBe(true);
    });

    it('should validate date is in reasonable range', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        deadline: '1990-01-01', // Date in distant past
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.errors.some(e => e.code === 'DATE_VALID')).toBe(true);
    });

    it('should validate age range', () => {
      const data: L2Data = {
        age: 200, // Unreasonable age
      };

      const result = validator.validate(data, 'AGENTDATE');

      expect(result.errors.some(e => e.code === 'AGE_VALID')).toBe(true);
    });
  });

  describe('addBusinessRule', () => {
    it('should add custom business rule', () => {
      const customRule: BusinessRule = {
        id: 'custom_rule',
        name: 'Custom Rule',
        description: 'Test custom rule',
        condition: (data) => data.customField === 'expected',
        errorMessage: 'Custom field must be expected',
        severity: 'error',
      };

      validator.addBusinessRule(customRule);

      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
        customField: 'unexpected',
      };

      const result = validator.validate(data, 'VISIONSHARE');

      expect(result.errors.some(e => e.code === 'CUSTOM_RULE')).toBe(true);
    });
  });

  describe('applyCorrections', () => {
    it('should apply corrections to data', () => {
      const data: L2Data = {
        contentType: ['photography'],
        purpose: 'share',
        skillLevel: 'intermediate',
      };

      const corrections = {
        purpose: 'collaborate',
      };

      const result = validator.applyCorrections(data, corrections);

      expect(result.contentType).toEqual(['photography']);
      expect(result.purpose).toBe('collaborate');
      expect(result.skillLevel).toBe('intermediate');
    });
  });

  describe('getFieldErrors', () => {
    it('should return errors for specific fields', () => {
      const result: ValidationResult = {
        valid: false,
        isComplete: false,
        canProceed: false,
        errors: [
          { field: 'field1', message: 'error1', code: 'CODE1' },
          { field: 'field2', message: 'error2', code: 'CODE2' },
          { field: 'general', message: 'general error', code: 'GENERAL' },
        ],
        warnings: [],
        missingRequired: [],
        invalidFields: [],
        suggestions: [],
      };

      const fieldErrors = validator.getFieldErrors(result, ['field1']);

      expect(fieldErrors).toHaveLength(1);
      expect(fieldErrors[0].field).toBe('field1');
    });

    it('should return all errors when no fieldIds specified', () => {
      const result: ValidationResult = {
        valid: false,
        isComplete: false,
        canProceed: false,
        errors: [
          { field: 'field1', message: 'error1', code: 'CODE1' },
          { field: 'field2', message: 'error2', code: 'CODE2' },
        ],
        warnings: [],
        missingRequired: [],
        invalidFields: [],
        suggestions: [],
      };

      const fieldErrors = validator.getFieldErrors(result);

      expect(fieldErrors).toHaveLength(2);
    });
  });

  describe('areFieldsValid', () => {
    it('should return true when all fields are valid', () => {
      const result: ValidationResult = {
        valid: true,
        isComplete: true,
        canProceed: true,
        errors: [],
        warnings: [],
        missingRequired: [],
        invalidFields: [],
        suggestions: [],
      };

      expect(validator.areFieldsValid(result, ['field1', 'field2'])).toBe(true);
    });

    it('should return false when any field has errors', () => {
      const result: ValidationResult = {
        valid: false,
        isComplete: false,
        canProceed: false,
        errors: [
          { field: 'field1', message: 'error1', code: 'CODE1' },
        ],
        warnings: [],
        missingRequired: [],
        invalidFields: [],
        suggestions: [],
      };

      expect(validator.areFieldsValid(result, ['field1', 'field2'])).toBe(false);
    });
  });
});
