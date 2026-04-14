/**
 * Mock for @visionshare/shared
 */

export const isAndFilter = (expr: any): boolean => 'and' in expr && Array.isArray(expr.and);
export const isOrFilter = (expr: any): boolean => 'or' in expr && Array.isArray(expr.or);
export const isNotFilter = (expr: any): boolean => 'not' in expr && !Array.isArray(expr.not);

// Credit level type (string literal union)
export type CreditLevel = 'excellent' | 'good' | 'average' | 'poor';

// Credit level thresholds
export const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, { min: number; max: number }> = {
  excellent: { min: 800, max: 1000 },
  good: { min: 600, max: 799 },
  average: { min: 400, max: 599 },
  poor: { min: 0, max: 399 },
};

// Keep enum for backward compatibility
export enum CreditLevelEnum {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
}

export enum CreditFactorType {
  PROFILE = 'profile',
  BEHAVIOR = 'behavior',
  TRANSACTION = 'transaction',
  SOCIAL = 'social',
}

// Filter types
export interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

export interface FilterExpression {
  and?: FilterCondition[];
  or?: FilterCondition[];
  not?: FilterCondition;
}

export interface FilterDSL {
  where: FilterCondition | FilterExpression;
}
