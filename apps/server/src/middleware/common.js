import { logger } from '../utils/logger';
/**
 * Async handler wrapper for controllers
 * Automatically catches errors and passes them to next()
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/**
 * Request logging middleware with additional context
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`Request completed: ${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            requestId: req.requestId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    });
    next();
};
//# sourceMappingURL=common.js.map