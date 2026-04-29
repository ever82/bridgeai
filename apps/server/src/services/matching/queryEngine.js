/**
 * Query Engine
 * Provides query compilation, execution plan generation, optimization, and parallel query execution.
 *
 * Note: This engine currently serves subscription queries via QuerySubscriptionManager only.
 * The synchronous match query path in MatchQueryService.queryMatches() uses prisma.agent.findMany
 * directly via buildPrismaQuery for simplicity and correctness. Routing one-shot queries through
 * QueryEngine would add caching/planning overhead with no benefit for low-volume request paths.
 */
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { buildPrismaQuery } from '../../utils/queryBuilder';
/**
 * Bounded cache with LRU eviction. Optionally evicts entries whose TTL is
 * exceeded on access.
 */
class LruCache {
    maxSize;
    store = new Map();
    constructor(maxSize) {
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.store.get(key);
        if (value === undefined)
            return undefined;
        // Refresh recency: delete + re-insert moves the entry to the tail.
        this.store.delete(key);
        this.store.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.store.has(key)) {
            this.store.delete(key);
        }
        else if (this.store.size >= this.maxSize) {
            // Evict the oldest (least recently used) entry.
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) {
                this.store.delete(oldestKey);
            }
        }
        this.store.set(key, value);
    }
    delete(key) {
        return this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    get size() {
        return this.store.size;
    }
    keys() {
        return this.store.keys();
    }
}
// Resource management
const activeQueries = new Map();
const DEFAULT_LIMITS = {
    maxConcurrentQueries: 50,
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
};
// Default cache sizes - tuned to keep memory bounded under heavy load.
const DEFAULT_PLAN_CACHE_SIZE = 500;
const DEFAULT_RESULT_CACHE_SIZE = 1000;
let resourceLimits = { ...DEFAULT_LIMITS };
/**
 * Query Engine class
 * Handles query compilation, planning, execution, and resource management
 */
export class QueryEngine {
    planCache;
    resultCache;
    static instance;
    constructor(planCacheSize = DEFAULT_PLAN_CACHE_SIZE, resultCacheSize = DEFAULT_RESULT_CACHE_SIZE) {
        this.planCache = new LruCache(planCacheSize);
        this.resultCache = new LruCache(resultCacheSize);
    }
    static getInstance() {
        if (!QueryEngine.instance) {
            QueryEngine.instance = new QueryEngine();
        }
        return QueryEngine.instance;
    }
    /**
     * Reset the singleton instance. Used in tests.
     */
    static resetInstance() {
        QueryEngine.instance = undefined;
    }
    /**
     * Compile a FilterDSL query into an execution plan
     */
    compileQuery(dsl, queryId) {
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
        const plan = {
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
    async executeQuery(plan, options = {}) {
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
                if (cached) {
                    if (Date.now() - cached.timestamp < cached.ttl) {
                        activeQueries.delete(plan.id);
                        return {
                            data: cached.data,
                            executionTime: Date.now() - startTime,
                            planId: plan.id,
                            cached: true,
                        };
                    }
                    // Expired - drop from cache so memory is reclaimed eagerly.
                    this.resultCache.delete(plan.id);
                }
            }
            // Check execution time limit
            const elapsed = Date.now() - startTime;
            if (elapsed > resourceLimits.maxExecutionTime) {
                throw new Error('Query execution timeout exceeded.');
            }
            // Execute query with timeout
            const timeoutMs = resourceLimits.maxExecutionTime - elapsed;
            let timeoutId;
            let data;
            try {
                data = await Promise.race([
                    this.executePrismaQuery(plan.query),
                    new Promise((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
                    }),
                ]);
            }
            finally {
                clearTimeout(timeoutId);
            }
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
                resultCount: data.length,
            });
            return {
                data,
                executionTime,
                planId: plan.id,
                cached: false,
            };
        }
        finally {
            activeQueries.delete(plan.id);
        }
    }
    /**
     * Execute a query with automatic compilation
     */
    async execute(dsl, options = {}) {
        const plan = this.compileQuery(dsl);
        return this.executeQuery(plan, options);
    }
    /**
     * Execute multiple queries in parallel
     */
    async executeParallel(queries, options = {}) {
        const { maxConcurrency = 10 } = options;
        // Create execution plans
        const plans = queries.map(dsl => this.compileQuery(dsl));
        // Filter to only parallel-capable queries
        const parallelPlans = plans.filter(p => p.parallelCapable);
        if (parallelPlans.length === 0) {
            // Execute sequentially if none are parallel-capable
            const results = [];
            for (const plan of plans) {
                const result = await this.executeQuery(plan, options);
                results.push(result);
            }
            return results;
        }
        // Execute parallel queries with concurrency limit
        const chunks = [];
        for (let i = 0; i < parallelPlans.length; i += maxConcurrency) {
            chunks.push(parallelPlans.slice(i, i + maxConcurrency));
        }
        const allResults = [];
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map(plan => this.executeQuery(plan, options)));
            allResults.push(...chunkResults);
        }
        return allResults;
    }
    /**
     * Optimize a query plan based on execution hints
     */
    optimizePlan(plan, hints) {
        const optimizedQuery = { ...plan.query };
        const newHints = [...plan.optimizationHints];
        for (const hint of hints) {
            if (hint === 'use_index') {
                // Index optimization would be applied here
                newHints.push('Applied index optimization');
            }
            else if (hint === 'reduce_limit') {
                // Suggest reducing result set
                newHints.push('Applied limit reduction');
            }
            else if (hint === 'parallel') {
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
    setResourceLimits(limits) {
        resourceLimits = { ...resourceLimits, ...limits };
        logger.info('Resource limits updated', resourceLimits);
    }
    /**
     * Get resource usage stats
     */
    getResourceStats() {
        return {
            activeQueries: activeQueries.size,
            cachedPlans: this.planCache.size,
            cachedResults: this.resultCache.size,
        };
    }
    /**
     * Clear all caches
     */
    clearCaches() {
        this.planCache.clear();
        this.resultCache.clear();
        logger.info('Query engine caches cleared');
    }
    /**
     * Invalidate result cache for a specific query
     */
    invalidateResultCache(queryId) {
        this.resultCache.delete(queryId);
    }
    /**
     * Invalidate all result caches (e.g., when data changes)
     */
    invalidateAllResultCaches() {
        this.resultCache.clear();
    }
    // Private helper methods
    generateQueryId() {
        return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    analyzeComplexity(dsl) {
        const whereStr = JSON.stringify(dsl.where);
        const conditionCount = (whereStr.match(/eq|ne|gt|gte|lt|lte|in|nin|contains/g) || []).length;
        const hasOr = JSON.stringify(dsl.where).includes('"or"');
        const hasNot = JSON.stringify(dsl.where).includes('"not"');
        let score = conditionCount;
        if (hasOr)
            score += 2;
        if (hasNot)
            score += 1;
        if (score <= 3)
            return 'low';
        if (score <= 7)
            return 'medium';
        return 'high';
    }
    estimateExecutionTime(dsl, complexity) {
        const baseTime = complexity === 'low' ? 50 : complexity === 'medium' ? 200 : 500;
        const pagination = dsl.pagination;
        const limit = pagination?.limit || 100;
        return baseTime + limit * 2;
    }
    canExecuteInParallel(dsl) {
        // Can parallelize if there are no OR conditions that depend on each other
        const whereStr = JSON.stringify(dsl.where);
        const orCount = (whereStr.match(/"or"/g) || []).length;
        return orCount <= 1;
    }
    identifyRequiredIndexes(dsl) {
        const indexes = [];
        const whereStr = JSON.stringify(dsl.where);
        if (whereStr.includes('status'))
            indexes.push('status');
        if (whereStr.includes('score'))
            indexes.push('score');
        if (whereStr.includes('createdAt'))
            indexes.push('createdAt');
        if (whereStr.includes('agentId'))
            indexes.push('agentId');
        if (whereStr.includes('userId'))
            indexes.push('userId');
        return [...new Set(indexes)];
    }
    generateOptimizationHints(dsl, complexity) {
        const hints = [];
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
    async executePrismaQuery(query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await prisma.match.findMany(query);
        return results;
    }
}
// Export singleton instance
export const queryEngine = QueryEngine.getInstance();
//# sourceMappingURL=queryEngine.js.map