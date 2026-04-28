import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Test database connection with retry
 */
export declare function testConnection(retries?: number): Promise<boolean>;
/**
 * Gracefully close database connection
 */
export declare function disconnect(): Promise<void>;
/**
 * Get connection pool statistics
 */
export declare function getConnectionStats(): Promise<{
    active: number;
    idle: number;
    total: number;
}>;
/**
 * Execute query with timeout
 */
export declare function executeWithTimeout<T>(query: () => Promise<T>, timeoutMs?: number): Promise<T>;
/**
 * Batch query for large datasets
 * Prevents memory issues with large queries
 */
export declare function batchQuery<T, R>(items: T[], batchSize: number, processBatch: (batch: T[]) => Promise<R[]>): Promise<R[]>;
/**
 * Performance monitoring wrapper
 * Tracks query execution time and logs metrics
 */
export declare function withPerformanceTracking<T>(operation: string, fn: () => Promise<T>): Promise<T>;
export default prisma;
//# sourceMappingURL=client.d.ts.map