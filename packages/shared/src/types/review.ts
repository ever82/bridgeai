/**
 * 评价系统共享类型
 * 供前后端共享使用
 */

// 评价场景类型
export type ReviewSceneType = 'vision_share' | 'agent_date' | 'agent_job' | 'agent_ad';

// 评价状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'deleted';

// 审核状态
export type ModerationStatus = 'pending' | 'passed' | 'flagged' | 'blocked';

// 举报原因
export type ReportReason = 'spam' | 'inappropriate' | 'false' | 'harassment' | 'other';

// 举报状态
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

// 评价创建输入
export interface CreateReviewInput {
  matchId: string;
  revieweeId: string;
  sceneType?: ReviewSceneType;
  rating: number; // 1-5
  title?: string;
  content: string;
  tags?: string[];
}

// 评价回复输入
export interface CreateReviewReplyInput {
  reviewId: string;
  content: string;
  isOfficial?: boolean;
}

// 举报评价输入
export interface ReportReviewInput {
  reviewId: string;
  reason: ReportReason;
  description?: string;
}

// 评价查询参数
export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  sceneType?: ReviewSceneType;
  startDate?: string;
  endDate?: string;
}

// 评价统计响应
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

// 评价列表响应
export interface ReviewListResponse {
  reviews: ReviewSummary[];
  total: number;
  page: number;
  limit: number;
}

// 评价摘要（供列表展示）
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

// 评价详情响应
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

// 评价回复摘要
export interface ReviewReplySummary {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  isOfficial: boolean;
  createdAt: string;
}

// 内容审核结果
export interface ModerationResult {
  passed: boolean;
  flagged: boolean;
  blocked: boolean;
  reason?: string;
  score: number;
}

// 反作弊结果
export interface AntiCheatResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  score: number;
}
