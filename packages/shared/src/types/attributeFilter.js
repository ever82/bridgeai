"use strict";
/**
 * Attribute Filter Types
 * 属性过滤类型定义
 *
 * Scene-specific attribute filters for Agent matching.
 * Each scene defines its own filterable attributes with validation rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENE_FILTER_SCHEMAS = exports.AGENTAD_FILTER_SCHEMA = exports.AGENTJOB_FILTER_SCHEMA = exports.AGENTDATE_FILTER_SCHEMA = exports.VISIONSHARE_FILTER_SCHEMA = void 0;
exports.getFilterSchemaForScene = getFilterSchemaForScene;
exports.getFilterableFieldsForScene = getFilterableFieldsForScene;
const agentProfile_1 = require("./agentProfile");
// ============================================
// Filter Schema Definitions Per Scene
// ============================================
const RANGE_OPERATORS = ['gte', 'lte', 'gt', 'lt', 'eq'];
const ENUM_OPERATORS = ['in', 'nin', 'eq', 'ne'];
const TAGS_OPERATORS = ['contains'];
const BOOLEAN_OPERATORS = ['eq'];
exports.VISIONSHARE_FILTER_SCHEMA = {
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
exports.AGENTDATE_FILTER_SCHEMA = {
    fields: [
        {
            name: 'age',
            type: 'enum',
            path: 'profile.l1Data.age',
            operators: ENUM_OPERATORS,
            enumValues: Object.values(agentProfile_1.AgeRange),
        },
        {
            name: 'gender',
            type: 'enum',
            path: 'profile.l1Data.gender',
            operators: ENUM_OPERATORS,
            enumValues: Object.values(agentProfile_1.Gender),
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
            enumValues: Object.values(agentProfile_1.EducationLevel),
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
exports.AGENTJOB_FILTER_SCHEMA = {
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
            enumValues: Object.values(agentProfile_1.EducationLevel),
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
exports.AGENTAD_FILTER_SCHEMA = {
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
exports.SCENE_FILTER_SCHEMAS = {
    visionshare: exports.VISIONSHARE_FILTER_SCHEMA,
    agentdate: exports.AGENTDATE_FILTER_SCHEMA,
    agentjob: exports.AGENTJOB_FILTER_SCHEMA,
    agentad: exports.AGENTAD_FILTER_SCHEMA,
};
function getFilterSchemaForScene(sceneId) {
    return exports.SCENE_FILTER_SCHEMAS[sceneId];
}
function getFilterableFieldsForScene(sceneId) {
    return exports.SCENE_FILTER_SCHEMAS[sceneId]?.fields ?? [];
}
//# sourceMappingURL=attributeFilter.js.map