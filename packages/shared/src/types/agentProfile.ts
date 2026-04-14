/**
 * Agent Profile L1, L2, L3 Data Models
 * L1: 基础信息（系统可查询的结构化数据）
 * L2: 结构化信息（Agent可读的自然语言）
 * L3: 自然语言描述（完整描述）
 */

// ============================================
// L1 - 基础信息（系统可查询）
// ============================================

export enum AgeRange {
  UNDER_18 = 'UNDER_18',
  AGE_18_25 = 'AGE_18_25',
  AGE_26_30 = 'AGE_26_30',
  AGE_31_35 = 'AGE_31_35',
  AGE_36_40 = 'AGE_36_40',
  AGE_41_45 = 'AGE_41_45',
  AGE_46_50 = 'AGE_46_50',
  AGE_51_60 = 'AGE_51_60',
  OVER_60 = 'OVER_60',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE = 'ASSOCIATE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
  OTHER = 'OTHER',
  NO_REQUIREMENT = 'NO_REQUIREMENT',
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
  // Additional flexible fields
  [key: string]: any;
}

// L1 field weights for completion calculation
export const L1_FIELD_WEIGHTS: Record<keyof L1Profile, number> = {
  age: 20,
  gender: 15,
  location: 25,
  occupation: 20,
  education: 20,
};

// L1 field labels for UI display
export const L1_FIELD_LABELS: Record<keyof L1Profile, string> = {
  age: '年龄段',
  gender: '性别',
  location: '所在地',
  occupation: '职业',
  education: '教育水平',
};

// Age range labels
export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  [AgeRange.UNDER_18]: '18岁以下',
  [AgeRange.AGE_18_25]: '18-25岁',
  [AgeRange.AGE_26_30]: '26-30岁',
  [AgeRange.AGE_31_35]: '31-35岁',
  [AgeRange.AGE_36_40]: '36-40岁',
  [AgeRange.AGE_41_45]: '41-45岁',
  [AgeRange.AGE_46_50]: '46-50岁',
  [AgeRange.AGE_51_60]: '51-60岁',
  [AgeRange.OVER_60]: '60岁以上',
};

// Gender labels
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: '男',
  [Gender.FEMALE]: '女',
  [Gender.OTHER]: '其他',
  [Gender.PREFER_NOT_TO_SAY]: '保密',
};

// Education labels
export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  [EducationLevel.HIGH_SCHOOL]: '高中及以下',
  [EducationLevel.ASSOCIATE]: '大专',
  [EducationLevel.BACHELOR]: '本科',
  [EducationLevel.MASTER]: '硕士',
  [EducationLevel.DOCTORATE]: '博士',
  [EducationLevel.OTHER]: '其他',
  [EducationLevel.NO_REQUIREMENT]: '不限',
};

// ============================================
// L2 - 结构化信息（Agent可读）
// ============================================

export interface L2Profile {
  description?: string;
  requirements?: string[];
  capabilities?: string[];
  preferences?: string[];
  constraints?: string[];
  [key: string]: any;
}

// ============================================
// L3 - 自然语言描述
// ============================================

export interface L3Profile {
  description: string;
}

// ============================================
// Agent Profile Combined
// ============================================

export interface AgentProfileData {
  l1?: L1Profile;
  l2?: L2Profile;
  l3?: L3Profile;
}

// Profile completion result
export interface ProfileCompletionResult {
  l1Percentage: number;
  l1FilledFields: number;
  l1TotalFields: number;
  l1MissingFields: (keyof L1Profile)[];
  l1WeightedScore: number;
}

// ============================================
// Profile Validation
// ============================================

export interface ProfileValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: ProfileValidationError[];
}

// ============================================
// Profile Update Request/Response
// ============================================

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
}
