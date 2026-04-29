/**
 * Standardized API Response class
 */
export class ApiResponse {
    success;
    data;
    message;
    errorCode;
    meta;
    constructor(success, data, message, errorCode, meta) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.errorCode = errorCode;
        this.meta = meta;
    }
    /**
     * Create a successful response
     */
    static success(data, message, meta) {
        return new ApiResponse(true, data, message, undefined, meta);
    }
    /**
     * Create an error response
     */
    static error(message, errorCode = 'INTERNAL_ERROR', statusCode = 500, details) {
        return new ApiResponse(false, undefined, message, errorCode, { ...details, statusCode });
    }
    /**
     * Create a paginated response
     */
    static paginated(data, pagination) {
        return new ApiResponse(true, data, undefined, undefined, { pagination });
    }
}
/**
 * HTTP Status codes mapping
 */
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};
/**
 * Common error codes
 */
export const ErrorCode = {
    // General errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    // Auth errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    // Resource errors
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    RESOURCE_EXPIRED: 'RESOURCE_EXPIRED',
};
//# sourceMappingURL=response.js.map