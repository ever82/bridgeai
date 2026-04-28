/**
 * Resume Intelligent Matching - Core Algorithm
 *
 * Multi-dimensional matching between a candidate resume and a job posting.
 * Produces a 0-100 composite score across skill, experience, salary,
 * education, and location dimensions.
 */
export interface ResumeProfile {
    skills: string[];
    experienceYears: number;
    experienceLevel?: string;
    educationLevel?: string;
    industry?: string;
    expectedSalary?: {
        min?: number;
        max?: number;
        period?: string;
    };
    currentSalary?: {
        min?: number;
        max?: number;
        period?: string;
    };
    location?: {
        city?: string;
        latitude?: number;
        longitude?: number;
        willingToRelocate?: boolean;
    };
    languages?: string[];
    certifications?: string[];
}
export interface JobCriteria {
    skills: string[];
    requiredSkills?: string[];
    experienceLevel?: string;
    minExperienceYears?: number;
    maxExperienceYears?: number;
    educationLevel?: string;
    industry?: string;
    salary: {
        min: number;
        max: number;
        period: string;
        isNegotiable?: boolean;
    };
    location?: {
        city?: string;
        latitude?: number;
        longitude?: number;
        isRemote?: boolean;
    };
    languages?: string[];
    certifications?: string[];
}
export interface DimensionScore {
    score: number;
    weight: number;
    weighted: number;
    details: string;
}
export interface ResumeMatchResult {
    totalScore: number;
    dimensions: {
        skill: DimensionScore;
        experience: DimensionScore;
        salary: DimensionScore;
        education: DimensionScore;
        location: DimensionScore;
    };
    matchedSkills: string[];
    missingSkills: string[];
    bonusSkills: string[];
}
export declare const DEFAULT_WEIGHTS: {
    readonly skill: 0.4;
    readonly experience: 0.2;
    readonly salary: 0.2;
    readonly education: 0.1;
    readonly location: 0.1;
};
export type WeightConfig = typeof DEFAULT_WEIGHTS;
export declare function calculateSkillScore(resumeSkills: string[], jobSkills: string[], requiredSkills?: string[]): {
    score: number;
    matched: string[];
    missing: string[];
    bonus: string[];
};
export declare function calculateExperienceScore(resumeYears: number, jobLevel?: string, jobMinYears?: number, jobMaxYears?: number, resumeLevel?: string, resumeIndustry?: string, jobIndustry?: string): number;
export declare function calculateSalaryScore(jobSalary: {
    min: number;
    max: number;
    period: string;
    isNegotiable?: boolean;
}, resumeExpected?: {
    min?: number;
    max?: number;
    period?: string;
}, resumeCurrent?: {
    min?: number;
    max?: number;
    period?: string;
}): number;
export declare function calculateEducationScore(resumeLevel?: string, jobLevel?: string): number;
export declare function calculateLocationScore(resumeLocation?: {
    city?: string;
    latitude?: number;
    longitude?: number;
    willingToRelocate?: boolean;
}, jobLocation?: {
    city?: string;
    latitude?: number;
    longitude?: number;
    isRemote?: boolean;
}): number;
export declare function matchResumeToJob(resume: ResumeProfile, job: JobCriteria, weights?: WeightConfig): ResumeMatchResult;
//# sourceMappingURL=resumeMatcher.d.ts.map