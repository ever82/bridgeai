/**
 * Query Builder
 * 查询构建器 - 将 FilterDSL 转换为 Prisma 查询
 */
import { isFilterCondition, isAndFilter, isOrFilter, isNotFilter, } from '@bridgeai/shared';
/**
 * Build Prisma query from FilterDSL
 */
export function buildPrismaQuery(dsl) {
    const query = {
        where: buildWhereClause(dsl.where),
    };
    if (dsl.orderBy) {
        query.orderBy = buildOrderByClause(dsl.orderBy);
    }
    if (dsl.pagination) {
        const { skip, take } = buildPaginationClause(dsl.pagination);
        if (skip !== undefined)
            query.skip = skip;
        if (take !== undefined)
            query.take = take;
    }
    return query;
}
/**
 * Build Prisma where clause from FilterExpression
 */
function buildWhereClause(expression) {
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
 * JSON path prefix — field paths starting with "$." are treated as JSON column
 * queries. The first segment after "$" is the JSON column name and the
 * remaining segments form the Prisma JSON `path` array.
 *
 * Example: "$.profile.l1Data.budget" → { profile: { path: ['l1Data', 'budget'], ... } }
 */
const JSON_PATH_PREFIX = '$.';
/**
 * Build a single condition
 *
 * Multi-segment field paths (e.g. "agent.user.name") are treated as Prisma
 * relation nesting and produce `{ agent: { user: { name: { equals: value } } } }`.
 *
 * For JSON column queries, prefix the field with "$." — e.g. "$.profile.l1Data.budget"
 * emits `{ profile: { path: ['l1Data', 'budget'], equals: value } }`.
 */
function buildCondition(condition) {
    const { field, operator, value } = condition;
    // Detect JSON path queries: "$.column.path.to.key"
    if (field.startsWith(JSON_PATH_PREFIX)) {
        const segments = field.slice(JSON_PATH_PREFIX.length).split('.');
        if (segments.length >= 2) {
            const jsonField = segments[0];
            const path = segments.slice(1);
            return buildJsonFieldFilter(jsonField, path, operator, value);
        }
    }
    const parts = field.split('.');
    const operatorClause = buildOperatorClause(operator, value);
    // Build nested object structure for relation paths (Prisma convention)
    return parts.reduceRight((acc, part) => ({ [part]: acc }), operatorClause);
}
/**
 * Build the operator clause (without the field key)
 */
function buildOperatorClause(operator, value) {
    switch (operator) {
        case 'eq':
            return { equals: value };
        case 'ne':
            return { not: value };
        case 'gt':
            return { gt: value };
        case 'gte':
            return { gte: value };
        case 'lt':
            return { lt: value };
        case 'lte':
            return { lte: value };
        case 'in':
            return { in: Array.isArray(value) ? value : [value] };
        case 'nin':
            return { notIn: Array.isArray(value) ? value : [value] };
        case 'contains':
            return { contains: value, mode: 'insensitive' };
        case 'startsWith':
            return { startsWith: value, mode: 'insensitive' };
        case 'endsWith':
            return { endsWith: value, mode: 'insensitive' };
        case 'exists':
            return value ? { not: null } : { equals: null };
        default:
            return { equals: value };
    }
}
/**
 * Build order by clause
 */
function buildOrderByClause(orderBy) {
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
function buildPaginationClause(pagination) {
    const result = {};
    if (pagination.limit !== undefined) {
        result.take = pagination.limit;
    }
    if (pagination.offset !== undefined) {
        result.skip = pagination.offset;
    }
    else if (pagination.page !== undefined && pagination.limit !== undefined) {
        result.skip = (pagination.page - 1) * pagination.limit;
    }
    return result;
}
/**
 * Query Builder class for fluent API
 */
export class QueryBuilder {
    dsl = { where: { and: [] } };
    constructor(initialFilter) {
        if (initialFilter) {
            this.dsl = { ...initialFilter };
        }
    }
    // Condition builders
    eq(field, value) {
        this.addCondition({ field, operator: 'eq', value });
        return this;
    }
    ne(field, value) {
        this.addCondition({ field, operator: 'ne', value });
        return this;
    }
    gt(field, value) {
        this.addCondition({ field, operator: 'gt', value });
        return this;
    }
    gte(field, value) {
        this.addCondition({ field, operator: 'gte', value });
        return this;
    }
    lt(field, value) {
        this.addCondition({ field, operator: 'lt', value });
        return this;
    }
    lte(field, value) {
        this.addCondition({ field, operator: 'lte', value });
        return this;
    }
    in(field, values) {
        this.addCondition({ field, operator: 'in', value: values });
        return this;
    }
    nin(field, values) {
        this.addCondition({ field, operator: 'nin', value: values });
        return this;
    }
    contains(field, value) {
        this.addCondition({ field, operator: 'contains', value });
        return this;
    }
    startsWith(field, value) {
        this.addCondition({ field, operator: 'startsWith', value });
        return this;
    }
    endsWith(field, value) {
        this.addCondition({ field, operator: 'endsWith', value });
        return this;
    }
    exists(field, value = true) {
        this.addCondition({ field, operator: 'exists', value });
        return this;
    }
    // Logical combinations
    and(...expressions) {
        this.dsl.where = { and: [this.dsl.where, { and: expressions }] };
        return this;
    }
    or(...expressions) {
        this.dsl.where = { or: [this.dsl.where, ...expressions] };
        return this;
    }
    not(expression) {
        this.dsl.where = { and: [this.dsl.where, { not: expression }] };
        return this;
    }
    // Ordering
    orderBy(field, direction = 'asc') {
        if (!this.dsl.orderBy) {
            this.dsl.orderBy = [];
        }
        if (Array.isArray(this.dsl.orderBy)) {
            this.dsl.orderBy.push({ field, direction });
        }
        else {
            this.dsl.orderBy = [this.dsl.orderBy, { field, direction }];
        }
        return this;
    }
    // Pagination
    page(page, limit) {
        this.dsl.pagination = { page, limit };
        return this;
    }
    offset(offset, limit) {
        this.dsl.pagination = { offset, limit };
        return this;
    }
    limit(limit) {
        if (!this.dsl.pagination) {
            this.dsl.pagination = {};
        }
        this.dsl.pagination.limit = limit;
        return this;
    }
    // Build
    build() {
        return buildPrismaQuery(this.dsl);
    }
    getDSL() {
        return { ...this.dsl };
    }
    // Private helpers
    addCondition(condition) {
        const where = this.dsl.where;
        if (isAndFilter(where)) {
            where.and.push(condition);
        }
        else {
            this.dsl.where = { and: [where, condition] };
        }
    }
}
/**
 * Create a new query builder
 */
export function createQueryBuilder() {
    return new QueryBuilder();
}
/**
 * Build JSON field filter for Prisma
 *
 * Generates the Prisma JSON path syntax for querying nested fields in JSON
 * columns, e.g. `{ profile: { path: ['l2Data', 'budget'], equals: value } }`.
 *
 * This is invoked automatically by `buildCondition` when the field path starts
 * with "$." — e.g. `$.profile.l2Data.budget`.
 */
export function buildJsonFieldFilter(jsonField, path, operator, value) {
    const operatorClause = buildOperatorClause(operator, value);
    return {
        [jsonField]: {
            path,
            ...operatorClause,
        },
    };
}
/**
 * Validate and sanitize filter DSL
 */
const MAX_NESTING_DEPTH = 10;
const VALID_OPERATORS = new Set([
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'nin',
    'contains',
    'startsWith',
    'endsWith',
    'exists',
]);
export function validateFilterDSL(dsl) {
    const errors = [];
    if (!dsl.where) {
        errors.push('FilterDSL must have a "where" clause');
    }
    else {
        validateExpression(dsl.where, 0, errors);
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
function validateExpression(expr, depth, errors) {
    if (depth > MAX_NESTING_DEPTH) {
        errors.push(`Filter nesting depth exceeds maximum of ${MAX_NESTING_DEPTH}`);
        return;
    }
    if (isFilterCondition(expr)) {
        validateCondition(expr, errors);
        return;
    }
    if (isAndFilter(expr)) {
        if (!Array.isArray(expr.and)) {
            errors.push('"and" must be an array');
            return;
        }
        expr.and.forEach(e => validateExpression(e, depth + 1, errors));
        return;
    }
    if (isOrFilter(expr)) {
        if (!Array.isArray(expr.or)) {
            errors.push('"or" must be an array');
            return;
        }
        expr.or.forEach(e => validateExpression(e, depth + 1, errors));
        return;
    }
    if (isNotFilter(expr)) {
        validateExpression(expr.not, depth + 1, errors);
        return;
    }
    errors.push('Invalid filter expression structure');
}
function validateCondition(condition, errors) {
    if (!condition.field || typeof condition.field !== 'string') {
        errors.push('Filter condition must have a "field" string');
    }
    if (!condition.operator || !VALID_OPERATORS.has(condition.operator)) {
        errors.push(`Invalid filter operator: "${condition.operator}"`);
    }
    // Value type checks per operator
    const { operator, value } = condition;
    if (operator === 'in' || operator === 'nin') {
        if (!Array.isArray(value)) {
            errors.push(`Operator "${operator}" requires an array value`);
        }
    }
    if (operator === 'exists') {
        if (typeof value !== 'boolean') {
            errors.push('Operator "exists" requires a boolean value');
        }
    }
    if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
        if (typeof value !== 'number' && !(value instanceof Date)) {
            errors.push(`Operator "${operator}" requires a number or Date value`);
        }
    }
}
/**
 * Optimize filter DSL (simplify redundant conditions)
 */
export function optimizeFilterDSL(dsl) {
    const optimized = {
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
function optimizeExpression(expression) {
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
function isEmptyExpression(expression) {
    if (isAndFilter(expression)) {
        return expression.and.length === 0;
    }
    if (isOrFilter(expression)) {
        return expression.or.length === 0;
    }
    return false;
}
//# sourceMappingURL=queryBuilder.js.map