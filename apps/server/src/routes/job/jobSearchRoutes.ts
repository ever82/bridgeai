/**
 * Job Search Routes
 * 职位搜索与匹配 API 路由
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/common';
import * as jobSearchController from '../../controllers/job/jobSearchController';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/job/search
 * @desc    搜索职位 (求职者视角，多条件筛选)
 * @access  Private
 */
router.get('/search', asyncHandler(jobSearchController.searchJobs));

/**
 * @route   GET /api/v1/job/candidates
 * @desc    搜索候选人 (招聘方视角)
 * @access  Private
 */
router.get('/candidates', asyncHandler(jobSearchController.searchCandidates));

/**
 * @route   GET /api/v1/job/recommendations
 * @desc    获取推荐职位列表
 * @access  Private
 */
router.get('/recommendations', asyncHandler(jobSearchController.getRecommendations));

/**
 * @route   GET /api/v1/job/matches/:matchId
 * @desc    获取匹配详情
 * @access  Private
 */
router.get('/matches/:matchId', asyncHandler(jobSearchController.getMatchDetail));

/**
 * @route   GET /api/v1/job/notifications
 * @desc    获取匹配通知列表
 * @access  Private
 */
router.get('/notifications', asyncHandler(jobSearchController.getNotifications));

/**
 * @route   GET /api/v1/job/search-history
 * @desc    获取搜索历史
 * @access  Private
 */
router.get('/search-history', asyncHandler(jobSearchController.getSearchHistory));

/**
 * @route   POST /api/v1/job/screen
 * @desc    AI简历筛选分析
 * @access  Private
 */
router.post('/screen', asyncHandler(jobSearchController.screenResume));

/**
 * @route   POST /api/v1/job/feedback
 * @desc    记录推荐反馈
 * @access  Private
 */
router.post('/feedback', asyncHandler(jobSearchController.recordFeedback));

/**
 * @route   POST /api/v1/job/refresh-recommendations
 * @desc    刷新推荐 (去重重置)
 * @access  Private
 */
router.post('/refresh-recommendations', asyncHandler(jobSearchController.refreshRecommendations));

/**
 * @route   POST /api/v1/job/quick-match
 * @desc    快速匹配
 * @access  Private
 */
router.post('/quick-match', asyncHandler(jobSearchController.quickMatch));

/**
 * @route   PUT /api/v1/job/notification-preferences
 * @desc    更新通知偏好
 * @access  Private
 */
router.put('/notification-preferences', asyncHandler(jobSearchController.updateNotificationPreferences));

export default router;
