/**
 * Base Application Error class
 * Provides structured error information with HTTP status codes and error codes
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: Record<string, unknown>;
    readonly isOperational: boolean;
    constructor(message: string, code?: string, statusCode?: number, details?: Record<string, unknown>, isOperational?: boolean);
}
/**
 * Not Found Error (404)
 */
export declare class NotFoundError extends AppError {
    constructor(resource?: string, details?: Record<string, unknown>);
}
/**
 * Validation Error (400)
 */
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Unauthorized Error (401)
 */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Forbidden Error (403)
 */
export declare class ForbiddenError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Conflict Error (409)
 */
export declare class ConflictError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Rate Limit Error (429)
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Multer Upload Error (400/413)
 */
export declare class MulterUploadError extends AppError {
    constructor(message: string, code: string, statusCode: number);
}
/**
 * File Validation Error (400)
 */
export declare class FileValidationError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=AppError.d.ts.map