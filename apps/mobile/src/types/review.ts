/**
 * Review/Rating types for the mobile app
 * Based on backend Rating model from schema.prisma
 */

export interface Review {
  id: string;
  matchId: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment?: string;
  createdAt: string;

  // Populated relations
  rater?: UserSummary;
  ratee?: UserSummary;
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
  averageScore: number;
  totalReviews: number;
  distribution: {
    score: number;
    count: number;
  }[];
}

export interface CreateReviewRequest {
  matchId: string;
  rateeId: string;
  score: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  score?: number;
  comment?: string;
}

export interface ReplyToReviewRequest {
  reply: string;
}

export type ReviewTab = 'received' | 'given';
