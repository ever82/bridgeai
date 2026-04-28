import * as Sentry from '@sentry/node';
/**
 * Sentry configuration for backend error monitoring
 */
export declare function initSentry(): void;
/**
 * Set user context for Sentry
 */
export declare function setUserContext(userId: string, email?: string, extras?: Record<string, unknown>): void;
/**
 * Clear user context
 */
export declare function clearUserContext(): void;
/**
 * Add breadcrumb
 */
export declare function addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: Record<string, unknown>): void;
/**
 * Capture exception
 */
export declare function captureException(error: Error, context?: Record<string, unknown>): string;
/**
 * Capture message
 */
export declare function captureMessage(message: string, level?: Sentry.SeverityLevel): string;
/**
 * Start a transaction for performance monitoring
 */
export declare function startTransaction(name: string, op: string, data?: Record<string, unknown>): ReturnType<typeof Sentry.startTransaction>;
/**
 * Wrap async function with Sentry transaction
 */
export declare function withTransaction<T>(name: string, op: string, fn: () => Promise<T>, data?: Record<string, unknown>): Promise<T>;
export { Sentry };
//# sourceMappingURL=sentry.d.ts.map