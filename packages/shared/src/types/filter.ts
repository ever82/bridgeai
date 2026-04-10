/**
 * Filter DSL Types
 * 过滤 DSL 类型定义
 *
 * Supports complex filtering with operators and logical combinations
 * 支持复杂过滤，包括操作符和逻辑组合
 */

// ============================================
// Filter Operators
// ============================================

export type FilterOperator =
  | 'eq'      // Equal (等于)
  | 'ne'      // Not equal (不等于)
  | 'gt'      // Greater than (大于)
  | 'gte'     // Greater than or equal (大于等于)
  | 'lt'      // Less than (小于)
  | 'lte'     // Less than or equal (小于等于)
  | 'in'      // In array (在数组中)
  | 'nin'     // Not in array (不在数组中)
  | 'contains'// Contains substring (包含子串)
  | 'startsWith' // Starts with (以...开头)
  | 'endsWith'   // Ends with (以...结尾)
  | 'exists'     // Field exists (字段存在)
  | 'regex';     // Regular expression (正则匹配)

// ============================================
// Filter Value Types
// ============================================

export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | null;

// ============================================
// Base Filter Condition
// ============================================

export interface FilterCondition {
  field: string;           // Field path (支持嵌套: 'profile.name')
  operator: FilterOperator;
  value?: FilterValue;     // Optional for exists operator
}

// ============================================
// Logical Filter Combinations
// ============================================

export interface AndFilter {
  and: FilterExpression[];
}

export interface OrFilter {
  or: FilterExpression[];
}

export interface NotFilter {
  not: FilterExpression;
}

// ============================================
// Filter Expression (Recursive)
// ============================================

export type FilterExpression =
  | FilterCondition
  | AndFilter
  | OrFilter
  | NotFilter;

// ============================================
// Complete Filter DSL
// ============================================

export interface FilterDSL {
  where: FilterExpression;
  orderBy?: OrderByClause | OrderByClause[];
  pagination?: PaginationClause;
}

// ============================================
// Ordering
// ============================================

export type SortDirection = 'asc' | 'desc';

export interface OrderByClause {
  field: string;
  direction: SortDirection;
}

// ============================================
// Pagination
// ============================================

export interface PaginationClause {
  page?: number;      // 1-based page number
  limit?: number;     // Items per page
  offset?: number;    // Alternative to page
  cursor?: string;    // Cursor-based pagination
}

// ============================================
// Filter Builder Types
// ============================================

export interface FilterBuilder {
  // Condition builders
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

  // Logical combinations
  and(...expressions: FilterExpression[]): AndFilter;
  or(...expressions: FilterExpression[]): OrFilter;
  not(expression: FilterExpression): NotFilter;
}

// ============================================
// Filter Validation
// ============================================

export interface FilterValidationError {
  path: string;
  message: string;
  code: string;
}

export interface FilterValidationResult {
  valid: boolean;
  errors: FilterValidationError[];
}

// ============================================
// Type-Safe Field Definitions
// ============================================

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'array'
  | 'object';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  path: string;           // Full path in object
  operators: FilterOperator[]; // Allowed operators
  nullable?: boolean;
  enumValues?: string[];  // For enum type
}

export interface FilterSchema {
  fields: FieldDefinition[];
  allowCustomFields?: boolean;
}

// ============================================
// Filter Suggestions
// ============================================

export interface FilterSuggestion {
  field: string;
  operator: FilterOperator;
  values: Array<{ value: FilterValue; count: number }>;
}

export interface FilterSuggestionRequest {
  field?: string;
  query?: string;
  limit?: number;
}

// ============================================
// Saved Filter Types
// ============================================

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

// ============================================
// Filter Result
// ============================================

export interface FilterResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// Utility Types
// ============================================

// Type guard functions
export function isFilterCondition(expr: FilterExpression): expr is FilterCondition {
  return 'field' in expr && 'operator' in expr;
}

export function isAndFilter(expr: FilterExpression): expr is AndFilter {
  return 'and' in expr && Array.isArray(expr.and);
}

export function isOrFilter(expr: FilterExpression): expr is OrFilter {
  return 'or' in expr && Array.isArray(expr.or);
}

export function isNotFilter(expr: FilterExpression): expr is NotFilter {
  return 'not' in expr && !Array.isArray(expr.not);
}

// Operator metadata
export const OPERATOR_METADATA: Record<FilterOperator, { label: string; description: string }> = {
  eq: { label: '等于', description: 'Equal to' },
  ne: { label: '不等于', description: 'Not equal to' },
  gt: { label: '大于', description: 'Greater than' },
  gte: { label: '大于等于', description: 'Greater than or equal' },
  lt: { label: '小于', description: 'Less than' },
  lte: { label: '小于等于', description: 'Less than or equal' },
  in: { label: '包含于', description: 'In list' },
  nin: { label: '不包含于', description: 'Not in list' },
  contains: { label: '包含', description: 'Contains substring' },
  startsWith: { label: '以...开头', description: 'Starts with' },
  endsWith: { label: '以...结尾', description: 'Ends with' },
  exists: { label: '存在', description: 'Field exists' },
  regex: { label: '正则匹配', description: 'Matches pattern' },
};
