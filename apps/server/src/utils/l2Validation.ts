import {
  L2Schema,
  L2SchemaField,
  L2FieldType,
  L2Data,
  L2ValidationResult,
  L2ValidationError,
} from '@bridgeai/shared';

/**
 * Validate L2 data against schema
 */
export function validateL2Data(
  data: L2Data,
  schema: L2Schema
): L2ValidationResult {
  const errors: L2ValidationError[] = [];

  for (const field of schema.fields) {
    const value = data[field.id];
    const fieldErrors = validateField(value, field, data);
    errors.push(...fieldErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field
 */
function validateField(
  value: any,
  field: L2SchemaField,
  allData: L2Data
): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  // Check if field should be shown (conditional logic)
  if (field.showWhen) {
    const { field: depField, operator, value: expectedValue } = field.showWhen;
    const actualValue = allData[depField];
    let shouldShow = false;

    switch (operator) {
      case 'eq':
        shouldShow = actualValue === expectedValue;
        break;
      case 'neq':
        shouldShow = actualValue !== expectedValue;
        break;
      case 'in':
        shouldShow = Array.isArray(expectedValue)
          ? expectedValue.includes(actualValue)
          : actualValue === expectedValue;
        break;
      case 'contains':
        shouldShow = Array.isArray(actualValue)
          ? actualValue.includes(expectedValue)
          : String(actualValue).includes(String(expectedValue));
        break;
    }

    if (!shouldShow) {
      return errors; // Skip validation for hidden fields
    }
  }

  // Check required
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push({
      field: field.id,
      message: `${field.label} 是必填项`,
      code: 'REQUIRED',
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // Type-specific validation
  switch (field.type) {
    case L2FieldType.TEXT:
    case L2FieldType.LONG_TEXT:
      errors.push(...validateText(value, field));
      break;

    case L2FieldType.NUMBER:
    case L2FieldType.RANGE:
      errors.push(...validateNumber(value, field));
      break;

    case L2FieldType.ENUM:
      errors.push(...validateEnum(value, field));
      break;

    case L2FieldType.MULTI_SELECT:
      errors.push(...validateMultiSelect(value, field));
      break;

    case L2FieldType.BOOLEAN:
      errors.push(...validateBoolean(value, field));
      break;

    case L2FieldType.DATE:
    case L2FieldType.TIME:
    case L2FieldType.DATETIME:
      errors.push(...validateDateTime(value, field));
      break;
  }

  // Pattern validation
  if (field.validation?.pattern && typeof value === 'string') {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value)) {
      errors.push({
        field: field.id,
        message: field.validation.message || `${field.label} 格式不正确`,
        code: 'PATTERN',
      });
    }
  }

  return errors;
}

/**
 * Validate text fields
 */
function validateText(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];
  const strValue = String(value);

  if (field.minLength !== undefined && strValue.length < field.minLength) {
    errors.push({
      field: field.id,
      message: `${field.label} 至少需要 ${field.minLength} 个字符`,
      code: 'MIN_LENGTH',
    });
  }

  if (field.maxLength !== undefined && strValue.length > field.maxLength) {
    errors.push({
      field: field.id,
      message: `${field.label} 最多 ${field.maxLength} 个字符`,
      code: 'MAX_LENGTH',
    });
  }

  return errors;
}

/**
 * Validate number/range fields
 */
function validateNumber(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  // Handle range object { min, max }
  if (typeof value === 'object' && value !== null) {
    if (field.min !== undefined && value.min < field.min) {
      errors.push({
        field: field.id,
        message: `${field.label} 最小值不能低于 ${field.min}`,
        code: 'MIN_VALUE',
      });
    }
    if (field.max !== undefined && value.max > field.max) {
      errors.push({
        field: field.id,
        message: `${field.label} 最大值不能超过 ${field.max}`,
        code: 'MAX_VALUE',
      });
    }
    if (value.min > value.max) {
      errors.push({
        field: field.id,
        message: `${field.label} 最小值不能大于最大值`,
        code: 'INVALID_RANGE',
      });
    }
  } else {
    // Handle simple number
    const numValue = Number(value);
    if (isNaN(numValue)) {
      errors.push({
        field: field.id,
        message: `${field.label} 必须是数字`,
        code: 'INVALID_NUMBER',
      });
    } else {
      if (field.min !== undefined && numValue < field.min) {
        errors.push({
          field: field.id,
          message: `${field.label} 不能小于 ${field.min}`,
          code: 'MIN_VALUE',
        });
      }
      if (field.max !== undefined && numValue > field.max) {
        errors.push({
          field: field.id,
          message: `${field.label} 不能大于 ${field.max}`,
          code: 'MAX_VALUE',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate enum fields
 */
function validateEnum(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  if (!field.options) {
    return errors;
  }

  const validValues = field.options.map(opt => opt.value);
  if (!validValues.includes(value)) {
    errors.push({
      field: field.id,
      message: `${field.label} 的值无效`,
      code: 'INVALID_OPTION',
    });
  }

  return errors;
}

/**
 * Validate multi-select fields
 */
function validateMultiSelect(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  if (!Array.isArray(value)) {
    errors.push({
      field: field.id,
      message: `${field.label} 必须是数组`,
      code: 'INVALID_TYPE',
    });
    return errors;
  }

  if (!field.options) {
    return errors;
  }

  const validValues = field.options.map(opt => opt.value);
  const invalidValues = value.filter(v => !validValues.includes(v));

  if (invalidValues.length > 0) {
    errors.push({
      field: field.id,
      message: `${field.label} 包含无效选项: ${invalidValues.join(', ')}`,
      code: 'INVALID_OPTIONS',
    });
  }

  return errors;
}

/**
 * Validate boolean fields
 */
function validateBoolean(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  if (typeof value !== 'boolean') {
    errors.push({
      field: field.id,
      message: `${field.label} 必须是布尔值`,
      code: 'INVALID_TYPE',
    });
  }

  return errors;
}

/**
 * Validate date/time fields
 */
function validateDateTime(value: any, field: L2SchemaField): L2ValidationError[] {
  const errors: L2ValidationError[] = [];

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    errors.push({
      field: field.id,
      message: `${field.label} 必须是有效的日期时间`,
      code: 'INVALID_DATE',
    });
  }

  return errors;
}

/**
 * Get field value label for display
 */
export function getFieldValueLabel(
  field: L2SchemaField,
  value: any
): string {
  if (value === undefined || value === null) {
    return '';
  }

  switch (field.type) {
    case L2FieldType.ENUM:
      return field.options?.find(opt => opt.value === value)?.label || String(value);

    case L2FieldType.MULTI_SELECT:
      if (Array.isArray(value)) {
        return value
          .map(v => field.options?.find(opt => opt.value === v)?.label || v)
          .join(', ');
      }
      return String(value);

    case L2FieldType.BOOLEAN:
      return value ? '是' : '否';

    case L2FieldType.RANGE:
      if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
        return `${value.min} - ${value.max}`;
      }
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Filter visible fields based on conditional logic
 */
export function getVisibleFields(
  schema: L2Schema,
  data: L2Data
): L2SchemaField[] {
  return schema.fields.filter(field => {
    if (!field.showWhen) {
      return true;
    }

    const { field: depField, operator, value: expectedValue } = field.showWhen;
    const actualValue = data[depField];

    switch (operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'neq':
        return actualValue !== expectedValue;
      case 'in':
        return Array.isArray(expectedValue)
          ? expectedValue.includes(actualValue)
          : actualValue === expectedValue;
      case 'contains':
        return Array.isArray(actualValue)
          ? actualValue.includes(expectedValue)
          : String(actualValue).includes(String(expectedValue));
      default:
        return true;
    }
  });
}

/**
 * Calculate L2 completion percentage
 */
export function calculateL2Completion(
  data: L2Data,
  schema: L2Schema
): { percentage: number; filled: number; total: number } {
  const visibleFields = getVisibleFields(schema, data);
  const requiredFields = visibleFields.filter(f => f.required);

  if (requiredFields.length === 0) {
    return { percentage: 100, filled: 0, total: 0 };
  }

  const filled = requiredFields.filter(field => {
    const value = data[field.id];
    return value !== undefined && value !== null && value !== '';
  }).length;

  const percentage = Math.round((filled / requiredFields.length) * 100);

  return { percentage, filled, total: requiredFields.length };
}
