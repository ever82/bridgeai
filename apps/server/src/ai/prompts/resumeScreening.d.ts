/**
 * Resume Screening Prompts
 * AI简历筛选提示词
 *
 * Provides prompt templates for LLM-based resume deep analysis:
 * - Implicit skill inference
 * - Experience relevance evaluation
 * - Cultural fit prediction
 * - Screening recommendation generation
 */
export interface ResumeScreeningContext {
    /** Raw resume text */
    resumeText: string;
    /** Extracted or provided resume fields */
    resumeProfile?: {
        skills?: string[];
        experienceYears?: number;
        educationLevel?: string;
        currentTitle?: string;
        location?: string;
        languages?: string[];
    };
    /** Job posting criteria */
    jobCriteria: {
        title: string;
        requiredSkills: string[];
        preferredSkills?: string[];
        minExperienceYears?: number;
        educationLevel?: string;
        location?: string;
        isRemote?: boolean;
        description?: string;
        salary?: {
            min?: number;
            max?: number;
            currency?: string;
        };
    };
    /** Additional context */
    employerProfile?: {
        companyName?: string;
        culture?: string[];
        industry?: string;
        size?: string;
    };
    /** Whether to include cultural fit analysis */
    includeCulturalFit?: boolean;
}
export interface ScreeningPrompt {
    system: string;
    user: string;
}
export declare function getScreeningPrompt(context: ResumeScreeningContext): ScreeningPrompt;
export declare function getBatchScreeningPrompt(resumes: Array<{
    id: string;
    text: string;
}>, jobCriteria: ResumeScreeningContext['jobCriteria']): ScreeningPrompt;
export declare function getRecommendationExplanationPrompt(candidateProfile: {
    name?: string;
    skills: string[];
    experienceYears: number;
    title?: string;
}, jobPosting: {
    title: string;
    requiredSkills: string[];
    description?: string;
    companyName?: string;
}, matchScore: number): ScreeningPrompt;
//# sourceMappingURL=resumeScreening.d.ts.map