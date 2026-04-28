/**
 * Query Engine
 * Provides query compilation, execution plan generation, optimization, and parallel query execution.
 *
 * Note: This engine currently serves subscription queries via QuerySubscriptionManager only.
 * The synchronous match query path in MatchQueryService.queryMatches() uses prisma.agent.findMany
 * directly via buildPrismaQuery for simplicity and correctness. Routing one-shot queries through
 * QueryEngine would add caching/planning overhead with no benefit for low-volume request paths.
 */
import { FilterDSL } from '@bridgeai/shared';
import { PrismaQuery } from '../../utils/queryBuilder';
export interface ExecutionPlan {
    id: string;
    query: PrismaQuery;
    estimatedComplexity: 'low' | 'medium' | 'high';
    estimatedExecutionTime: number;
    parallelCapable: boolean;
    requiresIndex: string[];
    optimizationHints: string[];
}
export interface QueryResult<T> {
    data: T[];
    executionTime: number;
    planId: string;
    cached: boolean;
}
export interface ResourceLimits {
    maxConcurrentQueries: number;
    maxExecutionTime: number;
    maxMemoryUsage: number;
}
/**
 * Query Engine class
 * Handles query compilation, planning, execution, and resource management
 */
export declare class QueryEngine {
    private planCache;
    private resultCache;
    private static instance;
    private constructor();
    static getInstance(): QueryEngine;
    /**
     * Reset the singleton instance. Used in tests.
     */
    static resetInstance(): void;
    /**
     * Compile a FilterDSL query into an execution plan
     */
    compileQuery(dsl: FilterDSL, queryId?: string): ExecutionPlan;
    /**
     * Execute a compiled query plan
     */
    executeQuery<T>(plan: ExecutionPlan, options?: {
        userId?: string;
        useCache?: boolean;
        cacheTtl?: number;
    }): Promise<QueryResult<T>>;
    /**
     * Execute a query with automatic compilation
     */
    execute<T>(dsl: FilterDSL, options?: {
        userId?: string;
        useCache?: boolean;
        cacheTtl?: number;
    }): Promise<QueryResult<T>>;
    /**
     * Execute multiple queries in parallel
     */
    executeParallel<T>(queries: FilterDSL[], options?: {
        userId?: string;
        useCache?: boolean;
        maxConcurrency?: number;
    }): Promise<QueryResult<T>[]>;
    /**
     * Optimize a query plan based on execution hints
     */
    optimizePlan(plan: ExecutionPlan, hints: string[]): ExecutionPlan;
    /**
     * Set resource limits
     */
    setResourceLimits(limits: Partial<ResourceLimits>): void;
    /**
     * Get resource usage stats
     */
    getResourceStats(): {
        activeQueries: number;
        cachedPlans: number;
        cachedResults: number;
    };
    /**
     * Clear all caches
     */
    clearCaches(): void;
    /**
     * Invalidate result cache for a specific query
     */
    invalidateResultCache(queryId: string): void;
    /**
     * Invalidate all result caches (e.g., when data changes)
     */
    invalidateAllResultCaches(): void;
    private generateQueryId;
    private analyzeComplexity;
    private estimateExecutionTime;
    private canExecuteInParallel;
    private identifyRequiredIndexes;
    private generateOptimizationHints;
    private executePrismaQuery;
}
export declare const queryEngine: QueryEngine;
//# sourceMappingURL=queryEngine.d.ts.map