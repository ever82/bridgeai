import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

/**
 * Sentry configuration for backend error monitoring
 */

// Initialize Sentry
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || process.env.npm_package_version;

  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Profiling
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    integrations: [
      new ProfilingIntegration(),
    ],

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
export function setUserContext(userId: string, email?: string, extras?: Record<string, unknown>): void {
  Sentry.setUser({
    id: userId,
    email,
    ...extras,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
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
export function captureException(error: Error, context?: Record<string, unknown>): string {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }

  // Return event ID for reference
  return Sentry.lastEventId() || '';
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string {
  Sentry.captureMessage(message, level);
  return Sentry.lastEventId() || '';
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, unknown>
): ReturnType<typeof Sentry.startTransaction> {
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
export async function withTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>
): Promise<T> {
  const transaction = startTransaction(name, op, data);

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error as Error, { transaction: name, op });
    throw error;
  } finally {
    transaction.finish();
  }
}

export { Sentry };
