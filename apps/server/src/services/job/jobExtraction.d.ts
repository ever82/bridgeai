/**
 * Job Extraction Service
 *
 * AI-powered service for extracting structured job information from natural language.
 * This is a stub implementation that will be connected to the AI extraction service (ISSUE-AI003a)
 * when it becomes available.
 */
import { type JobDescription, type JobPosting } from '@bridgeai/shared';
export interface ExtractionResult {
    structuredData: JobDescription;
    extractedSkills: string[];
    skillMatchScore: number;
    competitivenessScore: number;
    suggestions: string[];
    qualityScore: number;
}
export interface JobExtractionOptions {
    includeCompetitivenessAnalysis?: boolean;
    includeSalarySuggestion?: boolean;
    targetIndustry?: string;
}
/**
 * Extract structured job information from natural language description
 *
 * TODO: Connect to AI003a extraction service when available
 * Currently returns a mock extraction for development/testing
 */
export declare function extractJobFromDescription(description: string, options?: JobExtractionOptions): Promise<ExtractionResult>;
/**
 * Evaluate job posting quality
 */
export declare function evaluateJobQuality(jobData: Partial<JobPosting>): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    missingFields: string[];
}>;
/**
 * Analyze competitiveness against similar jobs
 * TODO: Connect to AI003a when available
 */
export declare function analyzeCompetitiveness(jobData: Partial<JobPosting>, similarJobs?: Partial<JobPosting>[]): Promise<{
    score: number;
    marketPosition: 'high' | 'medium' | 'low';
    insights: string[];
}>;
/**
 * Generate job description from structured data
 */
export declare function generateJobDescription(structuredData: Partial<JobDescription>, tone?: 'professional' | 'casual' | 'enthusiastic'): Promise<string>;
//# sourceMappingURL=jobExtraction.d.ts.map