/**
 * VisionShare API Service
 * VisionShare API 服务
 */

import { api } from './client';
import type {
  VisionShareTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  DemandRefinementResult,
  PublishValidationResult,
  VisionShareTaskStatus,
} from '@packages/shared/types/visionShare';

export interface CreateTaskResponse {
  success: boolean;
  data: { task: VisionShareTask };
}

export interface PublishTaskResponse {
  success: boolean;
  data?: {
    task: VisionShareTask;
    estimatedMatchTime?: number;
    shareLink?: string;
  };
  errors?: string[];
}

export interface TaskListResponse {
  success: boolean;
  data: {
    tasks: VisionShareTask[];
    total: number;
  };
}

export interface RefinementResponse {
  success: boolean;
  data: { refinement: DemandRefinementResult };
}

export interface ValidationResponse {
  success: boolean;
  data: PublishValidationResult;
}

export interface PublishLimitsResponse {
  success: boolean;
  data: {
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    canPublish: boolean;
  };
}

export interface ShareResponse {
  success: boolean;
  data?: { shareLink: string };
}

export const visionShareApi = {
  /**
   * Create a draft task
   */
  createDraft: async (data: CreateTaskRequest): Promise<CreateTaskResponse> => {
    const response = await api.post<CreateTaskResponse>('/visionshare/tasks', data);
    return response.data;
  },

  /**
   * Refine demand with AI
   */
  refineDemand: async (taskId: string, description: string): Promise<RefinementResponse> => {
    const response = await api.post<RefinementResponse>(`/visionshare/tasks/${taskId}/refine`, {
      description,
    });
    return response.data;
  },

  /**
   * Publish task
   */
  publishTask: async (taskId: string): Promise<PublishTaskResponse> => {
    const response = await api.post<PublishTaskResponse>(`/visionshare/tasks/${taskId}/publish`);
    return response.data;
  },

  /**
   * Update task
   */
  updateTask: async (taskId: string, data: UpdateTaskRequest): Promise<CreateTaskResponse> => {
    const response = await api.put<CreateTaskResponse>(`/visionshare/tasks/${taskId}`, data);
    return response.data;
  },

  /**
   * Cancel task
   */
  cancelTask: async (taskId: string, reason?: string): Promise<CreateTaskResponse> => {
    const response = await api.delete<CreateTaskResponse>(`/visionshare/tasks/${taskId}`, {
      data: { reason },
    });
    return response.data;
  },

  /**
   * Get task details
   */
  getTask: async (taskId: string): Promise<CreateTaskResponse> => {
    const response = await api.get<CreateTaskResponse>(`/visionshare/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Get user's tasks
   */
  getUserTasks: async (options?: {
    status?: VisionShareTaskStatus;
    limit?: number;
    offset?: number;
  }): Promise<TaskListResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get<TaskListResponse>(`/visionshare/tasks?${params.toString()}`);
    return response.data;
  },

  /**
   * Validate publish eligibility
   */
  validatePublish: async (data: {
    budgetAmount?: number;
    budgetType?: 'POINTS' | 'CASH';
    description?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ValidationResponse> => {
    const response = await api.post<ValidationResponse>('/visionshare/tasks/validate', data);
    return response.data;
  },

  /**
   * Get publish limits
   */
  getPublishLimits: async (): Promise<PublishLimitsResponse> => {
    const response = await api.get<PublishLimitsResponse>('/visionshare/publish-limits');
    return response.data;
  },

  /**
   * Share task
   */
  shareTask: async (taskId: string): Promise<ShareResponse> => {
    const response = await api.post<ShareResponse>(`/visionshare/tasks/${taskId}/share`);
    return response.data;
  },

  /**
   * Analyze description (preview refinement)
   */
  analyzeDescription: async (description: string): Promise<RefinementResponse> => {
    const response = await api.post<RefinementResponse>('/visionshare/analyze-description', {
      description,
    });
    return response.data;
  },
};
