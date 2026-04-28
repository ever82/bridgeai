/**
 * Job Recommendation Service
 *
 * Provides LLM-based job recommendation:
 * - Job recommendations for seekers
 * - Candidate recommendations for recruiters
 * - Recommendation explanations
 * - Feedback tracking and deduplication
 */

import { llmService } from '../../services/ai/llmService';
import { logger } from '../../utils/logger';
import {
  getJobRecommendationPrompt,
  getCandidateRecommendationPrompt,
  getRecommendationExplanationPrompt,
} from '../../ai/prompts/jobRecommendation';

import { LLMResponseParseError } from './resumeScreening';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeekerProfile {
  userId: string;
  skills: string[];
  experienceYears: number;
  educationLevel?: string;
  currentTitle?: string;
  location?: string;
  preferredSalary?: { min?: number; max?: number; currency?: string };
  preferredJobTypes?: string[];
  preferredLocations?: string[];
}

export interface JobSummary {
  jobId: string;
  title: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  salary?: { min?: number; max?: number; currency?: string };
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
  score: number; // 0-100
  reasons: string[];
  skillMatch: { matched: string[]; gaps: string[] };
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

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const feedbackStore: Map<string, RecommendationFeedback[]> = new Map();
const seenItemsStore: Map<string, Set<string>> = new Map();

// ---------------------------------------------------------------------------
// JobRecommendationService
// ---------------------------------------------------------------------------

export class JobRecommendationService {
  /**
   * Recommend jobs for a job seeker based on their profile.
   * Uses LLM to score and rank jobs, then paginates results.
   */
  async recommendJobsForSeeker(
    seekerProfile: SeekerProfile,
    jobs: JobSummary[],
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendations> {
    try {
      logger.info('Starting job recommendation for seeker', {
        userId: seekerProfile.userId,
        jobCount: jobs.length,
        page,
        pageSize,
      });

      if (jobs.length === 0) {
        return {
          recommendations: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      const prompt = getJobRecommendationPrompt(seekerProfile, jobs);

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const allRecommendations = this.parseRecommendations(response.text);

      // Sort by score descending
      allRecommendations.sort((a, b) => b.score - a.score);

      // Paginate
      const total = allRecommendations.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = allRecommendations.slice(start, end);

      logger.info('Job recommendation completed', {
        userId: seekerProfile.userId,
        total,
        returned: paginated.length,
      });

      return {
        recommendations: paginated,
        total,
        page,
        pageSize,
        hasMore: end < total,
      };
    } catch (error) {
      logger.error('Job recommendation failed', {
        userId: seekerProfile.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Recommend candidates for a job (recruiter side).
   * Uses LLM to score and rank candidates, then paginates results.
   */
  async recommendCandidatesForJob(
    jobCriteria: JobSummary,
    candidates: CandidateSummary[],
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendations> {
    try {
      logger.info('Starting candidate recommendation for job', {
        jobId: jobCriteria.jobId,
        candidateCount: candidates.length,
        page,
        pageSize,
      });

      if (candidates.length === 0) {
        return {
          recommendations: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      const prompt = getCandidateRecommendationPrompt(jobCriteria, candidates);

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const allRecommendations = this.parseRecommendations(response.text);

      // Sort by score descending
      allRecommendations.sort((a, b) => b.score - a.score);

      // Paginate
      const total = allRecommendations.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = allRecommendations.slice(start, end);

      logger.info('Candidate recommendation completed', {
        jobId: jobCriteria.jobId,
        total,
        returned: paginated.length,
      });

      return {
        recommendations: paginated,
        total,
        page,
        pageSize,
        hasMore: end < total,
      };
    } catch (error) {
      logger.error('Candidate recommendation failed', {
        jobId: jobCriteria.jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate LLM explanation for a recommendation.
   */
  async explainRecommendation(
    recommendation: Recommendation,
    _seekerProfile?: SeekerProfile,
    _job?: JobSummary
  ): Promise<{ summary: string; details: string; advice: string }> {
    try {
      logger.info('Generating recommendation explanation', {
        itemId: recommendation.itemId,
        score: recommendation.score,
      });

      const prompt = getRecommendationExplanationPrompt(recommendation);

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      return this.parseExplanation(response.text);
    } catch (error) {
      logger.error('Recommendation explanation failed', {
        itemId: recommendation.itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Record user feedback (like/dislike/ignore) on a recommendation.
   */
  async recordFeedback(feedback: RecommendationFeedback): Promise<void> {
    logger.info('Recording recommendation feedback', {
      userId: feedback.userId,
      itemId: feedback.itemId,
      action: feedback.action,
    });

    const existing = feedbackStore.get(feedback.userId) || [];
    existing.push(feedback);
    feedbackStore.set(feedback.userId, existing);
  }

  /**
   * Get feedback history for a user.
   */
  async getRecommendationHistory(userId: string): Promise<RecommendationFeedback[]> {
    return feedbackStore.get(userId) || [];
  }

  /**
   * Mark items as seen for dedup purposes.
   */
  async refreshRecommendations(userId: string, seenItemIds: string[]): Promise<void> {
    logger.info('Refreshing recommendations, marking seen items', {
      userId,
      seenCount: seenItemIds.length,
    });

    const existing = seenItemsStore.get(userId) || new Set<string>();
    for (const itemId of seenItemIds) {
      existing.add(itemId);
    }
    seenItemsStore.set(userId, existing);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseRecommendations(text: string): Recommendation[] {
    try {
      // Try array first, then object
      const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const data = JSON.parse(jsonMatch[0]);
      const items: unknown[] = Array.isArray(data) ? data : [data];

      return items.map((item: Record<string, unknown>) => ({
        itemId: String(item.itemId ?? ''),
        score: typeof item.score === 'number' ? item.score : 0,
        reasons: Array.isArray(item.reasons) ? item.reasons.map(String) : [],
        skillMatch: {
          matched: Array.isArray((item.skillMatch as Record<string, unknown>)?.matched)
            ? ((item.skillMatch as Record<string, unknown>).matched as unknown[]).map(String)
            : [],
          gaps: Array.isArray((item.skillMatch as Record<string, unknown>)?.gaps)
            ? ((item.skillMatch as Record<string, unknown>).gaps as unknown[]).map(String)
            : [],
        },
      }));
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Parse error';
      logger.warn('Failed to parse recommendation result', { error: parseError });
      throw new LLMResponseParseError(
        `Failed to parse recommendation result as valid JSON: ${parseError}`,
        text
      );
    }
  }

  private parseExplanation(text: string): { summary: string; details: string; advice: string } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const data = JSON.parse(jsonMatch[0]);

      return {
        summary: data.summary ?? '',
        details: data.details ?? '',
        advice: data.advice ?? '',
      };
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Parse error';
      logger.warn('Failed to parse explanation result', { error: parseError });
      throw new LLMResponseParseError(
        `Failed to parse explanation as valid JSON: ${parseError}`,
        text
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const jobRecommendationService = new JobRecommendationService();
