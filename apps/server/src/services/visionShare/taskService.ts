/**
 * VisionShare Task Service
 * VisionShare任务管理服务
 */

import type {
  VisionShareTask,
  VisionShareTaskStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
  PublishTaskResponse,
  DemandRefinementResult,
} from '@packages/shared/types/visionShare';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { emitToUser } from '../../socket';
import { visionShareDemandRefinementService } from '../ai/visionShareDemandRefinement';
import { visionShareNLPService } from '../ai/visionShareNLP';

import { publishValidationService } from './publishValidation';

/**
 * VisionShare任务服务
 */
export class VisionShareTaskService {
  private readonly logger = logger.child({ module: 'VisionShareTaskService' });

  /**
   * 创建草稿任务
   */
  async createDraft(userId: string, data: CreateTaskRequest): Promise<VisionShareTask> {
    try {
      this.logger.info('Creating draft task', { userId, title: data.title });

      // 计算过期时间
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (data.validHours || 24));

      // 解析时间
      const startTime = data.startTime ? new Date(data.startTime) : null;
      const endTime = data.endTime ? new Date(data.endTime) : null;

      // 创建任务
      const task = await prisma.visionShareTask.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          budgetType: data.budgetType,
          budgetAmount: data.budgetAmount,
          budgetCurrency: data.budgetCurrency,
          latitude: data.latitude,
          longitude: data.longitude,
          locationName: data.locationName,
          locationAddress: data.locationAddress,
          startTime,
          endTime,
          timeType: data.timeType,
          validHours: data.validHours || 24,
          expiresAt,
          category: data.category,
          tags: data.tags || [],
          aiGeneratedTags: [],
          status: 'DRAFT',
          creditChecked: false,
          contentFiltered: false,
          viewCount: 0,
          matchCount: 0,
          shareCount: 0,
          publishCount: 0,
          dailyLimitHit: false,
        },
      });

      // 记录历史
      await this.createHistoryRecord(task.id, 'DRAFT', { action: 'create_draft' });

      this.logger.info('Draft task created', { taskId: task.id });

      return task as VisionShareTask;
    } catch (error) {
      this.logger.error('Create draft failed', { userId, error });
      throw error;
    }
  }

  /**
   * 使用AI提炼需求
   */
  async refineDemand(
    taskId: string,
    description: string,
    userId: string
  ): Promise<DemandRefinementResult> {
    try {
      this.logger.info('Refining demand', { taskId, userId });

      // 调用AI服务提炼需求
      const refinement = await visionShareDemandRefinementService.refineDemand(description, userId);

      // 更新任务
      await prisma.visionShareTask.update({
        where: { id: taskId },
        data: {
          aiRefinedDescription: refinement.refinedDescription,
          qualityScore: refinement.qualityScore,
          aiGeneratedTags: refinement.generatedTags,
        },
      });

      this.logger.info('Demand refined', { taskId, qualityScore: refinement.qualityScore });

      return refinement;
    } catch (error) {
      this.logger.error('Refine demand failed', { taskId, error });
      throw error;
    }
  }

  /**
   * 发布任务
   */
  async publishTask(userId: string, taskId: string): Promise<PublishTaskResponse> {
    try {
      this.logger.info('Publishing task', { userId, taskId });

      // 获取任务
      const task = await prisma.visionShareTask.findFirst({
        where: { id: taskId, userId },
      });

      if (!task) {
        return {
          success: false,
          errors: ['任务不存在或无权访问'],
        };
      }

      if (task.status !== 'DRAFT') {
        return {
          success: false,
          errors: [`任务状态为${task.status}，无法发布`],
        };
      }

      // 执行发布验证
      const validationResult = await publishValidationService.validate({
        userId,
        budgetAmount: Number(task.budgetAmount),
        budgetType: task.budgetType as 'POINTS' | 'CASH',
        description: task.description,
        latitude: task.latitude,
        longitude: task.longitude,
      });

      if (!validationResult.valid) {
        const errors: string[] = [];
        if (!validationResult.creditCheck.passed) {
          errors.push(
            `信用分不足，当前${validationResult.creditCheck.score}，需要${validationResult.creditCheck.requiredScore}`
          );
        }
        if (!validationResult.balanceCheck.passed) {
          errors.push(
            `积分余额不足，当前${validationResult.balanceCheck.balance}，需要${validationResult.balanceCheck.required}`
          );
        }
        if (!validationResult.limitCheck.passed) {
          errors.push(`今日发布数量已达上限(${validationResult.limitCheck.dailyLimit}个)`);
        }
        if (!validationResult.contentCheck.passed) {
          errors.push(...validationResult.contentCheck.issues);
        }
        if (!validationResult.locationCheck.passed) {
          errors.push(validationResult.locationCheck.reason || '位置信息有误');
        }

        return {
          success: false,
          errors,
        };
      }

      // 如果还没有AI提炼，尝试提炼
      if (!task.aiRefinedDescription && task.description) {
        try {
          await this.refineDemand(taskId, task.description, userId);
        } catch (e) {
          this.logger.warn('Auto refinement failed during publish', { taskId, error: e });
        }
      }

      // 使用NLP提取标签
      if (task.tags.length === 0 && task.description) {
        const entities = visionShareNLPService.extractEntities(task.description);
        if (entities.tags.length > 0) {
          await prisma.visionShareTask.update({
            where: { id: taskId },
            data: {
              tags: entities.tags,
              category: entities.category || task.category,
            },
          });
        }
      }

      // 更新任务状态
      const updatedTask = await prisma.visionShareTask.update({
        where: { id: taskId },
        data: {
          status: 'PUBLISHED',
          creditChecked: true,
          creditScore: validationResult.creditCheck.score,
          contentFiltered: true,
          publishedAt: new Date(),
        },
      });

      // 记录历史
      await this.createHistoryRecord(taskId, 'PUBLISHED', {
        action: 'publish',
        creditScore: validationResult.creditCheck.score,
      });

      // 推送状态更新
      this.pushStatusUpdate(taskId, 'PUBLISHED', userId);

      // 生成分享链接
      const shareLink = `${process.env.APP_URL || 'https://app.example.com'}/visionshare/task/${taskId}`;

      // 计算预计匹配时间（基于历史数据，这里使用模拟值）
      const estimatedMatchTime = this.calculateEstimatedMatchTime(updatedTask as VisionShareTask);

      this.logger.info('Task published successfully', { taskId });

      return {
        success: true,
        task: updatedTask as VisionShareTask,
        estimatedMatchTime,
        shareLink,
      };
    } catch (error) {
      this.logger.error('Publish task failed', { userId, taskId, error });
      return {
        success: false,
        errors: ['发布失败，请稍后重试'],
      };
    }
  }

  /**
   * 更新任务
   */
  async updateTask(
    userId: string,
    taskId: string,
    data: UpdateTaskRequest
  ): Promise<VisionShareTask | null> {
    try {
      this.logger.info('Updating task', { userId, taskId });

      // 检查任务是否存在且属于该用户
      const existingTask = await prisma.visionShareTask.findFirst({
        where: { id: taskId, userId },
      });

      if (!existingTask) {
        return null;
      }

      // 只有草稿状态可以编辑
      if (existingTask.status !== 'DRAFT') {
        throw new Error('只有草稿状态的任务可以编辑');
      }

      // 准备更新数据
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.budgetType !== undefined) updateData.budgetType = data.budgetType;
      if (data.budgetAmount !== undefined) updateData.budgetAmount = data.budgetAmount;
      if (data.budgetCurrency !== undefined) updateData.budgetCurrency = data.budgetCurrency;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.locationName !== undefined) updateData.locationName = data.locationName;
      if (data.locationAddress !== undefined) updateData.locationAddress = data.locationAddress;
      if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
      if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
      if (data.timeType !== undefined) updateData.timeType = data.timeType;
      if (data.validHours !== undefined) {
        updateData.validHours = data.validHours;
        // 重新计算过期时间
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + data.validHours);
        updateData.expiresAt = expiresAt;
      }
      if (data.category !== undefined) updateData.category = data.category;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const task = await prisma.visionShareTask.update({
        where: { id: taskId },
        data: updateData,
      });

      // 记录历史
      await this.createHistoryRecord(taskId, 'DRAFT', {
        action: 'update',
        fields: Object.keys(data),
      });

      this.logger.info('Task updated', { taskId });

      return task as VisionShareTask;
    } catch (error) {
      this.logger.error('Update task failed', { userId, taskId, error });
      throw error;
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(
    userId: string,
    taskId: string,
    reason?: string
  ): Promise<VisionShareTask | null> {
    try {
      this.logger.info('Cancelling task', { userId, taskId });

      const task = await prisma.visionShareTask.findFirst({
        where: { id: taskId, userId },
      });

      if (!task) {
        return null;
      }

      // 检查是否可以取消
      const cancellableStatuses = ['DRAFT', 'PUBLISHED', 'MATCHING'];
      if (!cancellableStatuses.includes(task.status)) {
        throw new Error(`任务状态为${task.status}，无法取消`);
      }

      const updatedTask = await prisma.visionShareTask.update({
        where: { id: taskId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // 记录历史
      await this.createHistoryRecord(taskId, 'CANCELLED', {
        action: 'cancel',
        previousStatus: task.status,
        reason,
      });

      // 推送状态更新
      this.pushStatusUpdate(taskId, 'CANCELLED', userId);

      this.logger.info('Task cancelled', { taskId });

      return updatedTask as VisionShareTask;
    } catch (error) {
      this.logger.error('Cancel task failed', { userId, taskId, error });
      throw error;
    }
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string, userId?: string): Promise<VisionShareTask | null> {
    try {
      const task = await prisma.visionShareTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return null;
      }

      // 增加浏览计数（如果不是自己查看）
      if (userId && task.userId !== userId) {
        await prisma.visionShareTask.update({
          where: { id: taskId },
          data: { viewCount: { increment: 1 } },
        });
      }

      return task as VisionShareTask;
    } catch (error) {
      this.logger.error('Get task failed', { taskId, error });
      throw error;
    }
  }

  /**
   * 获取用户的任务列表
   */
  async getUserTasks(
    userId: string,
    options?: {
      status?: VisionShareTaskStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ tasks: VisionShareTask[]; total: number }> {
    try {
      const where: any = { userId };

      if (options?.status) {
        where.status = options.status;
      }

      const [tasks, total] = await Promise.all([
        prisma.visionShareTask.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
        }),
        prisma.visionShareTask.count({ where }),
      ]);

      return {
        tasks: tasks as VisionShareTask[],
        total,
      };
    } catch (error) {
      this.logger.error('Get user tasks failed', { userId, error });
      throw error;
    }
  }

  /**
   * 创建历史记录
   */
  private async createHistoryRecord(
    taskId: string,
    status: VisionShareTaskStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.visionShareTaskHistory.create({
        data: {
          taskId,
          status,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error('Create history record failed', { taskId, error });
    }
  }

  /**
   * 推送状态更新
   */
  private pushStatusUpdate(taskId: string, status: VisionShareTaskStatus, userId: string): void {
    try {
      emitToUser(userId, 'visionShare:taskStatus', {
        taskId,
        status,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Push status update failed', { taskId, error });
    }
  }

  /**
   * 计算预计匹配时间
   */
  private calculateEstimatedMatchTime(task: VisionShareTask): number {
    // 基于任务特征计算预计匹配时间
    let baseTime = 30; // 基础30分钟

    // 预算越高匹配越快
    if (task.budgetAmount >= 500) {
      baseTime -= 10;
    } else if (task.budgetAmount >= 200) {
      baseTime -= 5;
    }

    // 有AI提炼的匹配更快
    if (task.aiRefinedDescription) {
      baseTime -= 5;
    }

    // 标签越多匹配越快
    const tagCount = task.tags.length + task.aiGeneratedTags.length;
    if (tagCount >= 5) {
      baseTime -= 5;
    } else if (tagCount >= 3) {
      baseTime -= 3;
    }

    // 有明确位置的匹配更快
    if (task.latitude && task.longitude) {
      baseTime -= 5;
    }

    // 质量分越高匹配越快
    if (task.qualityScore && task.qualityScore >= 80) {
      baseTime -= 5;
    }

    return Math.max(5, baseTime); // 最少5分钟
  }

  /**
   * 分享任务
   */
  async shareTask(
    taskId: string,
    userId: string
  ): Promise<{ shareLink: string; success: boolean }> {
    try {
      const task = await prisma.visionShareTask.findFirst({
        where: { id: taskId, userId },
      });

      if (!task) {
        return { shareLink: '', success: false };
      }

      // 增加分享计数
      await prisma.visionShareTask.update({
        where: { id: taskId },
        data: { shareCount: { increment: 1 } },
      });

      const shareLink = `${process.env.APP_URL || 'https://app.example.com'}/visionshare/task/${taskId}`;

      return { shareLink, success: true };
    } catch (error) {
      this.logger.error('Share task failed', { taskId, error });
      return { shareLink: '', success: false };
    }
  }
}

// 导出单例实例
export const visionShareTaskService = new VisionShareTaskService();
