"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queryBuilder_1 = require("../utils/queryBuilder");
describe('QueryBuilder', () => {
    describe('buildPrismaQuery', () => {
        it('should build query with simple equality condition', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({ status: { equals: 'active' } });
        });
        it('should build query with multiple conditions', () => {
            const dsl = {
                where: {
                    and: [
                        { field: 'status', operator: 'eq', value: 'active' },
                        { field: 'score', operator: 'gte', value: 80 },
                    ],
                },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                AND: [{ status: { equals: 'active' } }, { score: { gte: 80 } }],
            });
        });
        it('should build query with OR condition', () => {
            const dsl = {
                where: {
                    or: [
                        { field: 'category', operator: 'eq', value: 'A' },
                        { field: 'category', operator: 'eq', value: 'B' },
                    ],
                },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                OR: [{ category: { equals: 'A' } }, { category: { equals: 'B' } }],
            });
        });
        it('should build query with NOT condition', () => {
            const dsl = {
                where: {
                    not: { field: 'status', operator: 'eq', value: 'deleted' },
                },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                NOT: { status: { equals: 'deleted' } },
            });
        });
        it('should handle IN operator', () => {
            const dsl = {
                where: { field: 'id', operator: 'in', value: ['1', '2', '3'] },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({ id: { in: ['1', '2', '3'] } });
        });
        it('should handle CONTAINS operator', () => {
            const dsl = {
                where: { field: 'name', operator: 'contains', value: 'test' },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                name: { contains: 'test', mode: 'insensitive' },
            });
        });
        it('should handle EXISTS operator', () => {
            const dsl = {
                where: { field: 'email', operator: 'exists', value: true },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({ email: { not: null } });
        });
        it('should handle multi-segment relation paths', () => {
            const dsl = {
                where: { field: 'agent.user.name', operator: 'eq', value: 'John' },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                agent: { user: { name: { equals: 'John' } } },
            });
        });
        it('should build JSON path query when field starts with $.', () => {
            const dsl = {
                where: { field: '$.profile.l1Data.budget', operator: 'eq', value: 1000 },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                profile: {
                    path: ['l1Data', 'budget'],
                    equals: 1000,
                },
            });
        });
        it('should build JSON path query with contains operator', () => {
            const dsl = {
                where: { field: '$.metadata.tags', operator: 'contains', value: 'important' },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.where).toEqual({
                metadata: {
                    path: ['tags'],
                    contains: 'important',
                    mode: 'insensitive',
                },
            });
        });
        it('should include orderBy clause', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                orderBy: { field: 'createdAt', direction: 'desc' },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.orderBy).toEqual({ createdAt: 'desc' });
        });
        it('should include pagination with limit', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { limit: 20 },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.take).toBe(20);
        });
        it('should include pagination with page and limit', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { page: 2, limit: 10 },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.take).toBe(10);
            expect(result.skip).toBe(10); // (page - 1) * limit
        });
        it('should include pagination with offset and limit', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { offset: 20, limit: 10 },
            };
            const result = (0, queryBuilder_1.buildPrismaQuery)(dsl);
            expect(result.take).toBe(10);
            expect(result.skip).toBe(20);
        });
    });
    describe('QueryBuilder class', () => {
        it('should create a basic query', () => {
            const builder = (0, queryBuilder_1.createQueryBuilder)();
            const result = builder.eq('status', 'active').build();
            // QueryBuilder wraps single conditions in AND
            expect(result.where).toEqual({
                AND: [{ status: { equals: 'active' } }],
            });
        });
        it('should chain multiple conditions', () => {
            const builder = (0, queryBuilder_1.createQueryBuilder)();
            const result = builder
                .eq('status', 'active')
                .gte('score', 80)
                .contains('name', 'test')
                .build();
            expect(result.where).toEqual({
                AND: [
                    { status: { equals: 'active' } },
                    { score: { gte: 80 } },
                    { name: { contains: 'test', mode: 'insensitive' } },
                ],
            });
        });
        it('should handle orderBy', () => {
            const builder = (0, queryBuilder_1.createQueryBuilder)();
            builder.eq('status', 'active').orderBy('score', 'desc');
            const result = builder.build();
            // orderBy can be array or single object depending on usage
            expect(result.orderBy).toBeDefined();
        });
        it('should handle pagination', () => {
            const builder = (0, queryBuilder_1.createQueryBuilder)();
            builder.eq('status', 'active').page(3, 10);
            const result = builder.build();
            expect(result.take).toBe(10);
            expect(result.skip).toBe(20);
        });
        it('should handle limit only', () => {
            const builder = (0, queryBuilder_1.createQueryBuilder)();
            builder.eq('status', 'active').limit(5);
            const result = builder.build();
            expect(result.take).toBe(5);
        });
    });
    describe('validateFilterDSL', () => {
        it('should validate a valid DSL', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { limit: 10, page: 1 },
            };
            const result = (0, queryBuilder_1.validateFilterDSL)(dsl);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject missing where clause', () => {
            const dsl = {};
            const result = (0, queryBuilder_1.validateFilterDSL)(dsl);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('FilterDSL must have a "where" clause');
        });
        it('should reject invalid pagination limit', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { limit: 0 },
            };
            const result = (0, queryBuilder_1.validateFilterDSL)(dsl);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Pagination limit must be between 1 and 1000');
        });
        it('should reject pagination limit > 1000', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { limit: 1001 },
            };
            const result = (0, queryBuilder_1.validateFilterDSL)(dsl);
            expect(result.valid).toBe(false);
        });
        it('should reject invalid page number', () => {
            const dsl = {
                where: { field: 'status', operator: 'eq', value: 'active' },
                pagination: { page: 0, limit: 10 },
            };
            const result = (0, queryBuilder_1.validateFilterDSL)(dsl);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Pagination page must be at least 1');
        });
    });
    describe('optimizeFilterDSL', () => {
        it('should simplify empty AND expressions', () => {
            const dsl = {
                where: { and: [] },
            };
            const result = (0, queryBuilder_1.optimizeFilterDSL)(dsl);
            // Empty AND should be simplified to always-true expression
            expect(result.where).toEqual({ field: 'id', operator: 'exists', value: true });
        });
        it('should simplify single-item AND to just that item', () => {
            const dsl = {
                where: {
                    and: [{ field: 'status', operator: 'eq', value: 'active' }],
                },
            };
            const result = (0, queryBuilder_1.optimizeFilterDSL)(dsl);
            // optimizeFilterDSL operates on FilterExpression format
            expect(result.where).toEqual({ field: 'status', operator: 'eq', value: 'active' });
        });
        it('should preserve valid multi-item AND', () => {
            const dsl = {
                where: {
                    and: [
                        { field: 'status', operator: 'eq', value: 'active' },
                        { field: 'score', operator: 'gte', value: 80 },
                    ],
                },
            };
            const result = (0, queryBuilder_1.optimizeFilterDSL)(dsl);
            // optimizeFilterDSL operates on FilterExpression format, not Prisma format
            expect(result.where).toEqual({
                and: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    { field: 'score', operator: 'gte', value: 80 },
                ],
            });
        });
    });
    describe('buildJsonFieldFilter', () => {
        it('should build JSON path filter with equals', () => {
            const result = (0, queryBuilder_1.buildJsonFieldFilter)('profile', ['l2Data', 'budget'], 'eq', 1000);
            expect(result).toEqual({
                profile: {
                    path: ['l2Data', 'budget'],
                    equals: 1000,
                },
            });
        });
        it('should build JSON path filter with contains', () => {
            const result = (0, queryBuilder_1.buildJsonFieldFilter)('metadata', ['tags'], 'contains', 'important');
            expect(result).toEqual({
                metadata: {
                    path: ['tags'],
                    contains: 'important',
                    mode: 'insensitive',
                },
            });
        });
        it('should handle single-level JSON paths', () => {
            const result = (0, queryBuilder_1.buildJsonFieldFilter)('config', ['enabled'], 'eq', true);
            expect(result).toEqual({
                config: {
                    path: ['enabled'],
                    equals: true,
                },
            });
        });
    });
});
//# sourceMappingURL=queryBuilder.test.js.map