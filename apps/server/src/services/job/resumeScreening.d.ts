/**
 * Resume Screening Service
 * AI简历筛选服务
 *
 * Provides LLM-based resume deep analysis:
 * - Implicit skill inference
 * - Experience relevance evaluation
 * - Cultural fit prediction
 * - Screening recommendation generation
 * - Ranking and scoring
 */
import { LLMProvider } from '../../services/ai/types';
export declare class LLMResponseParseError extends Error {
    readonly rawResponse: string;
    constructor(message: string, rawResponse: string);
}
export interface ResumeScreeningRequest {
    /** Resume text (raw or extracted) */
    resumeText: string;
    /** Job criteria for screening */
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
    /** Optional pre-extracted resume profile */
    resumeProfile?: {
        skills?: string[];
        experienceYears?: number;
        educationLevel?: string;
        currentTitle?: string;
        location?: string;
        languages?: string[];
    };
    /** Employer context for cultural fit */
    employerProfile?: {
        companyName?: string;
        culture?: string[];
        industry?: string;
        size?: string;
    };
    /** Provider override */
    provider?: LLMProvider;
}
export interface ScreeningDimensionResult {
    score: number;
    details: string;
}
export interface ScreeningDimension {
    explicitSkillsMatch: ScreeningDimensionResult;
    implicitSkillsInferred: {
        score: number;
        skills: string[];
        details: string;
    };
    experienceRelevance: ScreeningDimensionResult;
    educationFit: ScreeningDimensionResult;
    culturalFit?: ScreeningDimensionResult;
    salaryFit: ScreeningDimensionResult;
}
export interface ResumeScreeningResult {
    /** Overall screening score 0-100 */
    screeningScore: number;
    /** Screening recommendation */
    recommendation: 'STRONG_GO' | 'GO' | 'HOLD' | 'NO_GO';
    /** Dimension breakdown */
    dimensions: ScreeningDimension;
    /** Skills that match job requirements */
    matchedSkills: string[];
    /** Skills required but missing */
    missingSkills: string[];
    /** Skills inferred from experience */
    inferredSkills: string[];
    /** Concerns about the candidate */
    concerns: string[];
    /** Strengths of the candidate */
    strengths: string[];
    /** Overall screening notes */
    screeningNotes: string;
    /** Suggested follow-up questions */
    followUpQuestions: string[];
    /** LLM metadata */
    provider: LLMProvider;
    model: string;
    latencyMs: number;
}
export interface BatchScreeningRequest {
    resumes: Array<{
        id: string;
        text: string;
    }>;
    jobCriteria: ResumeScreeningRequest['jobCriteria'];
}
export interface BatchScreeningResult {
    results: Array<{
        resumeId: string;
        screeningScore: number;
        recommendation: 'STRONG_GO' | 'GO' | 'HOLD' | 'NO_GO';
        matchedSkills: string[];
        missingSkills: string[];
        concerns: string[];
        screeningNotes: string;
    }>;
    provider: LLMProvider;
    model: string;
    latencyMs: number;
}
export interface RecommendationExplanation {
    summary: string;
    matchingReasons: string[];
    skillAlignment: {
        matched: string[];
        gaps: string[];
    };
    careerFit: string;
    recommendedNextSteps: string[];
}
export interface RankedResume {
    resumeId: string;
    resumeText: string;
    result: ResumeScreeningResult;
}
export declare class ResumeScreeningService {
    /**
     * Screen a single resume against job criteria
     */
    screen(request: ResumeScreeningRequest): Promise<ResumeScreeningResult>;
    /**
     * Screen multiple resumes in batch (more efficient)
     */
    screenBatch(request: BatchScreeningRequest): Promise<BatchScreeningResult>;
    /**
     * Screen and rank multiple resumes
     */
    screenAndRank(resumes: Array<{
        id: string;
        text: string;
    }>, jobCriteria: ResumeScreeningRequest['jobCriteria'], employerProfile?: ResumeScreeningRequest['employerProfile']): Promise<RankedResume[]>;
    /**
     * Generate recommendation explanation
     */
    explainRecommendation(candidateProfile: {
        name?: string;
        skills: string[];
        experienceYears: number;
        title?: string;
    }, jobPosting: {
        title: string;
        requiredSkills: string[];
        description?: string;
        companyName?: string;
    }, matchScore: number): Promise<RecommendationExplanation>;
    private parseScreeningResult;
    private parseBatchResult;
    private parseExplanation;
    private detectProvider;
}
export declare const resumeScreeningService: ResumeScreeningService;
//# sourceMappingURL=resumeScreening.d.ts.map