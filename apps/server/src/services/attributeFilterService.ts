/**
 * Attribute Filter Service
 * 属性过滤服务
 *
 * Scene-specific attribute filtering for Agent matching.
 * Translates scene-specific filter conditions into Prisma queries.
 */

import {
  SceneId,
  getFilterSchemaForScene,
  RangeFilter,
  EnumFilter,
  TagsOverlapFilter,
  SceneAttributeFilter,
  VisionShareAttributeFilter,
  AgentDateAttributeFilter,
  AgentJobAttributeFilter,
  AgentAdAttributeFilter,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { buildJsonFieldFilter } from '../utils/queryBuilder';

// ============================================
// Validation
// ============================================

export interface AttributeFilterValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Validate attribute filter for a given scene
 */
export function validateAttributeFilter(
  sceneId: SceneId,
  filters: SceneAttributeFilter
): AttributeFilterValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const schema = getFilterSchemaForScene(sceneId);
  const filterableFields = new Set(schema.fields.map(f => f.name));

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (!filterableFields.has(key)) {
      errors.push({
        field: key,
        message: `Field "${key}" is not filterable for scene "${sceneId}"`,
      });
      continue;
    }

    const fieldDef = schema.fields.find(f => f.name === key);
    if (!fieldDef) continue;

    // Validate enum values
    if (fieldDef.type === 'enum' && fieldDef.enumValues) {
      const enumFilter = value as EnumFilter;
      const allValues = [...(enumFilter.include || []), ...(enumFilter.exclude || [])];
      for (const v of allValues) {
        if (!fieldDef.enumValues.includes(v)) {
          errors.push({ field: key, message: `Invalid enum value "${v}" for field "${key}"` });
        }
      }
    }

    // Validate range
    if (fieldDef.type === 'object') {
      const range = value as RangeFilter;
      if (range && typeof range === 'object' && 'min' in range && 'max' in range) {
        if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
          errors.push({ field: key, message: `min cannot be greater than max for field "${key}"` });
        }
      }
    }

    // Validate tags overlap
    if (fieldDef.type === 'array') {
      const tagsFilter = value as TagsOverlapFilter;
      if (tagsFilter && typeof tagsFilter === 'object' && 'tags' in tagsFilter) {
        if (!Array.isArray(tagsFilter.tags) || tagsFilter.tags.length === 0) {
          errors.push({ field: key, message: `tags must be a non-empty array for field "${key}"` });
        }
        if (
          tagsFilter.minOverlap !== undefined &&
          (tagsFilter.minOverlap < 0 || tagsFilter.minOverlap > 1)
        ) {
          errors.push({
            field: key,
            message: `minOverlap must be between 0 and 1 for field "${key}"`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Filter-to-Prisma Translation
// ============================================

/**
 * Build JSON field condition using buildJsonFieldFilter for Prisma JSON column queries
 * Converts $.profile.l1Data.field to { profile: { path: ['l1Data', 'field'], equals: value } }
 */
function buildJsonFieldCondition(jsonPath: string, filter: any): any {
  // Parse $.profile.l1Data.field path
  if (!jsonPath.startsWith('$.')) return {};

  const segments = jsonPath.slice(2).split('.');
  if (segments.length < 3) return {};

  const jsonField = segments[0];
  const path = segments.slice(1); // ['l1Data', 'field']

  if (typeof filter === 'object' && 'min' in filter) {
    const conditions: any[] = [];
    if (filter.min !== undefined) {
      conditions.push(buildJsonFieldFilter(jsonField, path, 'gte', filter.min));
    }
    if (filter.max !== undefined) {
      conditions.push(buildJsonFieldFilter(jsonField, path, 'lte', filter.max));
    }
    if (conditions.length === 1) return conditions[0];
    if (conditions.length > 1) return { AND: conditions };
    return {};
  }

  if (typeof filter === 'object' && 'include' in filter) {
    if (filter.include && filter.include.length > 0) {
      return buildJsonFieldFilter(jsonField, path, 'in', filter.include);
    }
    if (filter.exclude && filter.exclude.length > 0) {
      return buildJsonFieldFilter(jsonField, path, 'nin', filter.exclude);
    }
    return {};
  }

  if (typeof filter === 'object' && 'tags' in filter) {
    return buildJsonFieldFilter(jsonField, path, 'contains', filter.tags);
  }

  if (typeof filter === 'boolean') {
    return buildJsonFieldFilter(jsonField, path, 'eq', filter);
  }

  return buildJsonFieldFilter(jsonField, path, 'eq', filter);
}

/**
 * Convert a scene-specific attribute filter into Prisma where conditions
 */
function buildAttributeWhereClause(sceneId: SceneId, filters: SceneAttributeFilter): any[] {
  const schema = getFilterSchemaForScene(sceneId);
  const conditions: any[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    const fieldDef = schema.fields.find(f => f.name === key);
    if (!fieldDef) continue;

    // Build JSON path with $. prefix for Prisma JSON column queries
    const jsonPath = `$.profile.l1Data.${key}`;

    switch (fieldDef.type) {
      case 'enum': {
        const condition = buildJsonFieldCondition(jsonPath, value as EnumFilter);
        if (Object.keys(condition).length > 0) conditions.push(condition);
        break;
      }
      case 'object': {
        const condition = buildJsonFieldCondition(jsonPath, value as RangeFilter);
        if (Object.keys(condition).length > 0) conditions.push(condition);
        break;
      }
      case 'array': {
        const tagsFilter = value as TagsOverlapFilter;
        if (tagsFilter && typeof tagsFilter === 'object' && 'tags' in tagsFilter) {
          const condition = buildJsonFieldCondition(jsonPath, tagsFilter);
          if (Object.keys(condition).length > 0) conditions.push(condition);
        }
        break;
      }
      case 'boolean': {
        const condition = buildJsonFieldCondition(jsonPath, value as boolean);
        if (Object.keys(condition).length > 0) conditions.push(condition);
        break;
      }
    }
  }

  return conditions;
}

// ============================================
// Main Filter Function
// ============================================

export interface AttributeFilterOptions {
  sceneId: SceneId;
  filters: SceneAttributeFilter;
  combinationMode?: 'and' | 'or';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  additionalWhere?: any;
}

export interface AttributeFilterResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  appliedFilters: SceneAttributeFilter;
  sceneId: SceneId;
}

/**
 * Filter agents by scene-specific attributes
 */
export async function filterAgentsByAttributes(
  options: AttributeFilterOptions
): Promise<AttributeFilterResult> {
  const {
    sceneId,
    filters,
    combinationMode = 'and',
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    additionalWhere,
  } = options;

  // Validate
  const validation = validateAttributeFilter(sceneId, filters);
  if (!validation.valid) {
    throw new Error(
      `Invalid attribute filters: ${validation.errors.map(e => e.message).join('; ')}`
    );
  }

  // Build conditions
  const attributeConditions = buildAttributeWhereClause(sceneId, filters);

  // Combine with mode
  let where: any = {};
  if (attributeConditions.length > 0) {
    where = combinationMode === 'or' ? { OR: attributeConditions } : { AND: attributeConditions };
  }

  // Merge with additional conditions
  if (additionalWhere && Object.keys(additionalWhere).length > 0) {
    where = { AND: [where, additionalWhere] };
  }

  const skip = (page - 1) * limit;

  try {
    const [items, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      appliedFilters: filters,
      sceneId,
    };
  } catch (error) {
    logger.error('Failed to filter agents by attributes', { error, sceneId, filters });
    throw error;
  }
}

// ============================================
// Convenience Builders
// ============================================

/**
 * Create a VisionShare filter builder
 */
export function visionShareFilterBuilder(): {
  contentType: (include: string[], exclude?: string[]) => typeof builder;
  purpose: (include: string[], exclude?: string[]) => typeof builder;
  style: (include: string[], exclude?: string[]) => typeof builder;
  priceRange: (min?: number, max?: number) => typeof builder;
  skillsOverlap: (tags: string[], minOverlap?: number) => typeof builder;
  build: () => VisionShareAttributeFilter;
} {
  const filter: VisionShareAttributeFilter = {};

  const builder = {
    contentType(include: string[], exclude?: string[]) {
      filter.contentType = { include, exclude };
      return builder;
    },
    purpose(include: string[], exclude?: string[]) {
      filter.purpose = { include, exclude };
      return builder;
    },
    style(include: string[], exclude?: string[]) {
      filter.style = { include, exclude };
      return builder;
    },
    priceRange(min?: number, max?: number) {
      filter.priceRange = { min, max };
      return builder;
    },
    skillsOverlap(tags: string[], minOverlap?: number) {
      filter.skillsOverlap = { tags, minOverlap };
      return builder;
    },
    build(): VisionShareAttributeFilter {
      return { ...filter };
    },
  };

  return builder;
}

/**
 * Create an AgentDate filter builder
 */
export function agentDateFilterBuilder() {
  const filter: AgentDateAttributeFilter = {};

  const builder = {
    ageRange(min?: number, max?: number) {
      filter.ageRange = { min, max };
      return builder;
    },
    gender(include: string[], exclude?: string[]) {
      filter.gender = { include: include as any, exclude: exclude as any };
      return builder;
    },
    maritalStatus(include: string[], exclude?: string[]) {
      filter.maritalStatus = { include, exclude };
      return builder;
    },
    hasChildren(value: boolean) {
      filter.hasChildren = value;
      return builder;
    },
    incomeRange(min?: number, max?: number) {
      filter.incomeRange = { min, max };
      return builder;
    },
    education(include: string[], exclude?: string[]) {
      filter.education = { include: include as any, exclude: exclude as any };
      return builder;
    },
    interestsOverlap(tags: string[], minOverlap?: number) {
      filter.interestsOverlap = { tags, minOverlap };
      return builder;
    },
    build(): AgentDateAttributeFilter {
      return { ...filter };
    },
  };

  return builder;
}

/**
 * Create an AgentJob filter builder
 */
export function agentJobFilterBuilder() {
  const filter: AgentJobAttributeFilter = {};

  const builder = {
    jobType(include: string[], exclude?: string[]) {
      filter.jobType = { include, exclude };
      return builder;
    },
    jobCategory(include: string[], exclude?: string[]) {
      filter.jobCategory = { include, exclude };
      return builder;
    },
    expectedSalary(min?: number, max?: number) {
      filter.expectedSalary = { min, max };
      return builder;
    },
    workLocation(include: string[], exclude?: string[]) {
      filter.workLocation = { include, exclude };
      return builder;
    },
    skillsOverlap(tags: string[], minOverlap?: number) {
      filter.skillsOverlap = { tags, minOverlap };
      return builder;
    },
    education(include: string[], exclude?: string[]) {
      filter.education = { include: include as any, exclude: exclude as any };
      return builder;
    },
    build(): AgentJobAttributeFilter {
      return { ...filter };
    },
  };

  return builder;
}

/**
 * Create an AgentAd filter builder
 */
export function agentAdFilterBuilder() {
  const filter: AgentAdAttributeFilter = {};

  const builder = {
    adType(include: string[], exclude?: string[]) {
      filter.adType = { include, exclude };
      return builder;
    },
    productCategory(include: string[], exclude?: string[]) {
      filter.productCategory = { include, exclude };
      return builder;
    },
    budgetRange(min?: number, max?: number) {
      filter.budgetRange = { min, max };
      return builder;
    },
    keyFeaturesOverlap(tags: string[], minOverlap?: number) {
      filter.keyFeaturesOverlap = { tags, minOverlap };
      return builder;
    },
    build(): AgentAdAttributeFilter {
      return { ...filter };
    },
  };

  return builder;
}

// ============================================
// Tags Overlap Calculation (for in-memory scoring)
// ============================================

/**
 * Calculate tag overlap ratio between two tag arrays
 */
export function calculateTagOverlap(tags1: string[], tags2: string[]): number {
  if (!tags1.length || !tags2.length) return 0;
  const uniqueTags = [...new Set(tags1)];
  const matchCount = uniqueTags.filter(t => tags2.includes(t)).length;
  return matchCount / uniqueTags.length;
}

/**
 * Check if an agent's profile matches attribute filters in memory
 * Used for scoring/filtering beyond what Prisma can express
 */
export function matchesAttributeFilter(
  agentProfile: any,
  filters: SceneAttributeFilter,
  _sceneId: SceneId
): boolean {
  const l1Data = agentProfile?.l1Data || {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    const profileValue = l1Data[key];

    // Handle TagsOverlapFilter
    if (value && typeof value === 'object' && 'tags' in value && Array.isArray(value.tags)) {
      const tagsFilter = value as TagsOverlapFilter;
      if (!Array.isArray(profileValue)) continue;
      const overlap = calculateTagOverlap(tagsFilter.tags, profileValue);
      const threshold = tagsFilter.minOverlap ?? 0.5;
      if (overlap < threshold) return false;
      continue;
    }

    // Handle RangeFilter
    if (value && typeof value === 'object' && ('min' in value || 'max' in value)) {
      const range = value as RangeFilter;
      // Handle profileValue as an object with min/max (e.g., { min: 100, max: 500 })
      if (profileValue && typeof profileValue === 'object' && 'min' in profileValue) {
        const profileMin = (profileValue as any).min;
        const profileMax = (profileValue as any).max;
        if (typeof profileMin === 'number' && range.max !== undefined && profileMin > range.max)
          return false;
        if (typeof profileMax === 'number' && range.min !== undefined && profileMax < range.min)
          return false;
        continue;
      }
      // Handle profileValue as a single number
      const numVal =
        typeof profileValue === 'number' ? profileValue : parseFloat(profileValue as string);
      if (isNaN(numVal)) continue;
      if (range.min !== undefined && numVal < range.min) return false;
      if (range.max !== undefined && numVal > range.max) return false;
      continue;
    }

    // Handle EnumFilter
    if (value && typeof value === 'object' && ('include' in value || 'exclude' in value)) {
      const enumFilter = value as EnumFilter;
      if (enumFilter.include?.length && !enumFilter.include.includes(profileValue)) return false;
      if (enumFilter.exclude?.length && enumFilter.exclude.includes(profileValue)) return false;
      continue;
    }

    // Handle boolean
    if (typeof value === 'boolean') {
      if (profileValue !== value) return false;
      continue;
    }
  }

  return true;
}
