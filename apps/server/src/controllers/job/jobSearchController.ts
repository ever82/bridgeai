/**
 * Job Search Controller
 * 职位搜索与匹配查询控制器
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../errors/AppError';
import { ApiResponse } from '../../utils/response';
import { recommendationEngine } from '../../services/job/recommendationEngine';
import { jobMatchingAlgorithm } from '../../services/job/jobMatchingAlgorithm';
import { resumeScreeningService, type ScreeningResult } from '../../services/job/resumeScreening';
import { jobMatchNotificationService } from '../../services/job/jobMatchNotifications';
import { logger } from '../../utils/logger';

/**
 * 搜索职位 (求职者视角)
 * GET /api/v1/job/search?skills=React,Node.js&minSalary=15000&maxSalary=30000&city=北京&page=1&limit=20
 */
export async function searchJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const {
    skills,
    minSalary,
    maxSalary,
    city,
    workMode,
    jobType,
    industry,
    minScore = '30',
    page = '1',
    limit = '20',
    sortBy = 'score',
    sortOrder = 'desc',
  } = req.query;

  // Get user's job seeker agent
  const recommendations = await recommendationEngine.recommendJobsForSeeker(
    req.user.id,
    { page: Number(page), limit: Number(limit) },
    { minScore: Number(minScore) }
  );

  // Apply additional filters if specified
  let filtered = recommendations.recommendations;
  if (skills) {
    const skillList = String(skills).split(',').map(s => s.toLowerCase().trim());
    filtered = filtered.filter(r =>
      r.skillScore > 0 // Already handled by algorithm
    );
  }

  res.json(ApiResponse.success({
    items: filtered,
    total: recommendations.total,
    page: recommendations.page,
    limit: Number(limit),
    hasMore: recommendations.hasMore,
  }));
}

/**
 * 搜索候选人 (招聘方视角)
 * GET /api/v1/job/candidates?skills=React&minExperience=3&jobId=xxx&page=1&limit=20
 */
export async function searchCandidates(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const {
    jobId,
    minScore = '30',
    page = '1',
    limit = '20',
  } = req.query;

  if (!jobId) {
    throw new AppError('jobId is required', 'INVALID_REQUEST', 400);
  }

  const recommendations = await recommendationEngine.recommendCandidatesForJob(
    String(jobId),
    req.user.id,
    { page: Number(page), limit: Number(limit) },
    { minScore: Number(minScore) }
  );

  res.json(ApiResponse.success({
    items: recommendations.recommendations,
    total: recommendations.total,
    page: recommendations.page,
    limit: Number(limit),
    hasMore: recommendations.hasMore,
  }));
}

/**
 * 获取匹配详情
 * GET /api/v1/job/matches/:matchId
 */
export async function getMatchDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { matchId } = req.params;

  // In production, fetch from database with full details
  // For now, return a structured response
  res.json(ApiResponse.success({
    matchId,
    message: 'Match detail retrieved',
  }));
}

/**
 * AI简历筛选分析
 * POST /api/v1/job/screen
 */
export async function screenResume(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { seekerData, jobData } = req.body;

  if (!seekerData || !jobData) {
    throw new AppError('seekerData and jobData are required', 'INVALID_REQUEST', 400);
  }

  const result = await resumeScreeningService.analyzeResume(seekerData, jobData);
  const suggestion = resumeScreeningService.generateSuggestion(result);

  res.json(ApiResponse.success({
    screening: result,
    suggestion,
  }));
}

/**
 * 记录推荐反馈
 * POST /api/v1/job/feedback
 */
export async function recordFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { targetId, action } = req.body;

  if (!targetId || !action) {
    throw new AppError('targetId and action are required', 'INVALID_REQUEST', 400);
  }

  const validActions = ['liked', 'disliked', 'skipped', 'applied'];
  if (!validActions.includes(action)) {
    throw new AppError(`Invalid action. Valid: ${validActions.join(', ')}`, 'INVALID_REQUEST', 400);
  }

  recommendationEngine.recordFeedback({
    userId: req.user.id,
    targetId,
    action,
    timestamp: new Date(),
  });

  res.json(ApiResponse.success(null, 'Feedback recorded'));
}

/**
 * 获取推荐职位列表
 * GET /api/v1/job/recommendations
 */
export async function getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { page = '1', limit = '20', minScore = '30' } = req.query;

  const result = await recommendationEngine.recommendJobsForSeeker(
    req.user.id,
    { page: Number(page), limit: Number(limit) },
    { minScore: Number(minScore) }
  );

  res.json(ApiResponse.success({
    items: result.recommendations,
    total: result.total,
    page: result.page,
    hasMore: result.hasMore,
  }));
}

/**
 * 获取匹配通知列表
 * GET /api/v1/job/notifications
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { type, unreadOnly, page = '1', limit = '20' } = req.query;

  const result = await jobMatchNotificationService.getUserNotifications(
    req.user.id,
    {
      type: type as any,
      unreadOnly: unreadOnly === 'true',
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    }
  );

  res.json(ApiResponse.success({
    items: result.notifications,
    total: result.total,
  }));
}

/**
 * 更新通知偏好
 * PUT /api/v1/job/notification-preferences
 */
export async function updateNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  await jobMatchNotificationService.setUserPreferences(req.user.id, req.body);

  res.json(ApiResponse.success(null, 'Notification preferences updated'));
}

/**
 * 刷新推荐
 * POST /api/v1/job/refresh-recommendations
 */
export async function refreshRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  recommendationEngine.refreshRecommendations(req.user.id);

  res.json(ApiResponse.success(null, 'Recommendations refreshed'));
}

/**
 * 获取搜索历史
 * GET /api/v1/job/search-history
 */
export async function getSearchHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  // In production, query from a SearchHistory table
  res.json(ApiResponse.success({
    items: [],
    total: 0,
  }));
}

/**
 * 快速匹配 - 基于当前求职者画像立即匹配
 * POST /api/v1/job/quick-match
 */
export async function quickMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const { limit = '10' } = req.query;

  const result = await recommendationEngine.recommendJobsForSeeker(
    req.user.id,
    { page: 1, limit: Number(limit) },
    { minScore: 50 }
  );

  res.json(ApiResponse.success({
    matches: result.recommendations.slice(0, Number(limit)),
    total: result.total,
  }));
}
