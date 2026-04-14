/**
 * Scene Field Validation Schemas
 * 场景字段验证 Schema
 *
 * Defines Zod schemas for validating scene field values
 */

import { z } from 'zod';

// ============================================
// Common Field Validators
// ============================================

export const textFieldSchema = z.string().min(1).max(255);
export const textareaFieldSchema = z.string().min(1).max(5000);
export const urlFieldSchema = z.string().url();
export const emailFieldSchema = z.string().email();
export const phoneFieldSchema = z.string().regex(/^\+?[\d\s-()]+$/);

// ============================================
// VisionShare Fields
// ============================================

export const VisionShareContentType = z.enum([
  'photography',
  'artwork',
  'design',
  'illustration',
  'video',
  'animation',
]);

export const VisionSharePurpose = z.enum([
  'share',
  'discover',
  'collaborate',
  'sell',
  'feedback',
]);

export const VisionShareStyle = z.enum([
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

export const VisionShareExperienceLevel = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'professional',
]);

export const VisionShareAvailability = z.enum([
  'not_available',
  'limited',
  'available',
]);

export const VisionSharePriceRange = z.enum([
  'free',
  'low',
  'medium',
  'high',
]);

export const visionShareFieldsSchema = z.object({
  contentType: z.array(VisionShareContentType).min(1),
  purpose: VisionSharePurpose,
  style: z.array(VisionShareStyle).optional(),
  portfolioUrl: urlFieldSchema.optional(),
  skills: z.array(z.string()).optional(),
  experienceLevel: VisionShareExperienceLevel.optional(),
  availability: VisionShareAvailability.optional(),
  priceRange: VisionSharePriceRange.optional(),
  inspirationSources: textareaFieldSchema.optional(),
  favoriteArtists: z.array(z.string()).optional(),
});

// ============================================
// AgentDate Fields
// ============================================

export const AgentDateDatingPurpose = z.enum([
  'serious_relationship',
  'casual_dating',
  'friendship',
  'marriage',
]);

export const AgentDatePreferredGender = z.enum([
  'male',
  'female',
  'any',
]);

export const AgentDateLocationPreference = z.enum([
  'same_city',
  'nearby',
  'any',
]);

export const AgentDateInterest = z.enum([
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

export const AgentDatePersonalityTrait = z.enum([
  'outgoing',
  'introverted',
  'humorous',
  'serious',
  'romantic',
  'practical',
  'creative',
  'adventurous',
]);

export const AgentDateLifestyle = z.enum([
  'early_bird',
  'night_owl',
  'active',
  'relaxed',
  'health_conscious',
]);

export const AgentDateEducation = z.enum([
  'high_school',
  'college',
  'bachelor',
  'master',
  'phd',
]);

export const AgentDateDealBreaker = z.enum([
  'smoking',
  'drinking',
  'lying',
  'disrespect',
  'unambitious',
]);

export const agentDateFieldsSchema = z.object({
  datingPurpose: AgentDateDatingPurpose,
  preferredGender: AgentDatePreferredGender,
  ageRange: z.object({
    min: z.number().min(18).max(100),
    max: z.number().min(18).max(100),
  }),
  locationPreference: AgentDateLocationPreference.optional(),
  interests: z.array(AgentDateInterest).optional(),
  personalityTraits: z.array(AgentDatePersonalityTrait).optional(),
  lifestyle: AgentDateLifestyle.optional(),
  occupation: textFieldSchema.optional(),
  education: AgentDateEducation.optional(),
  lookingFor: textareaFieldSchema.min(20).max(500).optional(),
  aboutMe: textareaFieldSchema.min(30).max(1000),
  dealBreakers: z.array(AgentDateDealBreaker).optional(),
});

// ============================================
// AgentJob Fields
// ============================================

export const AgentJobJobType = z.enum([
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
]);

export const AgentJobJobCategory = z.enum([
  'tech',
  'design',
  'marketing',
  'sales',
  'operations',
  'finance',
  'hr',
  'product',
]);

export const AgentJobWorkLocation = z.enum([
  'remote',
  'hybrid',
  'onsite',
]);

export const AgentJobWorkExperience = z.enum([
  'entry',
  'junior',
  'mid',
  'senior',
  'expert',
]);

export const AgentJobCertification = z.enum([
  'pmp',
  'aws',
  'google',
  'azure',
  'cfa',
  'cpa',
]);

export const AgentJobEducation = z.enum([
  'high_school',
  'associate',
  'bachelor',
  'master',
  'phd',
]);

export const AgentJobAvailability = z.enum([
  'immediate',
  'two_weeks',
  'one_month',
  'negotiable',
]);

export const AgentJobCompanySize = z.enum([
  'startup',
  'small',
  'medium',
  'large',
]);

export const agentJobFieldsSchema = z.object({
  jobType: AgentJobJobType,
  jobCategory: AgentJobJobCategory,
  targetPositions: z.array(z.string()).min(1),
  expectedSalary: z.enum(['0-5k', '5k-10k', '10k-20k', '20k-30k', '30k-50k', '50k+']).optional(),
  workLocation: AgentJobWorkLocation.optional(),
  workExperience: AgentJobWorkExperience,
  skills: z.array(z.string()).min(1),
  certifications: z.array(AgentJobCertification).optional(),
  education: AgentJobEducation.optional(),
  portfolioUrl: urlFieldSchema.optional(),
  careerSummary: textareaFieldSchema.min(50).max(1000),
  keyAchievements: textareaFieldSchema.optional(),
  availability: AgentJobAvailability.optional(),
  preferredCompanySize: z.array(AgentJobCompanySize).optional(),
});

// ============================================
// AgentAd Fields
// ============================================

export const AgentAdAdType = z.enum([
  'product',
  'service',
  'event',
  'brand',
  'promotion',
  'awareness',
]);

export const AgentAdProductCategory = z.enum([
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

export const AgentAdTargetAudience = z.enum([
  'youth',
  'young_adult',
  'adult',
  'senior',
  'family',
  'business',
  'professional',
]);

export const AgentAdCampaignObjective = z.enum([
  'awareness',
  'engagement',
  'traffic',
  'leads',
  'sales',
  'app_install',
]);

export const AgentAdBudgetRange = z.enum([
  'small',
  'medium',
  'large',
  'enterprise',
]).optional();

export const AgentAdCampaignDuration = z.enum([
  'short',
  'medium',
  'long',
  'ongoing',
]).optional();

export const agentAdFieldsSchema = z.object({
  adType: AgentAdAdType,
  productCategory: AgentAdProductCategory,
  targetAudience: z.array(AgentAdTargetAudience).min(1),
  campaignObjective: AgentAdCampaignObjective,
  budgetRange: AgentAdBudgetRange,
  campaignDuration: AgentAdCampaignDuration,
  productName: textFieldSchema.max(50),
  productDescription: textareaFieldSchema.min(30).max(500),
  keyFeatures: z.array(z.string()).optional(),
  priceInfo: textFieldSchema.optional(),
  promotionDetails: textareaFieldSchema.optional(),
  websiteUrl: urlFieldSchema.optional(),
  contactInfo: textFieldSchema.optional(),
  location: textFieldSchema.optional(),
  businessHours: textFieldSchema.optional(),
});

// ============================================
// Export All Schemas
// ============================================

export const sceneFieldsSchemas = {
  visionshare: visionShareFieldsSchema,
  agentdate: agentDateFieldsSchema,
  agentjob: agentJobFieldsSchema,
  agentad: agentAdFieldsSchema,
};

// Type exports
export type VisionShareFields = z.infer<typeof visionShareFieldsSchema>;
export type AgentDateFields = z.infer<typeof agentDateFieldsSchema>;
export type AgentJobFields = z.infer<typeof agentJobFieldsSchema>;
export type AgentAdFields = z.infer<typeof agentAdFieldsSchema>;

// ============================================
// Validation Helpers
// ============================================

export function validateSceneFields(
  sceneId: 'visionshare' | 'agentdate' | 'agentjob' | 'agentad',
  data: unknown
): { success: true; data: unknown } | { success: false; errors: z.ZodError } {
  const schema = sceneFieldsSchemas[sceneId];
  if (!schema) {
    throw new Error(`Unknown scene: ${sceneId}`);
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

export function validatePartialSceneFields(
  sceneId: 'visionshare' | 'agentdate' | 'agentjob' | 'agentad',
  data: unknown
): { success: true; data: unknown } | { success: false; errors: z.ZodError } {
  const schema = sceneFieldsSchemas[sceneId];
  if (!schema) {
    throw new Error(`Unknown scene: ${sceneId}`);
  }

  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
