/**
 * Review Moderation Service
 * 评价审核服务
 *
 * 敏感词过滤、AI内容审核、异常评价标记
 */
import { ReviewModerationLog } from '@prisma/client';
interface ISensitiveWordMatch {
    word: string;
    position: number;
}
export interface IModerationResult {
    passed: boolean;
    flagged: boolean;
    blocked: boolean;
    reason?: string;
    matchedWords?: ISensitiveWordMatch[];
    score: number;
}
/**
 * 执行内容审核
 * @param content 评价内容
 * @param title 评价标题
 * @returns 审核结果
 */
export declare function moderateContent(content: string, title?: string): Promise<IModerationResult>;
/**
 * 审核评价（异步）
 * @param reviewId 评价ID
 * @returns 审核结果
 */
export declare function moderateReview(reviewId: string): Promise<IModerationResult>;
/**
 * 批量审核待处理的评价
 * @param limit 处理数量限制
 * @returns 处理结果统计
 */
export declare function batchModeratePendingReviews(limit?: number): Promise<{
    processed: number;
    passed: number;
    flagged: number;
    blocked: number;
}>;
/**
 * 获取审核日志
 * @param reviewId 评价ID
 * @returns 审核日志列表
 */
export declare function getModerationLogs(reviewId: string): Promise<ReviewModerationLog[]>;
/**
 * 人工审核评价
 * @param reviewId 评价ID
 * @param action 审核动作
 * @param reason 审核原因
 * @param moderatorId 审核员ID
 */
export declare function manualModerateReview(reviewId: string, action: 'APPROVE' | 'REJECT' | 'HIDE', reason?: string, moderatorId?: string): Promise<void>;
/**
 * 添加敏感词
 * @param word 敏感词
 */
export declare function addSensitiveWord(word: string): void;
/**
 * 移除敏感词
 * @param word 敏感词
 */
export declare function removeSensitiveWord(word: string): void;
/**
 * 获取敏感词列表
 * @returns 敏感词列表
 */
export declare function getSensitiveWords(): string[];
export {};
//# sourceMappingURL=reviewModerationService.d.ts.map