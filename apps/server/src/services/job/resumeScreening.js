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
import { logger } from '../../utils/logger';
import { getScreeningPrompt, getBatchScreeningPrompt, getRecommendationExplanationPrompt, } from '../../ai/prompts/resumeScreening';
// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------
export class LLMResponseParseError extends Error {
    rawResponse;
    constructor(message, rawResponse) {
        super(message);
        this.name = 'LLMResponseParseError';
        this.rawResponse = rawResponse;
    }
}
// ---------------------------------------------------------------------------
// ResumeScreeningService
// ---------------------------------------------------------------------------
export class ResumeScreeningService {
    /**
     * Screen a single resume against job criteria
     */
    async screen(request) {
        const startTime = Date.now();
        const context = {
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
        }
        catch (error) {
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
    async screenBatch(request) {
        const startTime = Date.now();
        try {
            logger.info('Starting batch resume screening', {
                count: request.resumes.length,
                title: request.jobCriteria.title,
            });
            const prompt = getBatchScreeningPrompt(request.resumes, request.jobCriteria);
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
        }
        catch (error) {
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
    async screenAndRank(resumes, jobCriteria, employerProfile) {
        // For small batches, screen individually for richer results
        if (resumes.length <= 5) {
            const results = await Promise.all(resumes.map(async (resume) => ({
                resumeId: resume.id,
                resumeText: resume.text,
                result: await this.screen({
                    resumeText: resume.text,
                    jobCriteria,
                    employerProfile,
                }),
            })));
            return results.sort((a, b) => b.result.screeningScore - a.result.screeningScore);
        }
        // For larger batches, use batch screening
        const batchResult = await this.screenBatch({ resumes, jobCriteria });
        return resumes
            .map((resume, i) => ({
            resumeId: resume.id,
            resumeText: resume.text,
            result: {
                screeningScore: batchResult.results[i]?.screeningScore ?? 0,
                recommendation: batchResult.results[i]?.recommendation ?? 'NO_GO',
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
            },
        }))
            .sort((a, b) => b.result.screeningScore - a.result.screeningScore);
    }
    /**
     * Generate recommendation explanation
     */
    async explainRecommendation(candidateProfile, jobPosting, matchScore) {
        try {
            const prompt = getRecommendationExplanationPrompt(candidateProfile, jobPosting, matchScore);
            const response = await llmService.generateText(prompt.user, {
                temperature: 0.4,
                maxTokens: 1500,
            });
            return this.parseExplanation(response.text);
        }
        catch (error) {
            logger.error('Recommendation explanation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    parseScreeningResult(text) {
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
        }
        catch (error) {
            const parseError = error instanceof Error ? error.message : 'Parse error';
            logger.warn('Failed to parse screening result', { error: parseError });
            throw new LLMResponseParseError(`Failed to parse screening result as valid JSON: ${parseError}`, text);
        }
    }
    parseBatchResult(text, resumes) {
        try {
            const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (!jsonMatch) {
                throw new Error('No JSON found in batch response');
            }
            const data = JSON.parse(jsonMatch[0]);
            const results = Array.isArray(data) ? data : [data];
            return results.map((r) => ({
                resumeId: r.resumeId ?? resumes[results.indexOf(r)]?.id ?? 'unknown',
                screeningScore: r.screeningScore ?? 0,
                recommendation: r.recommendation ?? 'HOLD',
                matchedSkills: r.matchedSkills ?? [],
                missingSkills: r.missingSkills ?? [],
                concerns: r.concerns ?? [],
                screeningNotes: r.screeningNotes ?? '',
            }));
        }
        catch (error) {
            const parseError = error instanceof Error ? error.message : 'Parse error';
            logger.warn('Failed to parse batch result', { error: parseError });
            throw new LLMResponseParseError(`Failed to parse batch result as valid JSON: ${parseError}`, text);
        }
    }
    parseExplanation(text) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found');
            }
            return JSON.parse(jsonMatch[0]);
        }
        catch (error) {
            const parseError = error instanceof Error ? error.message : 'Parse error';
            logger.warn('Failed to parse explanation result', { error: parseError });
            throw new LLMResponseParseError(`Failed to parse explanation as valid JSON: ${parseError}`, text);
        }
    }
    detectProvider(model) {
        if (model.includes('claude'))
            return 'claude';
        if (model.includes('ernie') || model.includes('wenxin'))
            return 'wenxin';
        return 'openai';
    }
}
// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------
export const resumeScreeningService = new ResumeScreeningService();
//# sourceMappingURL=resumeScreening.js.map