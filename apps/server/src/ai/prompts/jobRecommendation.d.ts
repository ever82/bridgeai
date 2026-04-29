/**
 * Job Recommendation Prompts
 *
 * Provides prompt templates for LLM-based job recommendation engine:
 * - Job-to-seeker matching
 * - Candidate-to-job matching (recruiter side)
 * - Recommendation explanation generation
 */
export interface SeekerProfile {
    userId: string;
    skills: string[];
    experienceYears: number;
    educationLevel?: string;
    currentTitle?: string;
    location?: string;
    preferredSalary?: {
        min?: number;
        max?: number;
        currency?: string;
    };
    preferredJobTypes?: string[];
    preferredLocations?: string[];
}
export interface JobSummary {
    jobId: string;
    title: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    salary?: {
        min?: number;
        max?: number;
        currency?: string;
    };
    location?: string;
    isRemote?: boolean;
    companyName?: string;
    description?: string;
}
export interface CandidateSummary {
    userId: string;
    name?: string;
    skills: string[];
    experienceYears: number;
    educationLevel?: string;
    currentTitle?: string;
    location?: string;
}
export interface RecommendationPrompt {
    system: string;
    user: string;
}
export interface Recommendation {
    itemId: string;
    score: number;
    reasons: string[];
    skillMatch: {
        matched: string[];
        gaps: string[];
    };
}
export declare function getJobRecommendationPrompt(seekerProfile: SeekerProfile, jobs: JobSummary[]): RecommendationPrompt;
export declare function getCandidateRecommendationPrompt(jobCriteria: JobSummary, candidates: CandidateSummary[]): RecommendationPrompt;
export declare function getRecommendationExplanationPrompt(recommendation: {
    itemId: string;
    score: number;
    reasons: string[];
    skillMatch: {
        matched: string[];
        gaps: string[];
    };
}): RecommendationPrompt;
//# sourceMappingURL=jobRecommendation.d.ts.map