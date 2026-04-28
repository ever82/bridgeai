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
export declare enum ReferralStatus {
    PENDING = "pending",// 待处理
    SUCCESS = "success",// 引荐成功
    FAILED = "failed",// 引荐失败
    CANCELLED = "cancelled"
}
export declare enum ReferralType {
    AGENT = "agent",// Agent引荐
    MANUAL = "manual",// 人工引荐
    AUTO = "auto"
}
export declare enum RejectionReason {
    NOT_INTERESTED = "not_interested",// 不感兴趣
    BUSY = "busy",// 太忙
    ALREADY_DATING = "already_dating",// 已在约会
    PREFER_OTHERS = "prefer_others",// 偏好其他人
    NO_CHEMISTRY = "no_chemistry",// 没有感觉
    SAFETY_CONCERN = "safety_concern",// 安全顾虑
    OTHER = "other"
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
    averageDecisionTime: number;
}
export interface ReferralRecord {
    id: string;
    type: ReferralType;
    userAId: string;
    userBId: string;
    status: ReferralStatus;
    result: ReferralResult | null;
    matchData: ReferralMatchData;
    userADecision: ReferralDecision | null;
    userBDecision: ReferralDecision | null;
    chatRoomId: string | null;
    createdAt: Date;
    expiresAt: Date;
    decidedAt: Date | null;
    completedAt: Date | null;
    blacklisted: boolean;
    blacklistReason?: string;
    blacklistedAt?: Date;
    viewCount: number;
    reminderCount: number;
    metadata?: Record<string, any>;
}
export interface ReferralBlacklistEntry {
    id: string;
    userId: string;
    blockedUserId: string;
    reason?: string;
    createdAt: Date;
    expiresAt?: Date;
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
    topRejectionReasons: {
        reason: RejectionReason;
        count: number;
    }[];
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
export declare function createReferralRecord(userAId: string, userBId: string, matchData: ReferralMatchData, type?: ReferralType, timeoutHours?: number): ReferralRecord;
/**
 * 更新引荐状态
 */
export declare function updateReferralStatus(record: ReferralRecord, status: ReferralStatus, result?: ReferralResult | null): ReferralRecord;
/**
 * 记录用户决策
 */
export declare function recordUserDecision(record: ReferralRecord, userId: string, decision: 'accept' | 'reject', reason?: RejectionReason, customReason?: string): ReferralRecord;
/**
 * 增加查看次数
 */
export declare function incrementViewCount(record: ReferralRecord): ReferralRecord;
/**
 * 增加提醒次数
 */
export declare function incrementReminderCount(record: ReferralRecord): ReferralRecord;
/**
 * 设置聊天房间ID
 */
export declare function setChatRoomId(record: ReferralRecord, chatRoomId: string): ReferralRecord;
/**
 * 加入黑名单
 */
export declare function addToBlacklist(record: ReferralRecord, reason?: string): ReferralRecord;
/**
 * 检查用户是否在黑名单中
 */
export declare function isUserBlacklisted(record: ReferralRecord, userId: string): boolean;
/**
 * 生成引荐报告
 */
export declare function generateReferralReport(referrals: ReferralRecord[], period: string): ReferralReport;
/**
 * 导出引荐报告为CSV
 */
export declare function exportReferralReportToCSV(referrals: ReferralRecord[]): string;
export default ReferralRecord;
//# sourceMappingURL=ReferralRecord.d.ts.map