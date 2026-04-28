/**
 * VisionShare 任务类型定义
 */
export type VisionShareTaskStatus = 'DRAFT' | 'PUBLISHING' | 'PUBLISHED' | 'MATCHING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
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
    expiresAt: Date;
    category?: string;
    tags: string[];
    aiGeneratedTags: string[];
    status: VisionShareTaskStatus;
    creditChecked: boolean;
    creditScore?: number;
    contentFiltered: boolean;
    filterResult?: Record<string, unknown>;
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
export interface DemandRefinementResult {
    refinedDescription: string;
    extractedInfo: {
        location?: string;
        timeRange?: {
            start?: Date;
            end?: Date;
        };
        budget?: {
            min?: number;
            max?: number;
            currency?: string;
        };
        category?: string;
    };
    generatedTags: string[];
    qualityScore: number;
    suggestions: string[];
}
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
    startTime?: string;
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
    estimatedMatchTime?: number;
    shareLink?: string;
    errors?: string[];
}
export interface TaskStatusUpdate {
    taskId: string;
    status: VisionShareTaskStatus;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export interface TaskShareData {
    taskId: string;
    title: string;
    shareLink: string;
    description?: string;
}
//# sourceMappingURL=visionShare.d.ts.map