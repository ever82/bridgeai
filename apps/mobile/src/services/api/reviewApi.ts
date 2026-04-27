import { ApiResponse } from '../../types';
import { Review, ReviewStats, CreateReviewRequest, ReplyToReviewRequest } from '../../types/review';

import { api } from './client';

export interface GetReviewsParams {
  page?: number;
  limit?: number;
  status?: string;
  sceneType?: string;
}

export interface GetReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// GET /api/v1/reviews/received
export const getReceivedReviews = async (
  params?: GetReviewsParams
): Promise<ApiResponse<GetReviewsResponse>> => {
  const response = await api.get<GetReviewsResponse>('/reviews/received', { params });
  return response.data;
};

// GET /api/v1/reviews/given
export const getGivenReviews = async (
  params?: GetReviewsParams
): Promise<ApiResponse<GetReviewsResponse>> => {
  const response = await api.get<GetReviewsResponse>('/reviews/given', { params });
  return response.data;
};

// GET /api/v1/reviews/stats
export const getReviewStats = async (): Promise<ApiResponse<ReviewStats>> => {
  const response = await api.get<ReviewStats>('/reviews/stats');
  return response.data;
};

// GET /api/v1/reviews/:id
export const getReviewById = async (id: string): Promise<ApiResponse<Review>> => {
  const response = await api.get<Review>(`/reviews/${id}`);
  return response.data;
};

// PUT /api/v1/reviews/:id/reply
export const replyToReview = async (
  reviewId: string,
  payload: ReplyToReviewRequest
): Promise<ApiResponse<Review>> => {
  const response = await api.put<Review>(`/reviews/${reviewId}/reply`, payload);
  return response.data;
};

// POST /api/v1/reviews
export const createReview = async (payload: CreateReviewRequest): Promise<ApiResponse<Review>> => {
  const response = await api.post<Review>('/reviews', payload);
  return response.data;
};
