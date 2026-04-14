/**
 * Resume Screening Service
 * 基于LLM的简历智能筛选服务
 *
 * 功能：简历深度分析、隐含技能推断、经验相关性评估、
 *       文化匹配度预测、筛选建议生成、排序与排名算法
 */

import { logger } from '../../utils/logger';
import { LLMService } from '../ai/llmService';
import {
  RESUME_ANALYSIS_PROMPT,
  SCREENING_SUGGESTION_PROMPT,
  RANKING_PROMPT,
} from '../../ai/prompts/resumeScreening';

/** 筛选结果 */
export interface ScreeningResult {
  seekerId: string;
  jobId: string;
  overallAssessment: string;
  skillMatch: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    implicitSkills: string[];
    analysis: string;
  };
  experienceRelevance: {
    score: number;
    relevantExperience: string[];
    growthPotential: string;
    analysis: string;
  };
  cultureFit: {
    score: number;
    alignmentPoints: string[];
    concerns: string[];
    analysis: string;
  };
  screeningRecommendation: {
    decision: string;
    confidence: number;
    keyStrengths: string[];
    concerns: string[];
    interviewFocus: string[];
    salaryExpectation: string;
  };
}

/** 推荐等级 */
export type RecommendationLevel = 'A' | 'B' | 'C' | 'D';

/** 筛选建议 */
export interface ScreeningSuggestion {
  level: RecommendationLevel;
  reasons: string[];
  interviewTips: string;
  salaryAdvice: string;
  riskNotes: string[];
}

/** 排名结果 */
export interface RankingResult {
  candidateId: string;
  rank: number;
  reason: string;
  screeningResult?: ScreeningResult;
}

/**
 * Resume Screening Service
 * AI驱动的简历筛选
 */
export class ResumeScreeningService {
  private llmService: LLMService | null = null;

  constructor() {
    this.initializeLLM();
  }

  private initializeLLM(): void {
    try {
      const config = {
        openai: process.env.OPENAI_API_KEY ? {
          apiKey: process.env.OPENAI_API_KEY,
        } : undefined,
        claude: process.env.CLAUDE_API_KEY ? {
          apiKey: process.env.CLAUDE_API_KEY,
        } : undefined,
      };

      if (config.openai || config.claude) {
        this.llmService = new LLMService(config);
      }
    } catch (error) {
      logger.warn('LLM service not available for screening, using fallback', { error });
    }
  }

  /**
   * 深度分析简历与职位匹配度
   */
  async analyzeResume(
    seekerData: Record<string, unknown>,
    jobData: Record<string, unknown>
  ): Promise<ScreeningResult> {
    const seekerId = (seekerData.agentId as string) || 'unknown';
    const jobId = (jobData.demandId as string) || 'unknown';

    if (this.llmService) {
      try {
        return await this.llmAnalyzeResume(seekerData, jobData);
      } catch (error) {
        logger.error('LLM screening failed, using rule-based fallback', { error });
      }
    }

    // Fallback: rule-based analysis
    return this.ruleBasedAnalysis(seekerData, jobData);
  }

  /**
   * 批量筛选 - 对候选人进行排序和排名
   */
  async rankCandidates(
    candidates: ScreeningResult[],
    jobData: Record<string, unknown>
  ): Promise<RankingResult[]> {
    if (this.llmService && candidates.length > 1) {
      try {
        return await this.llmRankCandidates(candidates, jobData);
      } catch (error) {
        logger.error('LLM ranking failed, using score-based fallback', { error });
      }
    }

    // Fallback: sort by composite score
    return candidates
      .map((c, idx) => ({
        candidateId: c.seekerId,
        rank: 0,
        reason: `综合评分: ${this.calculateCompositeScreeningScore(c)}`,
        screeningResult: c,
      }))
      .sort((a, b) => {
        const scoreA = a.screeningResult ? this.calculateCompositeScreeningScore(a.screeningResult) : 0;
        const scoreB = b.screeningResult ? this.calculateCompositeScreeningScore(b.screeningResult) : 0;
        return scoreB - scoreA;
      })
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }

  /**
   * 生成筛选建议
   */
  generateSuggestion(screeningResult: ScreeningResult): ScreeningSuggestion {
    const compositeScore = this.calculateCompositeScreeningScore(screeningResult);

    let level: RecommendationLevel;
    if (compositeScore >= 80) level = 'A';
    else if (compositeScore >= 60) level = 'B';
    else if (compositeScore >= 40) level = 'C';
    else level = 'D';

    const reasons: string[] = [];
    if (screeningResult.skillMatch.score >= 70) {
      reasons.push(`技能匹配度高(${screeningResult.skillMatch.score}分)`);
    }
    if (screeningResult.experienceRelevance.score >= 70) {
      reasons.push(`经验相关性强(${screeningResult.experienceRelevance.score}分)`);
    }
    if (screeningResult.cultureFit.score >= 70) {
      reasons.push(`文化契合度好(${screeningResult.cultureFit.score}分)`);
    }

    const interviewTips = screeningResult.screeningRecommendation.interviewFocus.join('、')
      || '建议按标准面试流程进行';

    const salaryAdvice = screeningResult.screeningRecommendation.salaryExpectation;

    const riskNotes = screeningResult.screeningRecommendation.concerns.length > 0
      ? screeningResult.screeningRecommendation.concerns
      : ['无明显风险'];

    return { level, reasons, interviewTips, salaryAdvice, riskNotes };
  }

  // ---- Private methods ----

  private async llmAnalyzeResume(
    seekerData: Record<string, unknown>,
    jobData: Record<string, unknown>
  ): Promise<ScreeningResult> {
    const prompt = RESUME_ANALYSIS_PROMPT
      .replace('{seekerProfile}', JSON.stringify(seekerData, null, 2))
      .replace('{jobRequirement}', JSON.stringify(jobData, null, 2));

    const response = await this.llmService!.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(this.extractJSON(content));
      return this.normalizeScreeningResult(parsed, seekerData, jobData);
    } catch {
      logger.warn('Failed to parse LLM screening response, using fallback');
      return this.ruleBasedAnalysis(seekerData, jobData);
    }
  }

  private async llmRankCandidates(
    candidates: ScreeningResult[],
    jobData: Record<string, unknown>
  ): Promise<RankingResult[]> {
    const candidatesList = candidates.map((c, idx) => ({
      id: c.seekerId,
      index: idx + 1,
      skillScore: c.skillMatch.score,
      expScore: c.experienceRelevance.score,
      cultureScore: c.cultureFit.score,
      recommendation: c.screeningRecommendation.decision,
    }));

    const prompt = RANKING_PROMPT
      .replace('{jobInfo}', JSON.stringify(jobData, null, 2))
      .replace('{candidatesList}', JSON.stringify(candidatesList, null, 2));

    const response = await this.llmService!.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(this.extractJSON(content));
      const rankings = parsed.rankings || [];

      return rankings.map((r: { candidateId: string; rank: number; reason: string }) => {
        const screeningResult = candidates.find(c => c.seekerId === r.candidateId);
        return {
          candidateId: r.candidateId,
          rank: r.rank,
          reason: r.reason,
          screeningResult,
        };
      });
    } catch {
      return candidates.map((c, idx) => ({
        candidateId: c.seekerId,
        rank: idx + 1,
        reason: `Score: ${this.calculateCompositeScreeningScore(c)}`,
        screeningResult: c,
      }));
    }
  }

  private ruleBasedAnalysis(
    seekerData: Record<string, unknown>,
    jobData: Record<string, unknown>
  ): ScreeningResult {
    const seekerSkills = (seekerData.skills as string[]) || [];
    const jobSkills = (jobData.requiredSkills as string[]) || [];
    const seekerExpYears = (seekerData.experienceYears as number) || 0;
    const jobExpYears = (jobData.experienceYears as number) || 0;

    // Skill matching
    const normalize = (s: string) => s.toLowerCase().trim();
    const normalizedSeeker = new Set(seekerSkills.map(normalize));
    const matchedSkills = jobSkills.filter(s => normalizedSeeker.has(normalize(s)));
    const missingSkills = jobSkills.filter(s => !normalizedSeeker.has(normalize(s)));

    // Implicit skill inference from experience
    const implicitSkills: string[] = [];
    const skillAliases: Record<string, string[]> = {
      'react': ['javascript', 'typescript', 'html', 'css'],
      'python': ['django', 'flask', 'data analysis'],
      'java': ['spring', 'maven', 'gradle'],
      'node.js': ['javascript', 'typescript', 'npm'],
    };
    for (const skill of seekerSkills) {
      const aliases = skillAliases[normalize(skill)];
      if (aliases) {
        for (const alias of aliases) {
          if (!normalizedSeeker.has(alias) && jobSkills.some(js => normalize(js) === alias)) {
            implicitSkills.push(alias);
          }
        }
      }
    }

    const skillScore = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50;

    // Experience relevance
    const expScore = jobExpYears > 0
      ? Math.min(100, Math.round((seekerExpYears / jobExpYears) * 70))
      : 50;

    // Culture fit (simplified)
    const seekerCulture = (seekerData.workCulture as string[]) || [];
    const jobCulture = (jobData.companyCulture as string[]) || [];
    const cultureOverlap = jobCulture.length > 0
      ? jobCulture.filter(c => seekerCulture.map(normalize).includes(normalize(c))).length / jobCulture.length
      : 0.5;
    const cultureScore = Math.round(cultureOverlap * 100);

    const seekerId = (seekerData.agentId as string) || 'unknown';
    const jobId = (jobData.demandId as string) || 'unknown';

    return {
      seekerId,
      jobId,
      overallAssessment: `技能匹配${skillScore}分，经验相关${expScore}分，文化契合${cultureScore}分`,
      skillMatch: {
        score: skillScore,
        matchedSkills,
        missingSkills,
        implicitSkills,
        analysis: `匹配${matchedSkills.length}项核心技能，缺少${missingSkills.length}项`,
      },
      experienceRelevance: {
        score: expScore,
        relevantExperience: seekerExpYears > 0 ? [`${seekerExpYears}年相关经验`] : [],
        growthPotential: seekerExpYears >= jobExpYears * 0.8 ? '良好' : '需要培养',
        analysis: seekerExpYears >= jobExpYears ? '经验充足' : '经验略有不足',
      },
      cultureFit: {
        score: cultureScore,
        alignmentPoints: seekerCulture.filter(c => jobCulture.map(normalize).includes(normalize(c))),
        concerns: [],
        analysis: cultureScore >= 60 ? '文化较为契合' : '文化匹配需要进一步评估',
      },
      screeningRecommendation: {
        decision: skillScore >= 60 ? '推荐' : skillScore >= 40 ? '可考虑' : '不推荐',
        confidence: Math.round((skillScore + expScore + cultureScore) / 3),
        keyStrengths: matchedSkills.length > 0 ? [`${matchedSkills.join('、')}技能匹配`] : ['待评估'],
        concerns: missingSkills.length > 0 ? [`缺少${missingSkills.join('、')}技能`] : [],
        interviewFocus: missingSkills.length > 0 ? missingSkills.slice(0, 3) : ['综合能力评估'],
        salaryExpectation: '需结合市场行情评估',
      },
    };
  }

  private calculateCompositeScreeningScore(result: ScreeningResult): number {
    return Math.round(
      result.skillMatch.score * 0.35 +
      result.experienceRelevance.score * 0.30 +
      result.cultureFit.score * 0.20 +
      result.screeningRecommendation.confidence * 0.15
    );
  }

  private normalizeScreeningResult(
    parsed: Record<string, unknown>,
    seekerData: Record<string, unknown>,
    jobData: Record<string, unknown>
  ): ScreeningResult {
    return {
      seekerId: (seekerData.agentId as string) || 'unknown',
      jobId: (jobData.demandId as string) || 'unknown',
      overallAssessment: (parsed.overallAssessment as string) || '',
      skillMatch: {
        score: ((parsed.skillMatch as Record<string, unknown>)?.score as number) || 50,
        matchedSkills: ((parsed.skillMatch as Record<string, unknown>)?.matchedSkills as string[]) || [],
        missingSkills: ((parsed.skillMatch as Record<string, unknown>)?.missingSkills as string[]) || [],
        implicitSkills: ((parsed.skillMatch as Record<string, unknown>)?.implicitSkills as string[]) || [],
        analysis: ((parsed.skillMatch as Record<string, unknown>)?.analysis as string) || '',
      },
      experienceRelevance: {
        score: ((parsed.experienceRelevance as Record<string, unknown>)?.score as number) || 50,
        relevantExperience: ((parsed.experienceRelevance as Record<string, unknown>)?.relevantExperience as string[]) || [],
        growthPotential: ((parsed.experienceRelevance as Record<string, unknown>)?.growthPotential as string) || '',
        analysis: ((parsed.experienceRelevance as Record<string, unknown>)?.analysis as string) || '',
      },
      cultureFit: {
        score: ((parsed.cultureFit as Record<string, unknown>)?.score as number) || 50,
        alignmentPoints: ((parsed.cultureFit as Record<string, unknown>)?.alignmentPoints as string[]) || [],
        concerns: ((parsed.cultureFit as Record<string, unknown>)?.concerns as string[]) || [],
        analysis: ((parsed.cultureFit as Record<string, unknown>)?.analysis as string) || '',
      },
      screeningRecommendation: {
        decision: ((parsed.screeningRecommendation as Record<string, unknown>)?.decision as string) || '可考虑',
        confidence: ((parsed.screeningRecommendation as Record<string, unknown>)?.confidence as number) || 50,
        keyStrengths: ((parsed.screeningRecommendation as Record<string, unknown>)?.keyStrengths as string[]) || [],
        concerns: ((parsed.screeningRecommendation as Record<string, unknown>)?.concerns as string[]) || [],
        interviewFocus: ((parsed.screeningRecommendation as Record<string, unknown>)?.interviewFocus as string[]) || [],
        salaryExpectation: ((parsed.screeningRecommendation as Record<string, unknown>)?.salaryExpectation as string) || '',
      },
    };
  }

  private extractJSON(text: string): string {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[1] || jsonMatch[0] : '{}';
  }
}

// Export singleton
export const resumeScreeningService = new ResumeScreeningService();
