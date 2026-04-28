"use strict";
/**
 * Scene Field Validation Schemas
 * 场景字段验证 Schema
 *
 * Defines Zod schemas for validating scene field values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sceneFieldsSchemas = exports.agentAdFieldsSchema = exports.AgentAdCampaignDuration = exports.AgentAdBudgetRange = exports.AgentAdCampaignObjective = exports.AgentAdTargetAudience = exports.AgentAdProductCategory = exports.AgentAdAdType = exports.agentJobFieldsSchema = exports.AgentJobCompanySize = exports.AgentJobAvailability = exports.AgentJobEducation = exports.AgentJobCertification = exports.AgentJobWorkExperience = exports.AgentJobWorkLocation = exports.AgentJobJobCategory = exports.AgentJobJobType = exports.agentDateFieldsSchema = exports.AgentDateDealBreaker = exports.AgentDateEducation = exports.AgentDateLifestyle = exports.AgentDatePersonalityTrait = exports.AgentDateInterest = exports.AgentDateLocationPreference = exports.AgentDatePreferredGender = exports.AgentDateDatingPurpose = exports.visionShareFieldsSchema = exports.VisionSharePriceRange = exports.VisionShareAvailability = exports.VisionShareExperienceLevel = exports.VisionShareStyle = exports.VisionSharePurpose = exports.VisionShareContentType = exports.phoneFieldSchema = exports.emailFieldSchema = exports.urlFieldSchema = exports.textareaFieldSchema = exports.textFieldSchema = void 0;
exports.validateSceneFields = validateSceneFields;
exports.validatePartialSceneFields = validatePartialSceneFields;
const zod_1 = require("zod");
// ============================================
// Common Field Validators
// ============================================
exports.textFieldSchema = zod_1.z.string().min(1).max(255);
exports.textareaFieldSchema = zod_1.z.string().min(1).max(5000);
exports.urlFieldSchema = zod_1.z.string().url();
exports.emailFieldSchema = zod_1.z.string().email();
exports.phoneFieldSchema = zod_1.z.string().regex(/^\+?[\d\s-()]+$/);
// ============================================
// VisionShare Fields
// ============================================
exports.VisionShareContentType = zod_1.z.enum([
    'photography',
    'artwork',
    'design',
    'illustration',
    'video',
    'animation',
]);
exports.VisionSharePurpose = zod_1.z.enum([
    'share',
    'discover',
    'collaborate',
    'sell',
    'feedback',
]);
exports.VisionShareStyle = zod_1.z.enum([
    'minimalist',
    'vintage',
    'modern',
    'abstract',
    'realistic',
    'cartoon',
    'cyberpunk',
    'nature',
    'urban',
]);
exports.VisionShareExperienceLevel = zod_1.z.enum([
    'beginner',
    'intermediate',
    'advanced',
    'professional',
]);
exports.VisionShareAvailability = zod_1.z.enum([
    'not_available',
    'limited',
    'available',
]);
exports.VisionSharePriceRange = zod_1.z.enum([
    'free',
    'low',
    'medium',
    'high',
]);
exports.visionShareFieldsSchema = zod_1.z.object({
    contentType: zod_1.z.array(exports.VisionShareContentType).min(1),
    purpose: exports.VisionSharePurpose,
    style: zod_1.z.array(exports.VisionShareStyle).optional(),
    portfolioUrl: exports.urlFieldSchema.optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    experienceLevel: exports.VisionShareExperienceLevel.optional(),
    availability: exports.VisionShareAvailability.optional(),
    priceRange: exports.VisionSharePriceRange.optional(),
    inspirationSources: exports.textareaFieldSchema.optional(),
    favoriteArtists: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================
// AgentDate Fields
// ============================================
exports.AgentDateDatingPurpose = zod_1.z.enum([
    'serious_relationship',
    'casual_dating',
    'friendship',
    'marriage',
]);
exports.AgentDatePreferredGender = zod_1.z.enum([
    'male',
    'female',
    'any',
]);
exports.AgentDateLocationPreference = zod_1.z.enum([
    'same_city',
    'nearby',
    'any',
]);
exports.AgentDateInterest = zod_1.z.enum([
    'movies',
    'music',
    'sports',
    'travel',
    'reading',
    'gaming',
    'cooking',
    'outdoor',
    'art',
    'tech',
]);
exports.AgentDatePersonalityTrait = zod_1.z.enum([
    'outgoing',
    'introverted',
    'humorous',
    'serious',
    'romantic',
    'practical',
    'creative',
    'adventurous',
]);
exports.AgentDateLifestyle = zod_1.z.enum([
    'early_bird',
    'night_owl',
    'active',
    'relaxed',
    'health_conscious',
]);
exports.AgentDateEducation = zod_1.z.enum([
    'high_school',
    'college',
    'bachelor',
    'master',
    'phd',
]);
exports.AgentDateDealBreaker = zod_1.z.enum([
    'smoking',
    'drinking',
    'lying',
    'disrespect',
    'unambitious',
]);
exports.agentDateFieldsSchema = zod_1.z.object({
    datingPurpose: exports.AgentDateDatingPurpose,
    preferredGender: exports.AgentDatePreferredGender,
    ageRange: zod_1.z.object({
        min: zod_1.z.number().min(18).max(100),
        max: zod_1.z.number().min(18).max(100),
    }),
    locationPreference: exports.AgentDateLocationPreference.optional(),
    interests: zod_1.z.array(exports.AgentDateInterest).optional(),
    personalityTraits: zod_1.z.array(exports.AgentDatePersonalityTrait).optional(),
    lifestyle: exports.AgentDateLifestyle.optional(),
    occupation: exports.textFieldSchema.optional(),
    education: exports.AgentDateEducation.optional(),
    lookingFor: exports.textareaFieldSchema.min(20).max(500).optional(),
    aboutMe: exports.textareaFieldSchema.min(30).max(1000),
    dealBreakers: zod_1.z.array(exports.AgentDateDealBreaker).optional(),
});
// ============================================
// AgentJob Fields
// ============================================
exports.AgentJobJobType = zod_1.z.enum([
    'full_time',
    'part_time',
    'contract',
    'freelance',
    'internship',
]);
exports.AgentJobJobCategory = zod_1.z.enum([
    'tech',
    'design',
    'marketing',
    'sales',
    'operations',
    'finance',
    'hr',
    'product',
]);
exports.AgentJobWorkLocation = zod_1.z.enum([
    'remote',
    'hybrid',
    'onsite',
]);
exports.AgentJobWorkExperience = zod_1.z.enum([
    'entry',
    'junior',
    'mid',
    'senior',
    'expert',
]);
exports.AgentJobCertification = zod_1.z.enum([
    'pmp',
    'aws',
    'google',
    'azure',
    'cfa',
    'cpa',
]);
exports.AgentJobEducation = zod_1.z.enum([
    'high_school',
    'associate',
    'bachelor',
    'master',
    'phd',
]);
exports.AgentJobAvailability = zod_1.z.enum([
    'immediate',
    'two_weeks',
    'one_month',
    'negotiable',
]);
exports.AgentJobCompanySize = zod_1.z.enum([
    'startup',
    'small',
    'medium',
    'large',
]);
exports.agentJobFieldsSchema = zod_1.z.object({
    jobType: exports.AgentJobJobType,
    jobCategory: exports.AgentJobJobCategory,
    targetPositions: zod_1.z.array(zod_1.z.string()).min(1),
    expectedSalary: zod_1.z.enum(['0-5k', '5k-10k', '10k-20k', '20k-30k', '30k-50k', '50k+']).optional(),
    workLocation: exports.AgentJobWorkLocation.optional(),
    workExperience: exports.AgentJobWorkExperience,
    skills: zod_1.z.array(zod_1.z.string()).min(1),
    certifications: zod_1.z.array(exports.AgentJobCertification).optional(),
    education: exports.AgentJobEducation.optional(),
    portfolioUrl: exports.urlFieldSchema.optional(),
    careerSummary: exports.textareaFieldSchema.min(50).max(1000),
    keyAchievements: exports.textareaFieldSchema.optional(),
    availability: exports.AgentJobAvailability.optional(),
    preferredCompanySize: zod_1.z.array(exports.AgentJobCompanySize).optional(),
});
// ============================================
// AgentAd Fields
// ============================================
exports.AgentAdAdType = zod_1.z.enum([
    'product',
    'service',
    'event',
    'brand',
    'promotion',
    'awareness',
]);
exports.AgentAdProductCategory = zod_1.z.enum([
    'electronics',
    'fashion',
    'food',
    'beauty',
    'home',
    'education',
    'travel',
    'health',
    'entertainment',
    'business',
]);
exports.AgentAdTargetAudience = zod_1.z.enum([
    'youth',
    'young_adult',
    'adult',
    'senior',
    'family',
    'business',
    'professional',
]);
exports.AgentAdCampaignObjective = zod_1.z.enum([
    'awareness',
    'engagement',
    'traffic',
    'leads',
    'sales',
    'app_install',
]);
exports.AgentAdBudgetRange = zod_1.z.enum([
    'small',
    'medium',
    'large',
    'enterprise',
]).optional();
exports.AgentAdCampaignDuration = zod_1.z.enum([
    'short',
    'medium',
    'long',
    'ongoing',
]).optional();
exports.agentAdFieldsSchema = zod_1.z.object({
    adType: exports.AgentAdAdType,
    productCategory: exports.AgentAdProductCategory,
    targetAudience: zod_1.z.array(exports.AgentAdTargetAudience).min(1),
    campaignObjective: exports.AgentAdCampaignObjective,
    budgetRange: exports.AgentAdBudgetRange,
    campaignDuration: exports.AgentAdCampaignDuration,
    productName: exports.textFieldSchema.max(50),
    productDescription: exports.textareaFieldSchema.min(30).max(500),
    keyFeatures: zod_1.z.array(zod_1.z.string()).optional(),
    priceInfo: exports.textFieldSchema.optional(),
    promotionDetails: exports.textareaFieldSchema.optional(),
    websiteUrl: exports.urlFieldSchema.optional(),
    contactInfo: exports.textFieldSchema.optional(),
    location: exports.textFieldSchema.optional(),
    businessHours: exports.textFieldSchema.optional(),
});
// ============================================
// Export All Schemas
// ============================================
exports.sceneFieldsSchemas = {
    visionshare: exports.visionShareFieldsSchema,
    agentdate: exports.agentDateFieldsSchema,
    agentjob: exports.agentJobFieldsSchema,
    agentad: exports.agentAdFieldsSchema,
};
// ============================================
// Validation Helpers
// ============================================
function validateSceneFields(sceneId, data) {
    const schema = exports.sceneFieldsSchemas[sceneId];
    if (!schema) {
        throw new Error(`Unknown scene: ${sceneId}`);
    }
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    else {
        return { success: false, errors: result.error };
    }
}
function validatePartialSceneFields(sceneId, data) {
    const schema = exports.sceneFieldsSchemas[sceneId];
    if (!schema) {
        throw new Error(`Unknown scene: ${sceneId}`);
    }
    const partialSchema = schema.partial();
    const result = partialSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    else {
        return { success: false, errors: result.error };
    }
}
//# sourceMappingURL=index.js.map