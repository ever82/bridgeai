/**
 * Extraction Validator Tests
 */

import { ExtractionValidator, ValidationRule, ValidationOptions } from '../extractionValidator';
import { L2Schema, L2Data, L2FieldType } from '@visionshare/shared';
import { Demand } from '../../demandExtractionService';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ExtractionValidator', () => {
  let validator: ExtractionValidator;

  const mockSchema: L2Schema = {
    id: 'test-schema',
    version: '1.0.0',
    scene: 'test-scene',
    title: 'Test Schema',
    fields: [
      {
        id: 'title',
        type: L2FieldType.TEXT,
        label: 'Title',
        required: true,
        maxLength: 100,
      },
      {
        id: 'description',
        type: L2FieldType.LONG_TEXT,
        label: 'Description',
        required: false,
        minLength: 10,
        maxLength: 1000,
      },
      {
        id: 'budget',
        type: L2FieldType.NUMBER,
        label: 'Budget',
        required: false,
        min: 0,
        max: 100000,
      },
      {
        id: 'serviceType',
        type: L2FieldType.ENUM,
        label: 'Service Type',
        required: true,
        options: [
          { value: 'photography', label: '摄影' },
          { value: 'video', label: '摄像' },
        ],
      },
      {
        id: 'tags',
        type: L2FieldType.MULTI_SELECT,
        label: 'Tags',
        required: false,
        options: [
          { value: 'indoor', label: '室内' },
          { value: 'outdoor', label: '室外' },
        ],
      },
      {
        id: 'priceRange',
        type: L2FieldType.RANGE,
        label: 'Price Range',
        required: false,
        min: 0,
        max: 10000,
      },
      {
        id: 'isUrgent',
        type: L2FieldType.BOOLEAN,
        label: 'Is Urgent',
        required: false,
      },
      {
        id: 'email',
        type: L2FieldType.TEXT,
        label: 'Email',
        required: false,
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          message: 'Invalid email format',
        },
      },
    ],
  };

  beforeEach(() => {
    validator = new ExtractionValidator();
  });

  describe('validate', () => {
    it('should validate complete data', () => {
      const data: L2Data = {
        title: '测试需求',
        serviceType: 'photography',
        budget: 5000,
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.summary.completenessScore).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const data: L2Data = {};

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(2); // title and serviceType
      expect(report.errors.some(e => e.field === 'title')).toBe(true);
      expect(report.errors.some(e => e.field === 'serviceType')).toBe(true);
    });

    it('should validate enum values', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'invalid-type',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.field === 'serviceType')).toBe(true);
    });

    it('should validate multi-select values', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        tags: ['indoor', 'invalid-tag'],
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.field === 'tags')).toBe(true);
    });

    it('should validate number ranges', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        budget: -100,
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.field === 'budget')).toBe(true);
    });

    it('should validate range type fields', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        priceRange: { min: 2000, max: 1000 }, // Invalid: min > max
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.field === 'priceRange')).toBe(true);
    });

    it('should validate text length', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        description: '短', // Too short
      };

      const report = validator.validate(data, mockSchema);

      expect(report.warnings.some(e => e.field === 'description')).toBe(true);
    });

    it('should validate email format', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        email: 'invalid-email',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should validate valid email', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        email: 'test@example.com',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.errors.some(e => e.field === 'email')).toBe(false);
    });

    it('should validate boolean values', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        isUrgent: true,
      };

      const report = validator.validate(data, mockSchema);

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('should calculate completeness score', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        budget: 5000,
        description: '这是一个详细的需求描述',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.summary.completenessScore).toBeGreaterThan(50);
      expect(report.summary.completenessScore).toBeLessThanOrEqual(100);
    });

    it('should calculate completeness score for partial data', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.summary.completenessScore).toBeGreaterThan(0);
      expect(report.summary.completenessScore).toBeLessThan(100);
    });
  });

  describe('business rules', () => {
    it('should warn about wide budget ranges', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        budgetMin: 100,
        budgetMax: 10000,
      };

      const report = validator.validate(data, mockSchema, undefined, {
        checkBusinessRules: true,
      });

      expect(report.warnings.some(w => w.ruleId === 'budget_range_too_wide')).toBe(true);
    });

    it('should warn about invalid budget range', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        budgetMin: 2000,
        budgetMax: 1000,
      };

      const report = validator.validate(data, mockSchema, undefined, {
        checkBusinessRules: true,
      });

      expect(report.errors.some(e => e.ruleId === 'invalid_budget_range')).toBe(true);
    });

    it('should warn about time in past', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        startTime: '2020-01-01T00:00:00Z',
        endTime: '2020-01-01T01:00:00Z',
      };

      const report = validator.validate(data, mockSchema, undefined, {
        checkBusinessRules: true,
      });

      expect(report.warnings.some(w => w.ruleId === 'time_in_past')).toBe(true);
    });

    it('should warn about very short duration', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes later

      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        startTime: now.toISOString(),
        endTime: later.toISOString(),
      };

      const report = validator.validate(data, mockSchema, undefined, {
        checkBusinessRules: true,
      });

      expect(report.warnings.some(w => w.ruleId === 'very_short_duration')).toBe(true);
    });
  });

  describe('options', () => {
    it('should skip completeness check when disabled', () => {
      const data: L2Data = {};

      const report = validator.validate(data, mockSchema, undefined, {
        checkCompleteness: false,
      });

      expect(report.errors.filter(e => e.ruleId === 'required_field_missing')).toHaveLength(0);
    });

    it('should skip business rules when disabled', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        budgetMin: 100,
        budgetMax: 1000000,
      };

      const report = validator.validate(data, mockSchema, undefined, {
        checkBusinessRules: false,
      });

      expect(report.warnings.some(w => w.ruleId === 'budget_range_too_wide')).toBe(false);
    });

    it('should require confirmation in strict mode with errors', () => {
      const data: L2Data = {};

      const report = validator.validate(data, mockSchema, undefined, {
        strictMode: true,
      });

      expect(report.confirmationNeeded).toBe(true);
    });

    it('should require confirmation with low completeness', () => {
      const data: L2Data = {
        title: '',
        serviceType: '',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.confirmationNeeded).toBe(true);
    });
  });

  describe('custom rules', () => {
    it('should apply custom validation rules', () => {
      const customRule: ValidationRule = {
        id: 'custom_rule',
        name: 'Custom Rule',
        description: 'Test custom rule',
        condition: (data) => data.title === 'allowed',
        message: 'Title must be "allowed"',
        severity: 'error',
        category: 'business',
      };

      validator.registerRule(customRule);

      const data: L2Data = {
        title: 'not-allowed',
        serviceType: 'photography',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.errors.some(e => e.ruleId === 'custom_rule')).toBe(true);
    });

    it('should apply scene-specific rules', () => {
      const sceneRule: ValidationRule = {
        id: 'scene_rule',
        name: 'Scene Rule',
        description: 'Scene-specific rule',
        condition: (data) => true,
        message: 'Scene rule triggered',
        severity: 'warning',
        category: 'business',
      };

      validator.registerSceneRules('test-scene', [sceneRule]);

      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
      };

      const report = validator.validate(data, mockSchema);

      expect(report.warnings.some(w => w.ruleId === 'scene_rule')).toBe(true);
    });
  });

  describe('validateField', () => {
    it('should validate a single field', () => {
      const result = validator.validateField('title', 'Test Title', mockSchema);

      expect(result.valid).toBe(true);
      expect(result.field).toBe('title');
    });

    it('should detect missing required field', () => {
      const result = validator.validateField('title', '', mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle unknown field', () => {
      const result = validator.validateField('unknown', 'value', mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].ruleId).toBe('field_not_found');
    });

    it('should validate field type', () => {
      const result = validator.validateField('budget', 'not-a-number', mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.ruleId === 'invalid_type')).toBe(true);
    });
  });

  describe('summary', () => {
    it('should count errors correctly', () => {
      const data: L2Data = {};

      const report = validator.validate(data, mockSchema);

      expect(report.summary.errorCount).toBe(report.errors.length);
    });

    it('should count warnings correctly', () => {
      const data: L2Data = {
        title: '测试',
        serviceType: 'photography',
        description: '短',
        budget: -100,
      };

      const report = validator.validate(data, mockSchema);

      expect(report.summary.warningCount).toBeGreaterThan(0);
    });

    it('should calculate total issues', () => {
      const data: L2Data = {};

      const report = validator.validate(data, mockSchema);

      expect(report.summary.totalIssues).toBe(
        report.summary.errorCount + report.summary.warningCount + report.summary.infoCount
      );
    });
  });
});
