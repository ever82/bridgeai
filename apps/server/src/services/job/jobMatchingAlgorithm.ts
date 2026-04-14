/**
 * Job Matching Algorithm
 * 职位匹配度核心算法 - 多维度综合评分
 *
 * 实现技能匹配(关键词+语义相似度)、经验评估(年限/行业/职级)、
 * 薪资匹配度计算、地域与工作方式兼容性评估、综合匹配度评分(0-100分)
 * 权重可配置
 */

import { prisma } from '../../db/client';
import {
  calculateSkillScore,
  calculateExperienceScore,
  calculateSalaryScore,
  calculateLocationScore,
  calculateCultureScore,
  DEFAULT_WEIGHTS,
  type MatchWeights,
  type SalaryRange,
  type ExperienceInfo,
  type LocationInfo,
  type CompositeMatchResult,
  type DimensionScore,
} from './matchScoring';
import { logger } from '../../utils/logger';

/** 求职者画像数据 */
export interface JobSeekerProfile {
  agentId: string;
  skills: string[];
  experience: ExperienceInfo;
  salaryExpectation: SalaryRange;
  location: LocationInfo;
  culturePreference: string[];
  selfIntroduction?: string;
  l2Data?: Record<string, unknown>;
}

/** 职位需求数据 */
export interface JobRequirement {
  demandId: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experience: ExperienceInfo;
  salaryOffer: SalaryRange;
  location: LocationInfo;
  companyCulture: string[];
  description?: string;
}

/** 单次匹配结果 */
export interface JobMatchResult extends CompositeMatchResult {
  seekerId: string;
  jobId: string;
  seekerName?: string;
  jobTitle?: string;
  matchTimestamp: Date;
}

/**
 * Job Matching Algorithm
 * 综合多维度匹配度计算
 */
export class JobMatchingAlgorithm {
  private weights: MatchWeights;

  constructor(weights?: Partial<MatchWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    // Normalize weights to sum to 1
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const factor = 1 / total;
      (Object.keys(this.weights) as Array<keyof MatchWeights>).forEach(k => {
        this.weights[k] *= factor;
      });
    }
  }

  /**
   * 计算单个求职者与单个职位的匹配度
   */
  calculateMatch(seeker: JobSeekerProfile, job: JobRequirement): JobMatchResult {
    const skillsScore = calculateSkillScore(seeker.skills, job.requiredSkills, job.preferredSkills);
    const expScore = calculateExperienceScore(seeker.experience, job.experience);
    const salaryScore = calculateSalaryScore(seeker.salaryExpectation, job.salaryOffer);
    const locationScore = calculateLocationScore(seeker.location, job.location);
    const cultureScore = calculateCultureScore(seeker.culturePreference, job.companyCulture);

    // Apply weights
    const dimensions = {
      skills: this.applyWeight(skillsScore, this.weights.skills),
      experience: this.applyWeight(expScore, this.weights.experience),
      salary: this.applyWeight(salaryScore, this.weights.salary),
      location: this.applyWeight(locationScore, this.weights.location),
      culture: this.applyWeight(cultureScore, this.weights.culture),
    };

    const totalScore = Math.round(
      dimensions.skills.weightedScore +
      dimensions.experience.weightedScore +
      dimensions.salary.weightedScore +
      dimensions.location.weightedScore +
      dimensions.culture.weightedScore
    );

    const summary = this.generateSummary(totalScore, dimensions);

    return {
      seekerId: seeker.agentId,
      jobId: job.demandId,
      totalScore: Math.min(100, Math.max(0, totalScore)),
      dimensions,
      summary,
      matchTimestamp: new Date(),
    };
  }

  /**
   * 批量匹配 - 为求职者找合适职位
   */
  async findMatchingJobs(
    seeker: JobSeekerProfile,
    options?: {
      minScore?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<JobMatchResult[]> {
    const { minScore = 0, limit = 20 } = options || {};

    // Fetch active job demands for AgentJob type
    const demands = await prisma.demand.findMany({
      where: {
        status: 'OPEN',
        agent: { type: 'AGENTJOB' },
      },
      include: {
        agent: { select: { id: true, name: true, config: true } },
      },
    });

    const results: JobMatchResult[] = [];

    for (const demand of demands) {
      // Skip seeker's own demands
      if (demand.agentId === seeker.agentId) continue;

      const jobReq = this.demandToJobRequirement(demand);
      const match = this.calculateMatch(seeker, jobReq);

      if (match.totalScore >= minScore) {
        match.jobTitle = demand.title;
        results.push(match);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.totalScore - a.totalScore);

    return results.slice(0, limit);
  }

  /**
   * 批量匹配 - 为职位找合适候选人
   */
  async findMatchingCandidates(
    job: JobRequirement,
    options?: {
      minScore?: number;
      limit?: number;
    }
  ): Promise<JobMatchResult[]> {
    const { minScore = 0, limit = 20 } = options || {};

    // Fetch active supplies with skills for AgentJob type
    const supplies = await prisma.supply.findMany({
      where: {
        status: 'AVAILABLE',
        agent: { type: 'AGENTJOB' },
      },
      include: {
        agent: { select: { id: true, name: true, config: true } },
      },
    });

    const results: JobMatchResult[] = [];

    for (const supply of supplies) {
      if (supply.agentId === job.demandId) continue;

      const seeker = this.supplyToSeekerProfile(supply);
      const match = this.calculateMatch(seeker, job);

      if (match.totalScore >= minScore) {
        match.seekerName = supply.agent?.name;
        results.push(match);
      }
    }

    results.sort((a, b) => b.totalScore - a.totalScore);
    return results.slice(0, limit);
  }

  /**
   * Save match result to database
   */
  async saveMatchResult(match: JobMatchResult): Promise<string> {
    const record = await prisma.match.upsert({
      where: {
        demandId_supplyId: {
          demandId: match.jobId,
          supplyId: match.seekerId,
        },
      },
      create: {
        demandId: match.jobId,
        supplyId: match.seekerId,
        score: match.totalScore,
        status: 'PENDING',
        metadata: {
          dimensions: {
            skills: match.dimensions.skills.score,
            experience: match.dimensions.experience.score,
            salary: match.dimensions.salary.score,
            location: match.dimensions.location.score,
            culture: match.dimensions.culture.score,
          },
          summary: match.summary,
          algorithm: 'JobMatchingAlgorithm',
          version: '1.0.0',
        },
      },
      update: {
        score: match.totalScore,
        metadata: {
          dimensions: {
            skills: match.dimensions.skills.score,
            experience: match.dimensions.experience.score,
            salary: match.dimensions.salary.score,
            location: match.dimensions.location.score,
            culture: match.dimensions.culture.score,
          },
          summary: match.summary,
          algorithm: 'JobMatchingAlgorithm',
          version: '1.0.0',
        },
      },
    });

    logger.info('Match result saved', {
      matchId: record.id,
      score: match.totalScore,
    });

    return record.id;
  }

  /**
   * Get configurable weights
   */
  getWeights(): MatchWeights {
    return { ...this.weights };
  }

  /**
   * Update weights
   */
  setWeights(weights: Partial<MatchWeights>): void {
    this.weights = { ...this.weights, ...weights };
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const factor = 1 / total;
      (Object.keys(this.weights) as Array<keyof MatchWeights>).forEach(k => {
        this.weights[k] *= factor;
      });
    }
  }

  // ---- Private helpers ----

  private applyWeight(score: DimensionScore, weight: number): DimensionScore {
    return {
      ...score,
      weight,
      weightedScore: score.score * weight,
    };
  }

  private generateSummary(totalScore: number, dimensions: Record<string, DimensionScore>): string {
    const parts: string[] = [];

    if (dimensions.skills.score >= 70) {
      parts.push('技能高度匹配');
    } else if (dimensions.skills.score >= 40) {
      parts.push('技能部分匹配');
    }

    if (dimensions.experience.score >= 70) {
      parts.push('经验符合要求');
    }

    if (dimensions.salary.score >= 70) {
      parts.push('薪资期望相符');
    } else if (dimensions.salary.score < 30) {
      parts.push('薪资差距较大');
    }

    if (dimensions.location.score >= 80) {
      parts.push('地域/工作方式匹配');
    }

    if (parts.length === 0) {
      return totalScore >= 50 ? '基本匹配' : '匹配度较低';
    }

    return parts.join('，');
  }

  private demandToJobRequirement(demand: {
    id: string;
    title: string;
    description?: string | null;
    tags: string[];
    budgetMin?: unknown;
    budgetMax?: unknown;
    latitude?: number | null;
    longitude?: number | null;
    agent?: { config?: unknown } | null;
  }): JobRequirement {
    const config = (demand.agent?.config as Record<string, unknown>) || {};
    const l2Data = (config.l2Data as Record<string, unknown>) || {};

    return {
      demandId: demand.id,
      requiredSkills: demand.tags || [],
      preferredSkills: (l2Data.preferredSkills as string[]) || [],
      experience: {
        years: (l2Data.experienceYears as number) || undefined,
        level: (l2Data.experienceLevel as ExperienceInfo['level']) || undefined,
        industries: (l2Data.industries as string[]) || [],
      },
      salaryOffer: {
        min: demand.budgetMin ? Number(demand.budgetMin) : undefined,
        max: demand.budgetMax ? Number(demand.budgetMax) : undefined,
      },
      location: {
        city: (l2Data.city as string) || undefined,
        remote: (l2Data.workMode === 'remote') as boolean,
        workMode: (l2Data.workMode as LocationInfo['workMode']) || undefined,
      },
      companyCulture: (l2Data.companyCulture as string[]) || [],
      description: demand.description || undefined,
    };
  }

  private supplyToSeekerProfile(supply: {
    id: string;
    agentId: string;
    title: string;
    description?: string | null;
    skills: string[];
    hourlyRate?: unknown;
    agent?: { id: string; name?: string; config?: unknown } | null;
  }): JobSeekerProfile {
    const config = (supply.agent?.config as Record<string, unknown>) || {};
    const l2Data = (config.l2Data as Record<string, unknown>) || {};

    return {
      agentId: supply.agentId,
      skills: supply.skills || [],
      experience: {
        years: (l2Data.experienceYears as number) || undefined,
        level: (l2Data.experienceLevel as ExperienceInfo['level']) || undefined,
        industries: (l2Data.industries as string[]) || [],
      },
      salaryExpectation: {
        min: supply.hourlyRate ? Number(supply.hourlyRate) * 160 : undefined, // hourly * 160 = monthly
        max: supply.hourlyRate ? Number(supply.hourlyRate) * 200 : undefined,
      },
      location: {
        city: (l2Data.city as string) || undefined,
        remote: (l2Data.workMode === 'remote') as boolean,
        workMode: (l2Data.workMode as LocationInfo['workMode']) || undefined,
      },
      culturePreference: (l2Data.workCulture as string[]) || [],
      selfIntroduction: supply.description || undefined,
      l2Data,
    };
  }
}

// Export singleton with default weights
export const jobMatchingAlgorithm = new JobMatchingAlgorithm();
