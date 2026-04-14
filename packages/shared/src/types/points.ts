/**
 * 积分系统类型定义
 * Points System Type Definitions
 */

// ============================================
// 积分账户类型
// ============================================

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

export interface PointsAccountWithRelations extends PointsAccount {
  transactions?: PointsTransaction[];
  freezes?: PointsFreeze[];
}

// ============================================
// 积分交易类型
// ============================================

export enum PointsTransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  REFUND = 'refund',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
}

export enum PointsScene {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
  SYSTEM = 'system',
}

export interface PointsTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  scene?: PointsScene;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// 积分冻结类型
// ============================================

export enum FreezeStatus {
  FROZEN = 'frozen',
  UNFROZEN = 'unfrozen',
  EXPIRED = 'expired',
  CONSUMED = 'consumed',
}

export interface PointsFreeze {
  id: string;
  accountId: string;
  transactionId: string;
  amount: number;
  reason: string;
  scene?: PointsScene;
  referenceId?: string;
  status: FreezeStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API 请求/响应类型
// ============================================

export interface PointsBalanceResponse {
  balance: number;
  frozenAmount: number;
  available: number;
}

export interface PointsTransactionQuery {
  userId?: string;
  type?: PointsTransactionType;
  scene?: PointsScene;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PointsTransactionListResponse {
  transactions: PointsTransaction[];
  total: number;
  hasMore: boolean;
}

// ============================================
// 业务操作类型
// ============================================

export interface EarnPointsInput {
  userId: string;
  amount: number;
  description?: string;
  scene?: PointsScene;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SpendPointsInput {
  userId: string;
  amount: number;
  description?: string;
  scene?: PointsScene;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface FreezePointsInput {
  userId: string;
  amount: number;
  reason: string;
  scene?: PointsScene;
  referenceId?: string;
  expiresAt?: Date;
}

export interface UnfreezePointsInput {
  freezeId: string;
  reason?: string;
}

export interface TransferPointsInput {
  fromUserId: string;
  toUserId: string;
  amount: number;
  description?: string;
  scene?: PointsScene;
  referenceId?: string;
}

// ============================================
// 积分统计类型
// ============================================

export interface PointsStatistics {
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
  frozenAmount: number;
  transactionCount: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface PointsStatisticsQuery {
  userId: string;
  periodStart?: Date;
  periodEnd?: Date;
  scene?: PointsScene;
}
