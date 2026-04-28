/**
 * Review Anti-Cheat Service
 * 评价反作弊服务
 *
 * 恶意刷评价检测、真实性验证、异常评价自动标记
 */
export interface AntiCheatResult {
    passed: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
    score: number;
}
/**
 * 检测是否已经评价过同一匹配
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @returns 是否已经评价
 */
export declare function hasAlreadyReviewedMatch(matchId: string, reviewerId: string): Promise<boolean>;
/**
 * 检测用户是否在短时间内频繁评价
 * @param reviewerId 评价者ID
 * @param timeWindowHours 时间窗口（小时）
 * @returns 评价次数
 */
export declare function countRecentReviews(reviewerId: string, timeWindowHours?: number): Promise<number>;
/**
 * 检测用户是否给同一评价者频繁评价
 * @param reviewerId 评价者ID
 * @param revieweeId 被评价者ID
 * @returns 评价次数
 */
export declare function countReviewsBetweenUsers(reviewerId: string, revieweeId: string): Promise<number>;
/**
 * 检测评价内容是否与已有评价高度相似
 * @param content 评价内容
 * @param userId 用户ID
 * @returns 相似评价数量
 */
export declare function findSimilarReviews(content: string, userId: string, threshold?: number): Promise<number>;
/**
 * 检测评价者是否是最近创建的账户（可能是水军）
 * @param userId 用户ID
 * @param minAgeDays 最小账户年龄
 * @returns 是否是新账户
 */
export declare function isNewAccount(userId: string, minAgeDays?: number): Promise<boolean>;
/**
 * 执行完整的反作弊检查
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @param revieweeId 被评价者ID
 * @param content 评价内容
 * @returns 反作弊结果
 */
export declare function performAntiCheatCheck(matchId: string, reviewerId: string, revieweeId: string, content: string): Promise<AntiCheatResult>;
/**
 * 自动标记异常评价
 * 检测并标记符合以下特征的评价：
 * - 同一用户短时间内大量评价
 * - 评价内容大量重复
 * - 评价者账户年龄极低
 */
export declare function autoFlagSuspiciousReviews(): Promise<{
    flagged: number;
    checked: number;
}>;
//# sourceMappingURL=reviewAntiCheatService.d.ts.map