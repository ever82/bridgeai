/**
 * Dating Profile Types
 * Types for AgentDate dating profile configuration
 */
export declare enum AgeRangePreference {
    UNDER_20 = "UNDER_20",
    AGE_20_25 = "AGE_20_25",
    AGE_26_30 = "AGE_26_30",
    AGE_31_35 = "AGE_31_35",
    AGE_36_40 = "AGE_36_40",
    AGE_41_50 = "AGE_41_50",
    OVER_50 = "OVER_50",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum HeightRange {
    BELOW_150 = "BELOW_150",// Below 150cm
    HEIGHT_150_160 = "HEIGHT_150_160",
    HEIGHT_160_170 = "HEIGHT_160_170",
    HEIGHT_170_180 = "HEIGHT_170_180",
    HEIGHT_180_190 = "HEIGHT_180_190",
    ABOVE_190 = "ABOVE_190",// Above 190cm
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum EducationPreference {
    HIGH_SCHOOL = "HIGH_SCHOOL",
    ASSOCIATE = "ASSOCIATE",
    BACHELOR = "BACHELOR",
    MASTER = "MASTER",
    DOCTORATE = "DOCTORATE",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum IncomeRange {
    BELOW_5K = "BELOW_5K",// Below 5k
    INCOME_5K_10K = "INCOME_5K_10K",
    INCOME_10K_20K = "INCOME_10K_20K",
    INCOME_20K_50K = "INCOME_20K_50K",
    ABOVE_50K = "ABOVE_50K",// Above 50k
    NO_PREFERENCE = "NO_PREFERENCE"
}
export interface LocationPreference {
    province?: string;
    city?: string;
    district?: string;
    radiusKm?: number;
    sameCity?: boolean;
    sameProvince?: boolean;
}
export interface BasicConditions {
    ageRange?: AgeRangePreference;
    heightRange?: HeightRange;
    education?: EducationPreference;
    income?: IncomeRange;
    location?: LocationPreference;
    hasPhoto?: boolean;
    isVerified?: boolean;
}
export declare enum MBTIType {
    INTJ = "INTJ",
    INTP = "INTP",
    ENTJ = "ENTJ",
    ENTP = "ENTP",
    INFJ = "INFJ",
    INFP = "INFP",
    ENFJ = "ENFJ",
    ENFP = "ENFP",
    ISTJ = "ISTJ",
    ISFJ = "ISFJ",
    ESTJ = "ESTJ",
    ESFJ = "ESFJ",
    ISTP = "ISTP",
    ISFP = "ISFP",
    ESTP = "ESTP",
    ESFP = "ESFP",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum PersonalityTrait {
    INTROVERTED = "INTROVERTED",
    EXTROVERTED = "EXTROVERTED",
    AMBIVERT = "AMBIVERT",
    OPTIMISTIC = "OPTIMISTIC",
    RATIONAL = "RATIONAL",
    EMOTIONAL = "EMOTIONAL",
    PRACTICAL = "PRACTICAL",
    CREATIVE = "CREATIVE",
    ADVENTUROUS = "ADVENTUROUS",
    STABLE = "STABLE",
    HUMOROUS = "HUMOROUS",
    GENTLE = "GENTLE",
    INDEPENDENT = "INDEPENDENT",
    DEPENDABLE = "DEPENDABLE"
}
export interface PersonalityPreferences {
    mbti?: MBTIType[];
    traits?: PersonalityTrait[];
    preferredTraits?: PersonalityTrait[];
    dislikedTraits?: PersonalityTrait[];
}
export declare enum InterestCategory {
    SPORTS = "SPORTS",
    MUSIC = "MUSIC",
    READING = "READING",
    TRAVEL = "TRAVEL",
    FOOD = "FOOD",
    MOVIES = "MOVIES",
    GAMING = "GAMING",
    PHOTOGRAPHY = "PHOTOGRAPHY",
    ARTS = "ARTS",
    TECH = "TECH",
    FASHION = "FASHION",
    OUTDOOR = "OUTDOOR",
    PETS = "PETS",
    COOKING = "COOKING",
    DANCING = "DANCING",
    FITNESS = "FITNESS"
}
export interface Interest {
    category: InterestCategory;
    name: string;
    level?: 'casual' | 'regular' | 'passionate';
}
export interface InterestPreferences {
    interests: Interest[];
    customInterests?: string[];
    preferredInPartner?: InterestCategory[];
    sharedInterests?: InterestCategory[];
}
export declare enum SleepSchedule {
    EARLY_BIRD = "EARLY_BIRD",// Early to bed, early to rise
    NIGHT_OWL = "NIGHT_OWL",// Late sleeper
    FLEXIBLE = "FLEXIBLE",
    REGULAR = "REGULAR"
}
export declare enum SmokingHabit {
    NEVER = "NEVER",
    OCCASIONALLY = "OCCASIONALLY",
    REGULARLY = "REGULARLY",
    QUITTING = "QUITTING",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum DrinkingHabit {
    NEVER = "NEVER",
    SOCIALLY = "SOCIALLY",
    REGULARLY = "REGULARLY",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum PetPreference {
    DOGS = "DOGS",
    CATS = "CATS",
    OTHER = "OTHER",
    NO_PETS = "NO_PETS",
    ALLERGIC = "ALLERGIC",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum ExerciseFrequency {
    NEVER = "NEVER",
    OCCASIONALLY = "OCCASIONALLY",
    REGULARLY = "REGULARLY",
    DAILY = "DAILY",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum DietPreference {
    OMNIVORE = "OMNIVORE",
    VEGETARIAN = "VEGETARIAN",
    VEGAN = "VEGAN",
    HALAL = "HALAL",
    KOSHER = "KOSHER",
    GLUTEN_FREE = "GLUTEN_FREE",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export interface Lifestyle {
    sleepSchedule?: SleepSchedule;
    smoking?: SmokingHabit;
    drinking?: DrinkingHabit;
    pets?: PetPreference;
    exercise?: ExerciseFrequency;
    diet?: DietPreference;
    workLifeBalance?: 'work_focused' | 'balanced' | 'life_focused';
    socialFrequency?: 'homebody' | 'moderate' | 'social_butterfly';
}
export declare enum DatingPurpose {
    SERIOUS_RELATIONSHIP = "SERIOUS_RELATIONSHIP",
    MARRIAGE = "MARRIAGE",
    CASUAL_DATING = "CASUAL_DATING",
    FRIENDSHIP_FIRST = "FRIENDSHIP_FIRST",
    COMPANIONSHIP = "COMPANIONSHIP",
    NOT_SURE = "NOT_SURE"
}
export declare enum RelationshipPace {
    TAKE_IT_SLOW = "TAKE_IT_SLOW",
    MODERATE = "MODERATE",
    READY_TO_COMMIT = "READY_TO_COMMIT"
}
export declare enum LivingArrangement {
    LIVE_ALONE = "LIVE_ALONE",
    WITH_FAMILY = "WITH_FAMILY",
    WITH_ROOMMATES = "WITH_ROOMMATES",
    OPEN_TO_MOVE = "OPEN_TO_MOVE"
}
export declare enum FamilyPlan {
    WANT_CHILDREN = "WANT_CHILDREN",
    DO_NOT_WANT_CHILDREN = "DO_NOT_WANT_CHILDREN",
    OPEN_MINDED = "OPEN_MINDED",
    HAVE_CHILDREN = "HAVE_CHILDREN",
    NOT_SURE = "NOT_SURE"
}
export interface RelationshipExpectations {
    purpose: DatingPurpose;
    pace?: RelationshipPace;
    living?: LivingArrangement;
    familyPlan?: FamilyPlan;
    marriageTimeline?: 'within_1_year' | '1_3_years' | '3_5_years' | 'no_rush';
    longDistance?: 'acceptable' | 'not_preferred' | 'deal_breaker';
}
export declare enum VisibilityLevel {
    PUBLIC = "PUBLIC",// Visible to all
    MATCHED_ONLY = "MATCHED_ONLY",// Only visible after matching
    VERIFIED_ONLY = "VERIFIED_ONLY",// Only visible to verified users
    PRIVATE = "PRIVATE"
}
export interface FieldVisibility {
    basicInfo?: VisibilityLevel;
    photos?: VisibilityLevel;
    income?: VisibilityLevel;
    location?: VisibilityLevel;
    contactInfo?: VisibilityLevel;
    personalDetails?: VisibilityLevel;
}
export interface DisclosureStage {
    stage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed';
    fields: string[];
}
export interface PrivacySettings {
    profileVisibility: VisibilityLevel;
    fieldVisibility: FieldVisibility;
    disclosureStages?: DisclosureStage[];
    allowScreenshot?: boolean;
    showOnlineStatus?: boolean;
    hideFromSearch?: boolean;
}
export interface DatingProfile {
    id: string;
    agentId: string;
    userId: string;
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    aiExtractedData?: Record<string, any>;
    aiExtractionConfidence?: number;
    privacySettings: PrivacySettings;
    completenessScore?: number;
    qualityScore?: number;
    isActive: boolean;
    isComplete: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface ProfileQualityMetrics {
    completenessScore: number;
    richnessScore: number;
    matchPotentialScore: number;
    missingCriticalFields: string[];
    suggestions: string[];
}
export interface ProfileQualityResult {
    overallScore: number;
    metrics: ProfileQualityMetrics;
    recommendations: {
        field: string;
        priority: 'high' | 'medium' | 'low';
        suggestion: string;
    }[];
}
export interface AIExtractedPreference {
    category: string;
    value: any;
    confidence: number;
    source: 'explicit' | 'implicit' | 'inferred';
}
export interface AIExtractionResult {
    basicConditions?: Partial<BasicConditions>;
    personality?: Partial<PersonalityPreferences>;
    interests?: Partial<InterestPreferences>;
    lifestyle?: Partial<Lifestyle>;
    expectations?: Partial<RelationshipExpectations>;
    extracted: AIExtractedPreference[];
    confidence: number;
    suggestions: string[];
}
export interface CreateDatingProfileRequest {
    agentId: string;
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    privacySettings?: Partial<PrivacySettings>;
}
export interface UpdateDatingProfileRequest {
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    privacySettings?: Partial<PrivacySettings>;
}
export interface ExtractFromDescriptionRequest {
    description: string;
    currentProfile?: Partial<DatingProfile>;
}
export interface ExtractFromDescriptionResponse {
    extracted: AIExtractionResult;
    profile: Partial<DatingProfile>;
    confidence: number;
}
export interface DatingProfileResponse {
    profile: DatingProfile;
    quality?: ProfileQualityResult;
    completion: {
        percentage: number;
        filledSections: number;
        totalSections: number;
    };
}
export declare const DATING_AGE_RANGE_LABELS: Record<AgeRangePreference, string>;
export declare const HEIGHT_RANGE_LABELS: Record<HeightRange, string>;
export declare const DATING_EDUCATION_LABELS: Record<EducationPreference, string>;
export declare const INCOME_LABELS: Record<IncomeRange, string>;
export declare const DATING_PURPOSE_LABELS: Record<DatingPurpose, string>;
export declare const VISIBILITY_LABELS: Record<VisibilityLevel, string>;
//# sourceMappingURL=dating.d.ts.map