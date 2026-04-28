/**
 * Attribute Filter Types
 * 属性过滤类型定义
 *
 * Scene-specific attribute filters for Agent matching.
 * Each scene defines its own filterable attributes with validation rules.
 */
import { FilterSchema, FieldDefinition } from './filter';
import { SceneId } from './scene';
import { Gender, EducationLevel } from './agentProfile';
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
    minOverlap?: number;
}
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
export type SceneAttributeFilter = VisionShareAttributeFilter | AgentDateAttributeFilter | AgentJobAttributeFilter | AgentAdAttributeFilter;
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
export declare const VISIONSHARE_FILTER_SCHEMA: FilterSchema;
export declare const AGENTDATE_FILTER_SCHEMA: FilterSchema;
export declare const AGENTJOB_FILTER_SCHEMA: FilterSchema;
export declare const AGENTAD_FILTER_SCHEMA: FilterSchema;
export declare const SCENE_FILTER_SCHEMAS: Record<SceneId, FilterSchema>;
export declare function getFilterSchemaForScene(sceneId: SceneId): FilterSchema;
export declare function getFilterableFieldsForScene(sceneId: SceneId): FieldDefinition[];
//# sourceMappingURL=attributeFilter.d.ts.map