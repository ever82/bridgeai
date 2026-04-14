/**
 * VisionShare 任务类型定义
 */

export type VisionShareTaskStatus =
  | 'DRAFT'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'MATCHING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type BudgetType = 'POINTS' | 'CASH';
export type TimeType = 'IMMEDIATE' | 'SCHEDULED';

export interface VisionShareTask {
  id: string;
  userId: string;
  agentId?: string;
  title: string;
  description?: string;
  aiRefinedDescription?: string;
  qualityScore?: number;

  // 预算信息
  budgetType: BudgetType;
  budgetAmount: number;
  budgetCurrency?: string;

  // 地理位置
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;

  // 时间窗口
  startTime?: Date;
  endTime?: Date;
  timeType: TimeType;

  // 有效期
  validHours: number;
  expiresAt: Date;

  // 分类和标签
  category?: string;
  tags: string[];
  aiGeneratedTags: string[];

  // 状态机
  status: VisionShareTaskStatus;

  // 验证状态
  creditChecked: boolean;
  creditScore?: number;
  contentFiltered: boolean;
  filterResult?: Record<string, unknown>;

  // 统计信息
  viewCount: number;
  matchCount: number;
  shareCount: number;

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface VisionShareTaskHistory {
  id: string;
  taskId: string;
  status: VisionShareTaskStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// 发布表单数据
export interface VisionSharePublishFormData {
  title: string;
  description?: string;
  budgetType: BudgetType;
  budgetAmount: number;
  budgetCurrency?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  startTime?: Date;
  endTime?: Date;
  timeType: TimeType;
  validHours: number;
  category?: string;
  tags: string[];
}

// AI提炼结果
export interface DemandRefinementResult {
  refinedDescription: string;
  extractedInfo: {
    location?: string;
    timeRange?: { start?: Date; end?: Date };
    budget?: { min?: number; max?: number; currency?: string };
    category?: string;
  };
  generatedTags: string[];
  qualityScore: number;
  suggestions: string[];
}

// 发布验证结果
export interface PublishValidationResult {
  valid: boolean;
  creditCheck: {
    passed: boolean;
    score: number;
    requiredScore: number;
  };
  balanceCheck: {
    passed: boolean;
    balance: number;
    required: number;
  };
  limitCheck: {
    passed: boolean;
    dailyCount: number;
    dailyLimit: number;
  };
  contentCheck: {
    passed: boolean;
    issues: string[];
  };
  locationCheck: {
    passed: boolean;
    reason?: string;
  };
}

// API 请求/响应类型
export interface CreateTaskRequest {
  title: string;
  description?: string;
  budgetType: BudgetType;
  budgetAmount: number;
  budgetCurrency?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  startTime?: string; // ISO format
  endTime?: string;
  timeType: TimeType;
  validHours: number;
  category?: string;
  tags: string[];
}

export interface CreateTaskResponse {
  task: VisionShareTask;
  refinement?: DemandRefinementResult;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  budgetType?: BudgetType;
  budgetAmount?: number;
  budgetCurrency?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  startTime?: string;
  endTime?: string;
  timeType?: TimeType;
  validHours?: number;
  category?: string;
  tags?: string[];
}

export interface PublishTaskResponse {
  success: boolean;
  task?: VisionShareTask;
  estimatedMatchTime?: number; // 预计匹配时间(分钟)
  shareLink?: string;
  errors?: string[];
}

// 实时状态推送
export interface TaskStatusUpdate {
  taskId: string;
  status: VisionShareTaskStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// 分享数据
export interface TaskShareData {
  taskId: string;
  title: string;
  shareLink: string;
  description?: string;
}
