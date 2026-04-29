/**
 * Base Application Error class
 * Provides structured error information with HTTP status codes and error codes
 */
export class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource', details) {
        super(`${resource} not found`, 'RESOURCE_NOT_FOUND', 404, details);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        // Fix instanceof check for transpiled ES6 class inheritance
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', details) {
        super(message, 'UNAUTHORIZED', 401, details);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details) {
        super(message, 'FORBIDDEN', 403, details);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict', details) {
        super(message, 'RESOURCE_CONFLICT', 409, details);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', details) {
        super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
/**
 * Multer Upload Error (400/413)
 */
export class MulterUploadError extends AppError {
    constructor(message, code, statusCode) {
        super(message, code, statusCode);
        Object.setPrototypeOf(this, MulterUploadError.prototype);
    }
}
/**
 * File Validation Error (400)
 */
export class FileValidationError extends AppError {
    constructor(message = 'Invalid file', details) {
        super(message, 'INVALID_FILE_TYPE', 400, details);
        Object.setPrototypeOf(this, FileValidationError.prototype);
    }
}
//# sourceMappingURL=AppError.js.map