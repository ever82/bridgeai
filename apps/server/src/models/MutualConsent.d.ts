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
export declare enum ConsentStatus {
    PENDING = "pending",// 等待决策
    ACCEPTED = "accepted",// 已同意
    REJECTED = "rejected",// 已拒绝
    EXPIRED = "expired"
}
export declare enum ReferralResult {
    PENDING = "pending",// 等待中
    MUTUAL_ACCEPT = "mutual_accept",// 双方同意
    SINGLE_ACCEPT = "single_accept",// 单方同意
    MUTUAL_REJECT = "mutual_reject",// 双方拒绝
    SINGLE_REJECT = "single_reject",// 单方拒绝
    EXPIRED = "expired"
}
export interface UserConsent {
    userId: string;
    status: ConsentStatus;
    decidedAt: Date | null;
    reason?: string;
    changedCount: number;
}
export interface MutualConsent {
    id: string;
    referralId: string;
    userAId: string;
    userBId: string;
    userAConsent: UserConsent;
    userBConsent: UserConsent;
    createdAt: Date;
    expiresAt: Date;
    timeoutHours: number;
    result: ReferralResult;
    resultCalculatedAt: Date | null;
    contextSummary?: string;
    matchScore?: number;
}
export interface ConsentDecision {
    userId: string;
    decision: 'accept' | 'reject';
    reason?: string;
}
export interface ConsentTimeoutConfig {
    defaultTimeoutHours: number;
    reminderBeforeHours: number[];
    maxChangeCount: number;
}
export declare const DEFAULT_CONSENT_CONFIG: ConsentTimeoutConfig;
/**
 * 创建新的双向同意记录
 */
export declare function createMutualConsent(referralId: string, userAId: string, userBId: string, config?: Partial<ConsentTimeoutConfig>): MutualConsent;
/**
 * 更新用户决策
 */
export declare function updateUserDecision(consent: MutualConsent, userId: string, decision: 'accept' | 'reject', reason?: string): MutualConsent;
/**
 * 计算引荐结果
 */
export declare function calculateResult(consent: MutualConsent): MutualConsent;
/**
 * 处理超时过期
 */
export declare function expireConsent(consent: MutualConsent): MutualConsent;
/**
 * 获取对方用户ID
 */
export declare function getOtherUserId(consent: MutualConsent, userId: string): string;
/**
 * 检查是否双方都已决策
 */
export declare function isBothDecided(consent: MutualConsent): boolean;
/**
 * 检查是否双方同意
 */
export declare function isMutualAccept(consent: MutualConsent): boolean;
/**
 * 错误类
 */
export declare class ConsentExpiredError extends Error {
    constructor(message: string);
}
export declare class ConsentChangeLimitError extends Error {
    constructor(message: string);
}
export default MutualConsent;
//# sourceMappingURL=MutualConsent.d.ts.map