/**
 * L2 Validation Tests
 */
jest.mock('@bridgeai/shared', () => {
  const actual = jest.requireActual('@bridgeai/shared');
  return {
    ...actual,
    // Ensure L2FieldType is always available even if package not built
    L2FieldType: actual.L2FieldType ?? {
      TEXT: 'TEXT',
      LONG_TEXT: 'LONG_TEXT',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN',
      ENUM: 'ENUM',
      MULTI_SELECT: 'MULTI_SELECT',
      RANGE: 'RANGE',
      DATE: 'DATE',
      IMAGE: 'IMAGE',
      LOCATION: 'LOCATION',
    },
  };
});

import {
  L2Schema,
  L2FieldType,
  L2Data,
} from '@bridgeai/shared';

import {
  validateL2Data,
  getFieldValueLabel,
  calculateL2Completion,
} from '../l2Validation';

const mockSchema: L2Schema = {
  id: 'test-schema',
  version: '1.0.0',
  scene: 'TEST',
  title: 'Test Schema',
  fields: [
    {
      id: 'name',
      type: L2FieldType.TEXT,
      label: '名称',
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    {
      id: 'description',
      type: L2FieldType.LONG_TEXT,
      label: '描述',
      required: false,
      maxLength: 500,
    },
    {
      id: 'category',
      type: L2FieldType.ENUM,
      label: '分类',
      required: true,
      options: [
        { value: 'a', label: '选项A' },
        { value: 'b', label: '选项B' },
      ],
    },
    {
      id: 'tags',
      type: L2FieldType.MULTI_SELECT,
      label: '标签',
      required: false,
      options: [
        { value: 'tag1', label: '标签1' },
        { value: 'tag2', label: '标签2' },
      ],
    },
    {
      id: 'count',
      type: L2FieldType.NUMBER,
      label: '数量',
      required: true,
      min: 0,
      max: 100,
    },
    {
      id: 'priceRange',
      type: L2FieldType.RANGE,
      label: '价格范围',
      required: false,
      min: 0,
      max: 10000,
    },
    {
      id: 'isActive',
      type: L2FieldType.BOOLEAN,
      label: '是否激活',
      required: false,
    },
  ],
};

describe('validateL2Data', () => {
  it('should pass with valid data', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail with missing required fields', () => {
    const data: L2Data = {};

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const nameError = result.errors.find(e => e.field === 'name');
    expect(nameError).toBeDefined();
    expect(nameError?.code).toBe('REQUIRED');

    const categoryError = result.errors.find(e => e.field === 'category');
    expect(categoryError).toBeDefined();
    expect(categoryError?.code).toBe('REQUIRED');
  });

  it('should validate text minLength', () => {
    const data: L2Data = {
      name: 'A',
      category: 'a',
      count: 50,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'name');
    expect(error?.code).toBe('MIN_LENGTH');
  });

  it('should validate text maxLength', () => {
    const data: L2Data = {
      name: 'A'.repeat(51),
      category: 'a',
      count: 50,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'name');
    expect(error?.code).toBe('MAX_LENGTH');
  });

  it('should validate enum values', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'invalid',
      count: 50,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'category');
    expect(error?.code).toBe('INVALID_OPTION');
  });

  it('should validate number min/max', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 150,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'count');
    expect(error?.code).toBe('MAX_VALUE');
  });

  it('should validate multi-select options', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
      tags: ['tag1', 'invalid'],
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'tags');
    expect(error?.code).toBe('INVALID_OPTIONS');
  });

  it('should allow optional fields to be empty', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(true);
  });

  it('should validate range values', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
      priceRange: { min: 100, max: 50 },
    };

    const result = validateL2Data(data, mockSchema);
    expect(result.valid).toBe(false);

    const error = result.errors.find(e => e.field === 'priceRange');
    expect(error?.code).toBe('INVALID_RANGE');
  });
});

describe('getFieldValueLabel', () => {
  it('should return label for enum value', () => {
    const field = mockSchema.fields[2]; // category field
    const label = getFieldValueLabel(field, 'a');
    expect(label).toBe('选项A');
  });

  it('should return labels for multi-select values', () => {
    const field = mockSchema.fields[3]; // tags field
    const label = getFieldValueLabel(field, ['tag1', 'tag2']);
    expect(label).toBe('标签1, 标签2');
  });

  it('should return 是/否 for boolean values', () => {
    const field = mockSchema.fields[6]; // isActive field
    expect(getFieldValueLabel(field, true)).toBe('是');
    expect(getFieldValueLabel(field, false)).toBe('否');
  });

  it('should return range string for range values', () => {
    const field = mockSchema.fields[5]; // priceRange field
    const label = getFieldValueLabel(field, { min: 10, max: 100 });
    expect(label).toBe('10 - 100');
  });

  it('should return empty string for null/undefined', () => {
    const field = mockSchema.fields[0];
    expect(getFieldValueLabel(field, null)).toBe('');
    expect(getFieldValueLabel(field, undefined)).toBe('');
  });
});

describe('calculateL2Completion', () => {
  it('should calculate 100% when all required fields filled', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
    };

    const result = calculateL2Completion(data, mockSchema);
    expect(result.percentage).toBe(100);
    expect(result.filled).toBe(3);
    expect(result.total).toBe(3);
  });

  it('should calculate 67% when 2 of 3 required fields filled', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
    };

    const result = calculateL2Completion(data, mockSchema);
    expect(result.percentage).toBe(67);
    expect(result.filled).toBe(2);
    expect(result.total).toBe(3);
  });

  it('should calculate 0% when no required fields filled', () => {
    const data: L2Data = {};

    const result = calculateL2Completion(data, mockSchema);
    expect(result.percentage).toBe(0);
    expect(result.filled).toBe(0);
    expect(result.total).toBe(3);
  });

  it('should ignore optional fields in calculation', () => {
    const data: L2Data = {
      name: 'Test',
      category: 'a',
      count: 50,
      description: '',
      tags: [],
    };

    const result = calculateL2Completion(data, mockSchema);
    expect(result.percentage).toBe(100);
    expect(result.total).toBe(3);
  });
});
