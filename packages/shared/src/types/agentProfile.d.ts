/**
 * Agent Profile L1, L2, L3 Data Models
 * L1: 基础信息（系统可查询的结构化数据）
 * L2: 结构化信息（Agent可读的自然语言）
 * L3: 自然语言描述（完整描述）
 */
export declare enum AgeRange {
    UNDER_18 = "UNDER_18",
    AGE_18_25 = "AGE_18_25",
    AGE_26_30 = "AGE_26_30",
    AGE_31_35 = "AGE_31_35",
    AGE_36_40 = "AGE_36_40",
    AGE_41_45 = "AGE_41_45",
    AGE_46_50 = "AGE_46_50",
    AGE_51_60 = "AGE_51_60",
    OVER_60 = "OVER_60"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER",
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"
}
export declare enum EducationLevel {
    HIGH_SCHOOL = "HIGH_SCHOOL",
    ASSOCIATE = "ASSOCIATE",
    BACHELOR = "BACHELOR",
    MASTER = "MASTER",
    DOCTORATE = "DOCTORATE",
    OTHER = "OTHER",
    NO_REQUIREMENT = "NO_REQUIREMENT"
}
export interface ProfileLocation {
    province: string;
    city: string;
    district?: string;
    latitude?: number;
    longitude?: number;
}
export interface L1Profile {
    age?: AgeRange;
    gender?: Gender;
    location?: ProfileLocation;
    occupation?: string;
    education?: EducationLevel;
    [key: string]: any;
}
export declare const L1_FIELD_WEIGHTS: Record<keyof L1Profile, number>;
export declare const L1_FIELD_LABELS: Record<keyof L1Profile, string>;
export declare const AGE_RANGE_LABELS: Record<AgeRange, string>;
export declare const GENDER_LABELS: Record<Gender, string>;
export declare const EDUCATION_LABELS: Record<EducationLevel, string>;
export interface L2Profile {
    description?: string;
    requirements?: string[];
    capabilities?: string[];
    preferences?: string[];
    constraints?: string[];
    [key: string]: any;
}
export interface L3Profile {
    description: string;
    mediaUrls?: string[];
}
export interface AgentProfileData {
    l1?: L1Profile;
    l2?: L2Profile;
    l3?: L3Profile;
}
export interface ProfileCompletionResult {
    l1Percentage: number;
    l1FilledFields: number;
    l1TotalFields: number;
    l1MissingFields: (keyof L1Profile)[];
    l1WeightedScore: number;
}
export interface ProfileValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ProfileValidationResult {
    valid: boolean;
    errors: ProfileValidationError[];
}
export interface UpdateL1ProfileRequest {
    age?: AgeRange;
    gender?: Gender;
    location?: ProfileLocation;
    occupation?: string;
    education?: EducationLevel;
}
export interface UpdateL2ProfileRequest {
    description?: string;
    requirements?: string[];
    capabilities?: string[];
    preferences?: string[];
    constraints?: string[];
}
export interface UpdateL3ProfileRequest {
    description: string;
    mediaUrls?: string[];
}
//# sourceMappingURL=agentProfile.d.ts.map