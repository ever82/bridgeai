/**
 * Attribute Filter Types
 * 属性过滤类型定义
 *
 * Scene-specific attribute filters for Agent matching.
 * Each scene defines its own filterable attributes with validation rules.
 */

import { FilterOperator, FilterSchema, FieldDefinition } from './filter';
import { SceneId } from './scene';
import { AgeRange, Gender, EducationLevel } from './agentProfile';

// ============================================
// Common Filter Value Types
// ============================================

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface EnumFilter<T extends string = string> {
  include?: T[];
  exclude?: T[];
}

export interface TagsOverlapFilter {
  tags: string[];
  minOverlap?: number; // 0-1 ratio, default 0.5
}

// ============================================
// Scene-Specific Filter Interfaces
// ============================================

/** VisionShare attribute filters */
export interface VisionShareAttributeFilter {
  contentType?: EnumFilter;
  purpose?: EnumFilter;
  style?: EnumFilter;
  experienceLevel?: EnumFilter;
  priceRange?: RangeFilter;
  skillsOverlap?: TagsOverlapFilter;
}

/** AgentDate attribute filters */
export interface AgentDateAttributeFilter {
  ageRange?: RangeFilter;
  gender?: EnumFilter<Gender>;
  maritalStatus?: EnumFilter;
  hasChildren?: boolean;
  incomeRange?: RangeFilter;
  propertyStatus?: EnumFilter;
  education?: EnumFilter<EducationLevel>;
  interestsOverlap?: TagsOverlapFilter;
  locationPreference?: EnumFilter;
  personalityTraits?: EnumFilter;
  lifestyle?: EnumFilter;
}

/** AgentJob attribute filters */
export interface AgentJobAttributeFilter {
  jobType?: EnumFilter;
  jobCategory?: EnumFilter;
  targetPositions?: TagsOverlapFilter;
  expectedSalary?: RangeFilter;
  workLocation?: EnumFilter;
  workExperience?: EnumFilter;
  skillsOverlap?: TagsOverlapFilter;
  certifications?: EnumFilter;
  education?: EnumFilter<EducationLevel>;
  preferredCompanySize?: EnumFilter;
  availability?: EnumFilter;
}

/** AgentAd attribute filters */
export interface AgentAdAttributeFilter {
  adType?: EnumFilter;
  productCategory?: EnumFilter;
  targetAudience?: EnumFilter;
  campaignObjective?: EnumFilter;
  budgetRange?: RangeFilter;
  campaignDuration?: EnumFilter;
  keyFeaturesOverlap?: TagsOverlapFilter;
}

/** Union of all scene-specific attribute filters */
export type SceneAttributeFilter =
  | VisionShareAttributeFilter
  | AgentDateAttributeFilter
  | AgentJobAttributeFilter
  | AgentAdAttributeFilter;

// ============================================
// Attribute Filter Request
// ============================================

export interface AttributeFilterRequest {
  sceneId: SceneId;
  filters: SceneAttributeFilter;
  /** How to combine multiple filter conditions: AND (all must match) or OR (any can match) */
  combinationMode?: 'and' | 'or';
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

// ============================================
// Filter Schema Definitions Per Scene
// ============================================

const RANGE_OPERATORS: FilterOperator[] = ['gte', 'lte', 'gt', 'lt', 'eq'];
const ENUM_OPERATORS: FilterOperator[] = ['in', 'nin', 'eq', 'ne'];
const TAGS_OPERATORS: FilterOperator[] = ['contains'];
const BOOLEAN_OPERATORS: FilterOperator[] = ['eq'];

export const VISIONSHARE_FILTER_SCHEMA: FilterSchema = {
  fields: [
    {
      name: 'contentType',
      type: 'enum',
      path: 'profile.l1Data.contentType',
      operators: ENUM_OPERATORS,
      enumValues: ['photography', 'illustration', 'design', 'video', '3d', 'other'],
    },
    {
      name: 'purpose',
      type: 'enum',
      path: 'profile.l1Data.purpose',
      operators: ENUM_OPERATORS,
      enumValues: ['sell', 'showcase', 'collaborate', 'learn', 'other'],
    },
    {
      name: 'style',
      type: 'enum',
      path: 'profile.l1Data.style',
      operators: ENUM_OPERATORS,
      enumValues: ['realistic', 'abstract', 'minimalist', 'vintage', 'modern', 'cartoon', 'scifi', 'nature', 'other'],
    },
    {
      name: 'experienceLevel',
      type: 'enum',
      path: 'profile.l1Data.experienceLevel',
      operators: ENUM_OPERATORS,
      enumValues: ['beginner', 'intermediate', 'advanced', 'professional'],
    },
    {
      name: 'priceRange',
      type: 'object',
      path: 'profile.l1Data.priceRange',
      operators: RANGE_OPERATORS,
    },
    {
      name: 'skills',
      type: 'array',
      path: 'profile.l1Data.skills',
      operators: TAGS_OPERATORS,
    },
  ],
  allowCustomFields: false,
};

export const AGENTDATE_FILTER_SCHEMA: FilterSchema = {
  fields: [
    {
      name: 'age',
      type: 'enum',
      path: 'profile.l1Data.age',
      operators: ENUM_OPERATORS,
      enumValues: Object.values(AgeRange),
    },
    {
      name: 'gender',
      type: 'enum',
      path: 'profile.l1Data.gender',
      operators: ENUM_OPERATORS,
      enumValues: Object.values(Gender),
    },
    {
      name: 'maritalStatus',
      type: 'enum',
      path: 'profile.l1Data.maritalStatus',
      operators: ENUM_OPERATORS,
      enumValues: ['single', 'married', 'divorced', 'widowed'],
    },
    {
      name: 'hasChildren',
      type: 'boolean',
      path: 'profile.l1Data.hasChildren',
      operators: BOOLEAN_OPERATORS,
    },
    {
      name: 'incomeRange',
      type: 'object',
      path: 'profile.l1Data.incomeRange',
      operators: RANGE_OPERATORS,
    },
    {
      name: 'propertyStatus',
      type: 'enum',
      path: 'profile.l1Data.propertyStatus',
      operators: ENUM_OPERATORS,
      enumValues: ['none', 'real_estate', 'vehicle', 'both'],
    },
    {
      name: 'education',
      type: 'enum',
      path: 'profile.l1Data.education',
      operators: ENUM_OPERATORS,
      enumValues: Object.values(EducationLevel),
    },
    {
      name: 'interests',
      type: 'array',
      path: 'profile.l1Data.interests',
      operators: TAGS_OPERATORS,
    },
    {
      name: 'locationPreference',
      type: 'enum',
      path: 'profile.l1Data.locationPreference',
      operators: ENUM_OPERATORS,
      enumValues: ['same_city', 'same_district', 'anywhere'],
    },
    {
      name: 'personalityTraits',
      type: 'enum',
      path: 'profile.l1Data.personalityTraits',
      operators: ENUM_OPERATORS,
    },
    {
      name: 'lifestyle',
      type: 'enum',
      path: 'profile.l1Data.lifestyle',
      operators: ENUM_OPERATORS,
      enumValues: ['early_bird', 'night_owl', 'balanced', 'flexible'],
    },
  ],
  allowCustomFields: false,
};

export const AGENTJOB_FILTER_SCHEMA: FilterSchema = {
  fields: [
    {
      name: 'jobType',
      type: 'enum',
      path: 'profile.l1Data.jobType',
      operators: ENUM_OPERATORS,
      enumValues: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
    },
    {
      name: 'jobCategory',
      type: 'enum',
      path: 'profile.l1Data.jobCategory',
      operators: ENUM_OPERATORS,
      enumValues: ['technology', 'finance', 'healthcare', 'education', 'marketing', 'design', 'engineering', 'other'],
    },
    {
      name: 'targetPositions',
      type: 'array',
      path: 'profile.l1Data.targetPositions',
      operators: TAGS_OPERATORS,
    },
    {
      name: 'expectedSalary',
      type: 'object',
      path: 'profile.l1Data.expectedSalary',
      operators: RANGE_OPERATORS,
    },
    {
      name: 'workLocation',
      type: 'enum',
      path: 'profile.l1Data.workLocation',
      operators: ENUM_OPERATORS,
      enumValues: ['remote', 'hybrid', 'onsite'],
    },
    {
      name: 'workExperience',
      type: 'enum',
      path: 'profile.l1Data.workExperience',
      operators: ENUM_OPERATORS,
      enumValues: ['entry', 'junior', 'mid', 'senior', 'executive'],
    },
    {
      name: 'skills',
      type: 'array',
      path: 'profile.l1Data.skills',
      operators: TAGS_OPERATORS,
    },
    {
      name: 'certifications',
      type: 'enum',
      path: 'profile.l1Data.certifications',
      operators: ENUM_OPERATORS,
    },
    {
      name: 'education',
      type: 'enum',
      path: 'profile.l1Data.education',
      operators: ENUM_OPERATORS,
      enumValues: Object.values(EducationLevel),
    },
    {
      name: 'preferredCompanySize',
      type: 'enum',
      path: 'profile.l1Data.preferredCompanySize',
      operators: ENUM_OPERATORS,
      enumValues: ['startup', 'medium', 'large', 'enterprise'],
    },
    {
      name: 'availability',
      type: 'enum',
      path: 'profile.l1Data.availability',
      operators: ENUM_OPERATORS,
      enumValues: ['immediately', 'within_week', 'within_month', 'negotiable'],
    },
  ],
  allowCustomFields: false,
};

export const AGENTAD_FILTER_SCHEMA: FilterSchema = {
  fields: [
    {
      name: 'adType',
      type: 'enum',
      path: 'profile.l1Data.adType',
      operators: ENUM_OPERATORS,
      enumValues: ['product', 'service', 'brand', 'event', 'promotion', 'recruitment'],
    },
    {
      name: 'productCategory',
      type: 'enum',
      path: 'profile.l1Data.productCategory',
      operators: ENUM_OPERATORS,
      enumValues: ['electronics', 'fashion', 'food', 'travel', 'education', 'health', 'home', 'auto', 'finance', 'other'],
    },
    {
      name: 'targetAudience',
      type: 'enum',
      path: 'profile.l1Data.targetAudience',
      operators: ENUM_OPERATORS,
      enumValues: ['all', 'young_adults', 'professionals', 'parents', 'seniors', 'students', 'business'],
    },
    {
      name: 'campaignObjective',
      type: 'enum',
      path: 'profile.l1Data.campaignObjective',
      operators: ENUM_OPERATORS,
      enumValues: ['awareness', 'traffic', 'conversion', 'engagement', 'retention', 'lead_gen'],
    },
    {
      name: 'budgetRange',
      type: 'object',
      path: 'profile.l1Data.budgetRange',
      operators: RANGE_OPERATORS,
    },
    {
      name: 'campaignDuration',
      type: 'enum',
      path: 'profile.l1Data.campaignDuration',
      operators: ENUM_OPERATORS,
      enumValues: ['1_week', '2_weeks', '1_month', '3_months'],
    },
    {
      name: 'keyFeatures',
      type: 'array',
      path: 'profile.l1Data.keyFeatures',
      operators: TAGS_OPERATORS,
    },
  ],
  allowCustomFields: false,
};

// ============================================
// Schema Registry
// ============================================

export const SCENE_FILTER_SCHEMAS: Record<SceneId, FilterSchema> = {
  visionshare: VISIONSHARE_FILTER_SCHEMA,
  agentdate: AGENTDATE_FILTER_SCHEMA,
  agentjob: AGENTJOB_FILTER_SCHEMA,
  agentad: AGENTAD_FILTER_SCHEMA,
};

export function getFilterSchemaForScene(sceneId: SceneId): FilterSchema {
  return SCENE_FILTER_SCHEMAS[sceneId];
}

export function getFilterableFieldsForScene(sceneId: SceneId): FieldDefinition[] {
  return SCENE_FILTER_SCHEMAS[sceneId]?.fields ?? [];
}
