/**
 * Review/Rating types for the mobile app
 * Based on backend Rating model from schema.prisma
 */

export interface Review {
  id: string;
  matchId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  content?: string;
  title?: string;
  tags?: string[];
  sceneType?: string;
  createdAt: string;

  // Populated relations
  reviewer?: UserSummary;
  reviewee?: UserSummary;
  match?: MatchSummary;
}

export interface UserSummary {
  id: string;
  name: string;
  avatar?: string;
}

export interface MatchSummary {
  id: string;
  title: string;
  completedAt?: string;
}

export interface ReviewStats {
  avgRating: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  responseRate: number;
}

export interface CreateReviewRequest {
  matchId: string;
  revieweeId: string;
  rating: number;
  content?: string;
  title?: string;
  tags?: string[];
  sceneType?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  content?: string;
}

export interface ReplyToReviewRequest {
  content: string;
}

export type ReviewTab = 'received' | 'given';
