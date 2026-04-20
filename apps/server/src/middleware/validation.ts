/**
 * Request Validation Middleware
 *
 * Provides Zod-based validation for request body, params, and query.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

import { ValidationError } from '../errors';

import { getRequestContext } from './requestContext';

/**
 * Custom validator function type
 */
export type CustomValidatorFn<T = unknown> = (value: T) => boolean | string;

/**
 * Custom validation rule
 */
export interface ValidationRule {
  name: string;
  validator: CustomValidatorFn;
  message: string;
}

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'params' | 'query' | 'headers';

/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
  body?: ZodType<any, any, any>;
  params?: ZodType<any, any, any>;
  query?: ZodType<any, any, any>;
  headers?: ZodType<any, any, any>;
}

/**
 * Create a custom schema with validation rules
 */
export function createValidatedSchema<T extends Record<string, unknown>>(
  baseSchema: ZodType<T>,
  rules?: ValidationRule[]
): ZodType<T> {
  if (!rules || rules.length === 0) return baseSchema;

  return baseSchema.refine(
    data => {
      for (const rule of rules) {
        for (const [, value] of Object.entries(data)) {
          const result = rule.validator(value);
          if (result === false) {
            return false;
          }
          if (typeof result === 'string') {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: rules.map(r => r.message).join('; '),
    }
  );
}

/**
 * Built-in custom validators
 */
export const Validators = {
  /**
   * Chinese mobile phone number validator
   */
  chinesePhone: (val: unknown): boolean | string => {
    if (typeof val !== 'string') return false;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(val.replace(/\s/g, '')) || 'Invalid Chinese mobile number';
  },

  /**
   * URL validator
   */
  url: (val: unknown): boolean | string => {
    if (typeof val !== 'string') return false;
    try {
      new URL(val);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  },

  /**
   * Strong password validator (min 8 chars, upper, lower, number)
   */
  strongPassword: (val: unknown): boolean | string => {
    if (typeof val !== 'string') return false;
    if (val.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(val)) return 'Password must contain uppercase letter';
    if (!/[a-z]/.test(val)) return 'Password must contain lowercase letter';
    if (!/\d/.test(val)) return 'Password must contain a number';
    return true;
  },

  /**
   * UUID validator
   */
  uuid: (val: unknown): boolean | string => {
    if (typeof val !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val) || 'Invalid UUID format';
  },

  /**
   * Date range validator
   */
  dateRange:
    (min: Date, max: Date) =>
    (val: unknown): boolean | string => {
      if (typeof val !== 'string') return false;
      const date = new Date(val);
      if (isNaN(date.getTime())) return 'Invalid date format';
      if (date < min) return `Date must be after ${min.toISOString()}`;
      if (date > max) return `Date must be before ${max.toISOString()}`;
      return true;
    },

  /**
   * File extension validator
   */
  fileExtension:
    (allowedExtensions: string[]) =>
    (val: unknown): boolean | string => {
      if (typeof val !== 'string') return false;
      const ext = val.split('.').pop()?.toLowerCase() || '';
      return (
        allowedExtensions.includes(ext) ||
        `File extension must be one of: ${allowedExtensions.join(', ')}`
      );
    },

  /**
   * Array length validator
   */
  arrayLength:
    (min: number, max: number) =>
    (val: unknown): boolean | string => {
      if (!Array.isArray(val)) return false;
      if (val.length < min) return `Array must have at least ${min} items`;
      if (val.length > max) return `Array must have at most ${max} items`;
      return true;
    },
};

/**
 * Create custom Zod refinement
 */
export function createRefinement<T>(
  schema: ZodType<T>,
  validator: (val: T) => boolean | string,
  message?: string
): ZodType<T> {
  return schema.refine(
    val => {
      const result = validator(val);
      return result === true;
    },
    {
      message: message || (typeof validator === 'function' ? 'Validation failed' : 'Invalid value'),
    }
  );
}

/**
 * Format Zod error into readable message
 */
function formatZodError(error: ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
}

/**
 * Create validation error from Zod error
 */
function createValidationError(error: ZodError, target: ValidationTarget): ValidationError {
  const details = error.errors.map(err => {
    const detail: Record<string, any> = {
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    };
    // Only add expected/received for types that have them
    if ('expected' in err) {
      detail.expected = err.expected;
    }
    if ('received' in err) {
      detail.received = err.received;
    }
    return detail;
  });

  return new ValidationError(`Validation failed for ${target}: ${formatZodError(error)}`, {
    details,
    target,
  });
}

/**
 * Validate request against schema
 */
function validateTarget<T>(
  data: unknown,
  schema: ZodType<T, any, any> | undefined,
  target: ValidationTarget
): T | undefined {
  if (!schema) return undefined;

  const result = schema.safeParse(data);
  if (!result.success) {
    throw createValidationError(result.error, target);
  }
  return result.data;
}

/**
 * Middleware factory for validating requests
 *
 * @example
 * router.post('/users',
 *   validate({
 *     body: createUserSchema,
 *     params: userIdParamsSchema
 *   }),
 *   userController.create
 * );
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const context = getRequestContext();

      // Validate each target
      const validatedBody = validateTarget(req.body, schemas.body, 'body');
      const validatedParams = validateTarget(req.params, schemas.params, 'params');
      const validatedQuery = validateTarget(req.query, schemas.query, 'query');
      const _validatedHeaders = validateTarget(req.headers, schemas.headers, 'headers');

      // Replace request data with validated data
      if (validatedBody !== undefined) {
        req.body = validatedBody;
      }
      if (validatedParams !== undefined) {
        req.params = validatedParams as Record<string, string>;
      }
      if (validatedQuery !== undefined) {
        req.query = validatedQuery as any;
      }

      // Log validation success in debug mode
      if (context && process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Request validation passed', {
          hasBody: !!schemas.body,
          hasParams: !!schemas.params,
          hasQuery: !!schemas.query,
          hasHeaders: !!schemas.headers,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware for validating request body only
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), userController.create);
 */
export function validateBody<T>(schema: ZodType<T, any, any>) {
  return validate({ body: schema });
}

/**
 * Middleware for validating request params only
 *
 * @example
 * router.get('/users/:id', validateParams(userIdParamsSchema), userController.getById);
 */
export function validateParams<T>(schema: ZodType<T, any, any>) {
  return validate({ params: schema });
}

/**
 * Middleware for validating request query only
 *
 * @example
 * router.get('/users', validateQuery(listUsersQuerySchema), userController.list);
 */
export function validateQuery<T>(schema: ZodType<T, any, any>) {
  return validate({ query: schema });
}

/**
 * Normalize unicode and whitespace to neutralize obfuscation attempts
 */
function normalizeString(input: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally removing control chars for sanitization
  let result = input.replace(/[\x00-\x1F\x7F]/g, '');
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\u3000]/g, '');
  result = result.replace(/[\t\n\r\f\v]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  try {
    result = result.normalize('NFKC');
  } catch {
    // Fallback: skip normalization if it fails
  }
  return result;
}

/**
 * Remove dangerous patterns from a normalized string
 */
function removeDangerousPatterns(input: string): string {
  let result = input;
  result = result.replace(/on[a-z][a-z0-9]*(?:\s|%09|%0A|%0D)*=(?:\s|%09|%0A|%0D)*/gi, '');
  result = result.replace(/javascript\s*:\s*/gi, '');
  result = result.replace(/data\s*:\s*/gi, '');
  result = result.replace(/vbscript\s*:\s*/gi, '');
  result = result.replace(/expression\s*\((?:[^)]*)\)/gi, '');
  result = result.replace(/<[^>]*>/g, '');
  result = result.replace(/[<>]/g, '');
  return result;
}

/**
 * Sanitize string input - remove dangerous characters and patterns
 */
export function sanitizeString(input: string): string {
  const normalized = normalizeString(input);
  return removeDangerousPatterns(normalized);
}

/**
 * Transform string fields in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}

/**
 * Zod transform for sanitizing strings
 */
export function sanitizedString() {
  return (val: string) => sanitizeString(val);
}

export default validate;
