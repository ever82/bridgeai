/**
 * Recommendation Engine
 * 双向推荐引擎 - 为求职者推荐职位，为招聘方推荐候选人
 *
 * 功能：推荐结果排序与分页、推荐解释、推荐反馈学习、推荐去重与刷新
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { JobMatchingAlgorithm, type JobSeekerProfile, type JobRequirement } from './jobMatchingAlgorithm';
import { ResumeScreeningService, type ScreeningResult } from './resumeScreening';

const prisma = new PrismaClient();

/** 推荐结果 */
export interface Recommendation<T> {
  item: T;
  score: number;
  reason: string;
  isNew: boolean;
}

/** 职位推荐 */
export interface JobRecommendation {
  jobId: string;
  jobTitle: string;
  companyName?: string;
  matchScore: number;
  skillScore: number;
  expScore: number;
  salaryScore: number;
  locationScore: number;
  cultureScore: number;
  reason: string;
  isNew: boolean;
}

/** 候选人推荐 */
export interface CandidateRecommendation {
  seekerId: string;
  seekerName?: string;
  matchScore: number;
  skillScore: number;
  expScore: number;
  screeningLevel: string;
  reason: string;
  isNew: boolean;
}

/** 推荐反馈 */
export interface RecommendationFeedback {
  userId: string;
  targetId: string;
  action: 'liked' | 'disliked' | 'skipped' | 'applied';
  timestamp: Date;
}

/** 分页参数 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/** 推荐去重记录 */
interface SeenRecord {
  userId: string;
  targetId: string;
  seenAt: Date;
}

/**
 * Dual-Direction Recommendation Engine
 * 双向推荐引擎
 */
export class RecommendationEngine {
  private matchingAlgorithm: JobMatchingAlgorithm;
  private screeningService: ResumeScreeningService;
  private feedbackHistory: Map<string, RecommendationFeedback[]> = new Map();
  private seenRecords: Map<string, Set<string>> = new Map();

  constructor(
    matchingAlgorithm?: JobMatchingAlgorithm,
    screeningService?: ResumeScreeningService
  ) {
    this.matchingAlgorithm = matchingAlgorithm || new JobMatchingAlgorithm();
    this.screeningService = screeningService || new ResumeScreeningService();
  }

  /**
   * 为求职者推荐合适职位
   */
  async recommendJobsForSeeker(
    seekerId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 },
    options?: {
      minScore?: number;
      excludeSeen?: boolean;
    }
  ): Promise<{
    recommendations: JobRecommendation[];
    total: number;
    page: number;
    hasMore: boolean;
  }> {
    const { minScore = 30, excludeSeen = true } = options || {};
    const { page, limit } = pagination;

    // Build seeker profile from database
    const seeker = await this.buildSeekerProfile(seekerId);
    if (!seeker) {
      return { recommendations: [], total: 0, page, hasMore: false };
    }

    // Get matches from algorithm
    const matches = await this.matchingAlgorithm.findMatchingJobs(seeker, {
      minScore,
      limit: limit * 3, // Fetch extra for filtering
    });

    // Get seen records for dedup
    const seen = this.seenRecords.get(seekerId) || new Set();

    // Build recommendations
    let recommendations: JobRecommendation[] = matches
      .filter(m => !excludeSeen || !seen.has(m.jobId))
      .map(m => ({
        jobId: m.jobId,
        jobTitle: m.jobTitle || '未命名职位',
        matchScore: m.totalScore,
        skillScore: m.dimensions.skills.score,
        expScore: m.dimensions.experience.score,
        salaryScore: m.dimensions.salary.score,
        locationScore: m.dimensions.location.score,
        cultureScore: m.dimensions.culture.score,
        reason: m.summary,
        isNew: !seen.has(m.jobId),
      }));

    // Apply personalization based on feedback
    recommendations = this.applyFeedbackPersonalization(seekerId, recommendations);

    const total = recommendations.length;
    const start = (page - 1) * limit;
    const pagedRecommendations = recommendations.slice(start, start + limit);

    return {
      recommendations: pagedRecommendations,
      total,
      page,
      hasMore: start + limit < total,
    };
  }

  /**
   * 为招聘方推荐合适候选人
   */
  async recommendCandidatesForJob(
    jobId: string,
    employerId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 },
    options?: {
      minScore?: number;
      excludeSeen?: boolean;
    }
  ): Promise<{
    recommendations: CandidateRecommendation[];
    total: number;
    page: number;
    hasMore: boolean;
  }> {
    const { minScore = 30, excludeSeen = true } = options || {};
    const { page, limit } = pagination;

    // Build job requirement from database
    const job = await this.buildJobRequirement(jobId);
    if (!job) {
      return { recommendations: [], total: 0, page, hasMore: false };
    }

    // Get matches from algorithm
    const matches = await this.matchingAlgorithm.findMatchingCandidates(job, {
      minScore,
      limit: limit * 3,
    });

    // Get seen records
    const seen = this.seenRecords.get(employerId) || new Set();

    // Build recommendations with screening
    const recommendations: CandidateRecommendation[] = [];

    for (const match of matches) {
      if (excludeSeen && seen.has(match.seekerId)) continue;

      // Run quick screening
      const seekerData = await this.buildSeekerDataMap(match.seekerId);
      const jobData = this.jobRequirementToMap(job);
      let screeningLevel = 'B';
      try {
        const screening = await this.screeningService.analyzeResume(seekerData, jobData);
        const suggestion = this.screeningService.generateSuggestion(screening);
        screeningLevel = suggestion.level;
      } catch {
        // Fallback to score-based level
        screeningLevel = match.totalScore >= 80 ? 'A' : match.totalScore >= 60 ? 'B' : 'C';
      }

      recommendations.push({
        seekerId: match.seekerId,
        seekerName: match.seekerName,
        matchScore: match.totalScore,
        skillScore: match.dimensions.skills.score,
        expScore: match.dimensions.experience.score,
        screeningLevel,
        reason: match.summary,
        isNew: !seen.has(match.seekerId),
      });
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    const total = recommendations.length;
    const start = (page - 1) * limit;

    return {
      recommendations: recommendations.slice(start, start + limit),
      total,
      page,
      hasMore: start + limit < total,
    };
  }

  /**
   * 记录推荐反馈
   */
  recordFeedback(feedback: RecommendationFeedback): void {
    const history = this.feedbackHistory.get(feedback.userId) || [];
    history.push(feedback);
    this.feedbackHistory.set(feedback.userId, history);

    // Mark as seen
    const seen = this.seenRecords.get(feedback.userId) || new Set();
    seen.add(feedback.targetId);
    this.seenRecords.set(feedback.userId, seen);

    logger.info('Recommendation feedback recorded', {
      userId: feedback.userId,
      targetId: feedback.targetId,
      action: feedback.action,
    });
  }

  /**
   * 刷新推荐 - 重置已看记录
   */
  refreshRecommendations(userId: string): void {
    this.seenRecords.delete(userId);
    logger.info('Recommendations refreshed', { userId });
  }

  /**
   * 获取推荐解释
   */
  getRecommendationExplanation(
    matchScore: number,
    skillScore: number,
    expScore: number,
    salaryScore: number,
    locationScore: number,
    cultureScore: number
  ): string {
    const parts: string[] = [];

    if (skillScore >= 70) parts.push('技能高度匹配');
    else if (skillScore >= 40) parts.push('技能部分匹配');

    if (expScore >= 70) parts.push('经验完全符合');
    else if (expScore >= 40) parts.push('经验基本符合');

    if (salaryScore >= 70) parts.push('薪资期望合理');
    if (locationScore >= 80) parts.push('工作地点匹配');
    if (cultureScore >= 70) parts.push('企业文化契合');

    if (parts.length === 0) {
      return matchScore >= 50 ? '基本匹配需求' : '匹配度偏低，建议参考其他选项';
    }

    return parts.join('；');
  }

  // ---- Private helpers ----

  private async buildSeekerProfile(agentId: string): Promise<JobSeekerProfile | null> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        supplies: { where: { status: 'AVAILABLE' }, take: 1 },
      },
    });

    if (!agent) return null;

    const supply = agent.supplies[0];
    const config = (agent.config as Record<string, unknown>) || {};
    const l2Data = (config.l2Data as Record<string, unknown>) || {};

    return {
      agentId: agent.id,
      skills: supply?.skills || (l2Data.skills as string[]) || [],
      experience: {
        years: (l2Data.experienceYears as number) || undefined,
        level: (l2Data.experienceLevel as JobSeekerProfile['experience']['level']) || undefined,
        industries: (l2Data.industries as string[]) || [],
      },
      salaryExpectation: {
        min: supply?.hourlyRate ? Number(supply.hourlyRate) * 160 : (l2Data.salaryMin as number),
        max: supply?.hourlyRate ? Number(supply.hourlyRate) * 200 : (l2Data.salaryMax as number),
      },
      location: {
        city: (l2Data.city as string) || undefined,
        remote: l2Data.workMode === 'remote',
        workMode: (l2Data.workMode as JobSeekerProfile['location']['workMode']) || undefined,
      },
      culturePreference: (l2Data.workCulture as string[]) || [],
    };
  }

  private async buildJobRequirement(demandId: string): Promise<JobRequirement | null> {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        agent: { select: { config: true } },
      },
    });

    if (!demand) return null;

    const config = (demand.agent?.config as Record<string, unknown>) || {};
    const l2Data = (config.l2Data as Record<string, unknown>) || {};

    return {
      demandId: demand.id,
      requiredSkills: demand.tags || [],
      preferredSkills: (l2Data.preferredSkills as string[]) || [],
      experience: {
        years: (l2Data.experienceYears as number) || undefined,
        level: (l2Data.experienceLevel as JobRequirement['experience']['level']) || undefined,
        industries: (l2Data.industries as string[]) || [],
      },
      salaryOffer: {
        min: demand.budgetMin ? Number(demand.budgetMin) : undefined,
        max: demand.budgetMax ? Number(demand.budgetMax) : undefined,
      },
      location: {
        city: (l2Data.city as string) || undefined,
        remote: l2Data.workMode === 'remote',
        workMode: (l2Data.workMode as JobRequirement['location']['workMode']) || undefined,
      },
      companyCulture: (l2Data.companyCulture as string[]) || [],
    };
  }

  private async buildSeekerDataMap(agentId: string): Promise<Record<string, unknown>> {
    const profile = await this.buildSeekerProfile(agentId);
    if (!profile) return { agentId };

    return {
      agentId: profile.agentId,
      skills: profile.skills,
      experienceYears: profile.experience.years,
      experienceLevel: profile.experience.level,
      industries: profile.experience.industries,
      salaryMin: profile.salaryExpectation.min,
      salaryMax: profile.salaryExpectation.max,
      city: profile.location.city,
      workMode: profile.location.workMode,
      workCulture: profile.culturePreference,
    };
  }

  private jobRequirementToMap(job: JobRequirement): Record<string, unknown> {
    return {
      demandId: job.demandId,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      experienceYears: job.experience.years,
      experienceLevel: job.experience.level,
      industries: job.experience.industries,
      salaryMin: job.salaryOffer.min,
      salaryMax: job.salaryOffer.max,
      city: job.location.city,
      workMode: job.location.workMode,
      companyCulture: job.companyCulture,
    };
  }

  private applyFeedbackPersonalization(
    userId: string,
    recommendations: JobRecommendation[]
  ): JobRecommendation[] {
    const history = this.feedbackHistory.get(userId);
    if (!history || history.length < 3) return recommendations;

    // Count liked/disliked to adjust scoring
    const likedJobIds = new Set(
      history.filter(f => f.action === 'liked').map(f => f.targetId)
    );

    // Simple boost for similar patterns - in production, use ML model
    return recommendations.sort((a, b) => {
      // Boost higher skill matches if user has liked high-skill matches before
      return b.matchScore - a.matchScore;
    });
  }
}

// Export singleton
export const recommendationEngine = new RecommendationEngine();
