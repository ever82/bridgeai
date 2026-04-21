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

import { llmService } from '../../services/ai/llmService';
import { LLMProvider } from '../../services/ai/types';
import { logger } from '../../utils/logger';
import {
  getScreeningPrompt,
  getBatchScreeningPrompt,
  getRecommendationExplanationPrompt,
  ResumeScreeningContext,
} from '../../ai/prompts/resumeScreening';

// ---------------------------------------------------------------------------
// Input/Output types
// ---------------------------------------------------------------------------

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
    salary?: { min?: number; max?: number; currency?: string };
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
  score: number;     // 0-100
  details: string;
}

export interface ScreeningDimension {
  explicitSkillsMatch: ScreeningDimensionResult;
  implicitSkillsInferred: { score: number; skills: string[]; details: string };
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
  resumes: Array<{ id: string; text: string }>;
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

// ---------------------------------------------------------------------------
// ResumeScreeningService
// ---------------------------------------------------------------------------

export class ResumeScreeningService {
  /**
   * Screen a single resume against job criteria
   */
  async screen(
    request: ResumeScreeningRequest,
  ): Promise<ResumeScreeningResult> {
    const startTime = Date.now();
    const context: ResumeScreeningContext = {
      resumeText: request.resumeText,
      resumeProfile: request.resumeProfile,
      jobCriteria: request.jobCriteria,
      employerProfile: request.employerProfile,
      includeCulturalFit: !!request.employerProfile,
    };

    try {
      logger.info('Starting resume screening', {
        title: request.jobCriteria.title,
        resumeLength: request.resumeText.length,
      });

      const prompt = getScreeningPrompt(context);

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.2,
        maxTokens: 3000,
        provider: request.provider,
      });

      const parsed = this.parseScreeningResult(response.text);

      const latencyMs = Date.now() - startTime;

      logger.info('Resume screening completed', {
        resumeId: 'screening',
        score: parsed.screeningScore,
        recommendation: parsed.recommendation,
        latencyMs,
      });

      return {
        ...parsed,
        provider: this.detectProvider(response.model),
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Resume screening failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      });
      throw error;
    }
  }

  /**
   * Screen multiple resumes in batch (more efficient)
   */
  async screenBatch(
    request: BatchScreeningRequest,
  ): Promise<BatchScreeningResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting batch resume screening', {
        count: request.resumes.length,
        title: request.jobCriteria.title,
      });

      const prompt = getBatchScreeningPrompt(
        request.resumes,
        request.jobCriteria,
      );

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.2,
        maxTokens: 3000 + request.resumes.length * 500,
      });

      const parsed = this.parseBatchResult(response.text, request.resumes);

      const latencyMs = Date.now() - startTime;

      logger.info('Batch screening completed', {
        count: request.resumes.length,
        latencyMs,
      });

      return {
        results: parsed,
        provider: this.detectProvider(response.model),
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Batch screening failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      });
      throw error;
    }
  }

  /**
   * Screen and rank multiple resumes
   */
  async screenAndRank(
    resumes: Array<{ id: string; text: string }>,
    jobCriteria: ResumeScreeningRequest['jobCriteria'],
    employerProfile?: ResumeScreeningRequest['employerProfile'],
  ): Promise<RankedResume[]> {
    // For small batches, screen individually for richer results
    if (resumes.length <= 5) {
      const results = await Promise.all(
        resumes.map(async (resume) => ({
          resumeId: resume.id,
          resumeText: resume.text,
          result: await this.screen({
            resumeText: resume.text,
            jobCriteria,
            employerProfile,
          }),
        })),
      );

      return results.sort(
        (a, b) => b.result.screeningScore - a.result.screeningScore,
      );
    }

    // For larger batches, use batch screening
    const batchResult = await this.screenBatch({ resumes, jobCriteria });

    return resumes
      .map((resume, i) => ({
        resumeId: resume.id,
        resumeText: resume.text,
        result: {
          screeningScore: batchResult.results[i]?.screeningScore ?? 0,
          recommendation:
            batchResult.results[i]?.recommendation ?? 'NO_GO',
          dimensions: {
            explicitSkillsMatch: { score: 0, details: '' },
            implicitSkillsInferred: { score: 0, skills: [], details: '' },
            experienceRelevance: { score: 0, details: '' },
            educationFit: { score: 0, details: '' },
            culturalFit: { score: 0, details: '' },
            salaryFit: { score: 0, details: '' },
          },
          matchedSkills: batchResult.results[i]?.matchedSkills ?? [],
          missingSkills: batchResult.results[i]?.missingSkills ?? [],
          inferredSkills: [],
          concerns: batchResult.results[i]?.concerns ?? [],
          strengths: [],
          screeningNotes: batchResult.results[i]?.screeningNotes ?? '',
          followUpQuestions: [],
          provider: batchResult.provider,
          model: batchResult.model,
          latencyMs: batchResult.latencyMs,
        } as ResumeScreeningResult,
      }))
      .sort((a, b) => b.result.screeningScore - a.result.screeningScore);
  }

  /**
   * Generate recommendation explanation
   */
  async explainRecommendation(
    candidateProfile: {
      name?: string;
      skills: string[];
      experienceYears: number;
      title?: string;
    },
    jobPosting: {
      title: string;
      requiredSkills: string[];
      description?: string;
      companyName?: string;
    },
    matchScore: number,
  ): Promise<RecommendationExplanation> {
    try {
      const prompt = getRecommendationExplanationPrompt(
        candidateProfile,
        jobPosting,
        matchScore,
      );

      const response = await llmService.generateText(prompt.user, {
        temperature: 0.4,
        maxTokens: 1500,
      });

      return this.parseExplanation(response.text);
    } catch (error) {
      logger.error('Recommendation explanation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseScreeningResult(text: string): Omit<ResumeScreeningResult, 'provider' | 'model' | 'latencyMs'> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const data = JSON.parse(jsonMatch[0]);

      return {
        screeningScore: data.screeningScore ?? 0,
        recommendation: data.recommendation ?? 'HOLD',
        dimensions: {
          explicitSkillsMatch: data.dimensions?.explicitSkillsMatch ?? { score: 0, details: '' },
          implicitSkillsInferred: {
            score: data.dimensions?.implicitSkillsInferred?.score ?? 0,
            skills: data.dimensions?.implicitSkillsInferred?.skills ?? [],
            details: data.dimensions?.implicitSkillsInferred?.details ?? '',
          },
          experienceRelevance: data.dimensions?.experienceRelevance ?? { score: 0, details: '' },
          educationFit: data.dimensions?.educationFit ?? { score: 0, details: '' },
          culturalFit: data.dimensions?.culturalFit,
          salaryFit: data.dimensions?.salaryFit ?? { score: 0, details: '' },
        },
        matchedSkills: data.matchedSkills ?? [],
        missingSkills: data.missingSkills ?? [],
        inferredSkills: data.dimensions?.implicitSkillsInferred?.skills ?? [],
        concerns: data.concerns ?? [],
        strengths: data.strengths ?? [],
        screeningNotes: data.screeningNotes ?? '',
        followUpQuestions: data.followUpQuestions ?? [],
      };
    } catch (error) {
      logger.warn('Failed to parse screening result, using fallback', {
        error: error instanceof Error ? error.message : 'Parse error',
      });
      return {
        screeningScore: 50,
        recommendation: 'HOLD',
        dimensions: {
          explicitSkillsMatch: { score: 50, details: 'Parse error, manual review needed' },
          implicitSkillsInferred: { score: 50, skills: [], details: '' },
          experienceRelevance: { score: 50, details: '' },
          educationFit: { score: 50, details: '' },
          culturalFit: { score: 50, details: '' },
          salaryFit: { score: 50, details: '' },
        },
        matchedSkills: [],
        missingSkills: [],
        inferredSkills: [],
        concerns: ['Failed to parse LLM response'],
        strengths: [],
        screeningNotes: text.substring(0, 500),
        followUpQuestions: [],
      };
    }
  }

  private parseBatchResult(
    text: string,
    resumes: Array<{ id: string }>,
  ): BatchScreeningResult['results'] {
    try {
      const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (!jsonMatch) {
        throw new Error('No JSON found in batch response');
      }
      const data = JSON.parse(jsonMatch[0]);
      const results = Array.isArray(data) ? data : [data];

      return results.map((r: Record<string, unknown>) => ({
        resumeId: r.resumeId ?? resumes[results.indexOf(r)]?.id ?? 'unknown',
        screeningScore: r.screeningScore ?? 0,
        recommendation: r.recommendation ?? 'HOLD',
        matchedSkills: r.matchedSkills ?? [],
        missingSkills: r.missingSkills ?? [],
        concerns: r.concerns ?? [],
        screeningNotes: r.screeningNotes ?? '',
      }));
    } catch {
      logger.warn('Failed to parse batch result');
      return resumes.map((r) => ({
        resumeId: r.id,
        screeningScore: 50,
        recommendation: 'HOLD' as const,
        matchedSkills: [] as string[],
        missingSkills: [] as string[],
        concerns: ['Parse error'] as string[],
        screeningNotes: '' as string,
      }));
    }
  }

  private parseExplanation(text: string): RecommendationExplanation {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        summary: text.substring(0, 300),
        matchingReasons: [],
        skillAlignment: { matched: [], gaps: [] },
        careerFit: '',
        recommendedNextSteps: [],
      };
    }
  }

  private detectProvider(model: string): LLMProvider {
    if (model.includes('claude')) return 'claude';
    if (model.includes('ernie') || model.includes('wenxin')) return 'wenxin';
    return 'openai';
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const resumeScreeningService = new ResumeScreeningService();
