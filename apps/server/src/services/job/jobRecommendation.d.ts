/**
 * Job Recommendation Service
 *
 * Provides LLM-based job recommendation:
 * - Job recommendations for seekers
 * - Candidate recommendations for recruiters
 * - Recommendation explanations
 * - Feedback tracking and deduplication
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
export interface Recommendation {
    itemId: string;
    score: number;
    reasons: string[];
    skillMatch: {
        matched: string[];
        gaps: string[];
    };
}
export interface PaginatedRecommendations {
    recommendations: Recommendation[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export interface RecommendationFeedback {
    userId: string;
    recommendationId: string;
    itemId: string;
    action: 'like' | 'dislike' | 'ignore';
    timestamp: Date;
}
export declare class JobRecommendationService {
    /**
     * Recommend jobs for a job seeker based on their profile.
     * Uses LLM to score and rank jobs, then paginates results.
     */
    recommendJobsForSeeker(seekerProfile: SeekerProfile, jobs: JobSummary[], page?: number, pageSize?: number): Promise<PaginatedRecommendations>;
    /**
     * Recommend candidates for a job (recruiter side).
     * Uses LLM to score and rank candidates, then paginates results.
     */
    recommendCandidatesForJob(jobCriteria: JobSummary, candidates: CandidateSummary[], page?: number, pageSize?: number): Promise<PaginatedRecommendations>;
    /**
     * Generate LLM explanation for a recommendation.
     */
    explainRecommendation(recommendation: Recommendation, _seekerProfile?: SeekerProfile, _job?: JobSummary): Promise<{
        summary: string;
        details: string;
        advice: string;
    }>;
    /**
     * Record user feedback (like/dislike/ignore) on a recommendation.
     */
    recordFeedback(feedback: RecommendationFeedback): Promise<void>;
    /**
     * Get feedback history for a user.
     */
    getRecommendationHistory(userId: string): Promise<RecommendationFeedback[]>;
    /**
     * Mark items as seen for dedup purposes.
     */
    refreshRecommendations(userId: string, seenItemIds: string[]): Promise<void>;
    private parseRecommendations;
    private parseExplanation;
}
export declare const jobRecommendationService: JobRecommendationService;
//# sourceMappingURL=jobRecommendation.d.ts.map