/**
 * 积分系统共享类型定义
 */

// 场景代码
export enum SceneCode {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
}

// 积分交易类型
export enum PointsTransactionType {
  EARN = 'EARN',
  SPEND = 'SPEND',
  FROZEN = 'FROZEN',
  UNFROZEN = 'UNFROZEN',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

// 积分账户
export interface PointsAccount {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// 积分交易记录
export interface PointsTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: string;
  createdAt: Date;
}

// 冻结状态
export enum FreezeStatus {
  FROZEN = 'FROZEN',
  RELEASED = 'RELEASED',
  USED = 'USED',
}

// 积分冻结记录
export interface PointsFreeze {
  id: string;
  accountId: string;
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  status: FreezeStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API 响应类型
export interface PointsAccountResponse {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  availableBalance: number;
}

export interface PointsTransactionListResponse {
  transactions: PointsTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PointsFreezeListResponse {
  freezes: PointsFreeze[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 请求类型
export interface CreatePointsTransactionRequest {
  amount: number;
  type: PointsTransactionType;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePointsFreezeRequest {
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  expiresAt?: string;
}

// 操作结果
export interface PointsOperationResult {
  success: boolean;
  transaction?: PointsTransaction;
  freeze?: PointsFreeze;
  error?: string;
}

// 规则相关类型
export interface PointsRuleConfig {
  code: string;
  name: string;
  description: string;
  points: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  cooldownMinutes?: number;
  enabled: boolean;
  scene?: SceneCode;
}

// 积分统计
export interface PointsStatistics {
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
  frozenAmount: number;
  dailyEarned: number;
  weeklyEarned: number;
  dailySpent: number;
  weeklySpent: number;
}
