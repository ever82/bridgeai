/**
 * VisionShare Task Service
 * VisionShare任务管理服务
 */
import type { VisionShareTask, VisionShareTaskStatus, CreateTaskRequest, UpdateTaskRequest, PublishTaskResponse, DemandRefinementResult } from '@bridgeai/shared/types/visionShare';
/**
 * VisionShare任务服务
 */
export declare class VisionShareTaskService {
    private readonly logger;
    /**
     * 创建草稿任务
     */
    createDraft(userId: string, data: CreateTaskRequest): Promise<VisionShareTask>;
    /**
     * 使用AI提炼需求
     */
    refineDemand(taskId: string, description: string, userId: string): Promise<DemandRefinementResult>;
    /**
     * 发布任务
     */
    publishTask(userId: string, taskId: string): Promise<PublishTaskResponse>;
    /**
     * 更新任务
     */
    updateTask(userId: string, taskId: string, data: UpdateTaskRequest): Promise<VisionShareTask | null>;
    /**
     * 取消任务
     */
    cancelTask(userId: string, taskId: string, reason?: string): Promise<VisionShareTask | null>;
    /**
     * 获取任务详情
     */
    getTask(taskId: string, userId?: string): Promise<VisionShareTask | null>;
    /**
     * 获取用户的任务列表
     */
    getUserTasks(userId: string, options?: {
        status?: VisionShareTaskStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        tasks: VisionShareTask[];
        total: number;
    }>;
    /**
     * 创建历史记录
     */
    private createHistoryRecord;
    /**
     * 推送状态更新
     */
    private pushStatusUpdate;
    /**
     * 计算预计匹配时间
     */
    private calculateEstimatedMatchTime;
    /**
     * 分享任务
     */
    shareTask(taskId: string, userId: string): Promise<{
        shareLink: string;
        success: boolean;
    }>;
}
export declare const visionShareTaskService: VisionShareTaskService;
//# sourceMappingURL=taskService.d.ts.map