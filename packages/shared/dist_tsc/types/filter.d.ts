/**
 * Filter DSL Types
 * 过滤 DSL 类型定义
 *
 * Supports complex filtering with operators and logical combinations
 * 支持复杂过滤，包括操作符和逻辑组合
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'exists' | 'regex';
export type FilterValue = string | number | boolean | Date | string[] | number[] | null;
export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value?: FilterValue;
}
export interface AndFilter {
    and: FilterExpression[];
}
export interface OrFilter {
    or: FilterExpression[];
}
export interface NotFilter {
    not: FilterExpression;
}
export type FilterExpression = FilterCondition | AndFilter | OrFilter | NotFilter;
export interface FilterDSL {
    where: FilterExpression;
    orderBy?: OrderByClause | OrderByClause[];
    pagination?: PaginationClause;
}
export type SortDirection = 'asc' | 'desc';
export interface OrderByClause {
    field: string;
    direction: SortDirection;
}
export interface PaginationClause {
    page?: number;
    limit?: number;
    offset?: number;
    cursor?: string;
}
export interface FilterBuilder {
    eq(field: string, value: FilterValue): FilterCondition;
    ne(field: string, value: FilterValue): FilterCondition;
    gt(field: string, value: number | Date): FilterCondition;
    gte(field: string, value: number | Date): FilterCondition;
    lt(field: string, value: number | Date): FilterCondition;
    lte(field: string, value: number | Date): FilterCondition;
    in(field: string, values: string[] | number[]): FilterCondition;
    nin(field: string, values: string[] | number[]): FilterCondition;
    contains(field: string, value: string): FilterCondition;
    startsWith(field: string, value: string): FilterCondition;
    endsWith(field: string, value: string): FilterCondition;
    exists(field: string, value: boolean): FilterCondition;
    regex(field: string, pattern: string): FilterCondition;
    and(...expressions: FilterExpression[]): AndFilter;
    or(...expressions: FilterExpression[]): OrFilter;
    not(expression: FilterExpression): NotFilter;
}
export interface FilterValidationError {
    path: string;
    message: string;
    code: string;
}
export interface FilterValidationResult {
    valid: boolean;
    errors: FilterValidationError[];
}
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';
export interface FieldDefinition {
    name: string;
    type: FieldType;
    path: string;
    operators: FilterOperator[];
    nullable?: boolean;
    enumValues?: string[];
}
export interface FilterSchema {
    fields: FieldDefinition[];
    allowCustomFields?: boolean;
}
export interface FilterSuggestion {
    field: string;
    operator: FilterOperator;
    values: Array<{
        value: FilterValue;
        count: number;
    }>;
}
export interface FilterSuggestionRequest {
    field?: string;
    query?: string;
    limit?: number;
}
export interface SavedFilter {
    id: string;
    userId: string;
    name: string;
    description?: string;
    category?: string;
    filter: FilterDSL;
    isPublic: boolean;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface SavedFilterInput {
    name: string;
    description?: string;
    category?: string;
    filter: FilterDSL;
    isPublic?: boolean;
}
export interface FilterResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export declare function isFilterCondition(expr: FilterExpression): expr is FilterCondition;
export declare function isAndFilter(expr: FilterExpression): expr is AndFilter;
export declare function isOrFilter(expr: FilterExpression): expr is OrFilter;
export declare function isNotFilter(expr: FilterExpression): expr is NotFilter;
export declare const OPERATOR_METADATA: Record<FilterOperator, {
    label: string;
    description: string;
}>;
//# sourceMappingURL=filter.d.ts.map