import * as Sentry from '@sentry/node';
/**
 * Sentry configuration for backend error monitoring
 */
// Initialize Sentry
export function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';
    const release = process.env.SENTRY_RELEASE || process.env.npm_package_version;
    if (!dsn) {
        console.warn('[Sentry] DSN not configured, error tracking disabled');
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const integrations = (defaultIntegrations) => {
        const result = [...defaultIntegrations];
        // Only add profiling in production when profiling is explicitly enabled
        if (environment === 'production' && process.env.SENTRY_PROFILES_ENABLED === 'true') {
            // Lazy load profiling to avoid native module errors in development
            const { ProfilingIntegration } = require('@sentry/profiling-node');
            result.push(new ProfilingIntegration());
        }
        return result;
    };
    Sentry.init({
        dsn,
        environment,
        release,
        // Performance monitoring
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        // Profiling (lazy loaded)
        integrations,
        // Error filtering
        beforeSend(event) {
            // Filter out known non-error events
            if (event.exception?.values?.[0]?.type === 'AbortError') {
                return null;
            }
            // Filter out health check errors in production
            if (environment === 'production' && event.request?.url?.includes('/health')) {
                return null;
            }
            return event;
        },
        // Debug in development
        debug: environment === 'development',
    });
    console.log(`[Sentry] Initialized for environment: ${environment}`);
}
/**
 * Set user context for Sentry
 */
export function setUserContext(userId, email, extras) {
    Sentry.setUser({
        id: userId,
        email,
        ...extras,
    });
}
/**
 * Clear user context
 */
export function clearUserContext() {
    Sentry.setUser(null);
}
/**
 * Add breadcrumb
 */
export function addBreadcrumb(message, category, level = 'info', data) {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
    });
}
/**
 * Capture exception
 */
export function captureException(error, context) {
    if (context) {
        Sentry.withScope((scope) => {
            scope.setExtras(context);
            Sentry.captureException(error);
        });
    }
    else {
        Sentry.captureException(error);
    }
    // Return event ID for reference
    return Sentry.lastEventId() || '';
}
/**
 * Capture message
 */
export function captureMessage(message, level = 'info') {
    Sentry.captureMessage(message, level);
    return Sentry.lastEventId() || '';
}
/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name, op, data) {
    const transaction = Sentry.startTransaction({
        name,
        op,
        data,
    });
    Sentry.getCurrentHub().configureScope((scope) => {
        scope.setSpan(transaction);
    });
    return transaction;
}
/**
 * Wrap async function with Sentry transaction
 */
export async function withTransaction(name, op, fn, data) {
    const transaction = startTransaction(name, op, data);
    try {
        const result = await fn();
        transaction.setStatus('ok');
        return result;
    }
    catch (error) {
        transaction.setStatus('internal_error');
        captureException(error, { transaction: name, op });
        throw error;
    }
    finally {
        transaction.finish();
    }
}
export { Sentry };
//# sourceMappingURL=sentry.js.map