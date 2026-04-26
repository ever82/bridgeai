/**
 * 评价系统共享类型
 * 供前后端共享使用
 */
export type ReviewSceneType = 'vision_share' | 'agent_date' | 'agent_job' | 'agent_ad';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'deleted';
export type ModerationStatus = 'pending' | 'passed' | 'flagged' | 'blocked';
export type ReportReason = 'spam' | 'inappropriate' | 'false' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export interface CreateReviewInput {
    matchId: string;
    revieweeId: string;
    sceneType?: ReviewSceneType;
    rating: number;
    title?: string;
    content: string;
    tags?: string[];
}
export interface CreateReviewReplyInput {
    reviewId: string;
    content: string;
    isOfficial?: boolean;
}
export interface ReportReviewInput {
    reviewId: string;
    reason: ReportReason;
    description?: string;
}
export interface ReviewQueryParams {
    page?: number;
    limit?: number;
    status?: ReviewStatus;
    sceneType?: ReviewSceneType;
    startDate?: string;
    endDate?: string;
}
export interface ReviewStatsResponse {
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
export interface ReviewListResponse {
    reviews: ReviewSummary[];
    total: number;
    page: number;
    limit: number;
}
export interface ReviewSummary {
    id: string;
    matchId: string;
    reviewerName: string;
    reviewerAvatar?: string;
    revieweeName: string;
    revieweeAvatar?: string;
    sceneType?: ReviewSceneType;
    rating: number;
    title?: string;
    content: string;
    tags: string[];
    status: ReviewStatus;
    moderationStatus: ModerationStatus;
    isVerified: boolean;
    replyCount: number;
    createdAt: string;
}
export interface ReviewDetailResponse {
    id: string;
    matchId: string;
    reviewer: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    reviewee: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    sceneType?: ReviewSceneType;
    rating: number;
    title?: string;
    content: string;
    tags: string[];
    status: ReviewStatus;
    moderationStatus: ModerationStatus;
    isVerified: boolean;
    replies: ReviewReplySummary[];
    createdAt: string;
    updatedAt: string;
}
export interface ReviewReplySummary {
    id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    isOfficial: boolean;
    createdAt: string;
}
export interface ModerationResult {
    passed: boolean;
    flagged: boolean;
    blocked: boolean;
    reason?: string;
    score: number;
}
export interface AntiCheatResult {
    passed: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
    score: number;
}
//# sourceMappingURL=review.d.ts.map