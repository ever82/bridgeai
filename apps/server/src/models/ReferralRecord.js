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
export var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "pending";
    ReferralStatus["SUCCESS"] = "success";
    ReferralStatus["FAILED"] = "failed";
    ReferralStatus["CANCELLED"] = "cancelled";
})(ReferralStatus || (ReferralStatus = {}));
export var ReferralType;
(function (ReferralType) {
    ReferralType["AGENT"] = "agent";
    ReferralType["MANUAL"] = "manual";
    ReferralType["AUTO"] = "auto";
})(ReferralType || (ReferralType = {}));
export var RejectionReason;
(function (RejectionReason) {
    RejectionReason["NOT_INTERESTED"] = "not_interested";
    RejectionReason["BUSY"] = "busy";
    RejectionReason["ALREADY_DATING"] = "already_dating";
    RejectionReason["PREFER_OTHERS"] = "prefer_others";
    RejectionReason["NO_CHEMISTRY"] = "no_chemistry";
    RejectionReason["SAFETY_CONCERN"] = "safety_concern";
    RejectionReason["OTHER"] = "other";
})(RejectionReason || (RejectionReason = {}));
/**
 * 创建新的引荐记录
 */
export function createReferralRecord(userAId, userBId, matchData, type = ReferralType.AGENT, timeoutHours = 72) {
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
export function updateReferralStatus(record, status, result = null) {
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
export function recordUserDecision(record, userId, decision, reason, customReason) {
    const decisionData = {
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
export function incrementViewCount(record) {
    return {
        ...record,
        viewCount: record.viewCount + 1,
    };
}
/**
 * 增加提醒次数
 */
export function incrementReminderCount(record) {
    return {
        ...record,
        reminderCount: record.reminderCount + 1,
    };
}
/**
 * 设置聊天房间ID
 */
export function setChatRoomId(record, chatRoomId) {
    return {
        ...record,
        chatRoomId,
    };
}
/**
 * 加入黑名单
 */
export function addToBlacklist(record, reason) {
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
export function isUserBlacklisted(record, userId) {
    if (!record.blacklisted)
        return false;
    // 如果一方拒绝，另一方可选择加入黑名单
    const userDecision = userId === record.userAId ? record.userADecision : record.userBDecision;
    const otherDecision = userId === record.userAId ? record.userBDecision : record.userADecision;
    return userDecision?.decision === 'reject' || otherDecision?.decision === 'reject';
}
/**
 * 生成引荐报告
 */
export function generateReferralReport(referrals, period) {
    const now = new Date();
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
    // 统计拒绝原因
    const rejectionReasons = {};
    referrals.forEach(r => {
        if (r.userADecision?.decision === 'reject' && r.userADecision.reason) {
            rejectionReasons[r.userADecision.reason] = (rejectionReasons[r.userADecision.reason] || 0) + 1;
        }
        if (r.userBDecision?.decision === 'reject' && r.userBDecision.reason) {
            rejectionReasons[r.userBDecision.reason] = (rejectionReasons[r.userBDecision.reason] || 0) + 1;
        }
    });
    const topRejectionReasons = Object.entries(rejectionReasons)
        .map(([reason, count]) => ({ reason: reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    // 计算平均匹配分数
    const avgMatchScore = total > 0
        ? referrals.reduce((sum, r) => sum + r.matchData.matchScore, 0) / total
        : 0;
    // 转化漏斗
    const viewed = referrals.filter(r => r.viewCount > 0).length;
    const decided = referrals.filter(r => r.decidedAt).length;
    const accepted = referrals.filter(r => r.userADecision?.decision === 'accept' || r.userBDecision?.decision === 'accept').length;
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
export function exportReferralReportToCSV(referrals) {
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
function generateReferralId() {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=ReferralRecord.js.map