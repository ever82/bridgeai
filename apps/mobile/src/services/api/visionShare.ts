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
} from '@packages/shared/types/payment.types';
import type { PhotoFilter, PhotoGalleryResponse } from '@packages/shared/types/photo.types';

import { api, apiClient } from './client';

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

export interface NearbyTasksResponse {
  success: boolean;
  data: {
    tasks: VisionShareTask[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface TaskTimelineResponse {
  success: boolean;
  data: {
    timeline: {
      date: string;
      tasks: VisionShareTask[];
    }[];
    total: number;
  };
}

export interface SmartAlbumsResponse {
  success: boolean;
  data: {
    albums: {
      id: string;
      name: string;
      description?: string;
      type: 'auto_ai' | 'location' | 'time' | 'scene' | 'custom';
      photoCount: number;
      coverPhotoId?: string;
      createdAt: string;
      metadata: {
        dateRange?: { start: string; end: string };
        location?: { lat: number; lng: number; name: string };
        dominantScenes?: string[];
        dominantTags?: string[];
      };
    }[];
  };
}

export interface SearchResponse {
  success: boolean;
  data: {
    results: {
      id: string;
      url: string;
      thumbnailUrl: string;
      title: string;
      description: string;
      tags: string[];
      confidence: number;
      matchedTerms: string[];
    }[];
    total: number;
  };
}

export interface AnalyzeImageResponse {
  success: boolean;
  data: {
    detections: {
      type: string;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      confidence: number;
      metadata?: Record<string, unknown>;
    }[];
    imageWidth: number;
    imageHeight: number;
    processingTimeMs: number;
    riskScore?: number;
    riskLevel?: string;
    hadGpsData?: boolean;
    exifStripped?: boolean;
  };
}

export interface TaskEligibilityResponse {
  success: boolean;
  data?: TaskEligibilityResult;
  error?: { code: string; message: string };
}

export interface CheckEligibilityParams {
  taskId: string;
  userId: string;
  latitude: number;
  longitude: number;
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
   * Check task eligibility for user
   */
  checkTaskEligibility: async (
    params: CheckEligibilityParams
  ): Promise<TaskEligibilityResponse> => {
    const response = await api.post<TaskEligibilityResponse>(
      '/visionshare/tasks/eligibility',
      params
    );
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
   * Get nearby tasks
   */
  getNearbyTasks: async (options?: {
    latitude?: number;
    longitude?: number;
    distanceKm?: number;
    limit?: number;
    offset?: number;
  }): Promise<NearbyTasksResponse> => {
    const params = new URLSearchParams();
    if (options?.latitude) params.append('latitude', options.latitude.toString());
    if (options?.longitude) params.append('longitude', options.longitude.toString());
    if (options?.distanceKm) params.append('distance_km', options.distanceKm.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get<NearbyTasksResponse>(
      `/visionshare/tasks/nearby?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get task timeline
   */
  getTaskTimeline: async (options?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<TaskTimelineResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.startDate) params.append('start_date', options.startDate);
    if (options?.endDate) params.append('end_date', options.endDate);
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<TaskTimelineResponse>(
      `/visionshare/tasks/timeline?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get smart albums
   */
  getSmartAlbums: async (options?: {
    type?: string;
    limit?: number;
  }): Promise<SmartAlbumsResponse> => {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<SmartAlbumsResponse>(`/visionshare/albums?${params.toString()}`);
    return response.data;
  },

  /**
   * Get photos for gallery with filtering, sorting, and pagination
   */
  getPhotos: async (filter: PhotoFilter): Promise<PhotoGalleryResponse> => {
    const params = new URLSearchParams();
    if (filter.sceneId) params.append('sceneId', filter.sceneId);
    if (filter.categories?.length) params.append('categories', filter.categories.join(','));
    if (filter.minCredit != null) params.append('minCredit', filter.minCredit.toString());
    if (filter.maxCredit != null) params.append('maxCredit', filter.maxCredit.toString());
    if (filter.minRating != null) params.append('minRating', filter.minRating.toString());
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());
    if (filter.dateRange) {
      if (filter.dateRange.start) params.append('startDate', filter.dateRange.start);
      if (filter.dateRange.end) params.append('endDate', filter.dateRange.end);
    }

    const response = await api.get<PhotoGalleryResponse>(
      `/visionshare/photos?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Search photos
   */
  searchPhotos: async (options: {
    query: string;
    favoritesOnly?: boolean;
    dateRange?: { start: string; end: string };
    tags?: string[];
    limit?: number;
  }): Promise<SearchResponse> => {
    const params = new URLSearchParams();
    params.append('query', options.query);
    if (options.favoritesOnly) params.append('favorites_only', 'true');
    if (options.dateRange) {
      params.append('start_date', options.dateRange.start);
      params.append('end_date', options.dateRange.end);
    }
    if (options.tags?.length) params.append('tags', options.tags.join(','));
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await api.get<SearchResponse>(`/visionshare/search?${params.toString()}`);
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

  /**
   * Analyze image for sensitive content detection
   */
  analyzeImage: async (imageUri: string): Promise<AnalyzeImageResponse> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as unknown as Blob);

    const response = await apiClient.post('/api/v1/ai/privacy/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Desensitize image with specified regions and method
   */
  desensitizeImage: async (params: {
    imageUri: string;
    detections: Array<{
      type: string;
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
    method: string;
    intensity: number;
  }): Promise<{
    success: boolean;
    data: {
      processedImage: string;
      appliedRegions: Array<{
        boundingBox: { x: number; y: number; width: number; height: number };
        method: string;
        intensity: number;
      }>;
      processingTimeMs: number;
    };
  }> => {
    const formData = new FormData();
    // Append image as a file
    formData.append('image', {
      uri: params.imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as unknown as Blob);
    formData.append('detections', JSON.stringify(params.detections));
    formData.append('method', params.method);
    formData.append('intensity', params.intensity.toString());

    const response = await apiClient.post('/api/v1/ai/privacy/desensitize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Apply different desensitization methods to different regions
   */
  multiDesensitizeImage: async (params: {
    imageUri: string;
    regions: Array<{
      boundingBox: { x: number; y: number; width: number; height: number };
      method: string;
      intensity: number;
    }>;
  }): Promise<{
    success: boolean;
    data: {
      processedImage: string;
      appliedRegions: Array<{
        boundingBox: { x: number; y: number; width: number; height: number };
        method: string;
        intensity: number;
      }>;
      processingTimeMs: number;
    };
  }> => {
    const formData = new FormData();
    formData.append('image', {
      uri: params.imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as unknown as Blob);
    formData.append('regions', JSON.stringify(params.regions));

    const response = await apiClient.post('/api/v1/ai/privacy/multi-desensitize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Preview desensitization effect on a region
   */
  previewDesensitization: async (params: {
    imageUri: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    method: string;
    intensity: number;
  }): Promise<{
    success: boolean;
    data: { previewImage: string };
  }> => {
    const formData = new FormData();
    formData.append('image', {
      uri: params.imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as unknown as Blob);
    formData.append('boundingBox', JSON.stringify(params.boundingBox));
    formData.append('method', params.method);
    formData.append('intensity', params.intensity.toString());

    const response = await apiClient.post('/api/v1/ai/privacy/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get recommended desensitization settings for a content type
   */
  getDesensitizationRecommendation: async (
    contentType: string,
    confidence?: number
  ): Promise<{
    success: boolean;
    data: { recommendedMethod: string; recommendedIntensity: number };
  }> => {
    const params = new URLSearchParams();
    if (confidence !== undefined) params.append('confidence', confidence.toString());
    const response = await api.get(
      `/ai/privacy/recommendations/${contentType}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Upload the privacy-processed image
   */
  uploadPrivacyImage: async (
    imageUri: string,
    imageId?: string
  ): Promise<{
    success: boolean;
    data: {
      imageId: string;
      url: string;
      thumbnailUrl?: string;
    };
    error?: string;
  }> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'privacy-processed.jpg',
    } as unknown as Blob);
    if (imageId) {
      formData.append('originalImageId', imageId);
    }

    const response = await apiClient.post('/api/v1/ai/privacy/save', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
