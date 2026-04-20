/**
 * VisionShare Publish Routes
 * VisionShare发布相关API路由
 */

import { Router, Request, Response } from 'express';
import type { CreateTaskRequest, UpdateTaskRequest } from '@packages/shared/types/visionShare';

import { authenticate } from '../../middleware/auth';
import { validate as validateRequest } from '../../middleware/validation';
import { visionShareTaskService } from '../../services/visionShare/taskService';
import { publishValidationService } from '../../services/visionShare/publishValidation';
import { visionShareDemandRefinementService } from '../../services/ai/visionShareDemandRefinement';
import { logger } from '../../utils/logger';

const router = Router();
const loggerCtx = logger.child({ module: 'VisionSharePublishRoutes' });

/**
 * POST /api/visionshare/tasks
 * 创建草稿任务
 */
router.post(
  '/tasks',
  authenticate,
  validateRequest({
    body: {
      title: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 1000 },
      budgetType: { type: 'string', enum: ['POINTS', 'CASH'], required: true },
      budgetAmount: { type: 'number', required: true, min: 1 },
      budgetCurrency: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      locationName: { type: 'string' },
      locationAddress: { type: 'string' },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
      timeType: { type: 'string', enum: ['IMMEDIATE', 'SCHEDULED'], required: true },
      validHours: { type: 'number', min: 1, max: 168 },
      category: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const data = req.body as CreateTaskRequest;

      const task = await visionShareTaskService.createDraft(userId, data);

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      loggerCtx.error('Create draft task failed', { error });
      res.status(500).json({
        success: false,
        error: '创建任务失败',
      });
    }
  }
);

/**
 * POST /api/visionshare/tasks/:id/refine
 * AI提炼需求
 */
router.post(
  '/tasks/:id/refine',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({
          success: false,
          error: '请提供需求描述',
        });
      }

      const refinement = await visionShareTaskService.refineDemand(taskId, description, userId);

      res.json({
        success: true,
        data: { refinement },
      });
    } catch (error) {
      loggerCtx.error('Refine demand failed', { error });
      res.status(500).json({
        success: false,
        error: '需求提炼失败',
      });
    }
  }
);

/**
 * POST /api/visionshare/tasks/:id/publish
 * 发布任务
 */
router.post(
  '/tasks/:id/publish',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;

      const result = await visionShareTaskService.publishTask(userId, taskId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            task: result.task,
            estimatedMatchTime: result.estimatedMatchTime,
            shareLink: result.shareLink,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }
    } catch (error) {
      loggerCtx.error('Publish task failed', { error });
      res.status(500).json({
        success: false,
        error: '发布任务失败',
      });
    }
  }
);

/**
 * PUT /api/visionshare/tasks/:id
 * 更新任务（仅草稿）
 */
router.put(
  '/tasks/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const data = req.body as UpdateTaskRequest;

      const task = await visionShareTaskService.updateTask(userId, taskId, data);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在或无权访问',
        });
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      if ((error as Error).message?.includes('只有草稿状态')) {
        return res.status(400).json({
          success: false,
          error: (error as Error).message,
        });
      }
      loggerCtx.error('Update task failed', { error });
      res.status(500).json({
        success: false,
        error: '更新任务失败',
      });
    }
  }
);

/**
 * DELETE /api/visionshare/tasks/:id
 * 取消任务
 */
router.delete(
  '/tasks/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const { reason } = req.body;

      const task = await visionShareTaskService.cancelTask(userId, taskId, reason);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在或无权访问',
        });
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      if ((error as Error).message?.includes('无法取消')) {
        return res.status(400).json({
          success: false,
          error: (error as Error).message,
        });
      }
      loggerCtx.error('Cancel task failed', { error });
      res.status(500).json({
        success: false,
        error: '取消任务失败',
      });
    }
  }
);

/**
 * GET /api/visionshare/tasks/:id
 * 获取任务详情
 */
router.get(
  '/tasks/:id',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;

      const task = await visionShareTaskService.getTask(taskId, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
        });
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      loggerCtx.error('Get task failed', { error });
      res.status(500).json({
        success: false,
        error: '获取任务失败',
      });
    }
  }
);

/**
 * GET /api/visionshare/tasks
 * 获取用户的任务列表
 */
router.get(
  '/tasks',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { status, limit, offset } = req.query;

      const result = await visionShareTaskService.getUserTasks(userId, {
        status: status as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      loggerCtx.error('Get user tasks failed', { error });
      res.status(500).json({
        success: false,
        error: '获取任务列表失败',
      });
    }
  }
);

/**
 * POST /api/visionshare/tasks/validate
 * 验证发布资格
 */
router.post(
  '/tasks/validate',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { budgetAmount, budgetType, description, latitude, longitude } = req.body;

      const result = await publishValidationService.validate({
        userId,
        budgetAmount: budgetAmount || 0,
        budgetType: budgetType || 'POINTS',
        description,
        latitude,
        longitude,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      loggerCtx.error('Validate publish failed', { error });
      res.status(500).json({
        success: false,
        error: '验证失败',
      });
    }
  }
);

/**
 * GET /api/visionshare/publish-limits
 * 获取发布限制信息
 */
router.get(
  '/publish-limits',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limits = await publishValidationService.getPublishLimits(userId);

      res.json({
        success: true,
        data: limits,
      });
    } catch (error) {
      loggerCtx.error('Get publish limits failed', { error });
      res.status(500).json({
        success: false,
        error: '获取发布限制失败',
      });
    }
  }
);

/**
 * POST /api/visionshare/tasks/:id/share
 * 分享任务
 */
router.post(
  '/tasks/:id/share',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;

      const result = await visionShareTaskService.shareTask(taskId, userId);

      if (result.success) {
        res.json({
          success: true,
          data: { shareLink: result.shareLink },
        });
      } else {
        res.status(400).json({
          success: false,
          error: '分享任务失败',
        });
      }
    } catch (error) {
      loggerCtx.error('Share task failed', { error });
      res.status(500).json({
        success: false,
        error: '分享任务失败',
      });
    }
  }
);

/**
 * POST /api/visionshare/analyze-description
 * 分析描述文本（AI提炼预览）
 */
router.post(
  '/analyze-description',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { description } = req.body;

      if (!description || description.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: '描述至少需要10个字符',
        });
      }

      const refinement = await visionShareDemandRefinementService.refineDemand(
        description,
        userId
      );

      res.json({
        success: true,
        data: { refinement },
      });
    } catch (error) {
      loggerCtx.error('Analyze description failed', { error });
      res.status(500).json({
        success: false,
        error: '分析描述失败',
      });
    }
  }
);

export default router;
