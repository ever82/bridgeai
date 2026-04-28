/**
 * Review Service
 * 评价服务
 *
 * 评价的提交、查询、回复、删除等核心功能
 */
import { Review, ReviewReply } from '@prisma/client';
export interface ICreateReviewData {
    matchId: string;
    reviewerId: string;
    revieweeId: string;
    sceneType?: string;
    rating: number;
    honestyRating?: number;
    politenessRating?: number;
    responsivenessRating?: number;
    satisfactionRating?: number;
    title?: string;
    content: string;
    tags?: string[];
}
export interface IUpdateReviewData {
    title?: string;
    content?: string;
    rating?: number;
    honestyRating?: number;
    politenessRating?: number;
    responsivenessRating?: number;
    satisfactionRating?: number;
    tags?: string[];
}
export interface ICreateReplyData {
    reviewId: string;
    authorId: string;
    content: string;
    isOfficial?: boolean;
}
export interface IReviewQueryParams {
    page?: number;
    limit?: number;
    status?: string;
    sceneType?: string;
    startDate?: Date;
    endDate?: Date;
}
export interface IReviewListResponse {
    reviews: Review[];
    total: number;
    page: number;
    limit: number;
}
export interface IReviewStatsResponse {
    userId: string;
    totalReviews: number;
    avgRating: number;
    fiveStarCount: number;
    fourStarCount: number;
    threeStarCount: number;
    twoStarCount: number;
    oneStarCount: number;
    responseRate: number;
}
/**
 * 验证评价权限
 * 检查用户是否有权限评价（交易完成后）
 * @param matchId 匹配ID
 * @param reviewerId 评价者ID
 * @returns 是否有权限
 */
export declare function validateReviewPermission(matchId: string, reviewerId: string): Promise<{
    allowed: boolean;
    reason?: string;
    match?: any;
}>;
/**
 * 创建评价
 * @param data 评价数据
 * @returns 创建的评价
 */
export declare function createReview(data: ICreateReviewData): Promise<Review>;
/**
 * 获取评价详情
 * @param reviewId 评价ID
 * @returns 评价详情
 */
export declare function getReviewById(reviewId: string): Promise<Review | null>;
/**
 * 获取收到的评价列表
 * @param userId 用户ID
 * @param params 查询参数
 * @returns 评价列表
 */
export declare function getReceivedReviews(userId: string, params?: IReviewQueryParams): Promise<IReviewListResponse>;
/**
 * 获取发出的评价列表
 * @param userId 用户ID
 * @param params 查询参数
 * @returns 评价列表
 */
export declare function getGivenReviews(userId: string, params?: IReviewQueryParams): Promise<IReviewListResponse>;
/**
 * 更新评价
 * @param reviewId 评价ID
 * @param userId 操作用户ID
 * @param data 更新数据
 * @returns 更新后的评价
 */
export declare function updateReview(reviewId: string, userId: string, data: IUpdateReviewData): Promise<Review>;
/**
 * 删除评价（软删除）
 * @param reviewId 评价ID
 * @param userId 操作用户ID
 * @param isAdmin 是否管理员
 */
export declare function deleteReview(reviewId: string, userId: string, isAdmin?: boolean): Promise<void>;
/**
 * 回复评价
 * @param data 回复数据
 * @returns 创建的回复
 */
export declare function replyToReview(data: ICreateReplyData): Promise<ReviewReply>;
/**
 * 删除评价回复
 * @param replyId 回复ID
 * @param userId 操作用户ID
 * @param isAdmin 是否管理员
 */
export declare function deleteReply(replyId: string, userId: string, isAdmin?: boolean): Promise<void>;
/**
 * 更新评价统计
 * @param userId 用户ID
 */
export declare function updateReviewStats(userId: string): Promise<void>;
/**
 * 获取用户评价统计
 * @param userId 用户ID
 * @returns 评价统计
 */
export declare function getUserReviewStats(userId: string): Promise<IReviewStatsResponse | null>;
/**
 * 审核评价
 * @param reviewId 评价ID
 * @param action 审核动作
 * @param reason 原因
 * @param moderatorId 审核员ID
 */
export declare function moderateReview(reviewId: string, action: 'APPROVE' | 'REJECT' | 'HIDE', reason?: string, moderatorId?: string): Promise<void>;
/**
 * 举报评价
 * @param reviewId 评价ID
 * @param reporterId 举报者ID
 * @param reason 举报原因
 * @param description 详细描述
 */
export declare function reportReview(reviewId: string, reporterId: string, reason: string, description?: string): Promise<void>;
/**
 * 处理举报
 * @param reportId 举报ID
 * @param action 处理动作
 * @param resolution 处理说明
 * @param handlerId 处理人ID
 */
export declare function handleReport(reportId: string, action: 'RESOLVE' | 'DISMISS', resolution?: string, handlerId?: string): Promise<void>;
//# sourceMappingURL=reviewService.d.ts.map