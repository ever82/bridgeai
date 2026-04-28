/**
 * Query Builder
 * 查询构建器 - 将 FilterDSL 转换为 Prisma 查询
 */
import { FilterDSL, FilterExpression, FilterOperator, FilterValue } from '@bridgeai/shared';
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
export declare function buildPrismaQuery(dsl: FilterDSL): PrismaQuery;
/**
 * Query Builder class for fluent API
 */
export declare class QueryBuilder {
    private dsl;
    constructor(initialFilter?: FilterDSL);
    eq(field: string, value: FilterValue): this;
    ne(field: string, value: FilterValue): this;
    gt(field: string, value: number | Date): this;
    gte(field: string, value: number | Date): this;
    lt(field: string, value: number | Date): this;
    lte(field: string, value: number | Date): this;
    in(field: string, values: string[] | number[]): this;
    nin(field: string, values: string[] | number[]): this;
    contains(field: string, value: string): this;
    startsWith(field: string, value: string): this;
    endsWith(field: string, value: string): this;
    exists(field: string, value?: boolean): this;
    and(...expressions: FilterExpression[]): this;
    or(...expressions: FilterExpression[]): this;
    not(expression: FilterExpression): this;
    orderBy(field: string, direction?: 'asc' | 'desc'): this;
    page(page: number, limit: number): this;
    offset(offset: number, limit: number): this;
    limit(limit: number): this;
    build(): PrismaQuery;
    getDSL(): FilterDSL;
    private addCondition;
}
/**
 * Create a new query builder
 */
export declare function createQueryBuilder(): QueryBuilder;
/**
 * Build JSON field filter for Prisma
 *
 * Generates the Prisma JSON path syntax for querying nested fields in JSON
 * columns, e.g. `{ profile: { path: ['l2Data', 'budget'], equals: value } }`.
 *
 * This is invoked automatically by `buildCondition` when the field path starts
 * with "$." — e.g. `$.profile.l2Data.budget`.
 */
export declare function buildJsonFieldFilter(jsonField: string, path: string[], operator: FilterOperator, value: FilterValue): any;
export declare function validateFilterDSL(dsl: FilterDSL): {
    valid: boolean;
    errors: string[];
};
/**
 * Optimize filter DSL (simplify redundant conditions)
 */
export declare function optimizeFilterDSL(dsl: FilterDSL): FilterDSL;
//# sourceMappingURL=queryBuilder.d.ts.map