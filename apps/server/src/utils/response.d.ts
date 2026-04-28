/**
 * Standardized API Response class
 */
export declare class ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errorCode?: string;
    meta?: Record<string, unknown>;
    constructor(success: boolean, data?: T, message?: string, errorCode?: string, meta?: Record<string, unknown>);
    /**
     * Create a successful response
     */
    static success<T>(data: T, message?: string, meta?: Record<string, unknown>): ApiResponse<T>;
    /**
     * Create an error response
     */
    static error(message: string, errorCode?: string, statusCode?: number, details?: Record<string, unknown>): ApiResponse;
    /**
     * Create a paginated response
     */
    static paginated<T>(data: T[], pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }): ApiResponse<T[]>;
}
/**
 * HTTP Status codes mapping
 */
export declare const HttpStatus: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
};
/**
 * Common error codes
 */
export declare const ErrorCode: {
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly RESOURCE_CONFLICT: "RESOURCE_CONFLICT";
    readonly RESOURCE_EXPIRED: "RESOURCE_EXPIRED";
};
//# sourceMappingURL=response.d.ts.map