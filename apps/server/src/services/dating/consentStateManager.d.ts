/**
 * Consent State Manager
 * 双向同意状态管理服务
 *
 * 管理同意状态的生命周期，包括：
 * - 创建同意记录
 * - 更新用户决策
 * - 检查过期状态
 * - 计算最终结果
 */
import { MutualConsent } from '../../models/MutualConsent';
export interface ConsentState {
    consent: MutualConsent;
    canChange: boolean;
    timeRemaining: number;
    isExpired: boolean;
}
/**
 * 创建新的双向同意记录
 */
export declare function createConsent(referralId: string, userAId: string, userBId: string, timeoutHours?: number): Promise<MutualConsent>;
/**
 * 获取同意状态
 */
export declare function getConsent(consentId: string): Promise<MutualConsent | null>;
/**
 * 获取引荐的同意记录
 */
export declare function getConsentByReferral(referralId: string): Promise<MutualConsent | null>;
/**
 * 记录用户决策
 */
export declare function recordDecision(consentId: string, userId: string, decision: 'accept' | 'reject', reason?: string): Promise<MutualConsent>;
/**
 * 获取用户决策状态
 */
export declare function getUserConsentState(consentId: string, userId: string): Promise<ConsentState | null>;
/**
 * 获取对方用户的决策状态（不透露具体选择）
 */
export declare function getOtherUserDecisionStatus(consentId: string, userId: string): Promise<'pending' | 'decided'>;
/**
 * 检查是否需要发送超时提醒
 */
export declare function checkAndSendTimeoutReminders(): Promise<void>;
/**
 * 处理过期同意记录
 */
export declare function processExpiredConsents(): Promise<number>;
/**
 * 获取等待决策的同意记录
 */
export declare function getPendingConsents(userId: string): Promise<MutualConsent[]>;
/**
 * 获取用户的所有同意记录
 */
export declare function getUserConsents(userId: string): Promise<MutualConsent[]>;
/**
 * 取消同意记录
 */
export declare function cancelConsent(consentId: string, _reason?: string): Promise<void>;
/**
 * 错误类
 */
export declare class ConsentNotFoundError extends Error {
    constructor(message: string);
}
export declare class ConsentUpdateError extends Error {
    constructor(message: string);
}
declare const _default: {
    createConsent: typeof createConsent;
    getConsent: typeof getConsent;
    getConsentByReferral: typeof getConsentByReferral;
    recordDecision: typeof recordDecision;
    getUserConsentState: typeof getUserConsentState;
    getOtherUserDecisionStatus: typeof getOtherUserDecisionStatus;
    checkAndSendTimeoutReminders: typeof checkAndSendTimeoutReminders;
    processExpiredConsents: typeof processExpiredConsents;
    getPendingConsents: typeof getPendingConsents;
    getUserConsents: typeof getUserConsents;
    cancelConsent: typeof cancelConsent;
};
export default _default;
//# sourceMappingURL=consentStateManager.d.ts.map