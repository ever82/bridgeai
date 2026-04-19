/**
 * VisionShare API Service
 * VisionShare API 服务
 */

import type {
  VisionShareTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  DemandRefinementResult,
  PublishValidationResult,
  VisionShareTaskStatus,
} from '@packages/shared/types/visionShare';

import type {
  PaymentResponse,
  PaymentTransaction,
  CreditBalance,
  PaymentConfirmation,
} from '../../../shared/types/payment.types';

import { api } from './client';

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

  // ==================== Payment APIs ====================

  /**
   * Process photo payment
   */
  payForPhotos: async (data: {
    photoIds: string[];
    totalAmount: number;
    password: string;
    metadata?: { source: 'gallery' | 'preview' | 'cart'; couponCode?: string };
  }): Promise<{
    success: boolean;
    data?: PaymentResponse;
    error?: { code: string; message: string };
  }> => {
    const response = await api.post('/visionshare/payment/pay', data);
    return response.data;
  },

  /**
   * Get credit balance
   */
  getCreditBalance: async (): Promise<{ success: boolean; data: CreditBalance }> => {
    const response = await api.get('/visionshare/payment/balance');
    return response.data;
  },

  /**
   * Verify payment password
   */
  verifyPaymentPassword: async (
    password: string
  ): Promise<{ success: boolean; data: { valid: boolean } }> => {
    const response = await api.post('/visionshare/payment/verify-password', { password });
    return response.data;
  },

  /**
   * Get payment transaction details
   */
  getTransaction: async (
    transactionId: string
  ): Promise<{ success: boolean; data: PaymentTransaction }> => {
    const response = await api.get(`/visionshare/payment/transaction/${transactionId}`);
    return response.data;
  },

  /**
   * Get user's payment transactions
   */
  getTransactions: async (
    page?: number,
    limit?: number
  ): Promise<{
    success: boolean;
    data: { transactions: PaymentTransaction[]; total: number; hasMore: boolean };
  }> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const response = await api.get(`/visionshare/payment/transactions?${params.toString()}`);
    return response.data;
  },

  /**
   * Get payment confirmation
   */
  getPaymentConfirmation: async (
    transactionId: string
  ): Promise<{ success: boolean; data: PaymentConfirmation }> => {
    const response = await api.get(`/visionshare/payment/confirmation/${transactionId}`);
    return response.data;
  },

  /**
   * Check photo unlock status
   */
  getPhotoUnlockStatus: async (
    photoId: string
  ): Promise<{ success: boolean; data: { photoId: string; unlocked: boolean } }> => {
    const response = await api.get(`/visionshare/payment/photos/${photoId}/unlock-status`);
    return response.data;
  },

  /**
   * Generate download token for HD photo
   */
  generateDownloadToken: async (
    photoId: string
  ): Promise<{ success: boolean; data: { token: string; photoId: string } }> => {
    const response = await api.post(`/visionshare/payment/photos/${photoId}/download-token`);
    return response.data;
  },

  /**
   * Validate download token and download HD photo
   */
  downloadHDPhoto: async (
    token: string
  ): Promise<{ success: boolean; data?: { photoId: string }; error?: string }> => {
    const response = await api.post(`/visionshare/payment/photos/download/${token}`);
    return response.data;
  },
};
