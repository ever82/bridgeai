/**
 * Referral Service
 * 引荐服务
 *
 * 处理引荐的核心业务流程：
 * - 创建引荐记录
 * - 处理同意流程
 * - 管理引荐生命周期
 */
import { ReferralRecord, ReferralType, ReferralStatus, ReferralMatchData } from '../../models/ReferralRecord';
import { MutualConsent } from '../../models/MutualConsent';
export interface CreateReferralRequest {
    userAId: string;
    userBId: string;
    matchData: ReferralMatchData;
    type?: ReferralType;
    timeoutHours?: number;
    initiatedBy?: 'system' | 'userA' | 'userB';
}
export interface CreateReferralResponse {
    success: boolean;
    referralId?: string;
    consentId?: string;
    error?: string;
}
export interface ReferralDecisionRequest {
    referralId: string;
    userId: string;
    decision: 'accept' | 'reject';
    reason?: string;
}
export interface ReferralDecisionResponse {
    success: boolean;
    result?: 'pending' | 'mutual_accept' | 'single_accept' | 'mutual_reject' | 'single_reject';
    chatRoomId?: string;
    message: string;
}
/**
 * 创建引荐
 */
export declare function createReferral(request: CreateReferralRequest): Promise<CreateReferralResponse>;
/**
 * 获取引荐记录
 */
export declare function getReferral(referralId: string): Promise<ReferralRecord | null>;
/**
 * 获取引荐的同意记录
 */
export declare function getReferralConsent(referralId: string): Promise<MutualConsent | null>;
/**
 * 记录引荐查看
 */
export declare function recordReferralView(referralId: string, userId: string): Promise<void>;
/**
 * 处理引荐决策
 */
export declare function processReferralDecision(request: ReferralDecisionRequest): Promise<ReferralDecisionResponse>;
/**
 * 取消引荐
 */
export declare function cancelReferral(referralId: string, cancelledBy: string, reason?: string): Promise<boolean>;
/**
 * 获取用户的引荐列表
 */
export declare function getUserReferrals(userId: string, status?: ReferralStatus): Promise<ReferralRecord[]>;
/**
 * 获取待处理的引荐
 */
export declare function getPendingReferrals(userId: string): Promise<ReferralRecord[]>;
/**
 * 错误类
 */
export declare class UnauthorizedViewError extends Error {
    constructor(message: string);
}
export declare class UnauthorizedCancelError extends Error {
    constructor(message: string);
}
/**
 * 从Agent对话结果创建引荐
 * 当Agent间对话完成且匹配度达标时自动触发
 */
export declare function createReferralFromConversation(roomId: string, agentAId: string, agentBId: string, userIdA: string, userIdBId: string, conversationResult: {
    summary: string;
    qualityScore: number;
    sharedInterests: string[];
    compatibilityScore: number;
}, matchThreshold?: number): Promise<CreateReferralResponse>;
declare const _default: {
    createReferral: typeof createReferral;
    getReferral: typeof getReferral;
    getReferralConsent: typeof getReferralConsent;
    recordReferralView: typeof recordReferralView;
    processReferralDecision: typeof processReferralDecision;
    cancelReferral: typeof cancelReferral;
    getUserReferrals: typeof getUserReferrals;
    getPendingReferrals: typeof getPendingReferrals;
    createReferralFromConversation: typeof createReferralFromConversation;
};
export default _default;
//# sourceMappingURL=referralService.d.ts.map