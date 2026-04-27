/**
 * Match Algorithm
 * 匹配算法核心实现 - 委托给 resumeMatcher 多维度评分
 */

import type { ResumeProfile, JobCriteria } from '../matching/resumeMatcher';
import { matchResumeToJob } from '../matching/resumeMatcher';

export interface MatchConfig {
  enableMachineLearning?: boolean;
  weightFactors?: {
    compatibility?: number;
    distance?: number;
    activity?: number;
    verification?: number;
  };
  minMatchScore?: number;
  maxResultsPerQuery?: number;
}

export class MatchScoringModel {
  constructor(_config?: Partial<MatchConfig>, _version?: string) {
    // Initialize with config and version if needed
  }

  /**
   * 计算匹配分数 (0-1)
   * 委托给 resumeMatcher 多维度评分算法，结果转换为 0-1 范围
   */
  async calculateScore(params: {
    userA: Record<string, unknown>;
    userB: Record<string, unknown>;
    config?: Partial<MatchConfig>;
  }): Promise<number> {
    // 尝试从 userA/userB 提取 ResumeProfile 和 JobCriteria
    const resume = params.userA as unknown as Partial<ResumeProfile>;
    const job = params.userB as unknown as Partial<JobCriteria>;

    if (resume?.skills && job?.skills && job?.salary) {
      // 使用 resumeMatcher 核心算法
      const result = matchResumeToJob(resume as ResumeProfile, job as JobCriteria);
      return result.totalScore / 100;
    }

    // 回退到默认分数
    return 0.5;
  }

  async getCompatibilityFactors(_userId: string): Promise<Record<string, number>> {
    return Promise.resolve({});
  }
}

export interface MatchResult {
  score: number;
  factors: Record<string, number>;
  recommendations: string[];
}

export interface MatchRecommendation {
  targetUserId: string;
  score: number;
  reasons: string[];
}
