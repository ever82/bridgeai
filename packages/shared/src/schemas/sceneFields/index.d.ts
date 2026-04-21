/**
 * Scene Field Validation Schemas
 * 场景字段验证 Schema
 *
 * Defines Zod schemas for validating scene field values
 */
import { z } from 'zod';
export declare const textFieldSchema: z.ZodString;
export declare const textareaFieldSchema: z.ZodString;
export declare const urlFieldSchema: z.ZodString;
export declare const emailFieldSchema: z.ZodString;
export declare const phoneFieldSchema: z.ZodString;
export declare const VisionShareContentType: z.ZodEnum<["photography", "artwork", "design", "illustration", "video", "animation"]>;
export declare const VisionSharePurpose: z.ZodEnum<["share", "discover", "collaborate", "sell", "feedback"]>;
export declare const VisionShareStyle: z.ZodEnum<["minimalist", "vintage", "modern", "abstract", "realistic", "cartoon", "cyberpunk", "nature", "urban"]>;
export declare const VisionShareExperienceLevel: z.ZodEnum<["beginner", "intermediate", "advanced", "professional"]>;
export declare const VisionShareAvailability: z.ZodEnum<["not_available", "limited", "available"]>;
export declare const VisionSharePriceRange: z.ZodEnum<["free", "low", "medium", "high"]>;
export declare const visionShareFieldsSchema: z.ZodObject<{
    contentType: z.ZodArray<z.ZodEnum<["photography", "artwork", "design", "illustration", "video", "animation"]>, "many">;
    purpose: z.ZodEnum<["share", "discover", "collaborate", "sell", "feedback"]>;
    style: z.ZodOptional<z.ZodArray<z.ZodEnum<["minimalist", "vintage", "modern", "abstract", "realistic", "cartoon", "cyberpunk", "nature", "urban"]>, "many">>;
    portfolioUrl: z.ZodOptional<z.ZodString>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    experienceLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced", "professional"]>>;
    availability: z.ZodOptional<z.ZodEnum<["not_available", "limited", "available"]>>;
    priceRange: z.ZodOptional<z.ZodEnum<["free", "low", "medium", "high"]>>;
    inspirationSources: z.ZodOptional<z.ZodString>;
    favoriteArtists: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    contentType: ("design" | "video" | "photography" | "artwork" | "illustration" | "animation")[];
    purpose: "feedback" | "share" | "discover" | "collaborate" | "sell";
    skills?: string[] | undefined;
    availability?: "available" | "not_available" | "limited" | undefined;
    experienceLevel?: "professional" | "beginner" | "intermediate" | "advanced" | undefined;
    style?: ("nature" | "urban" | "minimalist" | "vintage" | "modern" | "abstract" | "realistic" | "cartoon" | "cyberpunk")[] | undefined;
    priceRange?: "high" | "medium" | "low" | "free" | undefined;
    portfolioUrl?: string | undefined;
    inspirationSources?: string | undefined;
    favoriteArtists?: string[] | undefined;
}, {
    contentType: ("design" | "video" | "photography" | "artwork" | "illustration" | "animation")[];
    purpose: "feedback" | "share" | "discover" | "collaborate" | "sell";
    skills?: string[] | undefined;
    availability?: "available" | "not_available" | "limited" | undefined;
    experienceLevel?: "professional" | "beginner" | "intermediate" | "advanced" | undefined;
    style?: ("nature" | "urban" | "minimalist" | "vintage" | "modern" | "abstract" | "realistic" | "cartoon" | "cyberpunk")[] | undefined;
    priceRange?: "high" | "medium" | "low" | "free" | undefined;
    portfolioUrl?: string | undefined;
    inspirationSources?: string | undefined;
    favoriteArtists?: string[] | undefined;
}>;
export declare const AgentDateDatingPurpose: z.ZodEnum<["serious_relationship", "casual_dating", "friendship", "marriage"]>;
export declare const AgentDatePreferredGender: z.ZodEnum<["male", "female", "any"]>;
export declare const AgentDateLocationPreference: z.ZodEnum<["same_city", "nearby", "any"]>;
export declare const AgentDateInterest: z.ZodEnum<["movies", "music", "sports", "travel", "reading", "gaming", "cooking", "outdoor", "art", "tech"]>;
export declare const AgentDatePersonalityTrait: z.ZodEnum<["outgoing", "introverted", "humorous", "serious", "romantic", "practical", "creative", "adventurous"]>;
export declare const AgentDateLifestyle: z.ZodEnum<["early_bird", "night_owl", "active", "relaxed", "health_conscious"]>;
export declare const AgentDateEducation: z.ZodEnum<["high_school", "college", "bachelor", "master", "phd"]>;
export declare const AgentDateDealBreaker: z.ZodEnum<["smoking", "drinking", "lying", "disrespect", "unambitious"]>;
export declare const agentDateFieldsSchema: z.ZodObject<{
    datingPurpose: z.ZodEnum<["serious_relationship", "casual_dating", "friendship", "marriage"]>;
    preferredGender: z.ZodEnum<["male", "female", "any"]>;
    ageRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>;
    locationPreference: z.ZodOptional<z.ZodEnum<["same_city", "nearby", "any"]>>;
    interests: z.ZodOptional<z.ZodArray<z.ZodEnum<["movies", "music", "sports", "travel", "reading", "gaming", "cooking", "outdoor", "art", "tech"]>, "many">>;
    personalityTraits: z.ZodOptional<z.ZodArray<z.ZodEnum<["outgoing", "introverted", "humorous", "serious", "romantic", "practical", "creative", "adventurous"]>, "many">>;
    lifestyle: z.ZodOptional<z.ZodEnum<["early_bird", "night_owl", "active", "relaxed", "health_conscious"]>>;
    occupation: z.ZodOptional<z.ZodString>;
    education: z.ZodOptional<z.ZodEnum<["high_school", "college", "bachelor", "master", "phd"]>>;
    lookingFor: z.ZodOptional<z.ZodString>;
    aboutMe: z.ZodString;
    dealBreakers: z.ZodOptional<z.ZodArray<z.ZodEnum<["smoking", "drinking", "lying", "disrespect", "unambitious"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    ageRange: {
        min: number;
        max: number;
    };
    datingPurpose: "serious_relationship" | "casual_dating" | "friendship" | "marriage";
    preferredGender: "any" | "male" | "female";
    aboutMe: string;
    occupation?: string | undefined;
    education?: "master" | "high_school" | "college" | "bachelor" | "phd" | undefined;
    dealBreakers?: ("smoking" | "drinking" | "lying" | "disrespect" | "unambitious")[] | undefined;
    interests?: ("tech" | "outdoor" | "cooking" | "travel" | "gaming" | "sports" | "art" | "music" | "reading" | "movies")[] | undefined;
    lifestyle?: "active" | "relaxed" | "early_bird" | "night_owl" | "health_conscious" | undefined;
    personalityTraits?: ("creative" | "outgoing" | "introverted" | "humorous" | "serious" | "romantic" | "practical" | "adventurous")[] | undefined;
    locationPreference?: "any" | "same_city" | "nearby" | undefined;
    lookingFor?: string | undefined;
}, {
    ageRange: {
        min: number;
        max: number;
    };
    datingPurpose: "serious_relationship" | "casual_dating" | "friendship" | "marriage";
    preferredGender: "any" | "male" | "female";
    aboutMe: string;
    occupation?: string | undefined;
    education?: "master" | "high_school" | "college" | "bachelor" | "phd" | undefined;
    dealBreakers?: ("smoking" | "drinking" | "lying" | "disrespect" | "unambitious")[] | undefined;
    interests?: ("tech" | "outdoor" | "cooking" | "travel" | "gaming" | "sports" | "art" | "music" | "reading" | "movies")[] | undefined;
    lifestyle?: "active" | "relaxed" | "early_bird" | "night_owl" | "health_conscious" | undefined;
    personalityTraits?: ("creative" | "outgoing" | "introverted" | "humorous" | "serious" | "romantic" | "practical" | "adventurous")[] | undefined;
    locationPreference?: "any" | "same_city" | "nearby" | undefined;
    lookingFor?: string | undefined;
}>;
export declare const AgentJobJobType: z.ZodEnum<["full_time", "part_time", "contract", "freelance", "internship"]>;
export declare const AgentJobJobCategory: z.ZodEnum<["tech", "design", "marketing", "sales", "operations", "finance", "hr", "product"]>;
export declare const AgentJobWorkLocation: z.ZodEnum<["remote", "hybrid", "onsite"]>;
export declare const AgentJobWorkExperience: z.ZodEnum<["entry", "junior", "mid", "senior", "expert"]>;
export declare const AgentJobCertification: z.ZodEnum<["pmp", "aws", "google", "azure", "cfa", "cpa"]>;
export declare const AgentJobEducation: z.ZodEnum<["high_school", "associate", "bachelor", "master", "phd"]>;
export declare const AgentJobAvailability: z.ZodEnum<["immediate", "two_weeks", "one_month", "negotiable"]>;
export declare const AgentJobCompanySize: z.ZodEnum<["startup", "small", "medium", "large"]>;
export declare const agentJobFieldsSchema: z.ZodObject<{
    jobType: z.ZodEnum<["full_time", "part_time", "contract", "freelance", "internship"]>;
    jobCategory: z.ZodEnum<["tech", "design", "marketing", "sales", "operations", "finance", "hr", "product"]>;
    targetPositions: z.ZodArray<z.ZodString, "many">;
    expectedSalary: z.ZodOptional<z.ZodEnum<["0-5k", "5k-10k", "10k-20k", "20k-30k", "30k-50k", "50k+"]>>;
    workLocation: z.ZodOptional<z.ZodEnum<["remote", "hybrid", "onsite"]>>;
    workExperience: z.ZodEnum<["entry", "junior", "mid", "senior", "expert"]>;
    skills: z.ZodArray<z.ZodString, "many">;
    certifications: z.ZodOptional<z.ZodArray<z.ZodEnum<["pmp", "aws", "google", "azure", "cfa", "cpa"]>, "many">>;
    education: z.ZodOptional<z.ZodEnum<["high_school", "associate", "bachelor", "master", "phd"]>>;
    portfolioUrl: z.ZodOptional<z.ZodString>;
    careerSummary: z.ZodString;
    keyAchievements: z.ZodOptional<z.ZodString>;
    availability: z.ZodOptional<z.ZodEnum<["immediate", "two_weeks", "one_month", "negotiable"]>>;
    preferredCompanySize: z.ZodOptional<z.ZodArray<z.ZodEnum<["startup", "small", "medium", "large"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    skills: string[];
    jobType: "full_time" | "part_time" | "contract" | "freelance" | "internship";
    jobCategory: "operations" | "design" | "hr" | "tech" | "product" | "sales" | "marketing" | "finance";
    targetPositions: string[];
    workExperience: "mid" | "expert" | "junior" | "senior" | "entry";
    careerSummary: string;
    availability?: "negotiable" | "immediate" | "two_weeks" | "one_month" | undefined;
    education?: "master" | "high_school" | "bachelor" | "phd" | "associate" | undefined;
    certifications?: ("aws" | "azure" | "google" | "pmp" | "cfa" | "cpa")[] | undefined;
    expectedSalary?: "0-5k" | "5k-10k" | "10k-20k" | "20k-30k" | "30k-50k" | "50k+" | undefined;
    workLocation?: "onsite" | "remote" | "hybrid" | undefined;
    portfolioUrl?: string | undefined;
    keyAchievements?: string | undefined;
    preferredCompanySize?: ("small" | "medium" | "large" | "startup")[] | undefined;
}, {
    skills: string[];
    jobType: "full_time" | "part_time" | "contract" | "freelance" | "internship";
    jobCategory: "operations" | "design" | "hr" | "tech" | "product" | "sales" | "marketing" | "finance";
    targetPositions: string[];
    workExperience: "mid" | "expert" | "junior" | "senior" | "entry";
    careerSummary: string;
    availability?: "negotiable" | "immediate" | "two_weeks" | "one_month" | undefined;
    education?: "master" | "high_school" | "bachelor" | "phd" | "associate" | undefined;
    certifications?: ("aws" | "azure" | "google" | "pmp" | "cfa" | "cpa")[] | undefined;
    expectedSalary?: "0-5k" | "5k-10k" | "10k-20k" | "20k-30k" | "30k-50k" | "50k+" | undefined;
    workLocation?: "onsite" | "remote" | "hybrid" | undefined;
    portfolioUrl?: string | undefined;
    keyAchievements?: string | undefined;
    preferredCompanySize?: ("small" | "medium" | "large" | "startup")[] | undefined;
}>;
export declare const AgentAdAdType: z.ZodEnum<["product", "service", "event", "brand", "promotion", "awareness"]>;
export declare const AgentAdProductCategory: z.ZodEnum<["electronics", "fashion", "food", "beauty", "home", "education", "travel", "health", "entertainment", "business"]>;
export declare const AgentAdTargetAudience: z.ZodEnum<["youth", "young_adult", "adult", "senior", "family", "business", "professional"]>;
export declare const AgentAdCampaignObjective: z.ZodEnum<["awareness", "engagement", "traffic", "leads", "sales", "app_install"]>;
export declare const AgentAdBudgetRange: z.ZodOptional<z.ZodEnum<["small", "medium", "large", "enterprise"]>>;
export declare const AgentAdCampaignDuration: z.ZodOptional<z.ZodEnum<["short", "medium", "long", "ongoing"]>>;
export declare const agentAdFieldsSchema: z.ZodObject<{
    adType: z.ZodEnum<["product", "service", "event", "brand", "promotion", "awareness"]>;
    productCategory: z.ZodEnum<["electronics", "fashion", "food", "beauty", "home", "education", "travel", "health", "entertainment", "business"]>;
    targetAudience: z.ZodArray<z.ZodEnum<["youth", "young_adult", "adult", "senior", "family", "business", "professional"]>, "many">;
    campaignObjective: z.ZodEnum<["awareness", "engagement", "traffic", "leads", "sales", "app_install"]>;
    budgetRange: z.ZodOptional<z.ZodEnum<["small", "medium", "large", "enterprise"]>>;
    campaignDuration: z.ZodOptional<z.ZodEnum<["short", "medium", "long", "ongoing"]>>;
    productName: z.ZodString;
    productDescription: z.ZodString;
    keyFeatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    priceInfo: z.ZodOptional<z.ZodString>;
    promotionDetails: z.ZodOptional<z.ZodString>;
    websiteUrl: z.ZodOptional<z.ZodString>;
    contactInfo: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    businessHours: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    adType: "service" | "promotion" | "event" | "brand" | "product" | "awareness";
    productCategory: "education" | "business" | "food" | "health" | "electronics" | "beauty" | "travel" | "home" | "entertainment" | "fashion";
    productName: string;
    targetAudience: ("business" | "professional" | "senior" | "family" | "youth" | "young_adult" | "adult")[];
    campaignObjective: "awareness" | "engagement" | "traffic" | "leads" | "sales" | "app_install";
    productDescription: string;
    location?: string | undefined;
    businessHours?: string | undefined;
    contactInfo?: string | undefined;
    budgetRange?: "small" | "medium" | "large" | "enterprise" | undefined;
    campaignDuration?: "short" | "medium" | "long" | "ongoing" | undefined;
    keyFeatures?: string[] | undefined;
    priceInfo?: string | undefined;
    promotionDetails?: string | undefined;
    websiteUrl?: string | undefined;
}, {
    adType: "service" | "promotion" | "event" | "brand" | "product" | "awareness";
    productCategory: "education" | "business" | "food" | "health" | "electronics" | "beauty" | "travel" | "home" | "entertainment" | "fashion";
    productName: string;
    targetAudience: ("business" | "professional" | "senior" | "family" | "youth" | "young_adult" | "adult")[];
    campaignObjective: "awareness" | "engagement" | "traffic" | "leads" | "sales" | "app_install";
    productDescription: string;
    location?: string | undefined;
    businessHours?: string | undefined;
    contactInfo?: string | undefined;
    budgetRange?: "small" | "medium" | "large" | "enterprise" | undefined;
    campaignDuration?: "short" | "medium" | "long" | "ongoing" | undefined;
    keyFeatures?: string[] | undefined;
    priceInfo?: string | undefined;
    promotionDetails?: string | undefined;
    websiteUrl?: string | undefined;
}>;
export declare const sceneFieldsSchemas: {
    visionshare: z.ZodObject<{
        contentType: z.ZodArray<z.ZodEnum<["photography", "artwork", "design", "illustration", "video", "animation"]>, "many">;
        purpose: z.ZodEnum<["share", "discover", "collaborate", "sell", "feedback"]>;
        style: z.ZodOptional<z.ZodArray<z.ZodEnum<["minimalist", "vintage", "modern", "abstract", "realistic", "cartoon", "cyberpunk", "nature", "urban"]>, "many">>;
        portfolioUrl: z.ZodOptional<z.ZodString>;
        skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        experienceLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced", "professional"]>>;
        availability: z.ZodOptional<z.ZodEnum<["not_available", "limited", "available"]>>;
        priceRange: z.ZodOptional<z.ZodEnum<["free", "low", "medium", "high"]>>;
        inspirationSources: z.ZodOptional<z.ZodString>;
        favoriteArtists: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        contentType: ("design" | "video" | "photography" | "artwork" | "illustration" | "animation")[];
        purpose: "feedback" | "share" | "discover" | "collaborate" | "sell";
        skills?: string[] | undefined;
        availability?: "available" | "not_available" | "limited" | undefined;
        experienceLevel?: "professional" | "beginner" | "intermediate" | "advanced" | undefined;
        style?: ("nature" | "urban" | "minimalist" | "vintage" | "modern" | "abstract" | "realistic" | "cartoon" | "cyberpunk")[] | undefined;
        priceRange?: "high" | "medium" | "low" | "free" | undefined;
        portfolioUrl?: string | undefined;
        inspirationSources?: string | undefined;
        favoriteArtists?: string[] | undefined;
    }, {
        contentType: ("design" | "video" | "photography" | "artwork" | "illustration" | "animation")[];
        purpose: "feedback" | "share" | "discover" | "collaborate" | "sell";
        skills?: string[] | undefined;
        availability?: "available" | "not_available" | "limited" | undefined;
        experienceLevel?: "professional" | "beginner" | "intermediate" | "advanced" | undefined;
        style?: ("nature" | "urban" | "minimalist" | "vintage" | "modern" | "abstract" | "realistic" | "cartoon" | "cyberpunk")[] | undefined;
        priceRange?: "high" | "medium" | "low" | "free" | undefined;
        portfolioUrl?: string | undefined;
        inspirationSources?: string | undefined;
        favoriteArtists?: string[] | undefined;
    }>;
    agentdate: z.ZodObject<{
        datingPurpose: z.ZodEnum<["serious_relationship", "casual_dating", "friendship", "marriage"]>;
        preferredGender: z.ZodEnum<["male", "female", "any"]>;
        ageRange: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>;
        locationPreference: z.ZodOptional<z.ZodEnum<["same_city", "nearby", "any"]>>;
        interests: z.ZodOptional<z.ZodArray<z.ZodEnum<["movies", "music", "sports", "travel", "reading", "gaming", "cooking", "outdoor", "art", "tech"]>, "many">>;
        personalityTraits: z.ZodOptional<z.ZodArray<z.ZodEnum<["outgoing", "introverted", "humorous", "serious", "romantic", "practical", "creative", "adventurous"]>, "many">>;
        lifestyle: z.ZodOptional<z.ZodEnum<["early_bird", "night_owl", "active", "relaxed", "health_conscious"]>>;
        occupation: z.ZodOptional<z.ZodString>;
        education: z.ZodOptional<z.ZodEnum<["high_school", "college", "bachelor", "master", "phd"]>>;
        lookingFor: z.ZodOptional<z.ZodString>;
        aboutMe: z.ZodString;
        dealBreakers: z.ZodOptional<z.ZodArray<z.ZodEnum<["smoking", "drinking", "lying", "disrespect", "unambitious"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        ageRange: {
            min: number;
            max: number;
        };
        datingPurpose: "serious_relationship" | "casual_dating" | "friendship" | "marriage";
        preferredGender: "any" | "male" | "female";
        aboutMe: string;
        occupation?: string | undefined;
        education?: "master" | "high_school" | "college" | "bachelor" | "phd" | undefined;
        dealBreakers?: ("smoking" | "drinking" | "lying" | "disrespect" | "unambitious")[] | undefined;
        interests?: ("tech" | "outdoor" | "cooking" | "travel" | "gaming" | "sports" | "art" | "music" | "reading" | "movies")[] | undefined;
        lifestyle?: "active" | "relaxed" | "early_bird" | "night_owl" | "health_conscious" | undefined;
        personalityTraits?: ("creative" | "outgoing" | "introverted" | "humorous" | "serious" | "romantic" | "practical" | "adventurous")[] | undefined;
        locationPreference?: "any" | "same_city" | "nearby" | undefined;
        lookingFor?: string | undefined;
    }, {
        ageRange: {
            min: number;
            max: number;
        };
        datingPurpose: "serious_relationship" | "casual_dating" | "friendship" | "marriage";
        preferredGender: "any" | "male" | "female";
        aboutMe: string;
        occupation?: string | undefined;
        education?: "master" | "high_school" | "college" | "bachelor" | "phd" | undefined;
        dealBreakers?: ("smoking" | "drinking" | "lying" | "disrespect" | "unambitious")[] | undefined;
        interests?: ("tech" | "outdoor" | "cooking" | "travel" | "gaming" | "sports" | "art" | "music" | "reading" | "movies")[] | undefined;
        lifestyle?: "active" | "relaxed" | "early_bird" | "night_owl" | "health_conscious" | undefined;
        personalityTraits?: ("creative" | "outgoing" | "introverted" | "humorous" | "serious" | "romantic" | "practical" | "adventurous")[] | undefined;
        locationPreference?: "any" | "same_city" | "nearby" | undefined;
        lookingFor?: string | undefined;
    }>;
    agentjob: z.ZodObject<{
        jobType: z.ZodEnum<["full_time", "part_time", "contract", "freelance", "internship"]>;
        jobCategory: z.ZodEnum<["tech", "design", "marketing", "sales", "operations", "finance", "hr", "product"]>;
        targetPositions: z.ZodArray<z.ZodString, "many">;
        expectedSalary: z.ZodOptional<z.ZodEnum<["0-5k", "5k-10k", "10k-20k", "20k-30k", "30k-50k", "50k+"]>>;
        workLocation: z.ZodOptional<z.ZodEnum<["remote", "hybrid", "onsite"]>>;
        workExperience: z.ZodEnum<["entry", "junior", "mid", "senior", "expert"]>;
        skills: z.ZodArray<z.ZodString, "many">;
        certifications: z.ZodOptional<z.ZodArray<z.ZodEnum<["pmp", "aws", "google", "azure", "cfa", "cpa"]>, "many">>;
        education: z.ZodOptional<z.ZodEnum<["high_school", "associate", "bachelor", "master", "phd"]>>;
        portfolioUrl: z.ZodOptional<z.ZodString>;
        careerSummary: z.ZodString;
        keyAchievements: z.ZodOptional<z.ZodString>;
        availability: z.ZodOptional<z.ZodEnum<["immediate", "two_weeks", "one_month", "negotiable"]>>;
        preferredCompanySize: z.ZodOptional<z.ZodArray<z.ZodEnum<["startup", "small", "medium", "large"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        jobType: "full_time" | "part_time" | "contract" | "freelance" | "internship";
        jobCategory: "operations" | "design" | "hr" | "tech" | "product" | "sales" | "marketing" | "finance";
        targetPositions: string[];
        workExperience: "mid" | "expert" | "junior" | "senior" | "entry";
        careerSummary: string;
        availability?: "negotiable" | "immediate" | "two_weeks" | "one_month" | undefined;
        education?: "master" | "high_school" | "bachelor" | "phd" | "associate" | undefined;
        certifications?: ("aws" | "azure" | "google" | "pmp" | "cfa" | "cpa")[] | undefined;
        expectedSalary?: "0-5k" | "5k-10k" | "10k-20k" | "20k-30k" | "30k-50k" | "50k+" | undefined;
        workLocation?: "onsite" | "remote" | "hybrid" | undefined;
        portfolioUrl?: string | undefined;
        keyAchievements?: string | undefined;
        preferredCompanySize?: ("small" | "medium" | "large" | "startup")[] | undefined;
    }, {
        skills: string[];
        jobType: "full_time" | "part_time" | "contract" | "freelance" | "internship";
        jobCategory: "operations" | "design" | "hr" | "tech" | "product" | "sales" | "marketing" | "finance";
        targetPositions: string[];
        workExperience: "mid" | "expert" | "junior" | "senior" | "entry";
        careerSummary: string;
        availability?: "negotiable" | "immediate" | "two_weeks" | "one_month" | undefined;
        education?: "master" | "high_school" | "bachelor" | "phd" | "associate" | undefined;
        certifications?: ("aws" | "azure" | "google" | "pmp" | "cfa" | "cpa")[] | undefined;
        expectedSalary?: "0-5k" | "5k-10k" | "10k-20k" | "20k-30k" | "30k-50k" | "50k+" | undefined;
        workLocation?: "onsite" | "remote" | "hybrid" | undefined;
        portfolioUrl?: string | undefined;
        keyAchievements?: string | undefined;
        preferredCompanySize?: ("small" | "medium" | "large" | "startup")[] | undefined;
    }>;
    agentad: z.ZodObject<{
        adType: z.ZodEnum<["product", "service", "event", "brand", "promotion", "awareness"]>;
        productCategory: z.ZodEnum<["electronics", "fashion", "food", "beauty", "home", "education", "travel", "health", "entertainment", "business"]>;
        targetAudience: z.ZodArray<z.ZodEnum<["youth", "young_adult", "adult", "senior", "family", "business", "professional"]>, "many">;
        campaignObjective: z.ZodEnum<["awareness", "engagement", "traffic", "leads", "sales", "app_install"]>;
        budgetRange: z.ZodOptional<z.ZodEnum<["small", "medium", "large", "enterprise"]>>;
        campaignDuration: z.ZodOptional<z.ZodEnum<["short", "medium", "long", "ongoing"]>>;
        productName: z.ZodString;
        productDescription: z.ZodString;
        keyFeatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priceInfo: z.ZodOptional<z.ZodString>;
        promotionDetails: z.ZodOptional<z.ZodString>;
        websiteUrl: z.ZodOptional<z.ZodString>;
        contactInfo: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        businessHours: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        adType: "service" | "promotion" | "event" | "brand" | "product" | "awareness";
        productCategory: "education" | "business" | "food" | "health" | "electronics" | "beauty" | "travel" | "home" | "entertainment" | "fashion";
        productName: string;
        targetAudience: ("business" | "professional" | "senior" | "family" | "youth" | "young_adult" | "adult")[];
        campaignObjective: "awareness" | "engagement" | "traffic" | "leads" | "sales" | "app_install";
        productDescription: string;
        location?: string | undefined;
        businessHours?: string | undefined;
        contactInfo?: string | undefined;
        budgetRange?: "small" | "medium" | "large" | "enterprise" | undefined;
        campaignDuration?: "short" | "medium" | "long" | "ongoing" | undefined;
        keyFeatures?: string[] | undefined;
        priceInfo?: string | undefined;
        promotionDetails?: string | undefined;
        websiteUrl?: string | undefined;
    }, {
        adType: "service" | "promotion" | "event" | "brand" | "product" | "awareness";
        productCategory: "education" | "business" | "food" | "health" | "electronics" | "beauty" | "travel" | "home" | "entertainment" | "fashion";
        productName: string;
        targetAudience: ("business" | "professional" | "senior" | "family" | "youth" | "young_adult" | "adult")[];
        campaignObjective: "awareness" | "engagement" | "traffic" | "leads" | "sales" | "app_install";
        productDescription: string;
        location?: string | undefined;
        businessHours?: string | undefined;
        contactInfo?: string | undefined;
        budgetRange?: "small" | "medium" | "large" | "enterprise" | undefined;
        campaignDuration?: "short" | "medium" | "long" | "ongoing" | undefined;
        keyFeatures?: string[] | undefined;
        priceInfo?: string | undefined;
        promotionDetails?: string | undefined;
        websiteUrl?: string | undefined;
    }>;
};
export type VisionShareFields = z.infer<typeof visionShareFieldsSchema>;
export type AgentDateFields = z.infer<typeof agentDateFieldsSchema>;
export type AgentJobFields = z.infer<typeof agentJobFieldsSchema>;
export type AgentAdFields = z.infer<typeof agentAdFieldsSchema>;
export declare function validateSceneFields(sceneId: 'visionshare' | 'agentdate' | 'agentjob' | 'agentad', data: unknown): {
    success: true;
    data: unknown;
} | {
    success: false;
    errors: z.ZodError;
};
export declare function validatePartialSceneFields(sceneId: 'visionshare' | 'agentdate' | 'agentjob' | 'agentad', data: unknown): {
    success: true;
    data: unknown;
} | {
    success: false;
    errors: z.ZodError;
};
//# sourceMappingURL=index.d.ts.map