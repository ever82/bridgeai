/**
 * Resume Delivery Types
 *
 * Types for resume delivery to job postings and tracking.
 */

// ============================================================================
// Resume Delivery
// ============================================================================

export interface ResumeDelivery {
  id: string;
  resumeId: string;
  jobId: string;

  // Job seeker info
  seekerId: string;
  seekerAgentId: string;

  // Employer info
  employerId: string;
  employerAgentId: string;

  // Delivery details
  coverLetter?: string;
  customAnswers?: Record<string, string>;
  referralCode?: string;

  // Status tracking
  status: DeliveryStatus;
  viewedAt?: string;
  respondedAt?: string;
  withdrawnAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',       // 待处理
  VIEWED = 'VIEWED',         // 已查看
  SHORTLISTED = 'SHORTLISTED', // 进入候选
  REJECTED = 'REJECTED',     // 已拒绝
  INTERVIEWING = 'INTERVIEWING', // 面试中
  OFFERED = 'OFFERED',       // 已发offer
  HIRED = 'HIRED',           // 已录用
  WITHDRAWN = 'WITHDRAWN',   // 已撤回
  EXPIRED = 'EXPIRED',       // 已过期
}

// ============================================================================
// Delivery History (Audit Log)
// ============================================================================

export interface DeliveryHistoryEntry {
  id: string;
  deliveryId: string;
  action: DeliveryAction;
  fromStatus?: DeliveryStatus;
  toStatus: DeliveryStatus;
  actorId: string; // userId who performed the action
  actorType: 'SEEKER' | 'EMPLOYER' | 'SYSTEM';
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export enum DeliveryAction {
  DELIVERED = 'DELIVERED',           // 投递
  VIEWED = 'VIEWED',                  // 查看
  SHORTLISTED = 'SHORTLISTED',        // 纳入候选
  REJECTED = 'REJECTED',              // 拒绝
  INTERVIEW_INVITED = 'INTERVIEW_INVITED', // 邀请面试
  OFFER_EXTENDED = 'OFFER_EXTENDED',  // 发offer
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',  // 接受offer
  OFFER_DECLINED = 'OFFER_DECLINED',  // 拒绝offer
  HIRED = 'HIRED',                    // 入职
  WITHDRAWN = 'WITHDRAWN',            // 撤回
  EXPIRED = 'EXPIRED',                // 过期
  STATUS_UPDATED = 'STATUS_UPDATED',  // 状态更新
  NOTE_ADDED = 'NOTE_ADDED',          // 添加备注
}

// ============================================================================
// Disclosure Tracking
// ============================================================================

export interface DisclosureRecord {
  id: string;
  deliveryId: string;
  field: string;           // 披露的字段名
  originalValue: string;   // 原始值（加密存储）
  disclosedAt: string;
  disclosedTo: string;    // employerId
  revokedAt?: string;
  isRevoked: boolean;
}

// ============================================================================
// Batch Delivery
// ============================================================================

export interface BatchDeliveryRequest {
  resumeId: string;
  jobIds: string[];
  coverLetter?: string;
}

export interface BatchDeliveryResult {
  jobId: string;
  success: boolean;
  deliveryId?: string;
  error?: string;
}

export interface BatchDeliveryResponse {
  total: number;
  successful: number;
  failed: number;
  results: BatchDeliveryResult[];
}

// ============================================================================
// Delivery Statistics
// ============================================================================

export interface DeliveryStats {
  totalDeliveries: number;
  pendingCount: number;
  viewedCount: number;
  shortlistedCount: number;
  rejectedCount: number;
  interviewingCount: number;
  offeredCount: number;
  hiredCount: number;
  withdrawnCount: number;
  responseRate: number;   // 查看率
  successRate: number;     // 成功率
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateDeliveryRequest {
  resumeId: string;
  jobId: string;
  coverLetter?: string;
  customAnswers?: Record<string, string>;
  referralCode?: string;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
  reason?: string;
  notes?: string;
}

export interface WithdrawDeliveryRequest {
  reason?: string;
}

export interface DeliveryFilterOptions {
  status?: DeliveryStatus | DeliveryStatus[];
  jobId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DeliveryListResponse {
  deliveries: ResumeDelivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Disclosure Notification
// ============================================================================

export interface DisclosureChangeNotification {
  deliveryId: string;
  jobSeekerId: string;
  employerId: string;
  changedFields: DisclosureFieldChange[];
  notifiedAt: string;
}

export interface DisclosureFieldChange {
  field: string;
  oldValue?: string;
  newValue: string;
  changeType: 'ADDED' | 'MODIFIED' | 'REVOKED';
}

// ============================================================================
// Display Labels
// ============================================================================

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PENDING]: '待处理',
  [DeliveryStatus.VIEWED]: '已查看',
  [DeliveryStatus.SHORTLISTED]: '进入候选',
  [DeliveryStatus.REJECTED]: '已拒绝',
  [DeliveryStatus.INTERVIEWING]: '面试中',
  [DeliveryStatus.OFFERED]: '已发offer',
  [DeliveryStatus.HIRED]: '已录用',
  [DeliveryStatus.WITHDRAWN]: '已撤回',
  [DeliveryStatus.EXPIRED]: '已过期',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PENDING]: '#9E9E9E',
  [DeliveryStatus.VIEWED]: '#2196F3',
  [DeliveryStatus.SHORTLISTED]: '#FF9800',
  [DeliveryStatus.REJECTED]: '#F44336',
  [DeliveryStatus.INTERVIEWING]: '#9C27B0',
  [DeliveryStatus.OFFERED]: '#4CAF50',
  [DeliveryStatus.HIRED]: '#4CAF50',
  [DeliveryStatus.WITHDRAWN]: '#757575',
  [DeliveryStatus.EXPIRED]: '#757575',
};

export const DELIVERY_ACTION_LABELS: Record<DeliveryAction, string> = {
  [DeliveryAction.DELIVERED]: '投递成功',
  [DeliveryAction.VIEWED]: '简历被查看',
  [DeliveryAction.SHORTLISTED]: '进入候选列表',
  [DeliveryAction.REJECTED]: '简历被拒绝',
  [DeliveryAction.INTERVIEW_INVITED]: '收到面试邀请',
  [DeliveryAction.OFFER_EXTENDED]: '收到offer',
  [DeliveryAction.OFFER_ACCEPTED]: '接受了offer',
  [DeliveryAction.OFFER_DECLINED]: '拒绝了offer',
  [DeliveryAction.HIRED]: '已入职',
  [DeliveryAction.WITHDRAWN]: '撤回了投递',
  [DeliveryStatus.EXPIRED]: '投递已过期',
  [DeliveryAction.STATUS_UPDATED]: '状态更新',
  [DeliveryAction.NOTE_ADDED]: '添加了备注',
};
