/**
 * Referral Record Model
 * 引荐记录管理数据模型
 *
 * 存储和管理引荐历史记录，支持：
 * - 引荐历史存储
 * - 状态追踪
 * - 统计分析
 * - 黑名单管理
 */

import { ReferralResult } from './MutualConsent';

export enum ReferralStatus {
  PENDING = 'pending',       // 待处理
  SUCCESS = 'success',       // 引荐成功
  FAILED = 'failed',         // 引荐失败
  CANCELLED = 'cancelled',   // 已取消
}

export enum ReferralType {
  AGENT = 'agent',           // Agent引荐
  MANUAL = 'manual',         // 人工引荐
  AUTO = 'auto',             // 自动引荐
}

export enum RejectionReason {
  NOT_INTERESTED = 'not_interested',    // 不感兴趣
  BUSY = 'busy',                         // 太忙
  ALREADY_DATING = 'already_dating',     // 已在约会
  PREFER_OTHERS = 'prefer_others',       // 偏好其他人
  NO_CHEMISTRY = 'no_chemistry',         // 没有感觉
  SAFETY_CONCERN = 'safety_concern',     // 安全顾虑
  OTHER = 'other',                       // 其他原因
}

export interface ReferralMatchData {
  matchScore: number;
  compatibilityFactors: string[];
  agentConversationSummary: string;
  recommendedTopics?: string[];
}

export interface ReferralDecision {
  userId: string;
  decision: 'accept' | 'reject';
  reason?: RejectionReason;
  customReason?: string;
  decidedAt: Date;
}

export interface ReferralStatistics {
  totalReferrals: number;
  successfulReferrals: number;
  failedReferrals: number;
  pendingReferrals: number;
  successRate: number;
  averageDecisionTime: number;  // 平均决策时间（小时）
}

export interface ReferralRecord {
  id: string;
  type: ReferralType;

  // 双方用户
  userAId: string;
  userBId: string;

  // 引荐状态
  status: ReferralStatus;
  result: ReferralResult | null;

  // 匹配数据
  matchData: ReferralMatchData;

  // 决策信息
  userADecision: ReferralDecision | null;
  userBDecision: ReferralDecision | null;

  // 创建真人聊天房间
  chatRoomId: string | null;

  // 时间戳
  createdAt: Date;
  expiresAt: Date;
  decidedAt: Date | null;
  completedAt: Date | null;

  // 黑名单
  blacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: Date;

  // 统计
  viewCount: number;          // 查看次数
  reminderCount: number;      // 提醒次数

  // 元数据
  metadata?: Record<string, any>;
}

export interface ReferralBlacklistEntry {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: Date;
  expiresAt?: Date;           // 可选过期时间
}

export interface ReferralFilter {
  status?: ReferralStatus;
  type?: ReferralType;
  result?: ReferralResult;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  blacklisted?: boolean;
}

export interface ReferralReport {
  period: string;
  generatedAt: Date;
  statistics: ReferralStatistics;
  topRejectionReasons: { reason: RejectionReason; count: number }[];
  averageMatchScore: number;
  conversionFunnel: {
    viewed: number;
    decided: number;
    accepted: number;
    matched: number;
  };
}

/**
 * 创建新的引荐记录
 */
export function createReferralRecord(
  userAId: string,
  userBId: string,
  matchData: ReferralMatchData,
  type: ReferralType = ReferralType.AGENT,
  timeoutHours: number = 72
): ReferralRecord {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutHours * 60 * 60 * 1000);

  return {
    id: generateReferralId(),
    type,
    userAId,
    userBId,
    status: ReferralStatus.PENDING,
    result: null,
    matchData,
    userADecision: null,
    userBDecision: null,
    chatRoomId: null,
    createdAt: now,
    expiresAt,
    decidedAt: null,
    completedAt: null,
    blacklisted: false,
    viewCount: 0,
    reminderCount: 0,
  };
}

/**
 * 更新引荐状态
 */
export function updateReferralStatus(
  record: ReferralRecord,
  status: ReferralStatus,
  result: ReferralResult | null = null
): ReferralRecord {
  const now = new Date();

  return {
    ...record,
    status,
    result,
    completedAt: status === ReferralStatus.SUCCESS || status === ReferralStatus.FAILED
      ? now
      : record.completedAt,
  };
}

/**
 * 记录用户决策
 */
export function recordUserDecision(
  record: ReferralRecord,
  userId: string,
  decision: 'accept' | 'reject',
  reason?: RejectionReason,
  customReason?: string
): ReferralRecord {
  const decisionData: ReferralDecision = {
    userId,
    decision,
    reason: decision === 'reject' ? reason : undefined,
    customReason: decision === 'reject' ? customReason : undefined,
    decidedAt: new Date(),
  };

  const isUserA = userId === record.userAId;

  return {
    ...record,
    [isUserA ? 'userADecision' : 'userBDecision']: decisionData,
    decidedAt: record.decidedAt || new Date(),
  };
}

/**
 * 增加查看次数
 */
export function incrementViewCount(record: ReferralRecord): ReferralRecord {
  return {
    ...record,
    viewCount: record.viewCount + 1,
  };
}

/**
 * 增加提醒次数
 */
export function incrementReminderCount(record: ReferralRecord): ReferralRecord {
  return {
    ...record,
    reminderCount: record.reminderCount + 1,
  };
}

/**
 * 设置聊天房间ID
 */
export function setChatRoomId(record: ReferralRecord, chatRoomId: string): ReferralRecord {
  return {
    ...record,
    chatRoomId,
  };
}

/**
 * 加入黑名单
 */
export function addToBlacklist(
  record: ReferralRecord,
  reason?: string
): ReferralRecord {
  return {
    ...record,
    blacklisted: true,
    blacklistReason: reason,
    blacklistedAt: new Date(),
  };
}

/**
 * 检查用户是否在黑名单中
 */
export function isUserBlacklisted(
  record: ReferralRecord,
  userId: string
): boolean {
  if (!record.blacklisted) return false;

  // 如果一方拒绝，另一方可选择加入黑名单
  const userDecision = userId === record.userAId ? record.userADecision : record.userBDecision;
  const otherDecision = userId === record.userAId ? record.userBDecision : record.userADecision;

  return userDecision?.decision === 'reject' || otherDecision?.decision === 'reject';
}

/**
 * 生成引荐报告
 */
export function generateReferralReport(
  referrals: ReferralRecord[],
  period: string
): ReferralReport {
  const now = new Date();

  const total = referrals.length;
  const successful = referrals.filter(r => r.status === ReferralStatus.SUCCESS).length;
  const failed = referrals.filter(r => r.status === ReferralStatus.FAILED).length;
  const pending = referrals.filter(r => r.status === ReferralStatus.PENDING).length;

  // 计算平均决策时间
  const decidedReferrals = referrals.filter(r => r.decidedAt);
  const avgDecisionTime = decidedReferrals.length > 0
    ? decidedReferrals.reduce((sum, r) => {
        const hours = (r.decidedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0) / decidedReferrals.length
    : 0;

  // 统计拒绝原因
  const rejectionReasons: Record<RejectionReason, number> = {} as Record<RejectionReason, number>;
  referrals.forEach(r => {
    if (r.userADecision?.decision === 'reject' && r.userADecision.reason) {
      rejectionReasons[r.userADecision.reason] = (rejectionReasons[r.userADecision.reason] || 0) + 1;
    }
    if (r.userBDecision?.decision === 'reject' && r.userBDecision.reason) {
      rejectionReasons[r.userBDecision.reason] = (rejectionReasons[r.userBDecision.reason] || 0) + 1;
    }
  });

  const topRejectionReasons = Object.entries(rejectionReasons)
    .map(([reason, count]) => ({ reason: reason as RejectionReason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 计算平均匹配分数
  const avgMatchScore = total > 0
    ? referrals.reduce((sum, r) => sum + r.matchData.matchScore, 0) / total
    : 0;

  // 转化漏斗
  const viewed = referrals.filter(r => r.viewCount > 0).length;
  const decided = referrals.filter(r => r.decidedAt).length;
  const accepted = referrals.filter(r =>
    r.userADecision?.decision === 'accept' || r.userBDecision?.decision === 'accept'
  ).length;
  const matched = successful;

  return {
    period,
    generatedAt: now,
    statistics: {
      totalReferrals: total,
      successfulReferrals: successful,
      failedReferrals: failed,
      pendingReferrals: pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDecisionTime: avgDecisionTime,
    },
    topRejectionReasons,
    averageMatchScore: avgMatchScore,
    conversionFunnel: {
      viewed,
      decided,
      accepted,
      matched,
    },
  };
}

/**
 * 导出引荐报告为CSV
 */
export function exportReferralReportToCSV(referrals: ReferralRecord[]): string {
  const headers = [
    'ID',
    'Type',
    'User A',
    'User B',
    'Status',
    'Result',
    'Match Score',
    'Created At',
    'Completed At',
    'View Count',
  ].join(',');

  const rows = referrals.map(r => [
    r.id,
    r.type,
    r.userAId,
    r.userBId,
    r.status,
    r.result || '',
    r.matchData.matchScore,
    r.createdAt.toISOString(),
    r.completedAt?.toISOString() || '',
    r.viewCount,
  ].join(','));

  return [headers, ...rows].join('\n');
}

/**
 * 生成唯一ID
 */
function generateReferralId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default ReferralRecord;
