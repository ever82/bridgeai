import { startTransaction, addBreadcrumb, captureException } from '../utils/sentry';
/**
 * Middleware to track API performance
 */
export function performanceMonitor(req, res, next) {
    const startTime = Date.now();
    // Create Sentry transaction
    const transaction = startTransaction(`${req.method} ${req.route?.path || req.path}`, 'http.request', {
        url: req.url,
        method: req.method,
        'http.host': req.headers.host,
        'http.user_agent': req.headers['user-agent'],
    });
    // Store in request for later use
    req.performanceMetrics = {
        startTime,
        transaction,
    };
    // Add breadcrumb for request start
    addBreadcrumb(`Request started: ${req.method} ${req.path}`, 'http', 'info', {
        url: req.url,
        method: req.method,
        query: req.query,
    });
    // Track response completion
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, cb) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        // Update transaction
        if (transaction) {
            transaction.setHttpStatus(res.statusCode);
            transaction.setTag('http.status_code', String(res.statusCode));
            transaction.setData('response_time_ms', duration);
            transaction.finish();
        }
        // Add breadcrumb for response
        addBreadcrumb(`Request completed: ${req.method} ${req.path}`, 'http', res.statusCode >= 400 ? 'error' : 'info', {
            url: req.url,
            method: req.method,
            statusCode: res.statusCode,
            duration,
        });
        // Log slow requests
        if (duration > 1000) {
            console.warn(`[Performance] Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
        // Call original end
        if (typeof encoding === 'function') {
            return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding, cb);
    };
    next();
}
/**
 * Track database query performance
 */
export function trackDatabaseQuery(operation, model, fn) {
    const startTime = Date.now();
    return fn()
        .then(result => {
        const duration = Date.now() - startTime;
        // Add breadcrumb for query
        addBreadcrumb(`Database query: ${operation}`, 'db', 'info', {
            operation,
            model,
            duration,
        });
        // Log slow queries
        if (duration > 500) {
            console.warn(`[Performance] Slow database query: ${operation} on ${model} took ${duration}ms`);
        }
        return result;
    })
        .catch(error => {
        const duration = Date.now() - startTime;
        // Capture exception with context
        captureException(error, {
            operation,
            model,
            duration,
            category: 'database_error',
        });
        throw error;
    });
}
/**
 * Memory usage tracker
 */
export function trackMemoryUsage() {
    const usage = process.memoryUsage();
    addBreadcrumb('Memory usage snapshot', 'performance', 'info', {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB',
    });
}
/**
 * Middleware to add performance headers
 */
export function performanceHeaders(req, res, next) {
    const startTime = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, cb) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
        if (typeof encoding === 'function') {
            return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding, cb);
    };
    next();
}
//# sourceMappingURL=performance.js.map