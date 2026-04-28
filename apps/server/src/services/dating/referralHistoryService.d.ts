/**
 * Referral History Service
 * 引荐记录与管理服务
 *
 * 管理引荐历史记录：
 * - 引荐历史存储
 * - 引荐状态追踪
 * - 引荐统计分析
 * - 黑名单管理
 * - 引荐报告导出
 */
import { ReferralRecord, ReferralStatus, ReferralType, ReferralStatistics, ReferralReport, ReferralBlacklistEntry } from '../../models/ReferralRecord';
export interface ReferralHistoryQuery {
    userId: string;
    status?: ReferralStatus;
    type?: ReferralType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
export interface ReferralHistoryResult {
    referrals: ReferralRecord[];
    total: number;
    hasMore: boolean;
}
export interface ReferralStatsResult {
    overall: ReferralStatistics;
    byType: Record<ReferralType, ReferralStatistics>;
    byMonth: Record<string, ReferralStatistics>;
}
/**
 * 获取引荐历史
 */
export declare function getReferralHistory(query: ReferralHistoryQuery): Promise<ReferralHistoryResult>;
/**
 * 获取引荐详情
 */
export declare function getReferralDetail(referralId: string, userId: string): Promise<ReferralRecord | null>;
/**
 * 获取引荐统计
 */
export declare function getReferralStats(userId: string): Promise<ReferralStatsResult>;
/**
 * 生成引荐报告
 */
export declare function generateReport(userId: string, period: string): Promise<ReferralReport>;
/**
 * 导出引荐报告
 */
export declare function exportReport(userId: string, period: string, format?: 'csv' | 'json'): Promise<string>;
/**
 * 添加到黑名单
 */
export declare function addToBlacklist(userId: string, blockedUserId: string, reason?: string, expiresAt?: Date): Promise<ReferralBlacklistEntry>;
/**
 * 从黑名单移除
 */
export declare function removeFromBlacklist(userId: string, blockedUserId: string): Promise<boolean>;
/**
 * 检查是否在黑名单中
 */
export declare function isBlacklisted(userId: string, checkUserId: string): Promise<boolean>;
/**
 * 获取用户的黑名单
 */
export declare function getUserBlacklist(userId: string): Promise<ReferralBlacklistEntry[]>;
/**
 * 获取引荐状态追踪
 */
export declare function getReferralTimeline(referralId: string, userId: string): Promise<Array<{
    timestamp: Date;
    event: string;
    description: string;
    actor?: string;
}>>;
/**
 * 获取引荐偏好分析
 */
export declare function getReferralPreferences(userId: string): Promise<{
    preferredTypes: Array<{
        type: ReferralType;
        count: number;
    }>;
    successPatterns: {
        avgMatchScore: number;
        topCompatibilityFactors: string[];
    };
    decisionPatterns: {
        avgDecisionTime: number;
        changeRate: number;
    };
}>;
/**
 * 错误类
 */
export declare class UnauthorizedAccessError extends Error {
    constructor(message: string);
}
export declare class ReferralNotFoundError extends Error {
    constructor(message: string);
}
declare const _default: {
    getReferralHistory: typeof getReferralHistory;
    getReferralDetail: typeof getReferralDetail;
    getReferralStats: typeof getReferralStats;
    generateReport: typeof generateReport;
    exportReport: typeof exportReport;
    addToBlacklist: typeof addToBlacklist;
    removeFromBlacklist: typeof removeFromBlacklist;
    isBlacklisted: typeof isBlacklisted;
    getUserBlacklist: typeof getUserBlacklist;
    getReferralTimeline: typeof getReferralTimeline;
    getReferralPreferences: typeof getReferralPreferences;
};
export default _default;
//# sourceMappingURL=referralHistoryService.d.ts.map