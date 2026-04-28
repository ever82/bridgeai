import { Request, Response, NextFunction } from 'express';
import { startTransaction } from '../utils/sentry';
/**
 * Performance monitoring middleware
 * Tracks API response times and database queries
 */
interface PerformanceMetrics {
    startTime: number;
    transaction?: ReturnType<typeof startTransaction>;
}
export interface RequestWithPerformance extends Request {
    performanceMetrics?: PerformanceMetrics;
}
/**
 * Middleware to track API performance
 */
export declare function performanceMonitor(req: RequestWithPerformance, res: Response, next: NextFunction): void;
/**
 * Track database query performance
 */
export declare function trackDatabaseQuery<T>(operation: string, model: string, fn: () => Promise<T>): Promise<T>;
/**
 * Memory usage tracker
 */
export declare function trackMemoryUsage(): void;
/**
 * Middleware to add performance headers
 */
export declare function performanceHeaders(req: Request, res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=performance.d.ts.map