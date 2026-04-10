/**
 * Request Validation Middleware
 *
 * Provides Zod-based validation for request body, params, and query.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema, ZodTypeAny } from 'zod';
import { ValidationError } from '../errors';
import { getRequestContext } from './requestContext';

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'params' | 'query' | 'headers';

/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
  body?: ZodSchema<ZodTypeAny>;
  params?: ZodSchema<ZodTypeAny>;
  query?: ZodSchema<ZodTypeAny>;
  headers?: ZodSchema<ZodTypeAny>;
}

/**
 * Format Zod error into readable message
 */
function formatZodError(error: ZodError): string {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}

/**
 * Create validation error from Zod error
 */
function createValidationError(error: ZodError, target: ValidationTarget): ValidationError {
  const details = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    ...(err.expected && { expected: err.expected }),
    ...(err.received && { received: err.received }),
  }));

  return new ValidationError(
    `Validation failed for ${target}: ${formatZodError(error)}`,
    { details, target }
  );
}

/**
 * Validate request against schema
 */
function validateTarget<T>(
  data: unknown,
  schema: ZodSchema<T> | undefined,
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
      const context = getRequestContext(req);

      // Validate each target
      const validatedBody = validateTarget(req.body, schemas.body, 'body');
      const validatedParams = validateTarget(req.params, schemas.params, 'params');
      const validatedQuery = validateTarget(req.query, schemas.query, 'query');
      const validatedHeaders = validateTarget(req.headers, schemas.headers, 'headers');

      // Replace request data with validated data
      if (validatedBody !== undefined) {
        req.body = validatedBody;
      }
      if (validatedParams !== undefined) {
        req.params = validatedParams as Record<string, string>;
      }
      if (validatedQuery !== undefined) {
        req.query = validatedQuery as Record<string, unknown>;
      }

      // Log validation success in debug mode
      if (context && process.env.NODE_ENV === 'development') {
        context.logDebug('Request validation passed', {
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
export function validateBody<T>(schema: ZodSchema<T>) {
  return validate({ body: schema });
}

/**
 * Middleware for validating request params only
 *
 * @example
 * router.get('/users/:id', validateParams(userIdParamsSchema), userController.getById);
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return validate({ params: schema });
}

/**
 * Middleware for validating request query only
 *
 * @example
 * router.get('/users', validateQuery(listUsersQuerySchema), userController.list);
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return validate({ query: schema });
}

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
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
