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
import { ReferralStatus, ReferralType, generateReferralReport, exportReferralReportToCSV, } from '../../models/ReferralRecord';
// 模拟存储
const referralStore = new Map();
const blacklistStore = new Map();
/**
 * 获取引荐历史
 */
export async function getReferralHistory(query) {
    const { userId, status, type, startDate, endDate, limit = 20, offset = 0 } = query;
    const referrals = [];
    for (const referral of referralStore.values()) {
        // 检查是否涉及该用户
        if (referral.userAId !== userId && referral.userBId !== userId) {
            continue;
        }
        // 应用过滤器
        if (status && referral.status !== status)
            continue;
        if (type && referral.type !== type)
            continue;
        if (startDate && referral.createdAt < startDate)
            continue;
        if (endDate && referral.createdAt > endDate)
            continue;
        referrals.push(referral);
    }
    // 按创建时间倒序
    referrals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = referrals.length;
    const paginatedReferrals = referrals.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    return {
        referrals: paginatedReferrals,
        total,
        hasMore,
    };
}
/**
 * 获取引荐详情
 */
export async function getReferralDetail(referralId, userId) {
    const referral = referralStore.get(referralId);
    if (!referral)
        return null;
    // 验证用户是否有权查看
    if (referral.userAId !== userId && referral.userBId !== userId) {
        throw new UnauthorizedAccessError('User is not authorized to view this referral');
    }
    return referral;
}
/**
 * 获取引荐统计
 */
export async function getReferralStats(userId) {
    const userReferrals = [];
    for (const referral of referralStore.values()) {
        if (referral.userAId === userId || referral.userBId === userId) {
            userReferrals.push(referral);
        }
    }
    // 整体统计
    const overall = calculateStatistics(userReferrals);
    // 按类型统计
    const byType = {
        [ReferralType.AGENT]: calculateStatistics(userReferrals.filter(r => r.type === ReferralType.AGENT)),
        [ReferralType.MANUAL]: calculateStatistics(userReferrals.filter(r => r.type === ReferralType.MANUAL)),
        [ReferralType.AUTO]: calculateStatistics(userReferrals.filter(r => r.type === ReferralType.AUTO)),
    };
    // 按月统计（最近12个月）
    const byMonth = {};
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthReferrals = userReferrals.filter(r => {
            const rDate = new Date(r.createdAt);
            return rDate.getFullYear() === date.getFullYear() && rDate.getMonth() === date.getMonth();
        });
        byMonth[monthKey] = calculateStatistics(monthReferrals);
    }
    return {
        overall,
        byType,
        byMonth,
    };
}
/**
 * 计算统计
 */
function calculateStatistics(referrals) {
    const total = referrals.length;
    const successful = referrals.filter(r => r.status === ReferralStatus.SUCCESS).length;
    const failed = referrals.filter(r => r.status === ReferralStatus.FAILED).length;
    const pending = referrals.filter(r => r.status === ReferralStatus.PENDING).length;
    // 计算平均决策时间
    const decidedReferrals = referrals.filter(r => r.decidedAt);
    const avgDecisionTime = decidedReferrals.length > 0
        ? decidedReferrals.reduce((sum, r) => {
            const hours = (r.decidedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
            return sum + hours;
        }, 0) / decidedReferrals.length
        : 0;
    return {
        totalReferrals: total,
        successfulReferrals: successful,
        failedReferrals: failed,
        pendingReferrals: pending,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        averageDecisionTime: avgDecisionTime,
    };
}
/**
 * 生成引荐报告
 */
export async function generateReport(userId, period) {
    // 解析周期（如 "2024-01", "2024-Q1", "2024"）
    const referrals = await getReferralsForPeriod(userId, period);
    return generateReferralReport(referrals, period);
}
/**
 * 导出引荐报告
 */
export async function exportReport(userId, period, format = 'csv') {
    const referrals = await getReferralsForPeriod(userId, period);
    if (format === 'csv') {
        return exportReferralReportToCSV(referrals);
    }
    // JSON格式
    return JSON.stringify({
        period,
        generatedAt: new Date().toISOString(),
        referrals,
    }, null, 2);
}
/**
 * 获取周期内的引荐
 */
async function getReferralsForPeriod(userId, period) {
    const referrals = [];
    for (const referral of referralStore.values()) {
        if (referral.userAId !== userId && referral.userBId !== userId)
            continue;
        const createdAt = new Date(referral.createdAt);
        const periodKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (periodKey.startsWith(period)) {
            referrals.push(referral);
        }
    }
    return referrals;
}
/**
 * 添加到黑名单
 */
export async function addToBlacklist(userId, blockedUserId, reason, expiresAt) {
    const entry = {
        id: generateBlacklistId(),
        userId,
        blockedUserId,
        reason,
        createdAt: new Date(),
        expiresAt,
    };
    const key = `${userId}:${blockedUserId}`;
    blacklistStore.set(key, entry);
    return entry;
}
/**
 * 从黑名单移除
 */
export async function removeFromBlacklist(userId, blockedUserId) {
    const key = `${userId}:${blockedUserId}`;
    return blacklistStore.delete(key);
}
/**
 * 检查是否在黑名单中
 */
export async function isBlacklisted(userId, checkUserId) {
    const key = `${userId}:${checkUserId}`;
    const entry = blacklistStore.get(key);
    if (!entry)
        return false;
    // 检查是否过期
    if (entry.expiresAt && new Date() > entry.expiresAt) {
        blacklistStore.delete(key);
        return false;
    }
    return true;
}
/**
 * 获取用户的黑名单
 */
export async function getUserBlacklist(userId) {
    const entries = [];
    for (const [key, entry] of blacklistStore.entries()) {
        if (key.startsWith(`${userId}:`)) {
            // 检查是否过期
            if (entry.expiresAt && new Date() > entry.expiresAt) {
                blacklistStore.delete(key);
                continue;
            }
            entries.push(entry);
        }
    }
    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
/**
 * 获取引荐状态追踪
 */
export async function getReferralTimeline(referralId, userId) {
    const referral = await getReferralDetail(referralId, userId);
    if (!referral) {
        throw new ReferralNotFoundError('Referral not found');
    }
    const timeline = [];
    // 创建
    timeline.push({
        timestamp: referral.createdAt,
        event: 'created',
        description: '引荐创建',
    });
    // 查看
    if (referral.viewCount > 0) {
        timeline.push({
            timestamp: new Date(referral.createdAt.getTime() + 1000), // 模拟时间
            event: 'viewed',
            description: '已查看引荐详情',
        });
    }
    // 提醒
    if (referral.reminderCount > 0) {
        timeline.push({
            timestamp: new Date(referral.expiresAt.getTime() - 24 * 60 * 60 * 1000), // 模拟提醒时间
            event: 'reminded',
            description: `发送了${referral.reminderCount}次提醒`,
        });
    }
    // 决策
    if (referral.userADecision) {
        timeline.push({
            timestamp: referral.userADecision.decidedAt,
            event: 'decided',
            description: `用户A${referral.userADecision.decision === 'accept' ? '同意' : '拒绝'}`,
            actor: referral.userAId,
        });
    }
    if (referral.userBDecision) {
        timeline.push({
            timestamp: referral.userBDecision.decidedAt,
            event: 'decided',
            description: `用户B${referral.userBDecision.decision === 'accept' ? '同意' : '拒绝'}`,
            actor: referral.userBId,
        });
    }
    // 完成
    if (referral.completedAt) {
        timeline.push({
            timestamp: referral.completedAt,
            event: 'completed',
            description: `引荐${referral.status === ReferralStatus.SUCCESS ? '成功' : '失败'}`,
        });
    }
    // 按时间排序
    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
/**
 * 获取引荐偏好分析
 */
export async function getReferralPreferences(userId) {
    const referrals = [];
    for (const referral of referralStore.values()) {
        if (referral.userAId === userId || referral.userBId === userId) {
            referrals.push(referral);
        }
    }
    // 按类型统计
    const typeCounts = {
        [ReferralType.AGENT]: 0,
        [ReferralType.MANUAL]: 0,
        [ReferralType.AUTO]: 0,
    };
    referrals.forEach(r => {
        typeCounts[r.type]++;
    });
    const preferredTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type: type, count }))
        .sort((a, b) => b.count - a.count);
    // 成功模式分析
    const successfulReferrals = referrals.filter(r => r.status === ReferralStatus.SUCCESS);
    const avgMatchScore = successfulReferrals.length > 0
        ? successfulReferrals.reduce((sum, r) => sum + r.matchData.matchScore, 0) /
            successfulReferrals.length
        : 0;
    const factorCounts = {};
    successfulReferrals.forEach(r => {
        r.matchData.compatibilityFactors.forEach(f => {
            factorCounts[f] = (factorCounts[f] || 0) + 1;
        });
    });
    const topCompatibilityFactors = Object.entries(factorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([factor]) => factor);
    // 决策模式分析
    const decidedReferrals = referrals.filter(r => r.decidedAt);
    const avgDecisionTime = decidedReferrals.length > 0
        ? decidedReferrals.reduce((sum, r) => {
            const hours = (r.decidedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
            return sum + hours;
        }, 0) / decidedReferrals.length
        : 0;
    const changeRate = referrals.length > 0
        ? (referrals.filter(r => (r.userAId === userId && r.userADecision) || (r.userBId === userId && r.userBDecision)).length /
            referrals.length) *
            100
        : 0;
    return {
        preferredTypes,
        successPatterns: {
            avgMatchScore,
            topCompatibilityFactors,
        },
        decisionPatterns: {
            avgDecisionTime,
            changeRate,
        },
    };
}
/**
 * 生成黑名单ID
 */
function generateBlacklistId() {
    return `blacklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * 错误类
 */
export class UnauthorizedAccessError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedAccessError';
    }
}
export class ReferralNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReferralNotFoundError';
    }
}
export default {
    getReferralHistory,
    getReferralDetail,
    getReferralStats,
    generateReport,
    exportReport,
    addToBlacklist,
    removeFromBlacklist,
    isBlacklisted,
    getUserBlacklist,
    getReferralTimeline,
    getReferralPreferences,
};
//# sourceMappingURL=referralHistoryService.js.map