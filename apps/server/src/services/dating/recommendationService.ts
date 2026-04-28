/**
 * Dating Recommendation Service
 * 约会推荐服务 - 每日候选池生成、自动筛选、排序、过滤、多样性保证
 */

import type { DatingProfile } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

import {
  generateDailyRecommendations,
  type MatchScore,
  type MatchAlgorithmConfig,
} from './matchAlgorithm';

// ============================================
// 类型定义
// ============================================

export interface RecommendationCandidate {
  profile: DatingProfile;
  matchScore: MatchScore;
}

export interface DailyRecommendationResult {
  userId: string;
  agentId: string;
  recommendations: RecommendationCandidate[];
  generatedAt: string;
  poolSize: number;
  filteredSize: number;
}

export interface UserFeedbackRecord {
  targetProfileId: string;
  action: 'like' | 'skip' | 'block';
  reason?: string;
  createdAt: string;
}

export interface RecommendationFilter {
  excludeProfileIds?: string[]; // 已匹配/已拒绝/黑名单
  excludeAgentIds?: string[]; // 特定agent排除
  minScore?: number; // 最低匹配分数
  maxResults?: number; // 最大结果数
  onlyActive?: boolean; // 仅活跃用户
  onlyComplete?: boolean; // 仅完善资料
}

// ============================================
// 内存存储
// ============================================

const feedbackStore = new Map<string, UserFeedbackRecord[]>();
const dailyRecommendationCache = new Map<
  string,
  { result: DailyRecommendationResult; expiresAt: number }
>();

// ============================================
// 候选池生成
// ============================================

/**
 * 获取所有可推荐的活跃约会画像
 */
async function fetchActiveCandidateProfiles(
  excludeAgentIds: string[] = []
): Promise<DatingProfile[]> {
  const profiles = await prisma.datingProfile.findMany({
    where: {
      isActive: true,
      isComplete: true,
      agentId: { notIn: excludeAgentIds },
    },
    include: {
      agent: {
        select: { id: true, userId: true, isActive: true },
      },
    },
  });

  // 过滤掉不活跃 agent 的资料并映射为 DatingProfile
  return profiles.filter(p => p.agent?.isActive).map(p => mapPrismaToProfile(p));
}

/**
 * 从 Prisma 记录映射为 DatingProfile
 */
function mapPrismaToProfile(p: any): DatingProfile {
  return {
    id: p.id,
    agentId: p.agentId,
    userId: p.userId,
    basicConditions: (p.basicConditions as any) ?? undefined,
    personality: (p.personality as any) ?? undefined,
    interests: (p.interests as any) ?? undefined,
    lifestyle: (p.lifestyle as any) ?? undefined,
    expectations: (p.expectations as any) ?? undefined,
    description: p.description ?? undefined,
    aiExtractedData: (p.aiExtractedData as any) ?? undefined,
    aiExtractionConfidence: p.aiExtractionConfidence ?? undefined,
    privacySettings: (p.privacySettings as any) ?? {
      profileVisibility: 'PUBLIC',
      fieldVisibility: {},
    },
    completenessScore: p.completenessScore ?? undefined,
    qualityScore: p.qualityScore ?? undefined,
    isActive: p.isActive,
    isComplete: p.isComplete,
    createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: p.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// ============================================
// 过滤逻辑
// ============================================

/**
 * 获取需要排除的用户列表（已匹配、已拒绝、黑名单）
 */
function getExcludedProfileIds(userId: string): string[] {
  const feedbacks = feedbackStore.get(userId) ?? [];
  const excluded = new Set<string>();

  for (const f of feedbacks) {
    if (f.action === 'skip' || f.action === 'block') {
      excluded.add(f.targetProfileId);
    }
  }

  return [...excluded];
}

/**
 * 获取需要排除的 agentId 列表
 */
function getExcludedAgentIds(agentId: string): string[] {
  // 排除自己
  return [agentId];
}

/**
 * 应用过滤条件
 */
function applyFilters(candidates: DatingProfile[], filter: RecommendationFilter): DatingProfile[] {
  let filtered = candidates;

  if (filter.excludeProfileIds && filter.excludeProfileIds.length > 0) {
    const excludeSet = new Set(filter.excludeProfileIds);
    filtered = filtered.filter(p => !excludeSet.has(p.id));
  }

  if (filter.excludeAgentIds && filter.excludeAgentIds.length > 0) {
    const excludeSet = new Set(filter.excludeAgentIds);
    filtered = filtered.filter(p => !excludeSet.has(p.agentId));
  }

  if (filter.onlyActive) {
    filtered = filtered.filter(p => p.isActive);
  }

  if (filter.onlyComplete) {
    filtered = filtered.filter(p => p.isComplete);
  }

  return filtered;
}

// ============================================
// 核心推荐逻辑
// ============================================

/**
 * 生成每日推荐
 */
export async function generateRecommendations(
  userId: string,
  agentId: string,
  config: Partial<MatchAlgorithmConfig> = {},
  filter?: Partial<RecommendationFilter>
): Promise<DailyRecommendationResult> {
  // 检查缓存
  const cacheKey = `${userId}:${agentId}`;
  const cached = dailyRecommendationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.info(`Returning cached recommendations for user ${userId}`);
    return cached.result;
  }

  // 获取用户资料
  const profile = await prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!profile) {
    throw new Error(`Dating profile not found for agent ${agentId}`);
  }

  const sourceProfile = mapPrismaToProfile(profile);

  // 构建排除列表
  const excludedProfileIds = getExcludedProfileIds(userId);
  const excludedAgentIds = getExcludedAgentIds(agentId);

  const recommendationFilter: RecommendationFilter = {
    excludeProfileIds: [...excludedProfileIds, ...(filter?.excludeProfileIds ?? [])],
    excludeAgentIds: [...excludedAgentIds, ...(filter?.excludeAgentIds ?? [])],
    minScore: filter?.minScore ?? config.minMatchScore,
    maxResults: filter?.maxResults ?? config.maxDailyRecommendations,
    onlyActive: filter?.onlyActive ?? true,
    onlyComplete: filter?.onlyComplete ?? true,
  };

  // 获取候选池
  const allCandidates = await fetchActiveCandidateProfiles(recommendationFilter.excludeAgentIds);
  const poolSize = allCandidates.length;

  // 过滤
  const filteredCandidates = applyFilters(allCandidates, recommendationFilter);
  const filteredSize = filteredCandidates.length;

  logger.info(
    `Generating recommendations: pool=${poolSize}, filtered=${filteredSize}, max=${recommendationFilter.maxResults}`
  );

  // 处理无候选的情况
  if (filteredCandidates.length === 0) {
    const result: DailyRecommendationResult = {
      userId,
      agentId,
      recommendations: [],
      generatedAt: new Date().toISOString(),
      poolSize,
      filteredSize: 0,
    };
    return result;
  }

  // 使用匹配算法生成推荐
  const matchScores = generateDailyRecommendations(sourceProfile, filteredCandidates, {
    ...config,
    maxDailyRecommendations: recommendationFilter.maxResults ?? 5,
  });

  // 构建推荐结果
  const recommendations: RecommendationCandidate[] = matchScores.map(ms => {
    const candidate = filteredCandidates.find(c => c.id === ms.profileId)!;
    return { profile: candidate, matchScore: ms };
  });

  const result: DailyRecommendationResult = {
    userId,
    agentId,
    recommendations,
    generatedAt: new Date().toISOString(),
    poolSize,
    filteredSize,
  };

  // 缓存24小时
  dailyRecommendationCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return result;
}

/**
 * 记录用户反馈（用于过滤后续推荐）
 */
export function recordFeedback(userId: string, feedback: UserFeedbackRecord): void {
  const existing = feedbackStore.get(userId) ?? [];
  existing.push(feedback);
  feedbackStore.set(userId, existing);

  // 如果是 skip/block，使缓存失效以便下次重新生成
  if (feedback.action === 'skip' || feedback.action === 'block') {
    invalidateCache(userId);
  }

  logger.info(
    `Recorded feedback: userId=${userId}, action=${feedback.action}, target=${feedback.targetProfileId}`
  );
}

/**
 * 获取用户的反馈历史
 */
export function getUserFeedbackHistory(userId: string): UserFeedbackRecord[] {
  return feedbackStore.get(userId) ?? [];
}

/**
 * 使推荐缓存失效
 */
export function invalidateCache(userId?: string): void {
  if (userId) {
    for (const key of dailyRecommendationCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        dailyRecommendationCache.delete(key);
      }
    }
  } else {
    dailyRecommendationCache.clear();
  }
}

/**
 * 获取单个用户的推荐刷新状态
 */
export function getRecommendationStatus(
  userId: string,
  agentId: string
): {
  hasCachedRecommendations: boolean;
  cacheExpiresAt?: string;
  feedbackCount: number;
} {
  const cacheKey = `${userId}:${agentId}`;
  const cached = dailyRecommendationCache.get(cacheKey);

  return {
    hasCachedRecommendations: !!cached && cached.expiresAt > Date.now(),
    cacheExpiresAt: cached ? new Date(cached.expiresAt).toISOString() : undefined,
    feedbackCount: (feedbackStore.get(userId) ?? []).length,
  };
}

export default {
  generateRecommendations,
  recordFeedback,
  getUserFeedbackHistory,
  invalidateCache,
  getRecommendationStatus,
};
