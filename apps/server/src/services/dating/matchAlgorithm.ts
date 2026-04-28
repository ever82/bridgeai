/**
 * Dating Match Algorithm
 * 约会匹配算法 - 多维度相似度计算、权重配置、综合匹配度评分
 */

import type { DatingProfile } from '@bridgeai/shared';
import {
  calculateDatingSimilarity,
  type SimilarityWeights,
  type DimensionScore,
} from '@bridgeai/shared';

import { logger } from '../../utils/logger';

// ============================================
// 匹配算法配置
// ============================================

export interface MatchAlgorithmConfig {
  minMatchScore: number; // 最低匹配阈值 (0-100)
  maxDailyRecommendations: number; // 每日最大推荐数
  diversityThreshold: number; // 推荐多样性阈值（0-1），越高越要求多样性
  weights: SimilarityWeights;
}

const DEFAULT_CONFIG: MatchAlgorithmConfig = {
  minMatchScore: 40,
  maxDailyRecommendations: 5,
  diversityThreshold: 0.3,
  weights: {
    basicConditions: 0.2,
    personality: 0.2,
    interests: 0.15,
    lifestyle: 0.15,
    expectations: 0.15,
    complementary: 0.1,
    geoProximity: 0.05,
  },
};

// ============================================
// 匹配结果类型
// ============================================

export interface MatchScore {
  profileId: string;
  agentId: string;
  totalScore: number; // 0-100
  dimensions: DimensionScore[];
  highlights: string[];
  warnings: string[];
}

export interface MatchResult {
  sourceProfileId: string;
  matches: MatchScore[];
  generatedAt: string;
  config: MatchAlgorithmConfig;
}

// ============================================
// 匹配算法核心
// ============================================

/**
 * 计算单个目标用户的匹配分数
 */
export function calculateMatchScore(
  sourceProfile: DatingProfile,
  targetProfile: DatingProfile,
  weights?: Partial<SimilarityWeights>
): MatchScore {
  const result = calculateDatingSimilarity(sourceProfile, targetProfile, weights);

  return {
    profileId: targetProfile.id,
    agentId: targetProfile.agentId,
    totalScore: result.totalScore,
    dimensions: result.dimensions,
    highlights: result.highlights,
    warnings: result.warnings,
  };
}

/**
 * 批量计算匹配分数并排序
 */
export function rankMatches(
  sourceProfile: DatingProfile,
  candidateProfiles: DatingProfile[],
  config: Partial<MatchAlgorithmConfig> = {}
): MatchScore[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const scores = candidateProfiles
    .map(candidate => calculateMatchScore(sourceProfile, candidate, cfg.weights))
    .filter(score => score.totalScore >= cfg.minMatchScore)
    .sort((a, b) => b.totalScore - a.totalScore);

  logger.info(
    `Ranked ${scores.length} matches from ${candidateProfiles.length} candidates (minScore=${cfg.minMatchScore})`
  );

  return scores;
}

/**
 * 生成每日推荐候选（含多样性保证）
 */
export function generateDailyRecommendations(
  sourceProfile: DatingProfile,
  candidateProfiles: DatingProfile[],
  config: Partial<MatchAlgorithmConfig> = {}
): MatchScore[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 先按匹配分数排序
  const ranked = rankMatches(sourceProfile, candidateProfiles, cfg);

  if (ranked.length <= cfg.maxDailyRecommendations) {
    return ranked;
  }

  // 多样性采样：确保推荐列表不全是一类人
  const selected: MatchScore[] = [];
  const remaining = [...ranked];

  // 先取最高分的
  selected.push(remaining.shift()!);

  while (selected.length < cfg.maxDailyRecommendations && remaining.length > 0) {
    let bestIdx = 0;
    let bestDiversity = -1;

    for (let i = 0; i < remaining.length; i++) {
      const diversityScore = calculateDiversityScore(selected, remaining[i]);
      if (diversityScore > bestDiversity) {
        bestDiversity = diversityScore;
        bestIdx = i;
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  // 最终按分数排序输出
  return selected.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * 计算候选人与已选列表的多样性
 */
function calculateDiversityScore(selected: MatchScore[], candidate: MatchScore): number {
  if (selected.length === 0) return 1;

  // 基于维度分数计算平均差异
  const avgDiff =
    selected.reduce((sum, s) => {
      const diff = Math.abs(s.totalScore - candidate.totalScore);
      return sum + diff;
    }, 0) / selected.length;

  // 高亮信息差异
  const existingHighlights = new Set(selected.flatMap(s => s.highlights));
  const newHighlights = candidate.highlights.filter(h => !existingHighlights.has(h));
  const highlightDiversity = newHighlights.length / Math.max(candidate.highlights.length, 1);

  return avgDiff * 0.5 + highlightDiversity * 50;
}

/**
 * 获取匹配维度的详细分析（用于展示）
 */
export function getMatchAnalysis(match: MatchScore): {
  topStrengths: string[];
  topWeaknesses: string[];
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const sortedDims = [...match.dimensions].sort((a, b) => b.score - a.score);

  const topStrengths = sortedDims
    .filter(d => d.score >= 70)
    .flatMap(d => d.details)
    .slice(0, 3);

  const topWeaknesses = sortedDims
    .filter(d => d.score < 50)
    .map(d => `${d.dimension}: ${Math.round(d.score)}分`)
    .slice(0, 3);

  let overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  if (match.totalScore >= 80) overallRating = 'excellent';
  else if (match.totalScore >= 60) overallRating = 'good';
  else if (match.totalScore >= 40) overallRating = 'fair';
  else overallRating = 'poor';

  return { topStrengths, topWeaknesses, overallRating };
}

export default {
  calculateMatchScore,
  rankMatches,
  generateDailyRecommendations,
  getMatchAnalysis,
};
