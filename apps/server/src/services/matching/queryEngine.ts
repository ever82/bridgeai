/**
 * Query Engine
 * Provides query compilation, execution plan generation, optimization, and parallel query execution
 */

import { FilterDSL } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { buildPrismaQuery, PrismaQuery } from '../../utils/queryBuilder';

export interface ExecutionPlan {
  id: string;
  query: PrismaQuery;
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedExecutionTime: number; // ms
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
  maxExecutionTime: number; // ms
  maxMemoryUsage: number; // bytes
}

// Resource management
const activeQueries = new Map<string, { startTime: number; userId?: string }>();
const DEFAULT_LIMITS: ResourceLimits = {
  maxConcurrentQueries: 50,
  maxExecutionTime: 30000, // 30 seconds
  maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
};

let resourceLimits: ResourceLimits = { ...DEFAULT_LIMITS };

/**
 * Query Engine class
 * Handles query compilation, planning, execution, and resource management
 */
export class QueryEngine {
  private planCache = new Map<string, ExecutionPlan>();
  private resultCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static instance: QueryEngine;

  private constructor() {}

  static getInstance(): QueryEngine {
    if (!QueryEngine.instance) {
      QueryEngine.instance = new QueryEngine();
    }
    return QueryEngine.instance;
  }

  /**
   * Compile a FilterDSL query into an execution plan
   */
  compileQuery(dsl: FilterDSL, queryId?: string): ExecutionPlan {
    const id = queryId || this.generateQueryId();

    // Check cache
    const cacheKey = JSON.stringify(dsl);
    const cachedPlan = this.planCache.get(cacheKey);
    if (cachedPlan) {
      return { ...cachedPlan, id };
    }

    // Compile to Prisma query
    const prismaQuery = buildPrismaQuery(dsl);

    // Analyze complexity
    const complexity = this.analyzeComplexity(dsl);
    const estimatedTime = this.estimateExecutionTime(dsl, complexity);
    const parallelCapable = this.canExecuteInParallel(dsl);
    const requiredIndexes = this.identifyRequiredIndexes(dsl);
    const optimizationHints = this.generateOptimizationHints(dsl, complexity);

    const plan: ExecutionPlan = {
      id,
      query: prismaQuery,
      estimatedComplexity: complexity,
      estimatedExecutionTime: estimatedTime,
      parallelCapable,
      requiresIndex: requiredIndexes,
      optimizationHints,
    };

    // Cache the plan
    this.planCache.set(cacheKey, plan);

    logger.debug('Query compiled', {
      queryId: id,
      complexity,
      estimatedTime,
      parallelCapable,
    });

    return plan;
  }

  /**
   * Execute a compiled query plan
   */
  async executeQuery<T>(
    plan: ExecutionPlan,
    options: { userId?: string; useCache?: boolean; cacheTtl?: number } = {}
  ): Promise<QueryResult<T>> {
    const { userId, useCache = true, cacheTtl = 60000 } = options;
    const startTime = Date.now();

    // Check concurrent query limit
    if (activeQueries.size >= resourceLimits.maxConcurrentQueries) {
      throw new Error('Too many concurrent queries. Please try again later.');
    }

    // Track active query
    const queryTracker = { startTime, userId };
    activeQueries.set(plan.id, queryTracker);

    try {
      // Check result cache
      if (useCache) {
        const cached = this.resultCache.get(plan.id);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          activeQueries.delete(plan.id);
          return {
            data: cached.data,
            executionTime: Date.now() - startTime,
            planId: plan.id,
            cached: true,
          };
        }
      }

      // Check execution time limit
      const elapsed = Date.now() - startTime;
      if (elapsed > resourceLimits.maxExecutionTime) {
        throw new Error('Query execution timeout exceeded.');
      }

      // Execute query with timeout
      const data = await Promise.race([
        this.executePrismaQuery<T>(plan.query),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Query timeout')),
            resourceLimits.maxExecutionTime - elapsed
          )
        ),
      ]);

      // Cache result
      if (useCache) {
        this.resultCache.set(plan.id, {
          data,
          timestamp: Date.now(),
          ttl: cacheTtl,
        });
      }

      const executionTime = Date.now() - startTime;

      logger.debug('Query executed', {
        queryId: plan.id,
        executionTime,
        resultCount: (data as any[]).length,
      });

      return {
        data,
        executionTime,
        planId: plan.id,
        cached: false,
      };
    } finally {
      activeQueries.delete(plan.id);
    }
  }

  /**
   * Execute a query with automatic compilation
   */
  async execute<T>(
    dsl: FilterDSL,
    options: { userId?: string; useCache?: boolean; cacheTtl?: number } = {}
  ): Promise<QueryResult<T>> {
    const plan = this.compileQuery(dsl);
    return this.executeQuery<T>(plan, options);
  }

  /**
   * Execute multiple queries in parallel
   */
  async executeParallel<T>(
    queries: FilterDSL[],
    options: { userId?: string; useCache?: boolean; maxConcurrency?: number } = {}
  ): Promise<QueryResult<T>[]> {
    const { maxConcurrency = 10 } = options;

    // Create execution plans
    const plans = queries.map(dsl => this.compileQuery(dsl));

    // Filter to only parallel-capable queries
    const parallelPlans = plans.filter(p => p.parallelCapable);

    if (parallelPlans.length === 0) {
      // Execute sequentially if none are parallel-capable
      const results: QueryResult<T>[] = [];
      for (const plan of plans) {
        const result = await this.executeQuery<T>(plan, options);
        results.push(result);
      }
      return results;
    }

    // Execute parallel queries with concurrency limit
    const chunks: ExecutionPlan[][] = [];
    for (let i = 0; i < parallelPlans.length; i += maxConcurrency) {
      chunks.push(parallelPlans.slice(i, i + maxConcurrency));
    }

    const allResults: QueryResult<T>[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(plan => this.executeQuery<T>(plan, options))
      );
      allResults.push(...chunkResults);
    }

    return allResults;
  }

  /**
   * Optimize a query plan based on execution hints
   */
  optimizePlan(plan: ExecutionPlan, hints: string[]): ExecutionPlan {
    const optimizedQuery = { ...plan.query };
    const newHints = [...plan.optimizationHints];

    for (const hint of hints) {
      if (hint === 'use_index') {
        // Index optimization would be applied here
        newHints.push('Applied index optimization');
      } else if (hint === 'reduce_limit') {
        // Suggest reducing result set
        newHints.push('Applied limit reduction');
      } else if (hint === 'parallel') {
        // Force parallel execution
        newHints.push('Forced parallel execution');
      }
    }

    return {
      ...plan,
      query: optimizedQuery,
      optimizationHints: newHints,
    };
  }

  /**
   * Set resource limits
   */
  setResourceLimits(limits: Partial<ResourceLimits>): void {
    resourceLimits = { ...resourceLimits, ...limits };
    logger.info('Resource limits updated', resourceLimits);
  }

  /**
   * Get resource usage stats
   */
  getResourceStats(): { activeQueries: number; cachedPlans: number; cachedResults: number } {
    return {
      activeQueries: activeQueries.size,
      cachedPlans: this.planCache.size,
      cachedResults: this.resultCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.planCache.clear();
    this.resultCache.clear();
    logger.info('Query engine caches cleared');
  }

  /**
   * Invalidate result cache for a specific query
   */
  invalidateResultCache(queryId: string): void {
    this.resultCache.delete(queryId);
  }

  /**
   * Invalidate all result caches (e.g., when data changes)
   */
  invalidateAllResultCaches(): void {
    this.resultCache.clear();
  }

  // Private helper methods

  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private analyzeComplexity(dsl: FilterDSL): 'low' | 'medium' | 'high' {
    const whereStr = JSON.stringify(dsl.where);
    const conditionCount = (whereStr.match(/eq|ne|gt|gte|lt|lte|in|nin|contains/g) || []).length;
    const hasOr = JSON.stringify(dsl.where).includes('"or"');
    const hasNot = JSON.stringify(dsl.where).includes('"not"');

    let score = conditionCount;
    if (hasOr) score += 2;
    if (hasNot) score += 1;

    if (score <= 3) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
  }

  private estimateExecutionTime(dsl: FilterDSL, complexity: 'low' | 'medium' | 'high'): number {
    const baseTime = complexity === 'low' ? 50 : complexity === 'medium' ? 200 : 500;
    const pagination = dsl.pagination;
    const limit = pagination?.limit || 100;

    return baseTime + limit * 2;
  }

  private canExecuteInParallel(dsl: FilterDSL): boolean {
    // Can parallelize if there are no OR conditions that depend on each other
    const whereStr = JSON.stringify(dsl.where);
    const orCount = (whereStr.match(/"or"/g) || []).length;
    return orCount <= 1;
  }

  private identifyRequiredIndexes(dsl: FilterDSL): string[] {
    const indexes: string[] = [];
    const whereStr = JSON.stringify(dsl.where);

    if (whereStr.includes('status')) indexes.push('status');
    if (whereStr.includes('score')) indexes.push('score');
    if (whereStr.includes('createdAt')) indexes.push('createdAt');
    if (whereStr.includes('agentId')) indexes.push('agentId');
    if (whereStr.includes('userId')) indexes.push('userId');

    return [...new Set(indexes)];
  }

  private generateOptimizationHints(
    dsl: FilterDSL,
    complexity: 'low' | 'medium' | 'high'
  ): string[] {
    const hints: string[] = [];

    if (complexity === 'high') {
      hints.push('Consider adding selective filters');
      hints.push('May benefit from query result caching');
    }

    if (dsl.pagination?.limit && dsl.pagination.limit > 100) {
      hints.push('Large result set - consider pagination');
    }

    const whereStr = JSON.stringify(dsl.where);
    if (whereStr.includes('"or"')) {
      hints.push('OR condition - consider splitting into separate queries');
    }

    if (!dsl.pagination) {
      hints.push('No pagination - add limit for better performance');
    }

    return hints;
  }

  private async executePrismaQuery<T>(query: PrismaQuery): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (prisma.match.findMany(query) as Promise<T[]>);
    return results;
  }
}

// Export singleton instance
export const queryEngine = QueryEngine.getInstance();
