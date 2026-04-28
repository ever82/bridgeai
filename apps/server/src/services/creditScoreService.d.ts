/**
 * 信用分计算服务
 * 实现多维度信用评分算法
 */
import { EventEmitter } from 'events';
import { prisma } from '../db/client';
import { CreditSourceType, CreditScoreResult, CreditFactorDetail } from '../types/credit';
export declare class CreditScoreService {
    /**
     * 计算用户信用分
     */
    calculateScore(userId: string): Promise<CreditScoreResult>;
    /**
     * 计算基础信息维度分数
     */
    private calculateProfileScore;
    /**
     * 计算行为维度分数
     */
    private calculateBehaviorScore;
    /**
     * 计算交易维度分数
     */
    private calculateTransactionScore;
    /**
     * 计算社交维度分数
     */
    private calculateSocialScore;
    /**
     * 构建维度得分列表
     */
    private buildFactorScores;
    private calculateCompleteness;
    private calculateVerification;
    private calculateBioQuality;
    private calculateResponseRate;
    private calculateCompletionRate;
    private calculateDisputeRate;
    private calculateCancelRate;
    /**
     * 获取用户信用分（从缓存读取，无则计算）
     */
    getUserCreditScore(userId: string): Promise<number>;
    /**
     * 获取或创建用户信用分记录
     */
    getOrCreateCreditScore(userId: string): Promise<{} & {
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        userId: string;
        score: number;
        createdAt: Date;
        level: string;
        updatedAt: Date;
        reason: string | null;
        lastUpdated: Date;
        updatedBy: string | null;
        nextUpdateAt: Date | null;
    }>;
    /**
     * 更新用户信用分
     */
    updateCreditScore(userId: string, sourceType: CreditSourceType, sourceId?: string): Promise<{
        success: boolean;
        score: number;
        level: string;
        delta: number;
        reason: string;
    } | {
        success: boolean;
        score: number;
        level: import("../types/credit").CreditLevel;
        delta: number;
        reason?: undefined;
    }>;
    /**
     * 获取信用分历史
     */
    getCreditHistory(userId: string, page?: number, pageSize?: number): Promise<{
        histories: {
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            userId: string;
            score: number;
            createdAt: Date;
            reason: string;
            delta: number;
            sourceType: string;
            sourceId: string | null;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    /**
     * 获取信用分维度详情
     */
    getCreditFactors(userId: string): Promise<CreditFactorDetail[]>;
    /**
     * 获取用户信用分排名
     */
    getCreditRank(userId: string): Promise<{
        rank: number;
        total: number;
        percentile: number;
    }>;
    private updateCreditFactors;
    private getFactorDescription;
}
export declare const creditScoreService: CreditScoreService;
export declare const creditScoreEvents: EventEmitter<[never]>;
export interface CreditScoreUpdatePayload {
    userId: string;
    delta: number;
    reason: string;
    sourceType: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
}
declare const REVIEW_CREDIT_CONFIG: {
    GOOD_REVIEW_SCORE: number;
    BAD_REVIEW_SCORE: number;
    REVIEW_COUNT_BONUS: number;
    MAX_REVIEW_COUNT_BONUS: number;
    REPLY_RATE_THRESHOLD: number;
    REPLY_RATE_BONUS: number;
    DEFAULT_SCORE: number;
    MIN_SCORE: number;
    MAX_SCORE: number;
};
/**
 * Calculate credit score based on rating score
 * @param ratingScore - The rating score (1-5)
 * @returns Credit score delta
 */
export declare function calculateRatingCreditDelta(ratingScore: number): number;
/**
 * Calculate credit score based on review count
 * @param reviewCount - Total number of reviews received
 * @returns Credit score bonus
 */
export declare function calculateReviewCountBonus(reviewCount: number): number;
/**
 * Calculate reply rate and credit bonus
 * @param totalReviews - Total reviews received
 * @param repliedReviews - Number of reviews with replies
 * @returns Credit score bonus
 */
export declare function calculateReplyRateBonus(totalReviews: number, repliedReviews: number): number;
/**
 * Get current credit score for a user (reads cached value from DB)
 * Delegates to CreditScoreService class for unified credit score system.
 * @param userId - User ID
 * @returns Current credit score
 */
export declare function getUserCreditScore(userId: string): Promise<number>;
/**
 * Update user's credit score by applying a delta
 * @param payload - Update payload
 * @returns Updated credit record
 */
export declare function updateCreditScore(payload: CreditScoreUpdatePayload): Promise<ReturnType<typeof prisma.creditHistory.create>>;
/**
 * Recalculate user's credit score based on all ratings
 * Delegates to CreditScoreService class for unified credit score system.
 * @param userId - User ID
 * @returns Updated credit score
 */
export declare function recalculateCreditScore(userId: string): Promise<number>;
/**
 * Get credit score statistics for a user
 * @param userId - User ID
 * @returns Credit statistics
 */
export declare function getCreditScoreStats(userId: string): Promise<{
    currentScore: number;
    totalReviews: number;
    goodReviews: number;
    badReviews: number;
    averageRating: number;
}>;
export { REVIEW_CREDIT_CONFIG };
//# sourceMappingURL=creditScoreService.d.ts.map