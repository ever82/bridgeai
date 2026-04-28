"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock dependencies
jest.mock('../db/client', () => ({
    prisma: {
        match: {
            findMany: jest.fn(),
        },
    },
}));
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('../utils/queryBuilder', () => ({
    buildPrismaQuery: jest.fn().mockImplementation(dsl => ({ where: dsl.where, take: dsl.pagination?.limit || 100 })),
}));
const queryEngine_1 = require("../services/matching/queryEngine");
const client_1 = require("../db/client");
describe('QueryEngine', () => {
    let engine;
    beforeEach(() => {
        queryEngine_1.QueryEngine.resetInstance();
        engine = queryEngine_1.QueryEngine.getInstance();
        engine.clearCaches();
        jest.clearAllMocks();
    });
    afterEach(() => {
        engine.clearCaches();
    });
    describe('compileQuery', () => {
        it('should generate an execution plan', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            const plan = engine.compileQuery(dsl);
            expect(plan).toHaveProperty('id');
            expect(plan).toHaveProperty('query');
            expect(plan).toHaveProperty('estimatedComplexity');
            expect(plan).toHaveProperty('estimatedExecutionTime');
            expect(plan).toHaveProperty('parallelCapable');
            expect(plan).toHaveProperty('requiresIndex');
            expect(plan).toHaveProperty('optimizationHints');
        });
        it('should cache compiled plans', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            const plan1 = engine.compileQuery(dsl, 'q1');
            const plan2 = engine.compileQuery(dsl, 'q2');
            expect(plan1.query).toEqual(plan2.query);
        });
        it('should reuse cache key across equivalent DSL', () => {
            const dsl1 = { where: { field: 'status', operator: 'eq', value: 'active' } };
            const dsl2 = { where: { field: 'status', operator: 'eq', value: 'active' } };
            const plan1 = engine.compileQuery(dsl1, 'q1');
            const plan2 = engine.compileQuery(dsl2, 'q2');
            // Both compiled from the same DSL shape; cache key is JSON.stringify(dsl)
            expect(plan1.query).toEqual(plan2.query);
        });
    });
    describe('execute', () => {
        it('should execute a query and return results', async () => {
            const mockData = [{ id: '1', status: 'active' }, { id: '2', status: 'active' }];
            client_1.prisma.match.findMany.mockResolvedValue(mockData);
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { limit: 10 },
            };
            const result = await engine.execute(dsl);
            expect(result.data).toEqual(mockData);
            expect(result.planId).toBeDefined();
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
            expect(result.cached).toBe(false);
        });
        it('should return cached results when available', async () => {
            const mockData = [{ id: '1', status: 'active' }];
            client_1.prisma.match.findMany.mockResolvedValue(mockData);
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            // compile once, execute twice with the same plan to test result caching
            const plan = engine.compileQuery(dsl, 'cached-q1');
            const result1 = await engine.executeQuery(plan, { useCache: true });
            expect(result1.cached).toBe(false);
            const result2 = await engine.executeQuery(plan, { useCache: true });
            expect(result2.cached).toBe(true);
        });
        it('should skip cache when useCache is false', async () => {
            const mockData = [{ id: '1', status: 'active' }];
            client_1.prisma.match.findMany.mockResolvedValue(mockData);
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            const result = await engine.execute(dsl, { useCache: false });
            expect(result.cached).toBe(false);
        });
    });
    describe('executeParallel', () => {
        it('should execute all queries', async () => {
            client_1.prisma.match.findMany.mockResolvedValue([]);
            const queries = [
                { where: { field: 'status', operator: 'eq', value: 'active' } },
                { where: { field: 'score', operator: 'gte', value: 50 } },
            ];
            const results = await engine.executeParallel(queries);
            expect(results).toHaveLength(2);
        });
        it('should fall back to sequential execution when no queries are parallel-capable', async () => {
            client_1.prisma.match.findMany.mockResolvedValue([]);
            const queries = [
                { where: { field: 'status', operator: 'eq', value: 'active' } },
                { where: { field: 'status', operator: 'eq', value: 'pending' } },
            ];
            const results = await engine.executeParallel(queries, { maxConcurrency: 5 });
            expect(results).toHaveLength(2);
        });
    });
    describe('resource limits', () => {
        it('should set and retrieve resource limits', () => {
            engine.setResourceLimits({ maxConcurrentQueries: 25 });
            const stats = engine.getResourceStats();
            expect(stats).toHaveProperty('activeQueries');
            expect(stats).toHaveProperty('cachedPlans');
            expect(stats).toHaveProperty('cachedResults');
        });
    });
    describe('cache invalidation', () => {
        it('should invalidate a specific result cache entry', async () => {
            client_1.prisma.match.findMany.mockResolvedValue([{ id: '1' }]);
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            const result = await engine.execute(dsl, { useCache: true });
            expect(result.cached).toBe(false);
            engine.invalidateResultCache(result.planId);
        });
        it('should invalidate all result caches', () => {
            engine.invalidateAllResultCaches();
            const stats = engine.getResourceStats();
            expect(stats.cachedResults).toBe(0);
        });
        it('should clear all caches', () => {
            engine.clearCaches();
            const stats = engine.getResourceStats();
            expect(stats.cachedPlans).toBe(0);
            expect(stats.cachedResults).toBe(0);
        });
    });
});
//# sourceMappingURL=queryEngine.test.js.map