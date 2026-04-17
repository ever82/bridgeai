/**
 * Query Builder
 * 查询构建器 - 将 FilterDSL 转换为 Prisma 查询
 */

import {
  FilterDSL,
  FilterExpression,
  FilterCondition,
  AndFilter,
  OrFilter,
  NotFilter,
  FilterOperator,
  FilterValue,
  OrderByClause,
  PaginationClause,
  isFilterCondition,
  isAndFilter,
  isOrFilter,
  isNotFilter,
} from '@bridgeai/shared';

/**
 * Prisma query object
 */
export interface PrismaQuery {
  where: any;
  orderBy?: any;
  skip?: number;
  take?: number;
}

/**
 * Build Prisma query from FilterDSL
 */
export function buildPrismaQuery(dsl: FilterDSL): PrismaQuery {
  const query: PrismaQuery = {
    where: buildWhereClause(dsl.where),
  };

  if (dsl.orderBy) {
    query.orderBy = buildOrderByClause(dsl.orderBy);
  }

  if (dsl.pagination) {
    const { skip, take } = buildPaginationClause(dsl.pagination);
    if (skip !== undefined) query.skip = skip;
    if (take !== undefined) query.take = take;
  }

  return query;
}

/**
 * Build Prisma where clause from FilterExpression
 */
function buildWhereClause(expression: FilterExpression): any {
  if (isFilterCondition(expression)) {
    return buildCondition(expression);
  }

  if (isAndFilter(expression)) {
    return {
      AND: expression.and.map(buildWhereClause),
    };
  }

  if (isOrFilter(expression)) {
    return {
      OR: expression.or.map(buildWhereClause),
    };
  }

  if (isNotFilter(expression)) {
    return {
      NOT: buildWhereClause(expression.not),
    };
  }

  return {};
}

/**
 * Build a single condition
 */
function buildCondition(condition: FilterCondition): any {
  const { field, operator, value } = condition;
  const fieldPath = buildFieldPath(field);

  switch (operator) {
    case 'eq':
      return { [fieldPath]: { equals: value } };

    case 'ne':
      return { [fieldPath]: { not: value } };

    case 'gt':
      return { [fieldPath]: { gt: value } };

    case 'gte':
      return { [fieldPath]: { gte: value } };

    case 'lt':
      return { [fieldPath]: { lt: value } };

    case 'lte':
      return { [fieldPath]: { lte: value } };

    case 'in':
      return { [fieldPath]: { in: Array.isArray(value) ? value : [value] } };

    case 'nin':
      return { [fieldPath]: { notIn: Array.isArray(value) ? value : [value] } };

    case 'contains':
      return { [fieldPath]: { contains: value, mode: 'insensitive' } };

    case 'startsWith':
      return { [fieldPath]: { startsWith: value, mode: 'insensitive' } };

    case 'endsWith':
      return { [fieldPath]: { endsWith: value, mode: 'insensitive' } };

    case 'exists':
      return value
        ? { [fieldPath]: { not: null } }
        : { [fieldPath]: { equals: null } };

    case 'regex':
      // Prisma doesn't support regex directly, use contains as fallback
      return { [fieldPath]: { contains: value, mode: 'insensitive' } };

    default:
      return { [fieldPath]: { equals: value } };
  }
}

/**
 * Build field path for Prisma (handles JSON fields)
 * e.g., 'profile.l2Data.budget' -> { path: ['profile', 'l2Data'], field: 'budget' }
 */
function buildFieldPath(field: string): any {
  const parts = field.split('.');

  if (parts.length === 1) {
    return field;
  }

  // Check if this is a JSON field query
  // Pattern: model.jsonField.nestedField
  if (parts.length >= 2) {
    // For JSON fields in Prisma, we use the path syntax
    return {
      path: parts,
    };
  }

  return field;
}

/**
 * Build order by clause
 */
function buildOrderByClause(orderBy: OrderByClause | OrderByClause[]): any {
  if (Array.isArray(orderBy)) {
    return orderBy.map(clause => ({
      [clause.field]: clause.direction,
    }));
  }

  return { [orderBy.field]: orderBy.direction };
}

/**
 * Build pagination clause
 */
function buildPaginationClause(pagination: PaginationClause): { skip?: number; take?: number } {
  const result: { skip?: number; take?: number } = {};

  if (pagination.limit !== undefined) {
    result.take = pagination.limit;
  }

  if (pagination.offset !== undefined) {
    result.skip = pagination.offset;
  } else if (pagination.page !== undefined && pagination.limit !== undefined) {
    result.skip = (pagination.page - 1) * pagination.limit;
  }

  return result;
}

/**
 * Query Builder class for fluent API
 */
export class QueryBuilder {
  private dsl: FilterDSL = { where: { and: [] } };

  constructor(initialFilter?: FilterDSL) {
    if (initialFilter) {
      this.dsl = { ...initialFilter };
    }
  }

  // Condition builders
  eq(field: string, value: FilterValue): this {
    this.addCondition({ field, operator: 'eq', value });
    return this;
  }

  ne(field: string, value: FilterValue): this {
    this.addCondition({ field, operator: 'ne', value });
    return this;
  }

  gt(field: string, value: number | Date): this {
    this.addCondition({ field, operator: 'gt', value });
    return this;
  }

  gte(field: string, value: number | Date): this {
    this.addCondition({ field, operator: 'gte', value });
    return this;
  }

  lt(field: string, value: number | Date): this {
    this.addCondition({ field, operator: 'lt', value });
    return this;
  }

  lte(field: string, value: number | Date): this {
    this.addCondition({ field, operator: 'lte', value });
    return this;
  }

  in(field: string, values: string[] | number[]): this {
    this.addCondition({ field, operator: 'in', value: values });
    return this;
  }

  nin(field: string, values: string[] | number[]): this {
    this.addCondition({ field, operator: 'nin', value: values });
    return this;
  }

  contains(field: string, value: string): this {
    this.addCondition({ field, operator: 'contains', value });
    return this;
  }

  startsWith(field: string, value: string): this {
    this.addCondition({ field, operator: 'startsWith', value });
    return this;
  }

  endsWith(field: string, value: string): this {
    this.addCondition({ field, operator: 'endsWith', value });
    return this;
  }

  exists(field: string, value: boolean = true): this {
    this.addCondition({ field, operator: 'exists', value });
    return this;
  }

  regex(field: string, pattern: string): this {
    this.addCondition({ field, operator: 'regex', value: pattern });
    return this;
  }

  // Logical combinations
  and(...expressions: FilterExpression[]): this {
    this.dsl.where = { and: [this.dsl.where, { and: expressions }] };
    return this;
  }

  or(...expressions: FilterExpression[]): this {
    this.dsl.where = { or: [this.dsl.where, ...expressions] };
    return this;
  }

  not(expression: FilterExpression): this {
    this.dsl.where = { and: [this.dsl.where, { not: expression }] };
    return this;
  }

  // Ordering
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    if (!this.dsl.orderBy) {
      this.dsl.orderBy = [];
    }
    if (Array.isArray(this.dsl.orderBy)) {
      this.dsl.orderBy.push({ field, direction });
    } else {
      this.dsl.orderBy = [this.dsl.orderBy, { field, direction }];
    }
    return this;
  }

  // Pagination
  page(page: number, limit: number): this {
    this.dsl.pagination = { page, limit };
    return this;
  }

  offset(offset: number, limit: number): this {
    this.dsl.pagination = { offset, limit };
    return this;
  }

  limit(limit: number): this {
    if (!this.dsl.pagination) {
      this.dsl.pagination = {};
    }
    this.dsl.pagination.limit = limit;
    return this;
  }

  // Build
  build(): PrismaQuery {
    return buildPrismaQuery(this.dsl);
  }

  getDSL(): FilterDSL {
    return { ...this.dsl };
  }

  // Private helpers
  private addCondition(condition: FilterCondition): void {
    const where = this.dsl.where as AndFilter;
    if (isAndFilter(where)) {
      where.and.push(condition);
    } else {
      this.dsl.where = { and: [where, condition] };
    }
  }
}

/**
 * Create a new query builder
 */
export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}

/**
 * Build JSON field filter for Prisma
 * Handles querying nested fields in JSON columns
 */
export function buildJsonFieldFilter(
  jsonField: string,
  path: string[],
  operator: FilterOperator,
  value: FilterValue
): any {
  // For Prisma JSON filtering, we construct the path
  const fullPath = [jsonField, ...path].join('.');

  const condition: FilterCondition = {
    field: fullPath,
    operator,
    value,
  };

  return buildCondition(condition);
}

/**
 * Validate and sanitize filter DSL
 */
export function validateFilterDSL(dsl: FilterDSL): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!dsl.where) {
    errors.push('FilterDSL must have a "where" clause');
  }

  if (dsl.pagination) {
    if (dsl.pagination.limit !== undefined) {
      if (dsl.pagination.limit < 1 || dsl.pagination.limit > 1000) {
        errors.push('Pagination limit must be between 1 and 1000');
      }
    }

    if (dsl.pagination.page !== undefined && dsl.pagination.page < 1) {
      errors.push('Pagination page must be at least 1');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Optimize filter DSL (simplify redundant conditions)
 */
export function optimizeFilterDSL(dsl: FilterDSL): FilterDSL {
  const optimized: FilterDSL = {
    where: optimizeExpression(dsl.where),
  };

  if (dsl.orderBy) {
    optimized.orderBy = dsl.orderBy;
  }

  if (dsl.pagination) {
    optimized.pagination = { ...dsl.pagination };
  }

  return optimized;
}

function optimizeExpression(expression: FilterExpression): FilterExpression {
  if (isAndFilter(expression)) {
    // Remove empty ANDs
    const optimizedAnds = expression.and
      .map(optimizeExpression)
      .filter(expr => !isEmptyExpression(expr));

    if (optimizedAnds.length === 0) {
      return { field: 'id', operator: 'exists', value: true }; // Always true
    }

    if (optimizedAnds.length === 1) {
      return optimizedAnds[0];
    }

    return { and: optimizedAnds };
  }

  if (isOrFilter(expression)) {
    const optimizedOrs = expression.or
      .map(optimizeExpression)
      .filter(expr => !isEmptyExpression(expr));

    if (optimizedOrs.length === 0) {
      return { field: 'id', operator: 'exists', value: false }; // Always false
    }

    if (optimizedOrs.length === 1) {
      return optimizedOrs[0];
    }

    return { or: optimizedOrs };
  }

  if (isNotFilter(expression)) {
    const optimizedNot = optimizeExpression(expression.not);
    if (isEmptyExpression(optimizedNot)) {
      return { field: 'id', operator: 'exists', value: false };
    }
    return { not: optimizedNot };
  }

  return expression;
}

function isEmptyExpression(expression: FilterExpression): boolean {
  if (isAndFilter(expression)) {
    return expression.and.length === 0;
  }
  if (isOrFilter(expression)) {
    return expression.or.length === 0;
  }
  return false;
}
