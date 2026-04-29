import { z } from 'zod';
import { TestResponse } from './request';
/**
 * API Response validation tools
 * Provides utilities for validating API responses
 */
/**
 * Response time thresholds (in milliseconds)
 */
export declare const ResponseTimeThresholds: {
    FAST: number;
    NORMAL: number;
    SLOW: number;
    VERY_SLOW: number;
};
/**
 * Standard API response schema
 */
export declare const StandardResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    errorCode: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error?: string;
    data?: unknown;
    message?: string;
    success?: boolean;
    errorCode?: string;
}, {
    error?: string;
    data?: unknown;
    message?: string;
    success?: boolean;
    errorCode?: string;
}>;
/**
 * Success response schema
 */
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    data?: unknown;
    success?: true;
}, {
    data?: unknown;
    success?: true;
}>;
/**
 * Error response schema
 */
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    errorCode: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    error?: string;
    details?: unknown;
    message?: string;
    success?: false;
    errorCode?: string;
}, {
    error?: string;
    details?: unknown;
    message?: string;
    success?: false;
    errorCode?: string;
}>;
/**
 * Pagination response schema
 */
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
    total: z.ZodNumber;
    totalPages: z.ZodNumber;
    hasNext: z.ZodBoolean;
    hasPrev: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    total?: number;
    limit?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}, {
    total?: number;
    limit?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}>;
/**
 * Paginated response schema
 */
export declare function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T): z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        items: z.ZodArray<T, "many">;
        pagination: z.ZodObject<{
            page: z.ZodNumber;
            limit: z.ZodNumber;
            total: z.ZodNumber;
            totalPages: z.ZodNumber;
            hasNext: z.ZodBoolean;
            hasPrev: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        }, {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        pagination?: {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        };
        items?: T["_output"][];
    }, {
        pagination?: {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        };
        items?: T["_input"][];
    }>;
}, "strip", z.ZodTypeAny, {
    data?: {
        pagination?: {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        };
        items?: T["_output"][];
    };
    success?: true;
}, {
    data?: {
        pagination?: {
            total?: number;
            limit?: number;
            page?: number;
            totalPages?: number;
            hasNext?: boolean;
            hasPrev?: boolean;
        };
        items?: T["_input"][];
    };
    success?: true;
}>;
/**
 * Validate response against Zod schema
 */
export declare function validateSchema<T>(schema: z.ZodType<T>, data: unknown): {
    valid: boolean;
    data?: T;
    errors?: z.ZodError;
};
/**
 * Assert response matches schema
 */
export declare function assertSchema<T>(schema: z.ZodType<T>, data: unknown): T;
/**
 * Validate standard API response structure
 */
export declare function validateStandardResponse(response: TestResponse): boolean;
/**
 * Validate success response
 */
export declare function validateSuccessResponse(response: TestResponse): boolean;
/**
 * Validate error response
 */
export declare function validateErrorResponse(response: TestResponse): boolean;
/**
 * Response time validator
 */
export declare class ResponseTimeValidator {
    private startTime;
    private endTime?;
    constructor();
    /**
     * Mark the end of request
     */
    end(): number;
    /**
     * Get request duration in milliseconds
     */
    getDuration(): number;
    /**
     * Check if response time is within threshold
     */
    isWithin(threshold: number): boolean;
    /**
     * Assert response time is within threshold
     */
    assertWithin(threshold: number, message?: string): void;
}
/**
 * HTTP status code validators
 */
export declare const StatusValidators: {
    /**
     * Check if status is 2xx success
     */
    isSuccess(status: number): boolean;
    /**
     * Check if status is 201 Created
     */
    isCreated(status: number): boolean;
    /**
     * Check if status is 204 No Content
     */
    isNoContent(status: number): boolean;
    /**
     * Check if status is 400 Bad Request
     */
    isBadRequest(status: number): boolean;
    /**
     * Check if status is 401 Unauthorized
     */
    isUnauthorized(status: number): boolean;
    /**
     * Check if status is 403 Forbidden
     */
    isForbidden(status: number): boolean;
    /**
     * Check if status is 404 Not Found
     */
    isNotFound(status: number): boolean;
    /**
     * Check if status is 409 Conflict
     */
    isConflict(status: number): boolean;
    /**
     * Check if status is 422 Unprocessable Entity
     */
    isUnprocessable(status: number): boolean;
    /**
     * Check if status is 429 Too Many Requests
     */
    isRateLimited(status: number): boolean;
    /**
     * Check if status is 500 Internal Server Error
     */
    isServerError(status: number): boolean;
    /**
     * Check if status is 503 Service Unavailable
     */
    isServiceUnavailable(status: number): boolean;
};
/**
 * Response header validators
 */
export declare const HeaderValidators: {
    /**
     * Check if response has Content-Type header
     */
    hasContentType(headers: Record<string, string | string[]>): boolean;
    /**
     * Check if Content-Type is JSON
     */
    isJson(headers: Record<string, string | string[]>): boolean;
    /**
     * Check if response has X-Request-ID header
     */
    hasRequestId(headers: Record<string, string | string[]>): boolean;
    /**
     * Get rate limit headers
     */
    getRateLimitInfo(headers: Record<string, string | string[]>): {
        limit?: number;
        remaining?: number;
        reset?: number;
    };
};
/**
 * Error response validators
 */
export declare const ErrorValidators: {
    /**
     * Check if error has required fields
     */
    hasRequiredFields(error: Record<string, unknown>): boolean;
    /**
     * Check if error message is present
     */
    hasMessage(error: Record<string, unknown>): boolean;
    /**
     * Check if error has validation details
     */
    hasValidationDetails(error: Record<string, unknown>): boolean;
    /**
     * Check if error code matches expected pattern
     */
    matchesCodePattern(errorCode: string, pattern: RegExp): boolean;
};
/**
 * Complete response validator class
 */
export declare class ResponseValidator {
    private validators;
    /**
     * Add status code validator
     */
    status(expectedStatus: number): this;
    /**
     * Add success validator
     */
    success(): this;
    /**
     * Add error validator
     */
    error(): this;
    /**
     * Add custom validator
     */
    custom(validator: (response: TestResponse) => boolean): this;
    /**
     * Validate response against all validators
     */
    validate(response: TestResponse): {
        valid: boolean;
        failedValidators: number;
    };
    /**
     * Assert all validators pass
     */
    assert(response: TestResponse): void;
}
/**
 * Create a new response validator
 */
export declare function createValidator(): ResponseValidator;
/**
 * Common validation patterns for reuse
 */
export declare const ValidationPatterns: {
    /**
     * UUID v4 pattern
     */
    uuid: RegExp;
    /**
     * ISO 8601 date pattern
     */
    isoDate: RegExp;
    /**
     * Email pattern (basic)
     */
    email: RegExp;
    /**
     * Error code pattern (UPPER_SNAKE_CASE)
     */
    errorCode: RegExp;
};
declare const _default: {
    ResponseTimeThresholds: {
        FAST: number;
        NORMAL: number;
        SLOW: number;
        VERY_SLOW: number;
    };
    StandardResponseSchema: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodOptional<z.ZodUnknown>;
        error: z.ZodOptional<z.ZodString>;
        errorCode: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        error?: string;
        data?: unknown;
        message?: string;
        success?: boolean;
        errorCode?: string;
    }, {
        error?: string;
        data?: unknown;
        message?: string;
        success?: boolean;
        errorCode?: string;
    }>;
    SuccessResponseSchema: z.ZodObject<{
        success: z.ZodLiteral<true>;
        data: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        data?: unknown;
        success?: true;
    }, {
        data?: unknown;
        success?: true;
    }>;
    ErrorResponseSchema: z.ZodObject<{
        success: z.ZodLiteral<false>;
        error: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
        errorCode: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        error?: string;
        details?: unknown;
        message?: string;
        success?: false;
        errorCode?: string;
    }, {
        error?: string;
        details?: unknown;
        message?: string;
        success?: false;
        errorCode?: string;
    }>;
    PaginationSchema: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        total?: number;
        limit?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    }, {
        total?: number;
        limit?: number;
        page?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    }>;
    createPaginatedResponseSchema: typeof createPaginatedResponseSchema;
    validateSchema: typeof validateSchema;
    assertSchema: typeof assertSchema;
    validateStandardResponse: typeof validateStandardResponse;
    validateSuccessResponse: typeof validateSuccessResponse;
    validateErrorResponse: typeof validateErrorResponse;
    ResponseTimeValidator: typeof ResponseTimeValidator;
    StatusValidators: {
        /**
         * Check if status is 2xx success
         */
        isSuccess(status: number): boolean;
        /**
         * Check if status is 201 Created
         */
        isCreated(status: number): boolean;
        /**
         * Check if status is 204 No Content
         */
        isNoContent(status: number): boolean;
        /**
         * Check if status is 400 Bad Request
         */
        isBadRequest(status: number): boolean;
        /**
         * Check if status is 401 Unauthorized
         */
        isUnauthorized(status: number): boolean;
        /**
         * Check if status is 403 Forbidden
         */
        isForbidden(status: number): boolean;
        /**
         * Check if status is 404 Not Found
         */
        isNotFound(status: number): boolean;
        /**
         * Check if status is 409 Conflict
         */
        isConflict(status: number): boolean;
        /**
         * Check if status is 422 Unprocessable Entity
         */
        isUnprocessable(status: number): boolean;
        /**
         * Check if status is 429 Too Many Requests
         */
        isRateLimited(status: number): boolean;
        /**
         * Check if status is 500 Internal Server Error
         */
        isServerError(status: number): boolean;
        /**
         * Check if status is 503 Service Unavailable
         */
        isServiceUnavailable(status: number): boolean;
    };
    HeaderValidators: {
        /**
         * Check if response has Content-Type header
         */
        hasContentType(headers: Record<string, string | string[]>): boolean;
        /**
         * Check if Content-Type is JSON
         */
        isJson(headers: Record<string, string | string[]>): boolean;
        /**
         * Check if response has X-Request-ID header
         */
        hasRequestId(headers: Record<string, string | string[]>): boolean;
        /**
         * Get rate limit headers
         */
        getRateLimitInfo(headers: Record<string, string | string[]>): {
            limit?: number;
            remaining?: number;
            reset?: number;
        };
    };
    ErrorValidators: {
        /**
         * Check if error has required fields
         */
        hasRequiredFields(error: Record<string, unknown>): boolean;
        /**
         * Check if error message is present
         */
        hasMessage(error: Record<string, unknown>): boolean;
        /**
         * Check if error has validation details
         */
        hasValidationDetails(error: Record<string, unknown>): boolean;
        /**
         * Check if error code matches expected pattern
         */
        matchesCodePattern(errorCode: string, pattern: RegExp): boolean;
    };
    ResponseValidator: typeof ResponseValidator;
    createValidator: typeof createValidator;
    ValidationPatterns: {
        /**
         * UUID v4 pattern
         */
        uuid: RegExp;
        /**
         * ISO 8601 date pattern
         */
        isoDate: RegExp;
        /**
         * Email pattern (basic)
         */
        email: RegExp;
        /**
         * Error code pattern (UPPER_SNAKE_CASE)
         */
        errorCode: RegExp;
    };
};
export default _default;
//# sourceMappingURL=validator.d.ts.map