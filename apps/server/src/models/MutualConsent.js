/**
 * Mutual Consent Model
 * 双向同意状态管理数据模型
 *
 * 管理约会引荐中的双方同意状态，支持以下特性：
 * - 独立决策存储（双方各自决策）
 * - 时效控制（超时自动过期）
 * - 决策变更（有效期内可改）
 * - 最终结果计算（双方都同意才成功）
 */
export var ConsentStatus;
(function (ConsentStatus) {
    ConsentStatus["PENDING"] = "pending";
    ConsentStatus["ACCEPTED"] = "accepted";
    ConsentStatus["REJECTED"] = "rejected";
    ConsentStatus["EXPIRED"] = "expired";
})(ConsentStatus || (ConsentStatus = {}));
export var ReferralResult;
(function (ReferralResult) {
    ReferralResult["PENDING"] = "pending";
    ReferralResult["MUTUAL_ACCEPT"] = "mutual_accept";
    ReferralResult["SINGLE_ACCEPT"] = "single_accept";
    ReferralResult["MUTUAL_REJECT"] = "mutual_reject";
    ReferralResult["SINGLE_REJECT"] = "single_reject";
    ReferralResult["EXPIRED"] = "expired";
})(ReferralResult || (ReferralResult = {}));
export const DEFAULT_CONSENT_CONFIG = {
    defaultTimeoutHours: 72, // 默认72小时
    reminderBeforeHours: [24, 4], // 到期前24小时和4小时提醒
    maxChangeCount: 3, // 最多变更3次
};
/**
 * 创建新的双向同意记录
 */
export function createMutualConsent(referralId, userAId, userBId, config = {}) {
    const timeoutConfig = { ...DEFAULT_CONSENT_CONFIG, ...config };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutConfig.defaultTimeoutHours * 60 * 60 * 1000);
    return {
        id: generateConsentId(),
        referralId,
        userAId,
        userBId,
        userAConsent: {
            userId: userAId,
            status: ConsentStatus.PENDING,
            decidedAt: null,
            changedCount: 0,
        },
        userBConsent: {
            userId: userBId,
            status: ConsentStatus.PENDING,
            decidedAt: null,
            changedCount: 0,
        },
        createdAt: now,
        expiresAt,
        timeoutHours: timeoutConfig.defaultTimeoutHours,
        result: ReferralResult.PENDING,
        resultCalculatedAt: null,
    };
}
/**
 * 更新用户决策
 */
export function updateUserDecision(consent, userId, decision, reason) {
    const now = new Date();
    // 检查是否过期
    if (now > consent.expiresAt) {
        throw new ConsentExpiredError('Consent has expired');
    }
    const isUserA = userId === consent.userAId;
    const userConsent = isUserA ? consent.userAConsent : consent.userBConsent;
    // 检查变更次数
    if (userConsent.status !== ConsentStatus.PENDING &&
        userConsent.changedCount >= DEFAULT_CONSENT_CONFIG.maxChangeCount) {
        throw new ConsentChangeLimitError('Maximum change count exceeded');
    }
    // 更新决策
    const newStatus = decision === 'accept' ? ConsentStatus.ACCEPTED : ConsentStatus.REJECTED;
    const updatedConsent = {
        ...consent,
        [isUserA ? 'userAConsent' : 'userBConsent']: {
            ...userConsent,
            status: newStatus,
            decidedAt: now,
            reason: decision === 'reject' ? reason : undefined,
            changedCount: userConsent.status !== ConsentStatus.PENDING
                ? userConsent.changedCount + 1
                : userConsent.changedCount,
        },
    };
    // 重新计算结果
    return calculateResult(updatedConsent);
}
/**
 * 计算引荐结果
 */
export function calculateResult(consent) {
    const { userAConsent, userBConsent } = consent;
    // 如果任一方还在等待，结果保持pending
    if (userAConsent.status === ConsentStatus.PENDING ||
        userBConsent.status === ConsentStatus.PENDING) {
        return consent;
    }
    let result;
    if (userAConsent.status === ConsentStatus.ACCEPTED &&
        userBConsent.status === ConsentStatus.ACCEPTED) {
        result = ReferralResult.MUTUAL_ACCEPT;
    }
    else if (userAConsent.status === ConsentStatus.REJECTED &&
        userBConsent.status === ConsentStatus.REJECTED) {
        result = ReferralResult.MUTUAL_REJECT;
    }
    else if (userAConsent.status === ConsentStatus.ACCEPTED ||
        userBConsent.status === ConsentStatus.ACCEPTED) {
        result = ReferralResult.SINGLE_ACCEPT;
    }
    else {
        result = ReferralResult.SINGLE_REJECT;
    }
    return {
        ...consent,
        result,
        resultCalculatedAt: new Date(),
    };
}
/**
 * 处理超时过期
 */
export function expireConsent(consent) {
    const now = new Date();
    if (now <= consent.expiresAt) {
        return consent;
    }
    const updatedConsent = { ...consent };
    // 将未决策方标记为过期
    if (consent.userAConsent.status === ConsentStatus.PENDING) {
        updatedConsent.userAConsent = {
            ...consent.userAConsent,
            status: ConsentStatus.EXPIRED,
        };
    }
    if (consent.userBConsent.status === ConsentStatus.PENDING) {
        updatedConsent.userBConsent = {
            ...consent.userBConsent,
            status: ConsentStatus.EXPIRED,
        };
    }
    return {
        ...updatedConsent,
        result: ReferralResult.EXPIRED,
        resultCalculatedAt: now,
    };
}
/**
 * 获取对方用户ID
 */
export function getOtherUserId(consent, userId) {
    return userId === consent.userAId ? consent.userBId : consent.userAId;
}
/**
 * 检查是否双方都已决策
 */
export function isBothDecided(consent) {
    return consent.userAConsent.status !== ConsentStatus.PENDING &&
        consent.userBConsent.status !== ConsentStatus.PENDING;
}
/**
 * 检查是否双方同意
 */
export function isMutualAccept(consent) {
    return consent.result === ReferralResult.MUTUAL_ACCEPT;
}
/**
 * 生成唯一ID
 */
function generateConsentId() {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * 错误类
 */
export class ConsentExpiredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConsentExpiredError';
    }
}
export class ConsentChangeLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConsentChangeLimitError';
    }
}
//# sourceMappingURL=MutualConsent.js.map