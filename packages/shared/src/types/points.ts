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
  createdAt: string;
  updatedAt: string;
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
  RECHARGE = 'recharge',
  REFUND = 'refund',
  FROZEN = 'frozen',
  UNFROZEN = 'unfrozen',
  DEDUCT = 'deduct',
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

// 场景代码 (与 schema.prisma 保持一致)
export enum SceneCode {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
}

// ============================================
// 积分交易类型
// ============================================

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
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// 积分冻结类型
// ============================================

export enum FreezeStatus {
  FROZEN = 'frozen',
  USED = 'used',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export interface PointsFreeze {
  id: string;
  accountId: string;
  transactionId?: string;
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  status: FreezeStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API 请求/响应类型
// ============================================

export interface PointsAccountResponse {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  availableBalance: number;
}

export interface PointsBalanceResponse {
  balance: number;
  frozenAmount: number;
  available: number;
}

export interface PointsTransactionListResponse {
  transactions: PointsTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  total: number;
  hasMore: boolean;
}

export interface PointsTransactionQuery {
  userId?: string;
  type?: PointsTransactionType;
  scene?: PointsScene;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
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

// ============================================
// 业务操作类型
// ============================================

export interface CreatePointsTransactionRequest {
  type: PointsTransactionType;
  amount: number;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

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
  expiresAt?: string;
}

export interface CreatePointsFreezeRequest {
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  expiresAt?: string;
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
  periodStart?: string;
  periodEnd?: string;
}

export interface PointsStatisticsQuery {
  userId: string;
  periodStart?: string;
  periodEnd?: string;
  scene?: PointsScene;
}

// ============================================
// 积分操作结果
// ============================================

export interface PointsOperationResult {
  success: boolean;
  account?: PointsAccount;
  transaction?: PointsTransaction;
  freeze?: PointsFreeze;
  error?: string;
}

// ============================================
// 积分规则配置
// ============================================

export interface PointsRuleConfig {
  scene: PointsScene;
  action: string;
  points: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  cooldownMs?: number;
  description?: string;
}

// ============================================
// 验证辅助函数类型
// ============================================

export interface ValidationContext {
  balance: number;
  amount: number;
  rule?: PointsRuleConfig;
}

export function validateBalance(balance: number, amount: number): boolean {
  return balance >= amount;
}

export function validatePointsAccount(account: PointsAccount): boolean {
  return account.balance >= 0 && account.totalEarned >= 0 && account.totalSpent >= 0;
}

export function validateTransactionAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

export function validateBalanceAfter(balance: number, amount: number, expected: number): boolean {
  return balance === expected;
}
