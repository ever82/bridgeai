/**
 * Consent Processor
 * 引荐结果处理服务
 *
 * 处理双方同意后的各种结果：
 * - 双方同意：交换联系方式、创建真人聊天房间
 * - 单方同意：保持匿名、提示对方未同意
 * - 双方/单方拒绝：记录原因、更新推荐算法
 * - 超时处理：自动取消、提醒决策
 */
import { ReferralResult } from '../../models/MutualConsent';
import { ReferralRecord, RejectionReason } from '../../models/ReferralRecord';
export interface ReferralProcessResult {
    success: boolean;
    result: ReferralResult;
    message: string;
    chatRoomId?: string;
    nextAction?: string;
}
export interface ProcessedDecision {
    userId: string;
    decision: 'accept' | 'reject';
    reason?: RejectionReason;
    customReason?: string;
}
/**
 * 处理引荐结果
 * 根据双方的决策处理不同的结果场景
 */
export declare function processReferralResult(referralId: string): Promise<ReferralProcessResult>;
/**
 * 获取引荐记录
 */
export declare function getReferral(referralId: string): Promise<ReferralRecord | null>;
/**
 * 保存引荐记录
 */
export declare function saveReferral(referral: ReferralRecord): Promise<void>;
/**
 * 错误类
 */
export declare class ReferralNotFoundError extends Error {
    constructor(message: string);
}
declare const _default: {
    processReferralResult: typeof processReferralResult;
    getReferral: typeof getReferral;
    saveReferral: typeof saveReferral;
};
export default _default;
//# sourceMappingURL=consentProcessor.d.ts.map