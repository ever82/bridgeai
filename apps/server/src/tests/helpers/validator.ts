import { z } from 'zod';
import { TestResponse } from './request';

/**
 * API Response validation tools
 * Provides utilities for validating API responses
 */

/**
 * Response time thresholds (in milliseconds)
 */
export const ResponseTimeThresholds = {
  FAST: 100,
  NORMAL: 500,
  SLOW: 1000,
  VERY_SLOW: 3000,
};

/**
 * Standard API response schema
 */
export const StandardResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Success response schema
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  errorCode: z.string(),
  details: z.unknown().optional(),
});

/**
 * Pagination response schema
 */
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

/**
 * Paginated response schema
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: PaginationSchema,
    }),
  });
}

/**
 * Validate response against Zod schema
 */
export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): { valid: boolean; data?: T; errors?: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return { valid: false, errors: result.error };
}

/**
 * Assert response matches schema
 */
export function assertSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Validate standard API response structure
 */
export function validateStandardResponse(response: TestResponse): boolean {
  const result = StandardResponseSchema.safeParse(response.body);
  return result.success;
}

/**
 * Validate success response
 */
export function validateSuccessResponse(response: TestResponse): boolean {
  if (!response.body || typeof response.body !== 'object') {
    return false;
  }

  const body = response.body as Record<string, unknown>;
  return body.success === true && 'data' in body;
}

/**
 * Validate error response
 */
export function validateErrorResponse(response: TestResponse): boolean {
  if (!response.body || typeof response.body !== 'object') {
    return false;
  }

  const body = response.body as Record<string, unknown>;
  return (
    body.success === false &&
    ('error' in body || 'message' in body) &&
    'errorCode' in body
  );
}

/**
 * Response time validator
 */
export class ResponseTimeValidator {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark the end of request
   */
  end(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  /**
   * Get request duration in milliseconds
   */
  getDuration(): number {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Check if response time is within threshold
   */
  isWithin(threshold: number): boolean {
    return this.getDuration() <= threshold;
  }

  /**
   * Assert response time is within threshold
   */
  assertWithin(threshold: number, message?: string): void {
    const duration = this.getDuration();
    if (duration > threshold) {
      throw new Error(
        message || `Response time ${duration}ms exceeded threshold ${threshold}ms`
      );
    }
  }
}

/**
 * HTTP status code validators
 */
export const StatusValidators = {
  /**
   * Check if status is 2xx success
   */
  isSuccess(status: number): boolean {
    return status >= 200 && status < 300;
  },

  /**
   * Check if status is 201 Created
   */
  isCreated(status: number): boolean {
    return status === 201;
  },

  /**
   * Check if status is 204 No Content
   */
  isNoContent(status: number): boolean {
    return status === 204;
  },

  /**
   * Check if status is 400 Bad Request
   */
  isBadRequest(status: number): boolean {
    return status === 400;
  },

  /**
   * Check if status is 401 Unauthorized
   */
  isUnauthorized(status: number): boolean {
    return status === 401;
  },

  /**
   * Check if status is 403 Forbidden
   */
  isForbidden(status: number): boolean {
    return status === 403;
  },

  /**
   * Check if status is 404 Not Found
   */
  isNotFound(status: number): boolean {
    return status === 404;
  },

  /**
   * Check if status is 409 Conflict
   */
  isConflict(status: number): boolean {
    return status === 409;
  },

  /**
   * Check if status is 422 Unprocessable Entity
   */
  isUnprocessable(status: number): boolean {
    return status === 422;
  },

  /**
   * Check if status is 429 Too Many Requests
   */
  isRateLimited(status: number): boolean {
    return status === 429;
  },

  /**
   * Check if status is 500 Internal Server Error
   */
  isServerError(status: number): boolean {
    return status === 500;
  },

  /**
   * Check if status is 503 Service Unavailable
   */
  isServiceUnavailable(status: number): boolean {
    return status === 503;
  },
};

/**
 * Response header validators
 */
export const HeaderValidators = {
  /**
   * Check if response has Content-Type header
   */
  hasContentType(headers: Record<string, string | string[]>): boolean {
    return 'content-type' in headers || 'Content-Type' in headers;
  },

  /**
   * Check if Content-Type is JSON
   */
  isJson(headers: Record<string, string | string[]>): boolean {
    const ct = String(headers['content-type'] || headers['Content-Type'] || '');
    return ct.includes('application/json');
  },

  /**
   * Check if response has X-Request-ID header
   */
  hasRequestId(headers: Record<string, string | string[]>): boolean {
    return 'x-request-id' in headers || 'X-Request-ID' in headers;
  },

  /**
   * Get rate limit headers
   */
  getRateLimitInfo(headers: Record<string, string | string[]>): {
    limit?: number;
    remaining?: number;
    reset?: number;
  } {
    return {
      limit: parseInt(String(headers['x-ratelimit-limit'] || ''), 10) || undefined,
      remaining: parseInt(String(headers['x-ratelimit-remaining'] || ''), 10) || undefined,
      reset: parseInt(String(headers['x-ratelimit-reset'] || ''), 10) || undefined,
    };
  },
};

/**
 * Error response validators
 */
export const ErrorValidators = {
  /**
   * Check if error has required fields
   */
  hasRequiredFields(error: Record<string, unknown>): boolean {
    return 'success' in error && error.success === false && 'errorCode' in error;
  },

  /**
   * Check if error message is present
   */
  hasMessage(error: Record<string, unknown>): boolean {
    return 'error' in error || 'message' in error;
  },

  /**
   * Check if error has validation details
   */
  hasValidationDetails(error: Record<string, unknown>): boolean {
    return 'details' in error && Array.isArray(error.details);
  },

  /**
   * Check if error code matches expected pattern
   */
  matchesCodePattern(errorCode: string, pattern: RegExp): boolean {
    return pattern.test(errorCode);
  },
};

/**
 * Complete response validator class
 */
export class ResponseValidator {
  private validators: Array<(response: TestResponse) => boolean> = [];

  /**
   * Add status code validator
   */
  status(expectedStatus: number): this {
    this.validators.push((response) => response.status === expectedStatus);
    return this;
  }

  /**
   * Add success validator
   */
  success(): this {
    this.validators.push((response) => validateSuccessResponse(response));
    return this;
  }

  /**
   * Add error validator
   */
  error(): this {
    this.validators.push((response) => validateErrorResponse(response));
    return this;
  }

  /**
   * Add custom validator
   */
  custom(validator: (response: TestResponse) => boolean): this {
    this.validators.push(validator);
    return this;
  }

  /**
   * Validate response against all validators
   */
  validate(response: TestResponse): {
    valid: boolean;
    failedValidators: number;
  } {
    let failedCount = 0;

    for (const validator of this.validators) {
      if (!validator(response)) {
        failedCount++;
      }
    }

    return {
      valid: failedCount === 0,
      failedValidators: failedCount,
    };
  }

  /**
   * Assert all validators pass
   */
  assert(response: TestResponse): void {
    const result = this.validate(response);
    if (!result.valid) {
      throw new Error(
        `Response validation failed: ${result.failedValidators} validators failed`
      );
    }
  }
}

/**
 * Create a new response validator
 */
export function createValidator(): ResponseValidator {
  return new ResponseValidator();
}

/**
 * Common validation patterns for reuse
 */
export const ValidationPatterns = {
  /**
   * UUID v4 pattern
   */
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /**
   * ISO 8601 date pattern
   */
  isoDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,

  /**
   * Email pattern (basic)
   */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * Error code pattern (UPPER_SNAKE_CASE)
   */
  errorCode: /^[A-Z][A-Z_0-9]+$/,
};

export default {
  ResponseTimeThresholds,
  StandardResponseSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  PaginationSchema,
  createPaginatedResponseSchema,
  validateSchema,
  assertSchema,
  validateStandardResponse,
  validateSuccessResponse,
  validateErrorResponse,
  ResponseTimeValidator,
  StatusValidators,
  HeaderValidators,
  ErrorValidators,
  ResponseValidator,
  createValidator,
  ValidationPatterns,
};
