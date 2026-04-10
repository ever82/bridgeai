import * as Sentry from '@sentry/react-native';
import { NavigationInstrumentation } from '@sentry/react-native';

/**
 * Sentry configuration for React Native mobile error monitoring
 */

// Navigation instrumentation for performance tracking
export const navigationInstrumentation = new NavigationInstrumentation();

// Initialize Sentry
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || `${process.env.npm_package_name}@${process.env.npm_package_version}`;

  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Enable native crash reporting
    enableNative: true,
    enableNativeCrashHandling: true,
    enableNativeNScope: true,

    // Performance monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Attach screenshots for errors
    attachScreenshot: true,

    // Session tracking
    autoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Enable auto performance tracking
    enableAutoPerformanceTracking: true,

    // Enable user interaction tracing
    enableUserInteractionTracing: true,

    // Debug in development
    debug: environment === 'development',

    // Before send callback for filtering
    beforeSend(event) {
      // Filter out development errors in production
      if (environment === 'production' && event.environment === 'development') {
        return null;
      }

      // Filter out known non-error events
      if (event.exception?.values?.[0]?.type === 'AbortError') {
        return null;
      }

      return event;
    },

    // Integrations
    integrations: [
      navigationInstrumentation,
    ],
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
  level: Sentry.Severity = 'info' as Sentry.Severity,
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

  return Sentry.lastEventId() || '';
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.Severity = 'info' as Sentry.Severity): string {
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
  return Sentry.startTransaction({
    name,
    op,
    data,
  });
}

/**
 * Configure navigation breadcrumb
 */
export function configureNavigationBreadcrumb(
  routeName: string,
  params?: Record<string, unknown>
): void {
  addBreadcrumb(
    `Navigation: ${routeName}`,
    'navigation',
    'info',
    {
      route: routeName,
      params,
    }
  );
}

/**
 * Error boundary wrapper for React Native
 */
export function withErrorBoundary<T extends React.ComponentType<any>>(
  Component: T
): T {
  return Sentry.wrap(Component);
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceTracking<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, operation);

  try {
    const result = await fn();
    transaction.setStatus('ok');
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error as Error, { transaction: name, operation });
    transaction.finish();
    throw error;
  }
}

/**
 * Track component lifecycle
 */
export function trackComponentLifecycle(componentName: string): {
  mount: () => void;
  unmount: () => void;
  update: (data?: Record<string, unknown>) => void;
} {
  const mountTime = Date.now();

  return {
    mount: () => {
      addBreadcrumb(
        `Component mounted: ${componentName}`,
        'ui.lifecycle',
        'info'
      );
    },
    unmount: () => {
      const lifetime = Date.now() - mountTime;
      addBreadcrumb(
        `Component unmounted: ${componentName}`,
        'ui.lifecycle',
        'info',
        { lifetime }
      );
    },
    update: (data?: Record<string, unknown>) => {
      addBreadcrumb(
        `Component updated: ${componentName}`,
        'ui.lifecycle',
        'info',
        data
      );
    },
  };
}

export { Sentry };
