import {
  Moment,
  User,
  UserProfile,
  PaginatedResponse,
  ApiResponse,
} from '../../types';

import { api } from './client';

interface GetMomentsParams {
  page?: number;
  limit?: number;
  userId?: string;
  category?: string;
  search?: string;
}

interface CreateMomentData {
  title: string;
  description?: string;
  media: Array<{
    uri: string;
    type: 'image' | 'video';
  }>;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  tags?: string[];
  visibility?: 'public' | 'private' | 'friends';
}

export const momentsApi = {
  getMoments: (params?: GetMomentsParams) =>
    api.get<PaginatedResponse<Moment>>('/moments', { params }),

  getMoment: (id: string) =>
    api.get<Moment>(`/moments/${id}`),

  createMoment: (data: FormData) =>
    api.post<Moment>('/moments', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  updateMoment: (id: string, data: Partial<CreateMomentData>) =>
    api.patch<Moment>(`/moments/${id}`, data),

  deleteMoment: (id: string) =>
    api.delete<void>(`/moments/${id}`),

  likeMoment: (id: string) =>
    api.post<void>(`/moments/${id}/like`),

  unlikeMoment: (id: string) =>
    api.delete<void>(`/moments/${id}/like`),

  saveMoment: (id: string) =>
    api.post<void>(`/moments/${id}/save`),

  unsaveMoment: (id: string) =>
    api.delete<void>(`/moments/${id}/save`),
};

export const usersApi = {
  getProfile: () =>
    api.get<UserProfile>('/users/me'),

  getUser: (id: string) =>
    api.get<UserProfile>(`/users/${id}`),

  updateProfile: (data: Partial<UserProfile>) =>
    api.patch<UserProfile>('/users/me', data),

  updateAvatar: (formData: FormData) =>
    api.post<User>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  followUser: (id: string) =>
    api.post<void>(`/users/${id}/follow`),

  unfollowUser: (id: string) =>
    api.delete<void>(`/users/${id}/follow`),

  getFollowers: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>(`/users/${id}/followers`, { params }),

  getFollowing: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>(`/users/${id}/following`, { params }),
};

export const commentsApi = {
  getComments: (momentId: string, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Comment>>(`/moments/${momentId}/comments`, { params }),

  createComment: (momentId: string, content: string, parentId?: string) =>
    api.post<Comment>(`/moments/${momentId}/comments`, { content, parentId }),

  updateComment: (id: string, content: string) =>
    api.patch<Comment>(`/comments/${id}`, { content }),

  deleteComment: (id: string) =>
    api.delete<void>(`/comments/${id}`),

  likeComment: (id: string) =>
    api.post<void>(`/comments/${id}/like`),

  unlikeComment: (id: string) =>
    api.delete<void>(`/comments/${id}/like`),
};
