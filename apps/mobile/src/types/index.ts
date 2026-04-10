/**
 * User types
 */

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  momentsCount: number;
  isFollowing?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  website?: string;
  location?: string;
  isPrivate: boolean;
}

/**
 * Moment types
 */

export interface Moment {
  id: string;
  userId: string;
  user: User;
  title: string;
  description?: string;
  media: MediaItem[];
  location?: Location;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  visibility: 'public' | 'private' | 'friends';
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  width: number;
  height: number;
  duration?: number; // For videos
}

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * Comment types
 */

export interface Comment {
  id: string;
  momentId: string;
  userId: string;
  user: User;
  content: string;
  likesCount: number;
  isLiked: boolean;
  parentId?: string;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Activity types
 */

export type ActivityType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'share'
  | 'save';

export interface Activity {
  id: string;
  type: ActivityType;
  actor: User;
  target?: Moment;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * API types
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/**
 * Auth types
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  displayName: string;
  password: string;
}
