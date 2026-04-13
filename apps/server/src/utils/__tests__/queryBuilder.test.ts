/**
 * Query Builder Tests
 * 查询构建器单元测试
 */

import {
  buildPrismaQuery,
  QueryBuilder,
  createQueryBuilder,
  validateFilterDSL,
  optimizeFilterDSL,
  buildJsonFieldFilter,
} from './queryBuilder';
import { FilterDSL, FilterCondition } from '@visionshare/shared';

describe('Query Builder', () => {
  describe('buildPrismaQuery', () => {
    it('should build basic where clause with eq operator', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'name',
          operator: 'eq',
          value: 'Test Agent',
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        name: { equals: 'Test Agent' },
      });
    });

    it('should build where clause with gt operator', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'creditScore',
          operator: 'gt',
          value: 600,
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        creditScore: { gt: 600 },
      });
    });

    it('should build where clause with contains operator', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'name',
          operator: 'contains',
          value: 'Test',
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        name: { contains: 'Test', mode: 'insensitive' },
      });
    });

    it('should build where clause with in operator', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'type',
          operator: 'in',
          value: ['VISIONSHARE', 'AGENTDATE'],
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        type: { in: ['VISIONSHARE', 'AGENTDATE'] },
      });
    });

    it('should build AND logic filter', () => {
      const dsl: FilterDSL = {
        where: {
          and: [
            { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
          ],
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        AND: [
          { type: { equals: 'VISIONSHARE' } },
          { status: { equals: 'ACTIVE' } },
        ],
      });
    });

    it('should build OR logic filter', () => {
      const dsl: FilterDSL = {
        where: {
          or: [
            { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
            { field: 'type', operator: 'eq', value: 'AGENTDATE' },
          ],
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        OR: [
          { type: { equals: 'VISIONSHARE' } },
          { type: { equals: 'AGENTDATE' } },
        ],
      });
    });

    it('should build NOT logic filter', () => {
      const dsl: FilterDSL = {
        where: {
          not: {
            field: 'status',
            operator: 'eq',
            value: 'ARCHIVED',
          },
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        NOT: { status: { equals: 'ARCHIVED' } },
      });
    });

    it('should build nested logical filters', () => {
      const dsl: FilterDSL = {
        where: {
          and: [
            { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
            {
              or: [
                { field: 'status', operator: 'eq', value: 'ACTIVE' },
                { field: 'status', operator: 'eq', value: 'DRAFT' },
              ],
            },
          ],
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        AND: [
          { type: { equals: 'VISIONSHARE' } },
          {
            OR: [
              { status: { equals: 'ACTIVE' } },
              { status: { equals: 'DRAFT' } },
            ],
          },
        ],
      });
    });

    it('should support orderBy clause', () => {
      const dsl: FilterDSL = {
        where: { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
        orderBy: { field: 'createdAt', direction: 'desc' },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.orderBy).toEqual({
        createdAt: 'desc',
      });
    });

    it('should support multiple orderBy clauses', () => {
      const dsl: FilterDSL = {
        where: { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
        orderBy: [
          { field: 'status', direction: 'asc' },
          { field: 'createdAt', direction: 'desc' },
        ],
      };

      const result = buildPrismaQuery(dsl);

      expect(result.orderBy).toEqual([
        { status: 'asc' },
        { createdAt: 'desc' },
      ]);
    });

    it('should support pagination with page and limit', () => {
      const dsl: FilterDSL = {
        where: { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
        pagination: { page: 2, limit: 10 },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.skip).toBe(10);
      expect(result.take).toBe(10);
    });

    it('should support pagination with offset', () => {
      const dsl: FilterDSL = {
        where: { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
        pagination: { offset: 20, limit: 10 },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.skip).toBe(20);
      expect(result.take).toBe(10);
    });

    it('should handle exists operator with true', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'description',
          operator: 'exists',
          value: true,
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        description: { not: null },
      });
    });

    it('should handle exists operator with false', () => {
      const dsl: FilterDSL = {
        where: {
          field: 'description',
          operator: 'exists',
          value: false,
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        description: { equals: null },
      });
    });

    it('should handle range operators (gte, lte)', () => {
      const dsl: FilterDSL = {
        where: {
          and: [
            { field: 'creditScore', operator: 'gte', value: 600 },
            { field: 'creditScore', operator: 'lte', value: 800 },
          ],
        },
      };

      const result = buildPrismaQuery(dsl);

      expect(result.where).toEqual({
        AND: [
          { creditScore: { gte: 600 } },
          { creditScore: { lte: 800 } },
        ],
      });
    });
  });

  describe('QueryBuilder class', () => {
    it('should build query using fluent API', () => {
      const builder = new QueryBuilder();

      const result = builder
        .eq('type', 'VISIONSHARE')
        .gt('creditScore', 600)
        .orderBy('createdAt', 'desc')
        .page(1, 20)
        .build();

      expect(result.where).toEqual({
        AND: [
          { and: [] },
          { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
          { field: 'creditScore', operator: 'gt', value: 600 },
        ],
      });
    });

    it('should support method chaining', () => {
      const builder = createQueryBuilder();

      const result = builder
        .contains('name', 'Test')
        .in('type', ['VISIONSHARE', 'AGENTDATE'])
        .gte('createdAt', new Date('2024-01-01'))
        .limit(50)
        .build();

      expect(result.take).toBe(50);
    });

    it('should get DSL from builder', () => {
      const builder = createQueryBuilder();

      builder.eq('type', 'VISIONSHARE').gt('creditScore', 600);

      const dsl = builder.getDSL();

      expect(dsl.where).toBeDefined();
      expect(dsl.pagination).toBeUndefined();
    });
  });

  describe('validateFilterDSL', () => {
    it('should validate valid DSL', () => {
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
        pagination: { page: 1, limit: 20 },
      };

      const result = validateFilterDSL(dsl);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject DSL without where clause', () => {
      const dsl = {} as FilterDSL;

      const result = validateFilterDSL(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('FilterDSL must have a "where" clause');
    });

    it('should validate pagination limit', () => {
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
        pagination: { page: 1, limit: 1001 },
      };

      const result = validateFilterDSL(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pagination limit must be between 1 and 1000');
    });

    it('should validate pagination page', () => {
      const dsl: FilterDSL = {
        where: { field: 'name', operator: 'eq', value: 'Test' },
        pagination: { page: 0, limit: 20 },
      };

      const result = validateFilterDSL(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pagination page must be at least 1');
    });
  });

  describe('optimizeFilterDSL', () => {
    it('should remove empty AND conditions', () => {
      const dsl: FilterDSL = {
        where: {
          and: [],
        },
      };

      const result = optimizeFilterDSL(dsl);

      expect(result.where).toEqual({
        field: 'id',
        operator: 'exists',
        value: true,
      });
    });

    it('should flatten single-item AND', () => {
      const dsl: FilterDSL = {
        where: {
          and: [{ field: 'name', operator: 'eq', value: 'Test' }],
        },
      };

      const result = optimizeFilterDSL(dsl);

      expect(result.where).toEqual({
        field: 'name',
        operator: 'eq',
        value: 'Test',
      });
    });

    it('should preserve multi-item AND', () => {
      const dsl: FilterDSL = {
        where: {
          and: [
            { field: 'name', operator: 'eq', value: 'Test' },
            { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
          ],
        },
      };

      const result = optimizeFilterDSL(dsl);

      expect(result.where).toEqual({
        and: [
          { field: 'name', operator: 'eq', value: 'Test' },
          { field: 'type', operator: 'eq', value: 'VISIONSHARE' },
        ],
      });
    });
  });

  describe('buildJsonFieldFilter', () => {
    it('should build JSON field filter', () => {
      const result = buildJsonFieldFilter(
        'config',
        ['scene', 'budget'],
        'gt',
        100
      );

      expect(result).toBeDefined();
    });
  });
});
